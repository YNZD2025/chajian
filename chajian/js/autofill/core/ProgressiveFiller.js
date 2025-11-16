/**
 * 渐进式填充器 - 优化版
 * 核心职责：按顺序逐个填写字段，完全模拟真实用户行为
 *
 * 核心改进：
 * 1. ✅ 集成DOMObserver实时监听DOM变化
 * 2. ✅ 智能延迟调整（根据页面反应动态调整）
 * 3. ✅ 使用优化后的EventSimulator.click（包含focus）
 * 4. ✅ 完善的弹窗检测和处理
 * 5. ✅ 更好的重试策略
 */

class ProgressiveFiller {
    constructor(options = {}) {
        this.options = {
            delayBetweenFields: 200,    // 字段之间的延迟（ms）
            delayAfterClick: 300,       // 点击后基础延迟（ms）
            delayAfterFill: 200,        // 填写后延迟（ms）
            maxRetries: 3,              // 最大重试次数
            scrollBehavior: 'smooth',   // 滚动行为
            verifyAfterFill: true,      // 填写后验证
            popupStableTime: 300,       // 弹窗稳定时间（ms）
            ...options
        };

        this.highlighter = new Highlighter();
        this.domObserver = new DOMObserver();  // ✅ 添加DOM观察器
        this.currentIndex = 0;
        this.filledFields = [];
        this.failedFields = [];
        this.isRunning = false;
        this.isPaused = false;

        // 回调函数
        this.onProgress = null;      // 进度回调
        this.onFieldFilled = null;   // 单个字段填写完成回调
        this.onComplete = null;      // 全部完成回调
        this.onError = null;         // 错误回调
    }

    /**
     * 开始填写
     * @param {Array} fields - 字段信息数组
     * @param {Object} data - 要填写的数据（键值对）
     */
    async fill(fields, data) {
        console.log('[ProgressiveFiller] 开始渐进式填写...');
        console.log(`[ProgressiveFiller] 字段数量: ${fields.length}`);

        this.isRunning = true;
        this.isPaused = false;
        this.currentIndex = 0;
        this.filledFields = [];
        this.failedFields = [];

        try {
            // 逐个填写字段
            for (let i = 0; i < fields.length; i++) {
                // 检查是否暂停
                while (this.isPaused && this.isRunning) {
                    await DOMUtils.delay(500);
                }

                // 检查是否停止
                if (!this.isRunning) {
                    console.log('[ProgressiveFiller] 填写已停止');
                    break;
                }

                this.currentIndex = i;
                const field = fields[i];

                // 通知进度
                this.notifyProgress(i + 1, fields.length, field);

                // 填写单个字段
                try {
                    const success = await this.fillSingleField(field, data);

                    if (success) {
                        this.filledFields.push(field);
                    } else {
                        this.failedFields.push(field);
                    }

                    // 通知单个字段完成
                    if (this.onFieldFilled) {
                        this.onFieldFilled(field, success);
                    }
                } catch (error) {
                    console.error('[ProgressiveFiller] 填写字段失败:', field, error);
                    this.failedFields.push(field);

                    if (this.onError) {
                        this.onError(field, error);
                    }
                }

                // 字段之间的延迟
                await DOMUtils.delay(this.options.delayBetweenFields);
            }

            // 通知完成
            console.log(`[ProgressiveFiller] 填写完成！成功: ${this.filledFields.length}, 失败: ${this.failedFields.length}`);

            if (this.onComplete) {
                this.onComplete({
                    total: fields.length,
                    filled: this.filledFields.length,
                    failed: this.failedFields.length,
                    filledFields: this.filledFields,
                    failedFields: this.failedFields
                });
            }

            return {
                success: true,
                filled: this.filledFields.length,
                failed: this.failedFields.length
            };
        } catch (error) {
            console.error('[ProgressiveFiller] 填写过程发生错误:', error);

            if (this.onError) {
                this.onError(null, error);
            }

            return {
                success: false,
                error: error.message
            };
        } finally {
            this.isRunning = false;

            // 清理所有高亮
            setTimeout(() => {
                this.highlighter.removeAll();
            }, 3000);
        }
    }

