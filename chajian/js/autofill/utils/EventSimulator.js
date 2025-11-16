/**
 * 事件模拟器 - 优化版
 * 完全模拟真实用户的点击、输入、聚焦等操作
 *
 * 核心改进：
 * 1. ✅ 正确的事件触发顺序：mousedown → focus → mouseup → click
 * 2. ✅ 向上查找可点击的父元素
 * 3. ✅ 避免二次点击问题
 * 4. ✅ 智能延迟控制
 * 5. ✅ 更真实的事件参数
 */

class EventSimulator {
    /**
     * 模拟点击元素（完整版 - 包含focus）
     * @param {HTMLElement} element 要点击的元素
     * @param {Object} options 事件选项
     * @returns {Promise<boolean>} 是否成功
     */
    static async click(element, options = {}) {
        if (!element) {
            console.warn('[EventSimulator] 点击失败: 元素不存在');
            return false;
        }

        try {
            // 1. 滚动到可见区域（优先使用scrollIntoViewIfNeeded）
            if (typeof element.scrollIntoViewIfNeeded === 'function') {
                element.scrollIntoViewIfNeeded();
            } else {
                element.scrollIntoView({ block: 'center', behavior: 'instant' });
            }
            await this.delay(50);

            // 2. 找到实际可点击的元素
            let targetElement = element;

            // 检查元素是否可见且可点击
            if (element.offsetWidth > 0 && element.offsetHeight > 0 &&
                window.getComputedStyle(element).visibility !== 'hidden') {

                const rect = element.getBoundingClientRect();
                const x = rect.left + rect.width / 2;
                const y = rect.top + rect.height / 2;

                // 获取该坐标点的实际元素
                const elementAtPoint = document.elementFromPoint(x, y);

                // 如果被遮挡，判断是否使用遮挡元素
                if (elementAtPoint && elementAtPoint !== element) {
                    const isRelated = element.contains(elementAtPoint) ||
                                      elementAtPoint.contains(element) ||
                                      element.parentNode === elementAtPoint.parentNode;

                    if (isRelated) {
                        targetElement = elementAtPoint;
                    }
                }
            }

            // 3. ✅ 向上查找真正可点击的元素（关键优化！）
            let clickableElement = targetElement;
            while (clickableElement && typeof clickableElement.click !== 'function') {
                clickableElement = clickableElement.parentElement;
                if (!clickableElement || clickableElement === document.body) {
                    clickableElement = targetElement;
                    break;
                }
            }

            // 4. ✅ 完整的事件序列（严格按照真实用户行为）
            const eventOptions = {
                bubbles: true,
                cancelable: true,
                view: window,
                detail: 1,  // 点击次数
                ...options
            };

            // mousedown 事件
            clickableElement.dispatchEvent(new MouseEvent('mousedown', eventOptions));

            // ✅✅✅ 关键：focus事件在mousedown之后、mouseup之前
            if (typeof clickableElement.focus === 'function') {
                clickableElement.focus();
            }
            clickableElement.dispatchEvent(new FocusEvent('focus', {
                bubbles: true,
                cancelable: true,
                view: window
            }));

            // mouseup 事件
            clickableElement.dispatchEvent(new MouseEvent('mouseup', eventOptions));

            // click 事件
            clickableElement.dispatchEvent(new MouseEvent('click', eventOptions));

            // 短暂延迟让事件传播完成
            await this.delay(10);

            console.log('[EventSimulator] 点击成功:', clickableElement.tagName, clickableElement.className);
            return true;
        } catch (error) {
            console.error('[EventSimulator] 点击失败:', error);
            return false;
        }
    }

    /**
     * 模拟聚焦（不包含点击）
     * @param {HTMLElement} element 要聚焦的元素
     * @returns {Promise<boolean>} 是否成功
     */
    static async focus(element) {
        if (!element) return false;

        try {
            // ❌ 注意：这里不调用click，避免二次点击
            // 只触发focus事件
            if (typeof element.focus === 'function') {
                element.focus();
            }

            element.dispatchEvent(new FocusEvent('focus', {
                bubbles: true,
                cancelable: true,
                view: window
            }));

            await this.delay(50);
            return true;
        } catch (error) {
            console.error('[EventSimulator] 聚焦失败:', error);
            return false;
        }
    }

