/**
 * 表单填写主控制器 - V2优化版本
 * 集成FormExpander，实现完整的两阶段AI填充流程
 */

class FormFillController {
    constructor(config = {}) {
        this.config = {
            aiServiceURL: config.aiServiceURL || (window.CONFIG ? window.CONFIG.getApiBaseUrl() : 'http://localhost:8080'),
            ...config
        };

        // 初始化各个模块
        this.scanner = new FieldScanner();
        this.filler = new ProgressiveFiller();
        this.highlighter = new Highlighter();
        this.expander = new FormExpander();  // ✅ 新增：表单展开器
        this.aiService = new AIService({     // ✅ 使用新版AIService
            baseURL: this.config.aiServiceURL
        });

        // 状态
        this.state = 'idle'; // idle | expanding | scanning | analyzing | filling | completed | error
        this.fields = [];
        this.matchedData = {};

        // 回调
        this.onStateChange = null;
        this.onProgress = null;
        this.onComplete = null;
        this.onError = null;

        // 绑定填写器的回调
        this.setupFillerCallbacks();
    }

    /**
     * 设置填写器的回调
     */
    setupFillerCallbacks() {
        this.filler.onProgress = (progress) => {
            if (this.onProgress) {
                this.onProgress({
                    phase: 'filling',
                    ...progress
                });
            }
        };

        this.filler.onFieldFilled = (field, success) => {
            console.log('[Controller] 字段填写完成:', field.label, success ? '✓' : '✗');
        };

        this.filler.onComplete = (result) => {
            console.log('[Controller] 填写全部完成:', result);
            this.changeState('completed');

            if (this.onComplete) {
                this.onComplete(result);
            }
        };

        this.filler.onError = (field, error) => {
            console.error('[Controller] 填写出错:', field, error);

            if (this.onError) {
                this.onError({ field, error });
            }
        };
    }