    /**
     * 填写单个字段 - 优化版
     * @param {Object} fieldInfo - 字段信息
     * @param {Object} data - 数据
     * @returns {boolean} 是否成功
     */
    async fillSingleField(fieldInfo, data) {
        const { element, fieldType, label, placeholder } = fieldInfo;

        console.log(`[ProgressiveFiller] 填写字段:`, fieldType, label || placeholder);

        // 1. 滚动到可见区域
        await DOMUtils.scrollIntoView(element);
        await DOMUtils.delay(100);

        // 2. 高亮标记（黄色）
        this.highlighter.highlight(element, 'yellow', { pulse: true });

        // 3. 获取要填写的值（可能是数组，支持分多次填充）
        const value = this.getValueForField(fieldInfo, data);

        if (value === null || value === undefined) {
            console.warn('[ProgressiveFiller] 没有找到匹配的值:', fieldType, label);
            this.highlighter.highlight(element, 'purple', { duration: 2000 });
            return false;
        }

        console.log(`[ProgressiveFiller] 值:`, value);

        // ⭐ 如果值是数组，分多次填充同一个字段（日期范围场景）
        if (Array.isArray(value)) {
            console.log(`[ProgressiveFiller] 📅 检测到数组值，将分${value.length}次填充`);

            let allSuccess = true;
            for (let i = 0; i < value.length; i++) {
                const singleValue = value[i];
                console.log(`[ProgressiveFiller] 📅 第${i + 1}/${value.length}次填充: ${singleValue}`);

                const success = await this.fillSingleValue(element, fieldInfo, singleValue);

                if (!success) {
                    allSuccess = false;
                }

                // 每次填充之间延迟
                if (i < value.length - 1) {
                    await DOMUtils.delay(500);
                }
            }

            return allSuccess;
        }

        // 单个值，正常流程
        return await this.fillSingleValue(element, fieldInfo, value);
    }

