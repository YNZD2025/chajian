/**
 * DOM观察器 - 实时监听DOM变化
 *
 * 核心功能：
 * 1. ✅ 使用MutationObserver监听DOM变化
 * 2. ✅ 检测新增的元素（弹窗、下拉框等）
 * 3. ✅ 检测从隐藏变为可见的元素
 * 4. ✅ 过滤重复和嵌套元素
 * 5. ✅ 提供稳定性检测（等待DOM停止变化）
 *
 * 使用场景：
 * - 检测点击输入框后弹出的选择器
 * - 检测日期选择器
 * - 检测下拉菜单
 * - 检测自动完成列表
 */

class DOMObserver {
    constructor() {
        this.observer = null;
        this.newElements = [];
        this.elementStyles = new WeakMap();
        this.isObserving = false;
        this.mutationCount = 0;
        this.lastMutationTime = 0;
    }

    /**
     * 开始监听DOM变化
     */
    start() {
        if (this.isObserving) {
            console.warn('[DOMObserver] 已经在监听中');
            return;
        }

        this.newElements = [];
        this.elementStyles = new WeakMap();
        this.mutationCount = 0;
        this.lastMutationTime = Date.now();

        // 保存所有元素的初始样式
        this.saveInitialStyles();

        // 创建MutationObserver
        this.observer = new MutationObserver((mutations) => {
            this.mutationCount += mutations.length;
            this.lastMutationTime = Date.now();
            this.handleMutations(mutations);
        });

        // 开始监听
        this.observer.observe(document.body, {
            childList: true,      // 监听子节点的增删
            subtree: true,        // 监听所有后代节点
            attributeFilter: ['class', 'style']  // 只监听class和style属性
        });

        this.isObserving = true;
        console.log('[DOMObserver] 开始监听DOM变化');
    }

