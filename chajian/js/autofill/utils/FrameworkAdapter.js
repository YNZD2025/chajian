/**
 * 前端框架适配器
 * 处理React/Vue/Angular等框架的状态更新问题
 * 参考求职方舟的实现
 */

class FrameworkAdapter {
    /**
     * 检测元素使用的框架
     * @param {HTMLElement} element
     * @returns {string|null} 'react', 'vue', 'angular' or null
     */
    static detectFramework(element) {
        if (!element) return null;

        // 检测React
        if (this.isReactElement(element)) {
            return 'react';
        }

        // 检测Vue
        if (this.isVueElement(element)) {
            return 'vue';
        }

        // 检测Angular
        if (this.isAngularElement(element)) {
            return 'angular';
        }

        return null;
    }

    /**
     * 判断元素是否为React元素
     * @param {HTMLElement} element
     * @returns {boolean}
     */
    static isReactElement(element) {
        // React内部属性以 __react 开头
        for (const key in element) {
            if (key.startsWith('__react')) {
                return true;
            }
        }

        // 查找React Fiber节点
        if (element._reactRootContainer || element._reactRootFiber) {
            return true;
        }

        // 检查父元素
        let current = element;
        let depth = 0;
        while (current && depth < 5) {
            for (const key in current) {
                if (key.startsWith('__react')) {
                    return true;
                }
            }
            current = current.parentElement;
            depth++;
        }

        return false;
    }

    /**
     * 判断元素是否为Vue元素
     * @param {HTMLElement} element
     * @returns {boolean}
     */
    static isVueElement(element) {
        // Vue 2.x: __vue__
        if (element.__vue__) {
            return true;
        }

        // Vue 3.x: __vnode
        if (element.__vnode) {
            return true;
        }

        // 检查父元素
        let current = element;
        let depth = 0;
        while (current && depth < 5) {
            if (current.__vue__ || current.__vnode) {
                return true;
            }
            current = current.parentElement;
            depth++;
        }

        return false;
    }

    /**
     * 判断元素是否为Angular元素
     * @param {HTMLElement} element
     * @returns {boolean}
     */
    static isAngularElement(element) {
        // Angular特征：ng-* 属性
        for (const attr of element.attributes || []) {
            if (attr.name.startsWith('ng-') || attr.name.startsWith('_ngcontent-')) {
                return true;
            }
        }

        return false;
    }

    /**
     * 设置元素值（适配框架）
     * @param {HTMLElement} element
     * @param {string} value
     * @returns {boolean} 是否成功
     */
    static setValue(element, value) {
        const framework = this.detectFramework(element);
        console.log(`[FrameworkAdapter] 检测到框架: ${framework || '原生'}`);

        let success = false;

        switch (framework) {
            case 'react':
                success = this.setReactValue(element, value);
                break;

            case 'vue':
                success = this.setVueValue(element, value);
                break;

            case 'angular':
                success = this.setAngularValue(element, value);
                break;

            default:
                // 原生HTML
                success = this.setNativeValue(element, value);
                break;
        }

        return success;
    }

