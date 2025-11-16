/**
 * AI服务 - 两阶段AI调用架构
 * 采用优化后的两阶段AI调用架构，大幅简化匹配逻辑
 *
 * 阶段1: analyzePage - 分析HTML，提取字段结构，返回sessionId
 * 阶段2: fillValues - 基于sessionId和简历JSON，AI直接生成填充值
 */

class AIService {
    constructor(config = {}) {
        this.config = {
            baseURL: config.baseURL || (window.CONFIG ? window.CONFIG.getApiBaseUrl() : 'http://localhost:8080'),
            timeout: config.timeout || 30000,
            ...config
        };

        this.cache = new Map(); // 缓存结果
        this.sessionId = null;  // 当前会话ID
    }

    /**
     * 【阶段1】分析页面HTML并提取字段结构
     * @param {Object} params
     * @returns {Promise<Object>}
     */
    async analyzePage(params) {
        const {
            url,
            html,
            companyName,
            positionName
        } = params;

        console.log('[AIService] ========== 阶段1：分析页面HTML ==========');
        console.log(`[AIService] URL: ${url}`);
        console.log(`[AIService] HTML长度: ${html ? html.length : 0} 字符`);

        try {
            const response = await this.callAPI('/api/autofill/analyze-page', {
                method: 'POST',
                body: JSON.stringify({
                    html: html || document.documentElement.outerHTML,
                    url: url || window.location.href,
                    company: companyName || '',
                    position: positionName || ''
                })
            });

            console.log('[AIService] ✅ 页面分析完成');
            console.log(`[AIService] SessionID: ${response.sessionId}`);
            console.log(`[AIService] Sections数量: ${response.sections ? response.sections.length : 0}`);

            if (!response.success) {
                throw new Error(`API返回失败: ${response.message || 'Unknown error'}`);
            }

            // 保存sessionId
            this.sessionId = response.sessionId;

            return {
                sessionId: response.sessionId,
                sections: response.sections || [],
                source: 'ai'
            };

        } catch (error) {
            console.error('[AIService] ❌ 页面分析失败:', error);

            // 降级：返回空结构
            return {
                sessionId: '',
                sections: [],
                source: 'error',
                error: error.message
            };
        }
    }

    /**
     * 【阶段2】基于sessionId和简历JSON，AI生成填充值
     * @param {Object} params
     * @returns {Promise<Object>}
     */
    async fillValues(params) {
        const {
            sessionId,
            fields,
            resumeData,
            companyName,
            positionName
        } = params;

        console.log('[AIService] ========== 阶段2：AI生成填充值 ==========');
        console.log(`[AIService] SessionID: ${sessionId}`);
        console.log(`[AIService] 字段数量: ${fields ? fields.length : 0}`);

        try {
            const response = await this.callAPI('/api/autofill/fill-values', {
                method: 'POST',
                body: JSON.stringify({
                    sessionId: sessionId || this.sessionId,
                    fields: fields || [],
                    resumeData: resumeData || {},
                    company: companyName || '',
                    position: positionName || ''
                })
            });

            console.log('[AIService] ✅ 填充值生成完成');

            if (!response.success) {
                throw new Error(`API返回失败: ${response.message || 'Unknown error'}`);
            }

            const matches = response.matches || [];
            console.log(`[AIService] 成功生成 ${matches.length} 个section的匹配值`);

            // 转换为前端需要的格式
            const formattedMatches = this.formatMatches(matches);

            return {
                matches: formattedMatches,
                source: 'ai'
            };

        } catch (error) {
            console.error('[AIService] ❌ 填充值生成失败:', error);

            // 降级：返回空匹配
            return {
                matches: [],
                source: 'error',
                error: error.message
            };
        }
    }

    /**
     * 【完整流程】分析并匹配（兼容旧接口）
     * @param {Object} params
     * @returns {Promise<Object>}
     */
    async analyzeAndMatch(params) {
        const {
            url,
            fields,
            resumeId,
            companyName,
            positionName
        } = params;

        console.log('[AIService] ========== 完整流程：分析+匹配 ==========');

        try {
            // 步骤1: 分析页面（传递完整HTML）
            const analyzeResult = await this.analyzePage({
                url: url || window.location.href,
                html: document.documentElement.outerHTML,  // ✅ 传递完整HTML
                companyName,
                positionName
            });

            if (!analyzeResult.sessionId) {
                console.warn('[AIService] 页面分析失败，使用本地降级方案');
                return this.fallbackMatch(fields);
            }

            // 步骤2: 获取简历数据
            const resumeData = await this.getResumeData(resumeId);

            if (!resumeData || Object.keys(resumeData).length === 0) {
                console.warn('[AIService] 简历数据为空');
                return this.fallbackMatch(fields);
            }

            // 步骤3: 丰富字段信息（添加items下拉选项）
            const enrichedFields = this.enrichFieldsWithOptions(fields);

            // 步骤4: AI生成填充值
            const fillResult = await this.fillValues({
                sessionId: analyzeResult.sessionId,
                fields: enrichedFields,
                resumeData,
                companyName,
                positionName
            });

            console.log('[AIService] ========== 完整流程完成 ==========');
            console.log(`[AIService] 最终匹配数: ${fillResult.matches.length}`);

            return fillResult;

        } catch (error) {
            console.error('[AIService] ❌ 完整流程失败:', error);
            return this.fallbackMatch(fields);
        }
    }

