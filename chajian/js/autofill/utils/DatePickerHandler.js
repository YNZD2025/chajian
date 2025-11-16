/**
 * 日期选择器处理器
 * 支持多种常见日期控件和格式
 *
 * 参考求职方舟的日期处理逻辑，支持：
 * 1. 标准日期输入框 (type="date")
 * 2. My97DatePicker 日期控件
 * 3. 自定义日期选择器（年-月、年月日、时间范围等）
 * 4. 多种日期格式（2023-05、2023年5月、至今等）
 */

class DatePickerHandler {
    /**
     * 尝试填写日期字段
     * @param {HTMLElement} element - 日期输入框元素
     * @param {string} value - 日期值（如 "2023-05"、"2023-01-15"、"至今"）
     * @returns {Promise<boolean>} 是否成功填写
     */
    static async fillDate(element, value) {
        console.log('[DatePickerHandler] 尝试填写日期:', value);

        if (!value) {
            console.warn('[DatePickerHandler] 日期值为空');
            return false;
        }

        // 标准化日期值
        const normalizedValue = this.normalizeDate(value);
        console.log('[DatePickerHandler] 标准化后:', normalizedValue);

        try {
            // 策略1: 标准HTML5日期输入框
            if (element.type === 'date' || element.type === 'month') {
                return await this.fillStandardDateInput(element, normalizedValue);
            }

            // 策略2: 检查是否是My97DatePicker
            if (this.isMy97DatePicker(element)) {
                return await this.fillMy97DatePicker(element, normalizedValue);
            }

            // 策略3: 自定义日期选择器（点击触发弹窗）
            const success = await this.fillCustomDatePicker(element, normalizedValue);
            if (success) {
                return true;
            }

            // 策略4: 直接输入（最后的降级方案）
            return await this.fillDirectInput(element, normalizedValue);
        } catch (error) {
            console.error('[DatePickerHandler] 填写日期失败:', error);
            return false;
        }
    }

    /**
     * 标准化日期字符串
     * @param {string} dateStr - 原始日期字符串
     * @returns {Object} { year, month, day, raw, isPresent }
     */
    static normalizeDate(dateStr) {
        const str = String(dateStr).trim();

        // 特殊值：至今
        if (/^(至今|现在|目前|在职)$/.test(str)) {
            const now = new Date();
            return {
                year: now.getFullYear(),
                month: now.getMonth() + 1,
                day: now.getDate(),
                raw: str,
                isPresent: true
            };
        }

        // 解析各种日期格式
        const patterns = [
            // YYYY-MM-DD
            /^(\d{4})[^\d]*(\d{1,2})[^\d]*(\d{1,2})$/,
            // YYYY-MM
            /^(\d{4})[^\d]*(\d{1,2})$/,
            // YYYY
            /^(\d{4})$/
        ];

        for (const pattern of patterns) {
            const match = str.match(pattern);
            if (match) {
                return {
                    year: parseInt(match[1]),
                    month: match[2] ? parseInt(match[2]) : null,
                    day: match[3] ? parseInt(match[3]) : null,
                    raw: str,
                    isPresent: false
                };
            }
        }

        // ⭐⭐⭐ 【新增】前端兜底方案：解析只有月份的情况
        // 如果后端返回了不完整的值（如 "04月"、"9月"），前端尝试智能补全
        const monthOnlyPattern = /^(\d{1,2})月?$/;
        const monthMatch = str.match(monthOnlyPattern);
        if (monthMatch) {
            const month = parseInt(monthMatch[1]);
            if (month >= 1 && month <= 12) {
                const currentYear = new Date().getFullYear();

                console.warn('[DatePickerHandler] ⚠️ 检测到只有月份的日期值:', str);
                console.warn('[DatePickerHandler] 使用当前年份进行补全:', currentYear);
                console.warn('[DatePickerHandler] 💡 建议：优化后端AI提示词，确保返回完整的YYYY-MM格式');

                return {
                    year: currentYear,
                    month: month,
                    day: null,
                    raw: str,
                    isPresent: false
                };
            }
        }

        console.warn('[DatePickerHandler] 无法解析日期:', str);
        return {
            year: null,
            month: null,
            day: null,
            raw: str,
            isPresent: false
        };
    }

