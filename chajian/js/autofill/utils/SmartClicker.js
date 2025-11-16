/**
 * 智能点击器 - 专门处理复杂UI框架的表单控件
 *
 * 支持的UI框架：
 * - Ant Design (antd)
 * - Element UI / Element Plus
 * - iView
 * - Vant
 * - 原生HTML控件
 *
 * 功能：
 * - 识别UI框架类型
 * - 找到真正需要点击的元素（容器、图标、触发器）
 * - 等待弹窗/下拉框完全展开
 * - 处理各种交互场景
 */

class SmartClicker {
    /**
     * 智能点击 - 自动识别控件类型并使用最佳策略
     * @param {HTMLElement} element - 要点击的元素
     * @param {Object} options - 选项
     * @returns {Promise<Object>} { success, popup, message }
     */
    static async smartClick(element, options = {}) {
        console.log('[SmartClicker] 开始智能点击:', element);

        try {
            // 1. 识别控件类型和UI框架
            const controlInfo = this.identifyControl(element);
            console.log('[SmartClicker] 识别控件类型:', controlInfo);

            // 2. 滚动到可见区域
            await this.scrollToElement(element);

            // 3. 根据控件类型选择点击策略
            const result = await this.executeClickStrategy(element, controlInfo);

            // 4. 等待UI响应（弹窗、下拉框等）
            if (result.success) {
                const popup = await this.waitForPopup(element, controlInfo);
                result.popup = popup;
            }

            console.log('[SmartClicker] 点击结果:', result);
            return result;

        } catch (error) {
            console.error('[SmartClicker] 点击失败:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }

    /**
     * 识别控件类型和UI框架
     * @param {HTMLElement} element
     * @returns {Object} 控件信息
     */
    static identifyControl(element) {
        const info = {
            tagName: element.tagName,
            type: element.type || 'text',
            framework: 'native', // native, antd, element, iview, vant
            controlType: 'input', // input, select, datepicker, timepicker, cascader
            clickTarget: element  // 实际应该点击的元素
        };

        // 检查父级容器的class，识别UI框架
        let parent = element;
        for (let i = 0; i < 5 && parent; i++) {
            const className = parent.className || '';

            // Ant Design
            if (className.includes('ant-')) {
                info.framework = 'antd';
                if (className.includes('ant-picker')) {
                    info.controlType = 'datepicker';
                    info.clickTarget = parent.querySelector('.ant-picker-input') || parent;
                } else if (className.includes('ant-select')) {
                    info.controlType = 'select';
                    info.clickTarget = parent.querySelector('.ant-select-selector') || parent;
                } else if (className.includes('ant-cascader')) {
                    info.controlType = 'cascader';
                    info.clickTarget = parent.querySelector('.ant-cascader-input') || parent;
                }
                break;
            }

            // Element UI / Element Plus
            if (className.includes('el-')) {
                info.framework = 'element';
                if (className.includes('el-date-picker') || className.includes('el-date-editor')) {
                    info.controlType = 'datepicker';
                    info.clickTarget = parent.querySelector('.el-input__inner') || parent;
                } else if (className.includes('el-select')) {
                    info.controlType = 'select';
                    info.clickTarget = parent.querySelector('.el-input__inner') || parent;
                } else if (className.includes('el-cascader')) {
                    info.controlType = 'cascader';
                    info.clickTarget = parent.querySelector('.el-input__inner') || parent;
                }
                break;
            }

            // iView
            if (className.includes('ivu-')) {
                info.framework = 'iview';
                if (className.includes('ivu-date-picker')) {
                    info.controlType = 'datepicker';
                } else if (className.includes('ivu-select')) {
                    info.controlType = 'select';
                }
                break;
            }

            // Vant
            if (className.includes('van-')) {
                info.framework = 'vant';
                if (className.includes('van-datetime-picker')) {
                    info.controlType = 'datepicker';
                } else if (className.includes('van-picker')) {
                    info.controlType = 'select';
                }
                break;
            }

            parent = parent.parentElement;
        }

        // 如果是原生select
        if (element.tagName === 'SELECT') {
            info.controlType = 'select';
        }

        // 如果是date/time类型的input
        if (element.type === 'date' || element.type === 'datetime-local' || element.type === 'time') {
            info.controlType = 'datepicker';
        }

        return info;
    }

    /**
     * 执行点击策略
     * @param {HTMLElement} element
     * @param {Object} controlInfo
     * @returns {Promise<Object>}
     */
    static async executeClickStrategy(element, controlInfo) {
        const { framework, controlType, clickTarget } = controlInfo;

        // 策略1: 先尝试点击真正的触发元素（容器或图标）
        if (clickTarget !== element) {
            console.log('[SmartClicker] 点击触发元素:', clickTarget);
            await this.performClick(clickTarget);
            await this.delay(200);

            // 检查是否成功展开
            if (await this.checkIfExpanded(element, controlInfo)) {
                return { success: true, message: '点击触发元素成功' };
            }
        }

        // 策略2: 点击输入框本身
        console.log('[SmartClicker] 点击输入框本身');
        await this.performClick(element);
        await this.delay(200);

        if (await this.checkIfExpanded(element, controlInfo)) {
            return { success: true, message: '点击输入框成功' };
        }

        // 策略3: 查找并点击图标（日历图标、下拉箭头等）
        const icon = this.findTriggerIcon(element, controlInfo);
        if (icon) {
            console.log('[SmartClicker] 点击触发图标:', icon);
            await this.performClick(icon);
            await this.delay(200);

            if (await this.checkIfExpanded(element, controlInfo)) {
                return { success: true, message: '点击图标成功' };
            }
        }

        // 策略4: 查找并点击父容器
        const container = this.findClickableContainer(element);
        if (container && container !== element) {
            console.log('[SmartClicker] 点击父容器:', container);
            await this.performClick(container);
            await this.delay(200);

            if (await this.checkIfExpanded(element, controlInfo)) {
                return { success: true, message: '点击容器成功' };
            }
        }

        // 策略5: 使用键盘触发（某些控件需要focus + 键盘事件）
        if (controlType === 'select' || controlType === 'datepicker') {
            console.log('[SmartClicker] 尝试键盘触发');
            element.focus();
            await this.delay(100);

            // 触发下箭头键
            element.dispatchEvent(new KeyboardEvent('keydown', {
                key: 'ArrowDown',
                code: 'ArrowDown',
                keyCode: 40,
                bubbles: true,
                cancelable: true
            }));

            await this.delay(200);

            if (await this.checkIfExpanded(element, controlInfo)) {
                return { success: true, message: '键盘触发成功' };
            }
        }

        // 如果所有策略都失败，返回基本成功（至少点击了）
        console.warn('[SmartClicker] 无法确认展开状态，但已完成点击');
        return {
            success: true,
            message: '已点击但无法确认展开'
        };
    }

    /**
     * 执行点击操作（完整的事件序列）
     * @param {HTMLElement} element
     */
    static async performClick(element) {
        if (!element) return;

        // 确保元素可见
        if (typeof element.scrollIntoViewIfNeeded === 'function') {
            element.scrollIntoViewIfNeeded();
        } else {
            element.scrollIntoView({ block: 'center', behavior: 'instant' });
        }
        await this.delay(50);

        // 完整的鼠标事件序列
        const eventOptions = {
            bubbles: true,
            cancelable: true,
            view: window,
            detail: 1
        };

        element.dispatchEvent(new MouseEvent('mouseenter', eventOptions));
        element.dispatchEvent(new MouseEvent('mouseover', eventOptions));
        element.dispatchEvent(new MouseEvent('mousedown', eventOptions));

        // Focus事件
        if (typeof element.focus === 'function') {
            element.focus();
        }
        element.dispatchEvent(new FocusEvent('focus', {
            bubbles: true,
            cancelable: true,
            view: window
        }));

        await this.delay(10);

        element.dispatchEvent(new MouseEvent('mouseup', eventOptions));
        element.dispatchEvent(new MouseEvent('click', eventOptions));

        await this.delay(10);
    }

    /**
     * 检查是否成功展开
     * @param {HTMLElement} element
     * @param {Object} controlInfo
     * @returns {Promise<boolean>}
     */
    static async checkIfExpanded(element, controlInfo) {
        const { framework, controlType } = controlInfo;

        await this.delay(100);

        // Ant Design
        if (framework === 'antd') {
            if (controlType === 'datepicker') {
                return !!document.querySelector('.ant-picker-dropdown:not(.ant-picker-dropdown-hidden)');
            }
            if (controlType === 'select') {
                return !!document.querySelector('.ant-select-dropdown:not(.ant-select-dropdown-hidden)');
            }
            if (controlType === 'cascader') {
                return !!document.querySelector('.ant-cascader-dropdown:not(.ant-cascader-dropdown-hidden)');
            }
        }

        // Element UI
        if (framework === 'element') {
            if (controlType === 'datepicker') {
                return !!document.querySelector('.el-picker-panel:not(.el-zoom-in-top-leave-active)');
            }
            if (controlType === 'select') {
                return !!document.querySelector('.el-select-dropdown:not(.el-select-dropdown__hide)');
            }
        }

        // iView
        if (framework === 'iview') {
            return !!document.querySelector('.ivu-select-dropdown, .ivu-date-picker-dropdown');
        }

        // 通用检测：查找新出现的浮层
        const popups = document.querySelectorAll(`
            [class*="dropdown"]:not([style*="display: none"]),
            [class*="popup"]:not([style*="display: none"]),
            [class*="picker"]:not([style*="display: none"]),
            [class*="menu"]:not([style*="display: none"])
        `);

        return popups.length > 0;
    }

    /**
     * 查找触发图标（日历、下拉箭头等）
     * @param {HTMLElement} element
     * @param {Object} controlInfo
     * @returns {HTMLElement|null}
     */
    static findTriggerIcon(element, controlInfo) {
        // 向上查找3层父元素
        let parent = element.parentElement;
        for (let i = 0; i < 3 && parent; i++) {
            // 查找图标
            const icons = parent.querySelectorAll(`
                [class*="icon"],
                [class*="suffix"],
                [class*="arrow"],
                [class*="calendar"],
                svg,
                i
            `);

            for (const icon of icons) {
                if (this.isVisible(icon) && icon !== element) {
                    // 检查是否是触发图标
                    const className = icon.className || '';
                    if (
                        className.includes('suffix') ||
                        className.includes('arrow') ||
                        className.includes('calendar') ||
                        className.includes('picker-icon') ||
                        className.includes('select-icon')
                    ) {
                        return icon;
                    }
                }
            }

            parent = parent.parentElement;
        }

        return null;
    }

    /**
     * 查找可点击的容器
     * @param {HTMLElement} element
     * @returns {HTMLElement|null}
     */
    static findClickableContainer(element) {
        let parent = element.parentElement;

        for (let i = 0; i < 3 && parent; i++) {
            const className = parent.className || '';

            // 包含控件相关class的容器
            if (
                className.includes('picker') ||
                className.includes('select') ||
                className.includes('input') ||
                className.includes('control')
            ) {
                return parent;
            }

            parent = parent.parentElement;
        }

        return null;
    }

    /**
     * 等待弹窗出现
     * @param {HTMLElement} element
     * @param {Object} controlInfo
     * @returns {Promise<HTMLElement|null>}
     */
    static async waitForPopup(element, controlInfo, timeout = 1000) {
        const startTime = Date.now();

        while (Date.now() - startTime < timeout) {
            // 根据框架类型查找弹窗
            const popup = this.findPopup(controlInfo);

            if (popup) {
                console.log('[SmartClicker] 检测到弹窗:', popup);
                return popup;
            }

            await this.delay(50);
        }

        console.warn('[SmartClicker] 未检测到弹窗');
        return null;
    }

    /**
     * 查找弹窗
     * @param {Object} controlInfo
     * @returns {HTMLElement|null}
     */
    static findPopup(controlInfo) {
        const { framework, controlType } = controlInfo;

        let selectors = [];

        // Ant Design
        if (framework === 'antd') {
            if (controlType === 'datepicker') {
                selectors.push('.ant-picker-dropdown:not(.ant-picker-dropdown-hidden)');
            } else if (controlType === 'select') {
                selectors.push('.ant-select-dropdown:not(.ant-select-dropdown-hidden)');
            } else if (controlType === 'cascader') {
                selectors.push('.ant-cascader-dropdown:not(.ant-cascader-dropdown-hidden)');
            }
        }

        // Element UI
        if (framework === 'element') {
            if (controlType === 'datepicker') {
                selectors.push('.el-picker-panel');
            } else if (controlType === 'select') {
                selectors.push('.el-select-dropdown');
            }
        }

        // 通用弹窗选择器
        selectors.push(
            '[class*="dropdown"]:not([style*="display: none"])',
            '[class*="popup"]:not([style*="display: none"])',
            '[class*="picker-panel"]',
            '[class*="options"]',
            '[role="listbox"]',
            '[role="menu"]'
        );

        for (const selector of selectors) {
            const elements = document.querySelectorAll(selector);
            for (const el of elements) {
                if (this.isVisible(el)) {
                    return el;
                }
            }
        }

        return null;
    }

    /**
     * 滚动到元素
     * @param {HTMLElement} element
     */
    static async scrollToElement(element) {
        try {
            element.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
                inline: 'center'
            });
            await this.delay(200);
        } catch (error) {
            element.scrollIntoView();
            await this.delay(100);
        }
    }

    /**
     * 检查元素是否可见
     * @param {HTMLElement} element
     * @returns {boolean}
     */
    static isVisible(element) {
        if (!element || !document.contains(element)) {
            return false;
        }

        const style = window.getComputedStyle(element);
        return style.display !== 'none' &&
               style.visibility !== 'hidden' &&
               parseFloat(style.opacity) > 0 &&
               element.offsetWidth > 0 &&
               element.offsetHeight > 0;
    }

    /**
     * 延迟
     * @param {number} ms
     * @returns {Promise<void>}
     */
    static delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SmartClicker;
}