    /**
     * 开始自动填写（新流程）
     * @param {Object} params
     */
    async start(params = {}) {
        const {
            resumeId = null,
            companyName = '',
            positionName = ''
        } = params;

        console.log('============================================');
        console.log('[Controller] 🚀 开始自动填写流程（V2优化版）');
        console.log(`[Controller] 简历ID: ${resumeId}`);
        console.log(`[Controller] 公司: ${companyName}`);
        console.log(`[Controller] 职位: ${positionName}`);
        console.log('============================================');

        try {
            // ========== 第零阶段：展开动态表单 ==========
            this.changeState('expanding');
            this.notifyProgress('正在展开动态表单区域...', 0);

            console.log('[Controller] ---------- 阶段0：展开动态表单 ----------');
            const expandResult = await this.expander.expandAll();
            console.log(`[Controller] ✓ 表单展开完成: ${expandResult.expanded} 个新区域`);

            // ========== 第一阶段：扫描字段 ==========
            this.changeState('scanning');
            this.notifyProgress('扫描页面字段...', 10);

            console.log('[Controller] ---------- 阶段1：扫描字段 ----------');
            this.fields = await this.scanner.scan();

            if (this.fields.length === 0) {
                throw new Error('页面中没有找到可填写的字段');
            }

            console.log(`[Controller] ✓ 扫描完成，找到 ${this.fields.length} 个字段`);

            // ========== 第二阶段：AI两步分析 ==========
            this.changeState('analyzing');
            this.notifyProgress('AI正在分析页面结构...', 30);

            console.log('[Controller] ---------- 阶段2：AI两步分析 ----------');

            // 步骤2.1: 分析页面HTML（获取sessionId和字段结构）
            console.log('[Controller] 步骤2.1: 分析页面HTML...');
            const pageAnalysisResult = await this.aiService.analyzePage({
                url: window.location.href,
                html: document.documentElement.outerHTML,  // ✅ 传递完整HTML
                companyName,
                positionName
            });

            console.log(`[Controller] ✓ 页面分析完成`);
            console.log(`[Controller]   SessionID: ${pageAnalysisResult.sessionId}`);
            console.log(`[Controller]   Sections: ${pageAnalysisResult.sections.length} 个`);

            if (!pageAnalysisResult.sessionId) {
                console.warn('[Controller] ⚠️ 页面分析失败，使用降级方案');
                return await this.fallbackFill(params);
            }

            // 步骤2.2: 获取简历数据
            this.notifyProgress('正在获取简历数据...', 50);
            console.log('[Controller] 步骤2.2: 获取简历数据...');
            const resumeData = await this.aiService.getResumeData(resumeId);

            if (!resumeData || Object.keys(resumeData).length === 0) {
                throw new Error('简历数据为空');
            }

            console.log(`[Controller] ✓ 简历数据获取成功`);

            // 步骤2.3: 丰富字段信息（添加下拉选项items）
            console.log('[Controller] 步骤2.3: 丰富字段信息（添加下拉选项）...');
            const enrichedFields = this.enrichFieldsWithOptions(this.fields);
            console.log(`[Controller] ✓ 字段丰富完成，${enrichedFields.filter(f => f.items).length} 个字段有下拉选项`);

            // 步骤2.4: AI生成填充值
            this.notifyProgress('AI正在生成填充值...', 60);
            console.log('[Controller] 步骤2.4: AI生成填充值...');
            const fillValuesResult = await this.aiService.fillValues({
                sessionId: pageAnalysisResult.sessionId,
                fields: enrichedFields,
                resumeData,
                companyName,
                positionName
            });

            console.log(`[Controller] ✓ 填充值生成完成: ${fillValuesResult.matches.length} 个匹配`);

            // 构建填写数据
            this.matchedData = this.buildFillData(fillValuesResult.matches, pageAnalysisResult.sections);

            // ========== 第三阶段：渐进式填写 ==========
            this.changeState('filling');
            this.notifyProgress('开始填写字段...', 70);

            console.log('[Controller] ---------- 阶段3：渐进式填写 ----------');
            const fillResult = await this.filler.fill(this.fields, this.matchedData);

            console.log('============================================');
            console.log('[Controller] ✅ 填写流程完成！');
            console.log(`[Controller] 成功: ${fillResult.filled} 个`);
            console.log(`[Controller] 失败: ${fillResult.failed} 个`);
            console.log(`[Controller] 总计: ${this.fields.length} 个字段`);
            console.log('============================================');

            return {
                success: true,
                total: this.fields.length,
                filled: fillResult.filled,
                failed: fillResult.failed
            };

        } catch (error) {
            console.error('[Controller] ❌ 填写流程出错:', error);
            this.changeState('error');

            if (this.onError) {
                this.onError({ error });
            }

            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 【V2新增】构建填写数据（基于AI直接返回的matches）
     * @param {Array} matches - AI返回的matches（包含sectionName和fieldName）
     * @param {Array} sections - 页面分析得到的sections结构
     * @returns {Object}
     */
    buildFillData(matches, sections) {
        console.log('[Controller] ========== 开始构建填写数据 ==========');
        console.log(`[Controller] AI返回 ${matches.length} 个section`);

        const data = {};
        let successCount = 0;

        // ⭐ 新增：跟踪每个label已被使用的次数（用于成对input的索引匹配）
        const labelUsageCount = new Map();

        for (const section of matches) {
            const { sectionName, fields } = section;

            // ⭐ 兼容两种数据结构
            // 1. 嵌套结构: {sectionName, fields: [{fieldName, value}]}
            // 2. 扁平结构: {sectionName, fieldName, value}
            const fieldsToProcess = fields || [section];

            console.log(`[Controller] 处理section: ${sectionName}, 包含 ${fieldsToProcess.length} 个字段`);

            for (const fieldData of fieldsToProcess) {
                const { fieldName, value } = fieldData;

                console.log(`[Controller] 处理匹配: [${sectionName}] ${fieldName} = ${value}`);

                let targetField = null;

                // ⭐ 空fieldName时使用值类型推断
                if (!fieldName || fieldName.trim() === '') {
                    console.warn(`[Controller] ⚠️ 检测到空fieldName，尝试根据值类型推断，value=${value}`);

                    // 尝试根据value推断字段
                    const inferredField = this.inferFieldFromValue(value);

                    if (inferredField) {
                        targetField = inferredField;
                        console.log(`[Controller] ✅ 根据值类型推断匹配到字段: ${targetField.label || targetField.placeholder}`);
                    } else {
                        console.warn(`[Controller] ⚠️ 无法推断字段，跳过此值: ${value}`);
                        continue;
                    }
                } else {
                    // 在this.fields中查找匹配的字段
                    // 策略1: 通过label精确匹配
                    targetField = this.fields.find(f =>
                        f.label && f.label.includes(fieldName)
                    );

                    // 策略2: 通过placeholder匹配
                    if (!targetField) {
                        targetField = this.fields.find(f =>
                            f.placeholder && f.placeholder.includes(fieldName)
                        );
                    }

                    // 策略3: 通过name匹配
                    if (!targetField) {
                        targetField = this.fields.find(f =>
                            f.name && f.name.includes(fieldName)
                        );
                    }

                    // 策略4: 模糊匹配（label包含fieldName或fieldName包含label）
                    if (!targetField) {
                        targetField = this.fields.find(f => {
                            if (f.label && fieldName) {
                                return f.label.includes(fieldName) || fieldName.includes(f.label);
                            }
                            return false;
                        });
                    }

                    // ⭐ 策略5: 时间范围字段智能匹配（支持索引）
                    // AI返回"开始时间"/"结束时间"应该匹配前端的"起止时间"字段
                    if (!targetField) {
                        const isStartTimeField = fieldName.includes('开始') || fieldName.includes('入学') || fieldName.includes('入职');
                        const isEndTimeField = fieldName.includes('结束') || fieldName.includes('毕业') || fieldName.includes('离职');

                        if (isStartTimeField || isEndTimeField) {
                            // 查找所有匹配"起止时间"的字段
                            const rangeFields = this.fields.filter(f =>
                                f.label && (
                                    f.label.includes('起止') ||
                                    f.label.includes('开始') || f.label.includes('入学') || f.label.includes('入职') ||
                                    f.label.includes('结束') || f.label.includes('毕业') || f.label.includes('离职')
                                )
                            );

                            if (rangeFields.length > 0) {
                                // 如果是开始时间，使用第一个；如果是结束时间，使用第二个（如果有的话）
                                if (isStartTimeField) {
                                    targetField = rangeFields[0];
                                    console.log(`[Controller] ✅ 时间范围索引匹配: ${fieldName} -> ${targetField.label} (第1个)`);
                                } else if (isEndTimeField) {
                                    targetField = rangeFields.length > 1 ? rangeFields[1] : rangeFields[0];
                                    console.log(`[Controller] ✅ 时间范围索引匹配: ${fieldName} -> ${targetField.label} (第${rangeFields.length > 1 ? 2 : 1}个)`);
                                }
                            }
                        }
                    }

                    // 策略6: 根据值类型回退匹配
                    if (!targetField) {
                        console.warn(`[Controller] ⚠️ 精确匹配失败: ${fieldName}，尝试值类型回退匹配`);
                        targetField = this.inferFieldFromValue(value);

                        if (targetField) {
                            console.log(`[Controller] ✅ 值类型回退匹配成功: ${targetField.label || targetField.placeholder}`);
                        }
                    }

                    if (!targetField) {
                        console.warn(`[Controller] ⚠️ 所有匹配策略失败，未找到字段: ${fieldName}`);
                        continue;
                    }
                }

                // ⭐ 时间范围字段特殊处理：存储为数组以支持分两次填充
                const isStartTime = fieldName.includes('开始') || fieldName.includes('入学') || fieldName.includes('入职');
                const isEndTime = fieldName.includes('结束') || fieldName.includes('毕业') || fieldName.includes('离职');

                // 判断是否是时间范围字段（更多关键词）
                const rangeKeywords = ['起止', '开始-结束', '入学-毕业', '入职-离职', '开始至结束', '起始时间'];
                const isRangeField = targetField.label && rangeKeywords.some(keyword =>
                    targetField.label.includes(keyword)
                );

                console.log(`[Controller] 🔍 字段分析: fieldName="${fieldName}", label="${targetField.label}", isStartTime=${isStartTime}, isEndTime=${isEndTime}, isRangeField=${isRangeField}`);

                // ⭐ 多键存储策略（使用字段索引确保唯一性）
                const keys = [];

                // ⭐ 核心改进：使用字段在fields数组中的索引作为唯一key
                const fieldIndex = this.fields.indexOf(targetField);
                const uniqueKey = `__field_${fieldIndex}__`;  // 使用索引作为唯一标识

                data[uniqueKey] = value;
                keys.push(uniqueKey);

                // 同时保留原有的key（用于降级匹配）
                if (targetField.fieldType && targetField.fieldType !== 'unknown') {
                    if (!data[targetField.fieldType]) {
                        data[targetField.fieldType] = value;
                        keys.push(targetField.fieldType);
                    }
                }

                if (targetField.label && !data[targetField.label]) {
                    data[targetField.label] = value;
                    keys.push(targetField.label);
                }

                if (targetField.name && !data[targetField.name]) {
                    data[targetField.name] = value;
                    keys.push(targetField.name);
                }

                if (targetField.placeholder && !data[targetField.placeholder]) {
                    data[targetField.placeholder] = value;
                    keys.push(targetField.placeholder);
                }

                // 直接使用fieldName作为key
                if (!data[fieldName]) {
                    data[fieldName] = value;
                    keys.push(fieldName);
                }

                successCount++;
                console.log(`[Controller] ✓ 已添加 ${fieldName}: ${value} (键: ${keys.join(', ')})`);
            }  // ← 内层for循环结束 (fieldsToProcess)
        }  // ← 外层for循环结束 (matches)

        console.log('[Controller] ========== 构建填写数据完成 ==========');
        console.log(`[Controller] 成功构建 ${successCount}/${matches.length} 条填写指令`);
        console.log(`[Controller] 填写数据包含 ${Object.keys(data).length} 个键`);

        return data;
    }

    /**
     * 丰富字段信息（添加下拉选项items）
     * @param {Array} fields
     * @returns {Array}
     */
    enrichFieldsWithOptions(fields) {
        return fields.map((field, index) => {
            const enriched = {
                index,
                tagName: field.tagName,
                type: field.type,
                label: field.label,
                placeholder: field.placeholder,
                name: field.name,
                fieldType: field.fieldType,
                required: field.required,
                section: field.section || '',
                context: field.context || ''
            };

            // 添加下拉选项
            if (field.options && field.options.length > 0) {
                enriched.items = field.options.map(opt => opt.text || opt.value);
            }

            return enriched;
        });
    }

    /**
     * 根据值的类型推断字段
     * @param {string} value - 值
     * @returns {Object|null} 推断的字段，找不到则返回null
     */
    inferFieldFromValue(value) {
        if (!value) return null;

        // 日期格式 (YYYY-MM, YYYY-MM-DD, YYYY, etc.)
        const datePattern = /^\d{4}(-\d{2}(-\d{2})?)?$/;
        if (datePattern.test(value)) {
            const dateKeywords = ['时间', '日期', '年月', '入学', '毕业', '入职', '离职', '开始', '结束', 'time', 'date'];
            return this.fields.find(f =>
                dateKeywords.some(keyword =>
                    (f.label && f.label.includes(keyword)) ||
                    (f.placeholder && f.placeholder.includes(keyword))
                )
            );
        }

        // 手机号格式
        const phonePattern = /^1[3-9]\d{9}$|^\+?86\s*1[3-9]\d{9}$/;
        if (phonePattern.test(value)) {
            const phoneKeywords = ['手机', '电话', '联系方式', 'phone', 'mobile', 'tel'];
            return this.fields.find(f =>
                phoneKeywords.some(keyword =>
                    (f.label && f.label.includes(keyword)) ||
                    (f.placeholder && f.placeholder.includes(keyword))
                )
            );
        }

        // 邮箱格式
        const emailPattern = /^[\w.-]+@[\w.-]+\.\w+$/;
        if (emailPattern.test(value)) {
            const emailKeywords = ['邮箱', 'email', 'mail'];
            return this.fields.find(f =>
                emailKeywords.some(keyword =>
                    (f.label && f.label.toLowerCase().includes(keyword.toLowerCase())) ||
                    (f.placeholder && f.placeholder.toLowerCase().includes(keyword.toLowerCase()))
                )
            );
        }

        // 学历关键词
        const degreePattern = /(本科|硕士|博士|专科|大专|高中|初中|PhD|Master|Bachelor)/;
        if (degreePattern.test(value)) {
            const degreeKeywords = ['学历', '学位', 'degree', 'education'];
            return this.fields.find(f =>
                degreeKeywords.some(keyword =>
                    (f.label && f.label.includes(keyword)) ||
                    (f.placeholder && f.placeholder.includes(keyword))
                )
            );
        }

        // 性别关键词
        if (/^(男|女|Male|Female|M|F)$/.test(value)) {
            const genderKeywords = ['性别', 'gender', 'sex'];
            return this.fields.find(f =>
                genderKeywords.some(keyword =>
                    (f.label && f.label.includes(keyword)) ||
                    (f.placeholder && f.placeholder.includes(keyword))
                )
            );
        }

        return null;
    }

    /**
     * 降级填写方案（当AI失败时）
     * @param {Object} params
     * @returns {Promise<Object>}
     */
    async fallbackFill(params) {
        console.log('[Controller] 使用降级填写方案...');

        // 使用本地规则匹配
        const fallbackResult = await this.aiService.fallbackMatch(this.fields);

        if (fallbackResult.matches.length === 0) {
            throw new Error('降级方案也无法匹配字段');
        }

        // 构建填写数据
        const data = {};
        for (const match of fallbackResult.matches) {
            const field = this.fields[match.fieldIndex];
            if (field) {
                if (field.fieldType) data[field.fieldType] = match.value;
                if (field.label) data[field.label] = match.value;
                if (field.name) data[field.name] = match.value;
            }
        }

        this.matchedData = data;

        // 执行填写
        this.changeState('filling');
        const fillResult = await this.filler.fill(this.fields, this.matchedData);

        return {
            success: true,
            total: this.fields.length,
            filled: fillResult.filled,
            failed: fillResult.failed,
            fallback: true
        };
    }

    /**
     * 改变状态
     * @param {string} newState
     */
    changeState(newState) {
        const oldState = this.state;
        this.state = newState;

        console.log(`[Controller] 状态变化: ${oldState} -> ${newState}`);

        if (this.onStateChange) {
            this.onStateChange(newState, oldState);
        }
    }

    /**
     * 通知进度
     * @param {string} message
     * @param {number} percentage
     */
    notifyProgress(message, percentage) {
        if (this.onProgress) {
            this.onProgress({
                phase: this.state,
                message,
                percentage
            });
        }
    }

    /**
     * 暂停填写
     */
    pause() {
        if (this.state === 'filling') {
            this.filler.pause();
            console.log('[Controller] 已暂停');
        }
    }

    /**
     * 继续填写
     */
    resume() {
        if (this.state === 'filling') {
            this.filler.resume();
            console.log('[Controller] 已继续');
        }
    }

    /**
     * 停止填写
     */
    stop() {
        this.filler.stop();
        this.changeState('idle');
        console.log('[Controller] 已停止');
    }

    /**
     * 重新开始
     */
    async restart(params) {
        this.stop();
        await new Promise(resolve => setTimeout(resolve, 500));
        return await this.start(params);
    }

    /**
     * 获取当前状态
     */
    getState() {
        return {
            state: this.state,
            fieldsCount: this.fields.length,
            filledCount: this.filler.filledFields.length,
            failedCount: this.filler.failedFields.length
        };
    }

    /**
     * 添加到时间范围数组（处理开始时间+结束时间 → [开始, 结束]）
     * @param {any} existingValue - 已有的值（可能是字符串或数组）
     * @param {string} newValue - 新值
     * @param {boolean} isStartTime - 新值是否为开始时间
     * @param {boolean} isEndTime - 新值是否为结束时间
     * @param {boolean} isRangeField - 目标字段是否为时间范围字段
     * @returns {string|Array}
     */
    addToTimeRangeArray(existingValue, newValue, isStartTime, isEndTime, isRangeField) {
        console.log(`[Controller] 📥 addToTimeRangeArray 调用: existing="${existingValue}", new="${newValue}", isStart=${isStartTime}, isEnd=${isEndTime}, isRange=${isRangeField}`);

        // 如果不是时间范围字段，直接返回新值
        if (!isRangeField) {
            console.log(`[Controller] ⚠️ 不是时间范围字段，直接返回新值`);
            return newValue;
        }

        // 如果没有已有值，返回新值
        if (!existingValue) {
            console.log(`[Controller] ℹ️ 首次赋值，返回新值: ${newValue}`);
            return newValue;
        }

        // 如果已有值是数组，继续追加
        if (Array.isArray(existingValue)) {
            console.log(`[Controller] 📅 追加时间范围值: [${existingValue.join(', ')}] + ${newValue}`);
            return [...existingValue, newValue];
        }

        // 如果已有值是字符串，转为数组
        // 确保开始时间在前，结束时间在后
        if (isStartTime && isEndTime) {
            // 新值既是开始又是结束（不太可能）
            console.log(`[Controller] ⚠️ 同时是开始和结束，转为数组`);
            return [existingValue, newValue];
        } else if (isStartTime) {
            // 新值是开始时间，已有值是结束时间
            console.log(`[Controller] 📅 构建时间范围数组（新值是开始）: [${newValue}, ${existingValue}]`);
            return [newValue, existingValue];
        } else if (isEndTime) {
            // 新值是结束时间，已有值是开始时间
            console.log(`[Controller] 📅 构建时间范围数组（新值是结束）: [${existingValue}, ${newValue}]`);
            return [existingValue, newValue];
        } else {
            // 都不是时间类型，转为数组
            console.log(`[Controller] ⚠️ 都不是时间类型，转为数组`);
            return [existingValue, newValue];
        }
    }

    /**
     * 销毁控制器
     */
    destroy() {
        this.stop();
        this.filler.destroy();
        this.highlighter.destroy();
        this.aiService.clearCache();

        console.log('[Controller] 已销毁');
    }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FormFillController;
}