    /**
     * 停止监听
     */
    stop() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }

        // 过滤重复元素（只保留最外层的父元素）
        this.newElements = this.filterNestedElements(this.newElements);

        this.isObserving = false;

        console.log(
            '[DOMObserver] 停止监听',
            '检测到', this.newElements.length, '个新元素',
            '变化次数:', this.mutationCount
        );
    }

    /**
     * 保存所有元素的初始样式
     */
    saveInitialStyles() {
        try {
            const allElements = Array.from(document.body.querySelectorAll("*"));
            allElements.push(document.body);

            for (const element of allElements) {
                if (element.nodeType === Node.ELEMENT_NODE) {
                    const styles = window.getComputedStyle(element);
                    this.elementStyles.set(element, {
                        display: styles.display,
                        visibility: styles.visibility,
                        opacity: styles.opacity
                    });
                }
            }

            console.log('[DOMObserver] 保存了', allElements.length, '个元素的初始样式');
        } catch (error) {
            console.error('[DOMObserver] 保存初始样式失败:', error);
        }
    }

    /**
     * 处理MutationObserver的回调
     * @param {MutationRecord[]} mutations 变化记录
     */
    handleMutations(mutations) {
        const addedElements = new WeakSet();

        for (const mutation of mutations) {
            // 处理新增节点
            if (mutation.type === 'childList') {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === Node.ELEMENT_NODE && !addedElements.has(node)) {
                        addedElements.add(node);
                        this.newElements.push(node);

                        // 递归添加子元素
                        const children = node.querySelectorAll('*');
                        for (const child of children) {
                            addedElements.add(child);
                        }
                    }
                }
            }

            // 处理属性变化（从隐藏变为可见）
            else if (mutation.type === 'attributes') {
                const element = mutation.target;

                if (element.nodeType !== Node.ELEMENT_NODE || addedElements.has(element)) {
                    continue;
                }

                // 检查是否从隐藏变为可见
                if (this.isElementBecomeVisible(element)) {
                    addedElements.add(element);
                    this.newElements.push(element);

                    // 检查子元素是否也从隐藏变为可见
                    this.checkChildrenVisibility(element, addedElements);
                }
            }
        }
    }

    /**
     * 检查元素是否从隐藏变为可见
     * @param {HTMLElement} element 要检查的元素
     * @returns {boolean} 是否从隐藏变为可见
     */
    isElementBecomeVisible(element) {
        try {
            const oldStyles = this.elementStyles.get(element) || {};
            const newStyles = window.getComputedStyle(element);

            const wasHidden = oldStyles.display === 'none' ||
                              oldStyles.visibility === 'hidden' ||
                              parseFloat(oldStyles.opacity) === 0;

            const isVisible = newStyles.display !== 'none' &&
                              newStyles.visibility !== 'hidden' &&
                              parseFloat(newStyles.opacity) !== 0;

            // 更新样式记录
            this.elementStyles.set(element, {
                display: newStyles.display,
                visibility: newStyles.visibility,
                opacity: newStyles.opacity
            });

            return wasHidden && isVisible;
        } catch (error) {
            return false;
        }
    }

    /**
     * 检查子元素的可见性变化
     * @param {HTMLElement} element 父元素
     * @param {WeakSet} addedElements 已添加的元素集合
     */
    checkChildrenVisibility(element, addedElements) {
        try {
            const children = element.querySelectorAll('div, ul, ol, table');

            for (const child of children) {
                if (addedElements.has(child)) {
                    continue;
                }

                const childOldStyles = this.elementStyles.get(child) || {};
                const childNewStyles = window.getComputedStyle(child);

                const childWasHidden = childOldStyles.display === 'none' ||
                                       childOldStyles.visibility === 'hidden' ||
                                       parseFloat(childOldStyles.opacity) === 0;

                const childIsVisible = childNewStyles.display !== 'none' &&
                                       childNewStyles.visibility !== 'hidden' &&
                                       parseFloat(childNewStyles.opacity) !== 0;

                // 更新样式记录
                this.elementStyles.set(child, {
                    display: childNewStyles.display,
                    visibility: childNewStyles.visibility,
                    opacity: childNewStyles.opacity
                });

                if (childWasHidden && childIsVisible) {
                    addedElements.add(child);
                    this.newElements.push(child);
                }
            }
        } catch (error) {
            console.error('[DOMObserver] 检查子元素可见性失败:', error);
        }
    }

    /**
     * 获取新增的元素
     * @returns {HTMLElement[]} 新增元素列表
     */
    getNewElements() {
        return this.newElements;
    }

    /**
     * 获取可见的新元素
     * @returns {HTMLElement[]} 可见的新元素列表
     */
    getVisibleNewElements() {
        return this.newElements.filter(element => {
            return element &&
                   document.contains(element) &&
                   this.isElementVisible(element);
        });
    }

    /**
     * 检查元素是否可见
     * @param {HTMLElement} element 要检查的元素
     * @returns {boolean} 是否可见
     */
    isElementVisible(element) {
        try {
            if (!element || !element.ownerDocument.contains(element)) {
                return false;
            }

            const style = window.getComputedStyle(element);

            return style.display !== 'none' &&
                   style.visibility !== 'hidden' &&
                   parseFloat(style.opacity) > 0 &&
                   element.offsetWidth > 0 &&
                   element.offsetHeight > 0;
        } catch (error) {
            return false;
        }
    }

    /**
     * 清空新元素列表
     */
    clear() {
        this.newElements = [];
        this.mutationCount = 0;
    }

    /**
     * 过滤嵌套元素（只保留最外层）
     * @param {HTMLElement[]} elements 元素列表
     * @returns {HTMLElement[]} 过滤后的元素列表
     */
    filterNestedElements(elements) {
        const result = [];

        for (const element of elements) {
            let isNested = false;

            for (const other of elements) {
                if (other !== element && other.contains(element)) {
                    isNested = true;
                    break;
                }
            }

            if (!isNested) {
                result.push(element);
            }
        }

        return result;
    }

    /**
     * 等待DOM稳定（无新变化）
     * @param {number} stableTime 稳定时间（ms），即多久无变化算稳定
     * @param {number} timeout 超时时间（ms）
     * @returns {Promise<boolean>} 是否稳定
     */
    async waitForStable(stableTime = 300, timeout = 5000) {
        const startTime = Date.now();

        return new Promise((resolve) => {
            let timer;

            const checkStable = () => {
                clearTimeout(timer);

                // 如果超时，直接返回
                if (Date.now() - startTime >= timeout) {
                    resolve(true);
                    return;
                }

                // 如果距离最后一次变化超过stableTime，认为稳定
                if (Date.now() - this.lastMutationTime >= stableTime) {
                    resolve(true);
                    return;
                }

                // 继续等待
                timer = setTimeout(checkStable, 100);
            };

            checkStable();
        });
    }

    /**
     * 获取变化次数
     * @returns {number} 变化次数
     */
    getMutationCount() {
        return this.mutationCount;
    }

    /**
     * 检查是否有新元素
     * @returns {boolean} 是否有新元素
     */
    hasNewElements() {
        return this.newElements.length > 0;
    }

    /**
     * 检查是否正在监听
     * @returns {boolean} 是否正在监听
     */
    isActive() {
        return this.isObserving;
    }

    /**
     * 销毁观察器
     */
    destroy() {
        this.stop();
        this.newElements = [];
        this.elementStyles = new WeakMap();
        this.mutationCount = 0;
        console.log('[DOMObserver] 已销毁');
    }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DOMObserver;
}