    /**
     * 填充单个值到字段（从fillField中抽取）
     * @param {HTMLElement} element
     * @param {Object} fieldInfo
     * @param {string} value
     * @returns {Promise<boolean>}
     */
    async fillSingleValue(element, fieldInfo, value) {
        console.log(`[ProgressiveFiller] 开始填充单个值: ${value}`);

        // ✅ 4. 使用智能点击（支持复杂UI框架）
        let clickResult = null;
        if (typeof SmartClicker !== 'undefined') {
            console.log('[ProgressiveFiller] 使用智能点击');
            clickResult = await SmartClicker.smartClick(element);
        } else {
            // 降级：使用传统点击
            console.log('[ProgressiveFiller] 使用传统点击');
            await EventSimulator.click(element);
            await DOMUtils.delay(this.options.delayAfterClick);
        }

        let success = false;
        let popup = clickResult?.popup || null;

        // ✅ 5. 检查是否有弹窗
        if (popup) {
            // 使用智能点击检测到的弹窗
            console.log('[ProgressiveFiller] 智能点击检测到弹窗');

            // 额外等待动画完成
            await DOMUtils.delay(200);

            // 处理弹窗
            success = await this.handlePopup(popup, value, element);
        } else {
            // 没有检测到弹窗，启动备用检测机制
            console.log('[ProgressiveFiller] 启动备用弹窗检测');

            this.domObserver.clear();
            this.domObserver.start();

            // 等待可能的DOM变化
            await this.domObserver.waitForStable(this.options.popupStableTime, 1000);
            this.domObserver.stop();

            const newElements = this.domObserver.getVisibleNewElements();

            if (newElements.length > 0) {
                // 检测到弹窗
                console.log('[ProgressiveFiller] 备用检测发现', newElements.length, '个新元素');
                popup = newElements[newElements.length - 1];

                // 智能延迟
                const popupDelay = Math.min(200, newElements.length * 100);
                await DOMUtils.delay(popupDelay);

                // 处理弹窗
                success = await this.handlePopup(popup, value, element);
            } else {
                // 没有检测到弹窗，直接填写
                console.log('[ProgressiveFiller] 未检测到弹窗，直接填写');
                success = await this.fillFieldDirect(fieldInfo, value);
            }
        }

        // 8. 验证填写结果
        if (this.options.verifyAfterFill && !success) {
            console.log('[ProgressiveFiller] 填写失败，尝试重试...');
            success = await this.retryFill(fieldInfo, value);
        }

        // ⭐ 9. 按Enter键确认（特别是时间/日期字段）
        const isDateTimeField = this.isDateTimeField(fieldInfo);
        if (isDateTimeField) {
            console.log('[ProgressiveFiller] 检测到时间/日期字段，按Enter键确认');
            await EventSimulator.pressEnter(element);
        }

        // 10. 失焦前再次检查DOM变化（可能有验证提示）
        this.domObserver.clear();
        this.domObserver.start();

        await EventSimulator.blur(element);

        await this.domObserver.waitForStable(200, 1000);
        this.domObserver.stop();

        const validationElements = this.domObserver.getVisibleNewElements();
        if (validationElements.length > 0) {
            console.log('[ProgressiveFiller] 检测到验证提示，增加延迟');
            await DOMUtils.delay(300);
        } else {
            await DOMUtils.delay(this.options.delayAfterFill);
        }

        // 10. 更新高亮状态
        if (success) {
            this.highlighter.highlight(element, 'green', { duration: 2000 });
        } else {
            this.highlighter.highlight(element, 'red', { duration: 3000 });
        }

        return success;
    }

    /**
     * 直接填写字段
     * @param {Object} fieldInfo
     * @param {*} value
     * @returns {boolean}
     */
    async fillFieldDirect(fieldInfo, value) {
        const { element, tagName, type } = fieldInfo;

        try {
            // ✅ 优先使用DataFormatter格式化值
            let formattedValue = value;
            if (typeof DataFormatter !== 'undefined' && value) {
                formattedValue = DataFormatter.smartFormat(value, fieldInfo, element);
                if (formattedValue !== value) {
                    console.log(`[ProgressiveFiller] DataFormatter格式化: "${value}" → "${formattedValue}"`);
                }
            }

            // ✅ 日期字段优先使用DatePickerHandler
            if (typeof DatePickerHandler !== 'undefined' && DatePickerHandler.isDateField(fieldInfo)) {
                console.log('[ProgressiveFiller] 检测到日期字段，使用DatePickerHandler');
                const success = await DatePickerHandler.fillDate(element, formattedValue);
                if (success) {
                    return true;
                }
                // 如果DatePickerHandler失败，继续尝试其他方法
                console.warn('[ProgressiveFiller] DatePickerHandler失败，尝试降级方案');
            }

            // SELECT 元素
            if (tagName === 'SELECT') {
                // ✅ 传递上下文信息给SelectMatcher，提高匹配准确度
                const context = {
                    fieldType: fieldInfo.fieldType,
                    label: fieldInfo.label,
                    placeholder: fieldInfo.placeholder,
                    section: fieldInfo.section
                };
                return await EventSimulator.selectOption(element, formattedValue, context);
            }

            // RADIO 元素
            if (type === 'radio') {
                const options = fieldInfo.options || [];
                const matched = options.find(opt =>
                    opt.text === formattedValue ||
                    opt.value === formattedValue ||
                    opt.text.includes(formattedValue)
                );

                if (matched && matched.element) {
                    return await EventSimulator.selectRadio(matched.element);
                }

                return false;
            }

            // CHECKBOX 元素
            if (type === 'checkbox') {
                const shouldCheck = formattedValue === true ||
                                    formattedValue === 'true' ||
                                    formattedValue === '是' ||
                                    formattedValue === 1;

                return await EventSimulator.selectCheckbox(element, shouldCheck);
            }

            // INPUT/TEXTAREA 元素
            if (tagName === 'INPUT' || tagName === 'TEXTAREA') {
                return await EventSimulator.fillByValue(element, String(formattedValue));
            }

            // ContentEditable 元素
            if (element.isContentEditable) {
                return await EventSimulator.fillByValue(element, String(formattedValue));
            }

            return false;
        } catch (error) {
            console.error('[ProgressiveFiller] fillFieldDirect 失败:', error);
            return false;
        }
    }

