/**
 * 高亮工具类
 * 用于给字段添加视觉反馈（边框高亮、背景色等）
 */

class Highlighter {
    constructor() {
        this.highlightedElements = new Map(); // 存储已高亮的元素
        this.styleId = 'yinianzhida-autofill-highlight-styles';
        this.injectStyles();
    }

    /**
     * 注入CSS样式
     */
    injectStyles() {
        // 避免重复注入
        if (document.getElementById(this.styleId)) {
            return;
        }

        const style = document.createElement('style');
        style.id = this.styleId;
        style.textContent = `
            /* 一念职达 - 自动填表高亮样式 */
            .yinianzhida-highlight {
                position: relative;
                transition: all 0.3s ease;
            }

            .yinianzhida-highlight-yellow {
                outline: 2px solid #FFD700 !important;
                outline-offset: 2px;
                box-shadow: 0 0 8px rgba(255, 215, 0, 0.5) !important;
            }

            .yinianzhida-highlight-green {
                outline: 2px solid #52C41A !important;
                outline-offset: 2px;
                box-shadow: 0 0 8px rgba(82, 196, 26, 0.5) !important;
            }

            .yinianzhida-highlight-red {
                outline: 2px solid #FF4D4F !important;
                outline-offset: 2px;
                box-shadow: 0 0 8px rgba(255, 77, 79, 0.5) !important;
            }

            .yinianzhida-highlight-purple {
                outline: 2px solid #722ED1 !important;
                outline-offset: 2px;
                box-shadow: 0 0 8px rgba(114, 46, 209, 0.5) !important;
            }

            .yinianzhida-highlight-blue {
                outline: 2px solid #1890FF !important;
                outline-offset: 2px;
                box-shadow: 0 0 8px rgba(24, 144, 255, 0.5) !important;
            }

            /* 脉冲动画 */
            @keyframes yinianzhida-pulse {
                0%, 100% {
                    transform: scale(1);
                    opacity: 1;
                }
                50% {
                    transform: scale(1.02);
                    opacity: 0.8;
                }
            }

            .yinianzhida-highlight-pulse {
                animation: yinianzhida-pulse 1s ease-in-out infinite;
            }
        `;

        document.head.appendChild(style);
        console.log('[Highlighter] 样式已注入');
    }

    /**
     * 高亮元素
     * @param {HTMLElement} element
     * @param {string} color - 'yellow' | 'green' | 'red' | 'purple' | 'blue'
     * @param {Object} options
     */
    highlight(element, color = 'yellow', options = {}) {
        if (!element) {
            console.warn('[Highlighter] 高亮失败: 元素不存在');
            return;
        }

        const {
            pulse = false,          // 是否添加脉冲动画
            duration = 0,           // 持续时间（0表示永久）
            removeOthers = true     // 是否移除其他颜色
        } = options;

        // 移除其他颜色的高亮
        if (removeOthers) {
            this.removeAllColors(element);
        }

        // 添加基础class
        if (!element.classList.contains('yinianzhida-highlight')) {
            element.classList.add('yinianzhida-highlight');
        }

        // 添加颜色class
        const colorClass = `yinianzhida-highlight-${color}`;
        element.classList.add(colorClass);

        // 添加脉冲动画
        if (pulse) {
            element.classList.add('yinianzhida-highlight-pulse');
        }

        // 记录高亮状态
        this.highlightedElements.set(element, {
            color,
            timestamp: Date.now()
        });

        console.log(`[Highlighter] 高亮元素:`, element.tagName, color);

        // 自动移除
        if (duration > 0) {
            setTimeout(() => {
                this.remove(element);
            }, duration);
        }
    }

    /**
     * 移除元素的所有颜色
     * @param {HTMLElement} element
     */
    removeAllColors(element) {
        if (!element) return;

        const colors = ['yellow', 'green', 'red', 'purple', 'blue'];
        colors.forEach(color => {
            element.classList.remove(`yinianzhida-highlight-${color}`);
        });
    }

    /**
     * 移除高亮
     * @param {HTMLElement} element
     */
    remove(element) {
        if (!element) return;

        element.classList.remove('yinianzhida-highlight');
        element.classList.remove('yinianzhida-highlight-pulse');
        this.removeAllColors(element);

        this.highlightedElements.delete(element);
        console.log('[Highlighter] 移除高亮:', element.tagName);
    }

    /**
     * 移除所有高亮
     */
    removeAll() {
        this.highlightedElements.forEach((_, element) => {
            this.remove(element);
        });

        console.log('[Highlighter] 已移除所有高亮');
    }

    /**
     * 获取元素当前高亮颜色
     * @param {HTMLElement} element
     * @returns {string | null}
     */
    getColor(element) {
        if (!element) return null;

        const info = this.highlightedElements.get(element);
        return info ? info.color : null;
    }

    /**
     * 批量高亮
     * @param {HTMLElement[]} elements
     * @param {string} color
     * @param {Object} options
     */
    highlightBatch(elements, color, options = {}) {
        elements.forEach(element => {
            this.highlight(element, color, options);
        });
    }

    /**
     * 销毁（清理所有样式和高亮）
     */
    destroy() {
        this.removeAll();

        const styleElement = document.getElementById(this.styleId);
        if (styleElement) {
            styleElement.remove();
        }

        console.log('[Highlighter] 已销毁');
    }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Highlighter;
}