    /**
     * 填写自定义日期选择器（核心实现）
     * @param {HTMLElement} element
     * @param {Object} dateObj
     * @returns {Promise<boolean>}
     */
    static async fillCustomDatePicker(element, dateObj) {
        console.log('[DatePickerHandler] 策略3: 尝试处理自定义日期选择器');

        // 1. 模拟点击以触发弹窗
        await EventSimulator.click(element);
        await DOMUtils.delay(300); // 等待弹窗动画

        // 2. 查找弹窗
        const popup = await this.findDatePickerPopup();
        if (!popup) {
            console.warn('[DatePickerHandler] 未找到日期选择弹窗');
            return false;
        }

        console.log('[DatePickerHandler] ✅ 找到日期弹窗:', popup);

        try {
            // 3. 处理“至今”
            if (dateObj.isPresent) {
                const success = await this.selectInPopup(popup, ['至今', '现在']);
                if (success) {
                    console.log('[DatePickerHandler] ✅ 已选择“至今”');
                    // 选择“至今”后通常会自动关闭，或需要点击确认
                    await this.confirmSelection(popup);
                    return true;
                }
            }

            // 4. 选择年、月、日
            if (dateObj.year) {
                const yearSuccess = await this.selectInPopup(popup, [String(dateObj.year), `${dateObj.year}年`]);
                if (!yearSuccess) {
                    console.warn(`[DatePickerHandler] 未能在弹窗中找到年份: ${dateObj.year}`);
                    // 可以在这里添加点击“上一年/下一年”的逻辑
                } else {
                    await DOMUtils.delay(200); // 等待月份面板更新
                }
            }

            if (dateObj.month) {
                const monthSuccess = await this.selectInPopup(popup, [
                    `${dateObj.month}月`,
                    String(dateObj.month).padStart(2, '0'),
                    this.getMonthShortName(dateObj.month) // 如 "Jan", "Feb"
                ]);
                if (!monthSuccess) {
                    console.warn(`[DatePickerHandler] 未能在弹窗中找到月份: ${dateObj.month}`);
                } else {
                    await DOMUtils.delay(200); // 等待日期面板更新
                }
            }

            if (dateObj.day) {
                const daySuccess = await this.selectInPopup(popup, [String(dateObj.day), String(dateObj.day).padStart(2, '0')]);
                if (!daySuccess) {
                    console.warn(`[DatePickerHandler] 未能在弹窗中找到日期: ${dateObj.day}`);
                }
            }

            // 5. 点击确认按钮
            await this.confirmSelection(popup);

            // 6. 验证结果
            // 这是一个简化的验证，实际场景可能更复杂
            await DOMUtils.delay(300);
            const finalValue = element.value || element.textContent;
            return finalValue.includes(dateObj.year);

        } catch (error) {
            console.error('[DatePickerHandler] 处理自定义日期选择器时出错:', error);
            return false;
        } finally {
            // 尝试关闭弹窗（如果还存在）
            const finalPopup = await this.findDatePickerPopup();
            if (finalPopup) {
                await this.confirmSelection(finalPopup, ['取消', '关闭']);
            }
        }
    }

    /**
     * 查找当前页面上最可能是日期选择器的弹窗元素
     * @returns {Promise<HTMLElement|null>}
     */
    static async findDatePickerPopup() {
        const keywords = ['date-picker', 'calendar', 'datepicker', 'date-panel', 'el-picker-panel'];
        const selectors = keywords.map(k => `[class*="${k}"]`).join(', ');

        // 查找可见的、z-index较高的元素
        const popups = Array.from(document.querySelectorAll(selectors)).filter(el => {
            const style = window.getComputedStyle(el);
            return style.display !== 'none' && style.visibility !== 'hidden' && parseFloat(style.zIndex) > 0;
        });

        if (popups.length === 0) return null;

        // 返回z-index最高的那个
        return popups.sort((a, b) => {
            return parseFloat(window.getComputedStyle(b).zIndex) - parseFloat(window.getComputedStyle(a).zIndex);
        })[0];
    }

    /**
     * 在弹窗内查找并点击包含指定文本的元素
     * @param {HTMLElement} popup
     * @param {Array<string>} texts - 要查找的文本数组
     * @returns {Promise<boolean>}
     */
    static async selectInPopup(popup, texts) {
        for (const text of texts) {
            const target = DOMUtils.findVisibleElementByText(popup, text, {
                exact: text.length > 2, // 对长文本使用精确匹配
                tagName: ['div', 'span', 'td', 'th', 'a', 'li', 'button']
            });

            if (target) {
                console.log(`[DatePickerHandler] 找到并点击: "${text}"`);
                await EventSimulator.click(target);
                return true;
            }
        }
        return false;
    }

    /**
     * 点击弹窗中的确认/完成按钮
     * @param {HTMLElement} popup
     * @param {Array<string>} [customTexts=null]
     * @returns {Promise<void>}
     */
    static async confirmSelection(popup, customTexts = null) {
        const confirmTexts = customTexts || ['确认', '确定', '完成', 'OK'];
        await this.selectInPopup(popup, confirmTexts);
        await DOMUtils.delay(200);
    }

    /**
     * 获取月份的英文缩写
     * @param {number} month
     * @returns {string}
     */
    static getMonthShortName(month) {
        const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return names[month - 1] || '';
    }