    /**
     * 模拟失焦
     * @param {HTMLElement} element 要失焦的元素
     * @returns {Promise<boolean>} 是否成功
     */
    static async blur(element) {
        if (!element) return false;

        try {
            if (typeof element.blur === 'function') {
                element.blur();
            }

            element.dispatchEvent(new FocusEvent('blur', {
                bubbles: true,
                cancelable: true,
                view: window
            }));

            await this.delay(50);
            return true;
        } catch (error) {
            console.error('[EventSimulator] 失焦失败:', error);
            return false;
        }
    }

    /**
     * ⭐ 模拟按Enter键（用于确认输入）
     * @param {HTMLElement} element 要按Enter的元素
     * @returns {Promise<boolean>} 是否成功
     */
    static async pressEnter(element) {
        if (!element) return false;

        try {
            console.log('[EventSimulator] 模拟按Enter键');

            // keydown 事件
            element.dispatchEvent(new KeyboardEvent('keydown', {
                key: 'Enter',
                code: 'Enter',
                keyCode: 13,
                which: 13,
                bubbles: true,
                cancelable: true
            }));

            await this.delay(50);

            // keypress 事件（某些网站需要）
            element.dispatchEvent(new KeyboardEvent('keypress', {
                key: 'Enter',
                code: 'Enter',
                keyCode: 13,
                which: 13,
                bubbles: true,
                cancelable: true
            }));

            await this.delay(50);

            // keyup 事件
            element.dispatchEvent(new KeyboardEvent('keyup', {
                key: 'Enter',
                code: 'Enter',
                keyCode: 13,
                which: 13,
                bubbles: true,
                cancelable: true
            }));

            await this.delay(100);

            console.log('[EventSimulator] Enter键模拟完成');
            return true;
        } catch (error) {
            console.error('[EventSimulator] 按Enter失败:', error);
            return false;
        }
    }