    /**
     * 设置React元素的值
     * @param {HTMLElement} element
     * @param {string} value
     * @returns {boolean}
     */
    static setReactValue(element, value) {
        try {
            // 方法1: 使用原生setter绕过React的只读限制
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                window.HTMLInputElement.prototype,
                'value'
            )?.set;

            const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(
                window.HTMLTextAreaElement.prototype,
                'value'
            )?.set;

            if (element.tagName === 'INPUT' && nativeInputValueSetter) {
                nativeInputValueSetter.call(element, value);
            } else if (element.tagName === 'TEXTAREA' && nativeTextAreaValueSetter) {
                nativeTextAreaValueSetter.call(element, value);
            } else {
                element.value = value;
            }

            // 方法2: 触发React合成事件
            this._dispatchReactEvents(element);

            console.log('[FrameworkAdapter] React元素值设置成功');
            return true;

        } catch (error) {
            console.error('[FrameworkAdapter] React元素值设置失败:', error);
            return false;
        }
    }

    /**
     * 触发React合成事件
     * @private
     */
    static _dispatchReactEvents(element) {
        // input事件
        const inputEvent = new Event('input', {
            bubbles: true,
            cancelable: true
        });
        element.dispatchEvent(inputEvent);

        // change事件
        const changeEvent = new Event('change', {
            bubbles: true,
            cancelable: true
        });
        element.dispatchEvent(changeEvent);

        // blur事件（某些表单需要）
        const blurEvent = new Event('blur', {
            bubbles: true,
            cancelable: true
        });
        element.dispatchEvent(blurEvent);

        // React特有的合成事件
        try {
            const syntheticEvent = new InputEvent('input', {
                bubbles: true,
                cancelable: true,
                data: element.value
            });
            element.dispatchEvent(syntheticEvent);
        } catch (e) {
            // 忽略错误
        }
    }

    /**
     * 设置Vue元素的值
     * @param {HTMLElement} element
     * @param {string} value
     * @returns {boolean}
     */
    static setVueValue(element, value) {
        try {
            // 直接设置value
            element.value = value;

            // 触发Vue的响应式更新
            const vueInstance = element.__vue__ || element.__vnode?.component?.proxy;

            if (vueInstance) {
                // Vue 2.x
                if (element.__vue__) {
                    console.log('[FrameworkAdapter] 检测到Vue 2.x');
                    // 触发v-model更新
                    element.__vue__.$emit('input', value);
                }

                // Vue 3.x
                if (element.__vnode) {
                    console.log('[FrameworkAdapter] 检测到Vue 3.x');
                }
            }

            // 触发DOM事件
            this._dispatchVueEvents(element);

            console.log('[FrameworkAdapter] Vue元素值设置成功');
            return true;

        } catch (error) {
            console.error('[FrameworkAdapter] Vue元素值设置失败:', error);
            return false;
        }
    }

    /**
     * 触发Vue事件
     * @private
     */
    static _dispatchVueEvents(element) {
        // input事件（v-model默认监听）
        const inputEvent = new Event('input', {
            bubbles: true,
            cancelable: true
        });
        element.dispatchEvent(inputEvent);

        // change事件
        const changeEvent = new Event('change', {
            bubbles: true,
            cancelable: true
        });
        element.dispatchEvent(changeEvent);

        // blur事件
        const blurEvent = new Event('blur', {
            bubbles: true
        });
        element.dispatchEvent(blurEvent);
    }

    /**
     * 设置Angular元素的值
     * @param {HTMLElement} element
     * @param {string} value
     * @returns {boolean}
     */
    static setAngularValue(element, value) {
        try {
            // 设置value
            element.value = value;

            // 触发Angular的变更检测
            this._dispatchAngularEvents(element);

            console.log('[FrameworkAdapter] Angular元素值设置成功');
            return true;

        } catch (error) {
            console.error('[FrameworkAdapter] Angular元素值设置失败:', error);
            return false;
        }
    }

    /**
     * 触发Angular事件
     * @private
     */
    static _dispatchAngularEvents(element) {
        // input事件（ngModel默认监听）
        const inputEvent = new Event('input', {
            bubbles: true,
            cancelable: true
        });
        element.dispatchEvent(inputEvent);

        // change事件
        const changeEvent = new Event('change', {
            bubbles: true
        });
        element.dispatchEvent(changeEvent);

        // blur事件
        const blurEvent = new Event('blur', {
            bubbles: true
        });
        element.dispatchEvent(blurEvent);
    }

    /**
     * 设置原生HTML元素的值
     * @param {HTMLElement} element
     * @param {string} value
     * @returns {boolean}
     */
    static setNativeValue(element, value) {
        try {
            if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                element.value = value;
            } else if (element.isContentEditable) {
                element.textContent = value;
            } else {
                element.value = value;
            }

            // 触发原生事件
            const inputEvent = new Event('input', { bubbles: true });
            element.dispatchEvent(inputEvent);

            const changeEvent = new Event('change', { bubbles: true });
            element.dispatchEvent(changeEvent);

            console.log('[FrameworkAdapter] 原生元素值设置成功');
            return true;

        } catch (error) {
            console.error('[FrameworkAdapter] 原生元素值设置失败:', error);
            return false;
        }
    }

    /**
     * 触发元素的所有可能事件（增强版）
     * @param {HTMLElement} element
     */
    static triggerAllEvents(element) {
        const events = [
            'input',
            'change',
            'blur',
            'keydown',
            'keyup',
            'keypress',
            'focus',
            'click'
        ];

        for (const eventType of events) {
            try {
                const event = new Event(eventType, {
                    bubbles: true,
                    cancelable: true
                });
                element.dispatchEvent(event);
            } catch (e) {
                // 忽略错误
            }
        }
    }

    /**
     * 获取框架统计信息
     * @returns {Object}
     */
    static getStats() {
        const inputs = document.querySelectorAll('input, textarea, select');
        const stats = {
            total: inputs.length,
            react: 0,
            vue: 0,
            angular: 0,
            native: 0
        };

        for (const input of inputs) {
            const framework = this.detectFramework(input);
            if (framework) {
                stats[framework]++;
            } else {
                stats.native++;
            }
        }

        return stats;
    }

    /**
     * 调试：打印框架统计信息
     */
    static debugPrintStats() {
        console.log('\n=== 前端框架统计 ===');
        const stats = this.getStats();
        console.log(`总字段数: ${stats.total}`);
        console.log(`React: ${stats.react}`);
        console.log(`Vue: ${stats.vue}`);
        console.log(`Angular: ${stats.angular}`);
        console.log(`原生HTML: ${stats.native}`);
    }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FrameworkAdapter;
}