    /**
     * 填写标准HTML5日期输入框
     * @param {HTMLElement} element
     * @param {Object} dateObj
     * @returns {Promise<boolean>}
     */
    static async fillStandardDateInput(element, dateObj) {
        const { year, month, day } = dateObj;

        if (!year) {
            console.warn('[DatePickerHandler] 年份缺失，无法填写');
            return false;
        }

        let formattedValue;
        if (element.type === 'month') {
            // 月份输入框：YYYY-MM
            if (!month) return false;
            formattedValue = `${year}-${String(month).padStart(2, '0')}`;
        } else if (element.type === 'date') {
            // 日期输入框：YYYY-MM-DD
            if (!month || !day) {
                // 如果缺少月份或日期，默认使用01
                formattedValue = `${year}-${String(month || 1).padStart(2, '0')}-${String(day || 1).padStart(2, '0')}`;
            } else {
                formattedValue = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            }
        }

        console.log('[DatePickerHandler] 填写标准日期输入框:', formattedValue);

        // 设置值并触发事件
        element.value = formattedValue;
        await EventSimulator.triggerEvents(element, ['input', 'change', 'blur']);

        return element.value === formattedValue;
    }

    /**
     * 检查是否是My97DatePicker
     * @param {HTMLElement} element
     * @returns {boolean}
     */
    static isMy97DatePicker(element) {
        // My97DatePicker通常有以下特征
        const hasOnClick = element.onclick || element.getAttribute('onclick');
        const hasClass = /WdatePicker|datepicker/i.test(element.className);
        const hasReadOnly = element.readOnly;

        return hasOnClick && hasClass && hasReadOnly;
    }

    /**
     * 填写My97DatePicker
     * @param {HTMLElement} element
     * @param {Object} dateObj
     * @returns {Promise<boolean>}
     */
    static async fillMy97DatePicker(element, dateObj) {
        const { year, month, day } = dateObj;

        if (!year) return false;

        // My97通常需要特定格式
        let formattedValue;
        if (month && day) {
            formattedValue = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        } else if (month) {
            formattedValue = `${year}-${String(month).padStart(2, '0')}`;
        } else {
            formattedValue = String(year);
        }

        console.log('[DatePickerHandler] 填写My97DatePicker:', formattedValue);

        // 直接设置值
        element.value = formattedValue;

        // 触发My97的内部更新
        if (typeof element.$dp !== 'undefined') {
            element.$dp.hide();
        }

        await EventSimulator.triggerEvents(element, ['input', 'change', 'blur']);

        return element.value === formattedValue;
    }

    /**
     * 直接输入（降级方案）
     * @param {HTMLElement} element
     * @param {Object} dateObj
     * @returns {Promise<boolean>}
     */
    static async fillDirectInput(element, dateObj) {
        const { year, month, day, raw } = dateObj;

        // 尝试多种格式
        const formats = [];

        if (year && month && day) {
            formats.push(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
            formats.push(`${year}年${month}月${day}日`);
            formats.push(`${year}/${month}/${day}`);
            formats.push(`${year}.${month}.${day}`);
        } else if (year && month) {
            formats.push(`${year}-${String(month).padStart(2, '0')}`);
            formats.push(`${year}年${month}月`);
            formats.push(`${year}/${month}`);
        } else if (year) {
            formats.push(String(year));
        }

        // 如果是"至今"，添加到格式列表
        if (dateObj.isPresent) {
            formats.unshift('至今', '现在', '目前');
        }

        // 如果有原始值，也尝试使用
        if (raw) {
            formats.unshift(raw);
        }

        console.log('[DatePickerHandler] 尝试直接输入，格式:', formats);

        for (const format of formats) {
            element.value = format;

            // 触发input和change事件
            await EventSimulator.triggerEvents(element, ['input', 'change']);
            await DOMUtils.delay(50);

            // ⭐ 关键修复：模拟按Enter键确认（参考求职方舟）
            const enterEvent = new KeyboardEvent('keydown', {
                key: 'Enter',
                code: 'Enter',
                keyCode: 13,
                which: 13,
                bubbles: true,
                cancelable: true
            });
            element.dispatchEvent(enterEvent);

            const enterUpEvent = new KeyboardEvent('keyup', {
                key: 'Enter',
                code: 'Enter',
                keyCode: 13,
                which: 13,
                bubbles: true,
                cancelable: true
            });
            element.dispatchEvent(enterUpEvent);

            console.log('[DatePickerHandler] ⌨️ 已模拟Enter键');

            // 触发blur
            await EventSimulator.triggerEvents(element, ['blur']);
            await DOMUtils.delay(200);

            // 检查是否成功
            if (element.value === format || element.value) {
                console.log('[DatePickerHandler] ✅ 直接输入成功:', format);
                return true;
            }
        }

        console.warn('[DatePickerHandler] 直接输入失败');
        return false;
    }

    /**
     * 判断字段是否是日期字段
     * @param {Object} fieldInfo - 字段信息
     * @returns {boolean}
     */
    static isDateField(fieldInfo) {
        const { type, fieldType, label, placeholder } = fieldInfo;

        // 通过input type判断
        if (type === 'date' || type === 'month') {
            return true;
        }

        // 通过fieldType判断
        if (/date|time|birthday|入职|毕业|开始|结束/i.test(fieldType || '')) {
            return true;
        }

        // 通过label或placeholder判断
        const combined = `${label} ${placeholder}`.toLowerCase();
        if (/日期|时间|年月|date|time|birthday|入职|毕业|开始|结束/i.test(combined)) {
            return true;
        }

        return false;
    }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DatePickerHandler;
}