    /**
     * 智能重试
     * @param {Object} fieldInfo
     * @param {*} value
     * @returns {boolean}
     */
    async retryFill(fieldInfo, value) {
        const { element } = fieldInfo;

        // ✅ 格式化值
        let formattedValue = value;
        if (typeof DataFormatter !== 'undefined' && value) {
            formattedValue = DataFormatter.smartFormat(value, fieldInfo, element);
        }

        // 定义多种填写策略
        const strategies = [
            () => EventSimulator.fillByValue(element, String(formattedValue)),
            () => EventSimulator.fillByTyping(element, String(formattedValue)),
            () => EventSimulator.fillByPaste(element, String(formattedValue))
        ];

        for (let i = 0; i < this.options.maxRetries; i++) {
            console.log(`[ProgressiveFiller] 重试第 ${i + 1} 次...`);

            const strategy = strategies[i % strategies.length];

            try {
                const success = await strategy();

                if (success) {
                    await DOMUtils.delay(200);

                    // 验证
                    if (this.verifyField(element, formattedValue)) {
                        console.log('[ProgressiveFiller] 重试成功！');
                        return true;
                    }
                }
            } catch (error) {
                console.error(`[ProgressiveFiller] 重试第 ${i + 1} 次失败:`, error);
            }

            await DOMUtils.delay(300);
        }

        return false;
    }

    /**
     * 验证字段是否填写成功
     * @param {HTMLElement} element
     * @param {*} expectedValue
     * @returns {boolean}
     */
    verifyField(element, expectedValue) {
        try {
            const actualValue = this.getFieldValue(element);

            // 转换为字符串比较
            const expected = String(expectedValue).trim();
            const actual = String(actualValue).trim();

            return expected === actual;
        } catch (error) {
            return false;
        }
    }

    /**
     * 获取字段当前值
     * @param {HTMLElement} element
     * @returns {*}
     */
    getFieldValue(element) {
        if (element.tagName === 'SELECT') {
            return element.value || element.options[element.selectedIndex]?.textContent.trim();
        }

        if (element.type === 'radio' || element.type === 'checkbox') {
            return element.checked;
        }

        if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
            return element.value;
        }

        if (element.isContentEditable) {
            return element.textContent;
        }