    /**
     * 模拟输入（直接设置值）- 优化版（集成FrameworkAdapter）
     * @param {HTMLElement} element 要填写的元素
     * @param {string} value 要填写的值
     * @returns {Promise<boolean>} 是否成功
     */
    static async fillByValue(element, value) {
        if (!element) return false;

        try {
            // ❌ 注意：这里不调用focus，因为外部已经调用了click（包含focus）

            // ✅ 优先使用FrameworkAdapter处理React/Vue/Angular
            if (typeof FrameworkAdapter !== 'undefined') {
                const success = FrameworkAdapter.setValue(element, value);
                if (success) {
                    // ✅ 智能延迟：根据值的长度动态调整
                    const baseDelay = 100;
                    const lengthDelay = Math.min(200, String(value).length * 5);
                    await this.delay(baseDelay + lengthDelay);
                    return true;
                }
                // 如果失败，继续尝试原生方法
                console.log('[EventSimulator] FrameworkAdapter失败，使用原生方法');
            }

            // 原生方法：直接设置值，不清空（避免触发额外的input事件）
            if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                if (element.type === 'number') {
                    const num = parseFloat(value);
                    if (!isNaN(num)) {
                        element.value = num;
                    } else {
                        element.value = value;
                    }
                } else {
                    element.value = value;
                }
            } else if (element.isContentEditable) {
                element.textContent = value;
            }

            // 触发 input 事件
            element.dispatchEvent(new Event('input', {
                bubbles: true,
                cancelable: true
            }));

            // ✅ 智能延迟：根据值的长度动态调整
            const baseDelay = 100;
            const lengthDelay = Math.min(200, String(value).length * 5);
            await this.delay(baseDelay + lengthDelay);

            // 触发 change 事件
            element.dispatchEvent(new Event('change', {
                bubbles: true,
                cancelable: true
            }));

            // 再延迟一下，让React/Vue等框架有时间响应
            await this.delay(100);

            return true;
        } catch (error) {
            console.error('[EventSimulator] fillByValue 失败:', error);
            return false;
        }
    }

    /**
     * 模拟输入（逐字符输入，更真实）
     * @param {HTMLElement} element 要填写的元素
     * @param {string} value 要填写的值
     * @returns {Promise<boolean>} 是否成功
     */
    static async fillByTyping(element, value) {
        if (!element) return false;

        try {
            // 清空现有值
            if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                element.value = '';
            } else if (element.isContentEditable) {
                element.textContent = '';
            }

            // 逐字符输入
            for (const char of value) {
                // keydown 事件
                element.dispatchEvent(new KeyboardEvent('keydown', {
                    key: char,
                    code: this.getKeyCode(char),
                    bubbles: true,
                    cancelable: true
                }));

                // 更新值
                if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                    element.value += char;
                } else if (element.isContentEditable) {
                    element.textContent += char;
                }

                // input 事件
                element.dispatchEvent(new Event('input', {
                    bubbles: true,
                    cancelable: true
                }));

                // keypress 事件（某些网站需要）
                element.dispatchEvent(new KeyboardEvent('keypress', {
                    key: char,
                    code: this.getKeyCode(char),
                    bubbles: true,
                    cancelable: true
                }));

                // keyup 事件
                element.dispatchEvent(new KeyboardEvent('keyup', {
                    key: char,
                    code: this.getKeyCode(char),
                    bubbles: true,
                    cancelable: true
                }));

                // ✅ 随机延迟，模拟真人打字速度（30-80ms）
                await this.delay(Math.random() * 50 + 30);
            }

            // 触发 change 事件
            element.dispatchEvent(new Event('change', {
                bubbles: true,
                cancelable: true
            }));

            await this.delay(100);

            return true;
        } catch (error) {
            console.error('[EventSimulator] fillByTyping 失败:', error);
            return false;
        }
    }

    /**
     * 模拟粘贴
     * @param {HTMLElement} element 要填写的元素
     * @param {string} value 要粘贴的值
     * @returns {Promise<boolean>} 是否成功
     */
    static async fillByPaste(element, value) {
        if (!element) return false;

        try {
            // 创建粘贴事件
            const clipboardData = new DataTransfer();
            clipboardData.setData('text/plain', value);

            const pasteEvent = new ClipboardEvent('paste', {
                bubbles: true,
                cancelable: true,
                clipboardData: clipboardData
            });

            element.dispatchEvent(pasteEvent);

            // 设置值
            if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                element.value = value;
            } else if (element.isContentEditable) {
                element.textContent = value;
            }

            // 触发 input 和 change
            element.dispatchEvent(new Event('input', { bubbles: true }));
            await this.delay(50);

            element.dispatchEvent(new Event('change', { bubbles: true }));
            await this.delay(100);

            return true;
        } catch (error) {
            console.error('[EventSimulator] fillByPaste 失败:', error);
            return false;
        }
    }

    /**
     * 选择下拉框选项
     * @param {HTMLSelectElement} selectElement 下拉框元素
     * @param {string} value 要选择的值
     * @param {Object} context 上下文信息（可选）
     * @returns {Promise<boolean>} 是否成功
     */
    static async selectOption(selectElement, value, context = {}) {
        if (!selectElement || selectElement.tagName !== 'SELECT') {
            return false;
        }

        try {
            // ✅ 优先使用SelectMatcher进行智能匹配
            if (typeof SelectMatcher !== 'undefined') {
                console.log('[EventSimulator] 使用SelectMatcher智能匹配');
                const result = SelectMatcher.findBestOption(selectElement, value, context);

                if (result) {
                    selectElement.value = result.option.value;
                    result.option.selected = true;

                    // 触发 change 事件
                    selectElement.dispatchEvent(new Event('change', {
                        bubbles: true,
                        cancelable: true
                    }));

                    await this.delay(100);

                    console.log('[EventSimulator] ✅ 智能匹配成功:', result.method, result.text);
                    return true;
                }

                console.warn('[EventSimulator] SelectMatcher未找到匹配，尝试降级方案');
            }

            // ✅ 降级方案：简单匹配
            const options = Array.from(selectElement.options);
            let targetOption = null;

            // 1. 精确匹配 value
            targetOption = options.find(opt => opt.value === value);

            // 2. 精确匹配 text
            if (!targetOption) {
                targetOption = options.find(opt => opt.textContent.trim() === value);
            }

            // 3. 模糊匹配 text
            if (!targetOption) {
                targetOption = options.find(opt =>
                    opt.textContent.includes(value) ||
                    value.includes(opt.textContent.trim())
                );
            }

            if (targetOption) {
                selectElement.value = targetOption.value;
                targetOption.selected = true;

                // 触发 change 事件
                selectElement.dispatchEvent(new Event('change', {
                    bubbles: true,
                    cancelable: true
                }));

                await this.delay(100);

                console.log('[EventSimulator] ✅ 降级匹配成功');
                return true;
            }

            console.warn('[EventSimulator] ❌ 未找到匹配的选项:', value);
            return false;
        } catch (error) {
            console.error('[EventSimulator] selectOption 失败:', error);
            return false;
        }
    }

    /**
     * 选择单选框
     * @param {HTMLInputElement} radioElement 单选框元素
     * @returns {Promise<boolean>} 是否成功
     */
    static async selectRadio(radioElement) {
        if (!radioElement || radioElement.type !== 'radio') {
            return false;
        }

        try {
            // 使用click方法（包含完整的事件序列）
            await this.click(radioElement);

            // 确保选中
            radioElement.checked = true;

            // 触发 change 事件
            radioElement.dispatchEvent(new Event('change', {
                bubbles: true,
                cancelable: true
            }));

            await this.delay(100);
            return true;
        } catch (error) {
            console.error('[EventSimulator] selectRadio 失败:', error);
            return false;
        }
    }

    /**
     * 选择复选框
     * @param {HTMLInputElement} checkboxElement 复选框元素
     * @param {boolean} checked 是否选中
     * @returns {Promise<boolean>} 是否成功
     */
    static async selectCheckbox(checkboxElement, checked) {
        if (!checkboxElement || checkboxElement.type !== 'checkbox') {
            return false;
        }

        try {
            // 如果当前状态和目标状态不一致，才点击
            if (checkboxElement.checked !== checked) {
                await this.click(checkboxElement);
            }

            // 确保状态正确
            checkboxElement.checked = checked;

            // 触发 change 事件
            checkboxElement.dispatchEvent(new Event('change', {
                bubbles: true,
                cancelable: true
            }));

            await this.delay(100);
            return true;
        } catch (error) {
            console.error('[EventSimulator] selectCheckbox 失败:', error);
            return false;
        }
    }

    /**
     * 延迟
     * @param {number} ms 延迟毫秒数
     * @returns {Promise<void>}
     */
    static delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 触发原生事件
     * @param {HTMLElement} element 元素
     * @param {string} eventName 事件名称
     */
    static triggerNativeEvent(element, eventName) {
        if (!element) return;

        const event = new Event(eventName, {
            bubbles: true,
            cancelable: true
        });

        element.dispatchEvent(event);
    }

    /**
     * 触发多个原生事件
     * @param {HTMLElement} element 元素
     * @param {Array<string>} eventNames 事件名称数组
     * @returns {Promise<void>}
     */
    static async triggerEvents(element, eventNames) {
        if (!element || !Array.isArray(eventNames)) return;

        for (const eventName of eventNames) {
            this.triggerNativeEvent(element, eventName);
            await this.delay(50); // 每个事件之间稍微延迟
        }
    }

    /**
     * 获取键码（用于KeyboardEvent）
     * @param {string} char 字符
     * @returns {string} 键码
     */
    static getKeyCode(char) {
        if (/[a-z]/.test(char)) {
            return 'Key' + char.toUpperCase();
        } else if (/[A-Z]/.test(char)) {
            return 'Key' + char;
        } else if (/[0-9]/.test(char)) {
            return 'Digit' + char;
        } else if (char === ' ') {
            return 'Space';
        } else if (char === '\n' || char === '\r') {
            return 'Enter';
        }
        return 'Unidentified';
    }

    /**
     * 等待元素变为可见
     * @param {HTMLElement} element 元素
     * @param {number} timeout 超时时间（ms）
     * @returns {Promise<boolean>} 是否可见
     */
    static async waitForVisible(element, timeout = 5000) {
        const startTime = Date.now();

        while (Date.now() - startTime < timeout) {
            if (this.isVisible(element)) {
                return true;
            }
            await this.delay(100);
        }

        return false;
    }

    /**
     * 检查元素是否可见
     * @param {HTMLElement} element 元素
     * @returns {boolean} 是否可见
     */
    static isVisible(element) {
        if (!element || !element.ownerDocument.contains(element)) {
            return false;
        }

        const style = window.getComputedStyle(element);

        return style.display !== 'none' &&
               style.visibility !== 'hidden' &&
               parseFloat(style.opacity) > 0 &&
               element.offsetWidth > 0 &&
               element.offsetHeight > 0;
    }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EventSimulator;
}