    /**
     * 格式化AI返回的matches为前端需要的格式
     * @param {Array} matches - AI返回的matches
     * @returns {Array}
     */
    formatMatches(matches) {
        const result = [];

        for (const section of matches) {
            for (const field of section.fields) {
                result.push({
                    fieldIndex: -1,  // 后续由FieldScanner分配
                    sectionName: section.sectionName,
                    fieldName: field.fieldName,
                    value: field.value,
                    confidence: 0.9,
                    source: 'ai'
                });
            }
        }

        return result;
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
     * 获取简历数据（优先从后端，降级到本地）
     * @param {string|null} resumeId
     * @returns {Promise<Object>}
     */
    async getResumeData(resumeId) {
        try {
            // 验证 resumeId 是否是有效的数字
            const isValidResumeId = resumeId && !isNaN(parseInt(resumeId)) && parseInt(resumeId) > 0;

            // 如果提供了有效的 resumeId，尝试从后端获取
            if (isValidResumeId) {
                console.log('[AIService] 尝试获取指定简历:', resumeId);
                try {
                    const response = await this.callAPI(`/api/autofill/resume/${resumeId}`);
                    if (response.success && response.data) {
                        console.log('[AIService] ✅ 使用指定简历数据');
                        // 缓存到本地
                        await this.cacheResumeData(response.data);
                        return response.data;
                    }
                } catch (error) {
                    console.warn('[AIService] 获取指定简历失败，尝试获取默认简历:', error.message);
                }
            } else if (resumeId) {
                console.warn('[AIService] ⚠️ resumeId 格式无效（不是有效数字）:', resumeId, '，将使用默认简历');
            }

            // 尝试获取默认简历
            console.log('[AIService] 尝试获取默认简历');
            const defaultResponse = await this.callAPI('/api/autofill/resume/default');
            if (defaultResponse.success && defaultResponse.data) {
                console.log('[AIService] ✅ 使用默认简历数据');
                // 缓存到本地
                await this.cacheResumeData(defaultResponse.data);
                return defaultResponse.data;
            }

            throw new Error('无法获取简历数据');
        } catch (error) {
            console.warn('[AIService] 后端获取简历失败，尝试使用本地缓存:', error.message);
            const localData = await this.getLocalResumeData();
            if (localData) {
                console.log('[AIService] ✅ 使用本地缓存的简历数据');
                return localData;
            }
            throw new Error('无法获取简历数据：后端和本地缓存都失败');
        }
    }

    /**
     * 缓存简历数据到本地
     * @param {Object} data
     * @returns {Promise<void>}
     */
    async cacheResumeData(data) {
        return new Promise((resolve) => {
            try {
                chrome.storage.local.set({ resume_data: data }, () => {
                    console.log('[AIService] 简历数据已缓存');
                    resolve();
                });
            } catch (error) {
                console.error('[AIService] 缓存简历数据失败:', error);
                resolve();
            }
        });
    }

    /**
     * 获取本地简历数据
     * @returns {Promise<Object>}
     */
    async getLocalResumeData() {
        return new Promise((resolve) => {
            try {
                chrome.storage.local.get(['resume_data'], (result) => {
                    if (result.resume_data) {
                        console.log('[AIService] 使用缓存的简历数据');
                        resolve(result.resume_data);
                    } else {
                        console.warn('[AIService] 未找到缓存的简历数据');
                        resolve(null);
                    }
                });
            } catch (error) {
                console.error('[AIService] 获取简历数据失败:', error);
                resolve(null);
            }
        });
    }

    /**
     * 降级方案：本地规则匹配
     * @param {Array} fields
     * @returns {Promise<Object>}
     */
    async fallbackMatch(fields) {
        console.log('[AIService] 执行本地降级匹配...');

        const matches = [];
        const localResume = await this.getLocalResumeData();

        if (!localResume) {
            console.warn('[AIService] 本地简历数据不存在');
            return { matches: [], source: 'error' };
        }

        // 定义字段类型的关键词映射
        const fieldTypeKeywords = {
            name: ['姓名', '名字', 'name'],
            phone: ['手机', '电话', 'phone', 'mobile'],
            email: ['邮箱', 'email'],
            gender: ['性别', 'gender'],
            birthday: ['出生', '生日', 'birthday'],
            school: ['学校', 'school', 'university'],
            major: ['专业', 'major'],
            education: ['学历', 'education', 'degree'],
            company: ['公司', 'company'],
            position: ['职位', 'position', 'title']
        };

        for (let i = 0; i < fields.length; i++) {
            const field = fields[i];
            let fieldType = field.fieldType;

            // 如果字段类型未知，通过关键词匹配
            if (!fieldType || fieldType === 'unknown') {
                const label = (field.label || '').toLowerCase();
                const placeholder = (field.placeholder || '').toLowerCase();
                const name = (field.name || '').toLowerCase();
                const combinedText = `${label} ${placeholder} ${name}`;

                for (const [type, keywords] of Object.entries(fieldTypeKeywords)) {
                    if (keywords.some(keyword => combinedText.includes(keyword.toLowerCase()))) {
                        fieldType = type;
                        break;
                    }
                }
            }

            // 如果找到字段类型且简历中有对应数据
            if (fieldType && localResume[fieldType]) {
                matches.push({
                    fieldIndex: i,
                    fieldType,
                    value: localResume[fieldType],
                    confidence: 0.7,
                    source: 'local'
                });
            }
        }

        console.log(`[AIService] 本地匹配完成，匹配了 ${matches.length} 个字段`);

        return {
            matches,
            source: 'local'
        };
    }

    /**
     * 调用后端API
     * @param {string} endpoint
     * @param {Object} options
     * @returns {Promise<Object>}
     */
    async callAPI(endpoint, options = {}) {
        const url = this.config.baseURL + endpoint;

        const defaultOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: this.config.timeout
        };

        const finalOptions = {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...options.headers
            }
        };