        return '';
    }

    /**
     * 从数据中获取字段对应的值（支持数组值）
     * @param {Object} fieldInfo
     * @param {Object} data
     * @returns {*}
     */
    getValueForField(fieldInfo, data) {
        const { fieldType, label, placeholder, name, id, index } = fieldInfo;

        console.log(`[ProgressiveFiller] 🔍 getValueForField: index=${index}, fieldType="${fieldType}", label="${label}"`);

        // ⭐ 优先通过字段索引匹配（最精确）
        if (index !== undefined) {
            const uniqueKey = `__field_${index}__`;
            if (data[uniqueKey] !== undefined) {
                const value = data[uniqueKey];
                console.log(`[ProgressiveFiller] ✅ 通过索引匹配到值:`, value, `(key: ${uniqueKey})`);
                return value;
            }
        }

        // ⭐ 直接返回匹配的值（可能是字符串或数组），不要提取
        // 1. 通过 fieldType 匹配
        if (data[fieldType]) {
            const value = data[fieldType];
            console.log(`[ProgressiveFiller] ✅ 通过fieldType匹配到值:`, value, `(isArray: ${Array.isArray(value)})`);
            return value;
        }

        // 2. 通过 label 匹配
        if (label && data[label]) {
            const value = data[label];
            console.log(`[ProgressiveFiller] ✅ 通过label匹配到值:`, value, `(isArray: ${Array.isArray(value)})`);
            return value;
        }

        // 3. 通过 placeholder 匹配
        if (placeholder && data[placeholder]) {
            const value = data[placeholder];
            console.log(`[ProgressiveFiller] ✅ 通过placeholder匹配到值:`, value, `(isArray: ${Array.isArray(value)})`);
            return value;
        }

        // 4. 通过 name 匹配
        if (name && data[name]) {
            return data[name];
        }

        // 5. 通过 id 匹配
        if (id && data[id]) {
            return data[id];
        }

        // 6. 模糊匹配（例如：label包含关键词）
        for (const key in data) {
            // 跳过索引key
            if (key.startsWith('__field_')) continue;

            const lowerKey = key.toLowerCase();
            const lowerLabel = (label || '').toLowerCase();
            const lowerPlaceholder = (placeholder || '').toLowerCase();

            if (lowerLabel.includes(lowerKey) || lowerPlaceholder.includes(lowerKey)) {
                return data[key];
            }
        }

        return null;
    }

    /**
     * 处理弹窗
     * @param {HTMLElement} popup 弹窗元素
     * @param {*} value 目标值
     * @param {HTMLElement} targetField 目标字段
     * @returns {boolean} 是否成功
     */
    async handlePopup(popup, value, targetField) {
        console.log('[ProgressiveFiller] 处理弹窗...');

        try {
            // 提取弹窗中的所有选项
            const options = this.extractPopupOptions(popup);

            if (options.length === 0) {
                console.warn('[ProgressiveFiller] 弹窗中没有找到选项');
                return false;
            }

            console.log('[ProgressiveFiller] 弹窗中找到', options.length, '个选项');

            // 查找最匹配的选项
            const matchedOption = this.findBestMatch(options, value);

            if (!matchedOption) {
                console.warn('[ProgressiveFiller] 没有找到匹配的选项');
                return false;
            }

            console.log('[ProgressiveFiller] 找到匹配选项:', matchedOption.textContent.trim());

            // 点击选项
            await EventSimulator.click(matchedOption);
            await DOMUtils.delay(200);

            // 验证是否成功
            const success = this.verifyField(targetField, value);
            console.log('[ProgressiveFiller] 弹窗处理结果:', success ? '成功' : '失败');

            return success;
        } catch (error) {
            console.error('[ProgressiveFiller] 处理弹窗失败:', error);
            return false;
        }
    }

    /**
     * 提取弹窗中的选项
     * @param {HTMLElement} popup 弹窗元素
     * @returns {HTMLElement[]} 选项元素列表
     */
    extractPopupOptions(popup) {
        const options = [];

        // 查找所有可能的选项元素
        const candidates = popup.querySelectorAll('li, div, span, a, button, td');

        for (const element of candidates) {
            // 过滤：必须可见且包含文本
            if (!DOMUtils.isVisible || !DOMUtils.isVisible(element)) {
                continue;
            }

            const text = element.textContent.trim();
            if (!text || text.length > 100) {
                continue;
            }

            // 避免嵌套重复（只保留叶子节点）
            const hasChildOption = Array.from(candidates).some(c =>
                c !== element && element.contains(c) &&
                DOMUtils.isVisible && DOMUtils.isVisible(c)
            );

            if (!hasChildOption) {
                options.push(element);
            }
        }

        return options;
    }

    /**
     * 查找最匹配的选项
     * @param {HTMLElement[]} options 选项列表
     * @param {*} targetValue 目标值
     * @returns {HTMLElement|null} 最匹配的选项
     */
    findBestMatch(options, targetValue) {
        const target = String(targetValue).trim().toLowerCase();

        // 1. 精确匹配
        for (const option of options) {
            const text = option.textContent.trim().toLowerCase();
            if (text === target) {
                return option;
            }
        }

        // 2. 包含匹配
        for (const option of options) {
            const text = option.textContent.trim().toLowerCase();
            if (text.includes(target) || target.includes(text)) {
                return option;
            }
        }

        // 3. 模糊匹配（编辑距离）
        let bestMatch = null;
        let bestScore = Infinity;

        for (const option of options) {
            const text = option.textContent.trim().toLowerCase();
            const score = this.levenshteinDistance(text, target);

            if (score < bestScore) {
                bestScore = score;
                bestMatch = option;
            }
        }

        // 只有编辑距离不太大时才返回
        if (bestScore <= target.length / 2) {
            return bestMatch;
        }

        return null;
    }

    /**
     * 计算编辑距离（Levenshtein Distance）
     */
    levenshteinDistance(str1, str2) {
        const matrix = [];

        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }

        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }

        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1, // substitution
                        matrix[i][j - 1] + 1,     // insertion
                        matrix[i - 1][j] + 1      // deletion
                    );
                }
            }
        }

        return matrix[str2.length][str1.length];
    }

    /**
     * 通知进度
     */
    notifyProgress(current, total, field) {
        if (this.onProgress) {
            this.onProgress({
                current,
                total,
                percentage: Math.round((current / total) * 100),
                field
            });
        }
    }

    /**
     * 暂停
     */
    pause() {
        this.isPaused = true;
        console.log('[ProgressiveFiller] 已暂停');
    }

    /**
     * 继续
     */
    resume() {
        this.isPaused = false;
        console.log('[ProgressiveFiller] 已继续');
    }

    /**
     * 停止
     */
    stop() {
        this.isRunning = false;
        this.isPaused = false;
        console.log('[ProgressiveFiller] 已停止');
    }

    /**
     * 判断是否是时间/日期字段
     * @param {Object} fieldInfo
     * @returns {boolean}
     */
    isDateTimeField(fieldInfo) {
        const { fieldType, label, placeholder, type, name } = fieldInfo;

        // 1. 通过fieldType判断
        if (fieldType) {
            const dateTypes = [
                'date', 'time', 'datetime', 'period',
                'startDate', 'endDate', 'birthday',
                'educationStartDate', 'educationEndDate',
                'workStartDate', 'workEndDate',
                'projectStartDate', 'projectEndDate'
            ];
            if (dateTypes.includes(fieldType)) {
                return true;
            }
        }

        // 2. 通过input type判断
        if (type) {
            const dateInputTypes = ['date', 'datetime', 'datetime-local', 'month', 'week', 'time'];
            if (dateInputTypes.includes(type)) {
                return true;
            }
        }

        // 3. 通过label/placeholder/name中的关键词判断
        const dateKeywords = [
            '时间', '日期', '年月', '年份', '月份',
            '入学', '毕业', '入职', '离职',
            '开始', '结束', '起止', '起始',
            '出生', '生日', '创建', '更新',
            'time', 'date', 'period', 'year', 'month',
            'start', 'end', 'begin', 'finish',
            'birth', 'graduation'
        ];

        const combinedText = `${label || ''} ${placeholder || ''} ${name || ''}`.toLowerCase();

        return dateKeywords.some(keyword => combinedText.includes(keyword.toLowerCase()));
    }

    /**
     * 销毁
     */
    destroy() {
        this.stop();
        this.highlighter.destroy();
        this.domObserver.destroy();
        console.log('[ProgressiveFiller] 已销毁');
    }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProgressiveFiller;
}