        // 添加认证token
        const token = await this.getAuthToken();
        if (token) {
            finalOptions.headers['Authorization'] = `Bearer ${token}`;
        }

        console.log('[AIService] 发送请求:', finalOptions.method, url);

        try {
            const response = await fetch(url, finalOptions);

            // 处理401错误（Token过期）
            if (response.status === 401) {
                const data = await response.json();
                if (data.needRefresh) {
                    console.log('[AIService] Token过期，尝试刷新...');

                    // 尝试刷新Token
                    const refreshed = await this.refreshAuthToken();
                    if (refreshed) {
                        // 重试请求
                        const newToken = await this.getAuthToken();
                        if (newToken) {
                            finalOptions.headers['Authorization'] = `Bearer ${newToken}`;
                        }

                        const retryResponse = await fetch(url, finalOptions);
                        if (!retryResponse.ok) {
                            throw new Error(`HTTP ${retryResponse.status}: ${retryResponse.statusText}`);
                        }

                        return await retryResponse.json();
                    }
                }

                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('[AIService] API调用失败:', error);
            throw error;
        }
    }

    /**
     * 获取认证token
     * @returns {Promise<string|null>}
     */
    async getAuthToken() {
        return new Promise((resolve) => {
            try {
                chrome.storage.local.get(['access_token'], (result) => {
                    resolve(result.access_token || null);
                });
            } catch (error) {
                console.error('[AIService] 获取token失败:', error);
                resolve(null);
            }
        });
    }

    /**
     * 刷新认证Token
     * @returns {Promise<boolean>}
     */
    async refreshAuthToken() {
        try {
            // 在content script中，使用消息通信请求popup刷新token
            return new Promise((resolve) => {
                chrome.runtime.sendMessage(
                    { type: 'REFRESH_TOKEN' },
                    (response) => {
                        if (chrome.runtime.lastError) {
                            console.error('[AIService] Token刷新失败:', chrome.runtime.lastError);
                            resolve(false);
                        } else {
                            resolve(response && response.success);
                        }
                    }
                );
            });
        } catch (error) {
            console.error('[AIService] Token刷新异常:', error);
            return false;
        }
    }

    /**
     * 清除缓存
     */
    clearCache() {
        this.cache.clear();
        this.sessionId = null;
        console.log('[AIService] 缓存已清除');
    }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AIService;
}
