/**
 * FormExpander - 表单动态展开器
 * 自动点击"添加"按钮，展开动态表单区域
 */

class FormExpander {
    constructor(config = {}) {
        this.config = {
            addButtonKeywords: ['添加', '增加', '新增'],
            excludeKeywords: ['职位'],
            maxRetries: 3,
            ...config
        };

        // EventSimulator 使用静态方法，不需要实例化
        this.observer = new DOMObserver();
    }

    /**
     * 展开所有动态表单区域
     * @returns {Promise<Object>} 展开结果统计
     */
    async expandAll() {
        console.log('[FormExpander] 开始展开动态表单...');

        const addButtons = this.findAddButtons();
        console.log(`[FormExpander] 找到 ${addButtons.length} 个"添加"按钮`);

        let expandedCount = 0;
        let skippedCount = 0;

        for (const button of addButtons) {
            try {
                // 清空之前的记录
                this.observer.clear();

                // 滚动到按钮位置
                button.scrollIntoView({ block: 'center', behavior: 'smooth' });
                await this.sleep(100);

                // 开始监听DOM变化
                this.observer.start();

                // 点击按钮（使用静态方法）
                await EventSimulator.click(button);
                await this.sleep(200);

                // 停止监听
                this.observer.stop();
                const addedElements = this.observer.getNewElements();

                // 检查是否弹出了新元素
                if (addedElements.length > 0) {
                    console.log(`[FormExpander] 点击按钮后新增了 ${addedElements.length} 个元素`);

                    // 检查是否是重复区域
                    if (this.isRepeatedSection(addedElements)) {
                        console.log('[FormExpander] 检测到重复区域，关闭...');
                        await this.closeRepeatedSection(addedElements);
                        skippedCount++;
                    } else {
                        console.log('[FormExpander] 成功展开新区域');
                        expandedCount++;
                    }
                } else {
                    console.log('[FormExpander] 点击后无新元素，可能已展开');
                    skippedCount++;
                }

            } catch (error) {
                console.error('[FormExpander] 展开按钮失败:', error);
            }
        }

        console.log(`[FormExpander] 展开完成: 成功=${expandedCount}, 跳过=${skippedCount}`);

        return {
            total: addButtons.length,
            expanded: expandedCount,
            skipped: skippedCount
        };
    }

    /**
     * 查找所有"添加"按钮
     * @returns {Array<HTMLElement>}
     */
    findAddButtons() {
        // 查找所有可能的按钮元素（button、div、span等）
        const candidates = Array.from(document.querySelectorAll('button, a, div[role="button"], span[role="button"], div[class*="btn"], span[class*="btn"]'));
        const buttons = [];

        for (const element of candidates) {
            // 检查元素是否可见
            if (!DOMUtils.isVisible(element)) continue;

            const text = element.textContent.trim();

            // 检查是否包含添加关键词
            let hasAddKeyword = false;
            for (const keyword of this.config.addButtonKeywords) {
                const pattern = new RegExp(`^[\\+\\s]*${keyword}`);
                if (pattern.test(text)) {
                    hasAddKeyword = true;
                    break;
                }
            }

            if (!hasAddKeyword) continue;

            // 排除特定关键词
            let hasExcludeKeyword = false;
            for (const keyword of this.config.excludeKeywords) {
                if (text.includes(keyword)) {
                    hasExcludeKeyword = true;
                    break;
                }
            }

            if (hasExcludeKeyword) continue;

            buttons.push(element);
        }

        // 去重：只保留最外层的按钮
        return this.removeDuplicateParentElements(buttons);
    }

    /**
     * 判断是否是重复的区域
     * @param {Array<HTMLElement>} addedElements
     * @returns {boolean}
     */
    isRepeatedSection(addedElements) {
        if (addedElements.length === 0) return false;

        // 收集所有元素及其子元素
        let allElements = [];
        for (const element of addedElements) {
            allElements.push(element);
            const children = Array.from(element.querySelectorAll('*'));
            allElements = allElements.concat(children);
        }
        allElements = allElements.reverse();

        const firstElement = addedElements[0];
        // 获取所有可见的页面元素
        const allPageElements = Array.from(document.querySelectorAll('*'));
        const pageElements = allPageElements.filter(el => DOMUtils.isVisible(el)).reverse();

        let matchIndex = 0;
        let foundFirst = false;

        // 遍历页面元素，寻找结构相似的匹配
        for (let i = 0; i < pageElements.length; i++) {
            const pageElem = pageElements[i];

            if (pageElem === firstElement) {
                foundFirst = true;
                continue;
            }

            if (!foundFirst) continue;

            if (matchIndex >= allElements.length) return true;

            const targetElem = allElements[matchIndex];

            // 检查结构是否相同
            if (this.isSimilarStructure(pageElem, targetElem)) {
                matchIndex++;
                continue;
            }

            // 如果元素有文本且不是按钮，则中断匹配
            if (pageElem.innerText && !this.isButtonElement(pageElem)) {
                if (targetElem.innerText && !this.isButtonElement(targetElem)) {
                    break;
                }
            }
        }

        return false;
    }

    /**
     * 检查两个元素结构是否相似
     * @param {HTMLElement} elem1
     * @param {HTMLElement} elem2
     * @returns {boolean}
     */
    isSimilarStructure(elem1, elem2) {
        if (elem1.nodeType !== elem2.nodeType) return false;
        if (elem1.tagName !== elem2.tagName) return false;

        // 检查className
        if (elem1.className === elem2.className) return true;

        // 检查className相似度（仅动画/状态类名不同）
        if (typeof elem1.className === 'string' && typeof elem2.className === 'string') {
            return this.areClassNamesSimilar(elem1.className, elem2.className);
        }

        return false;
    }

    /**
     * 检查两个className是否相似
     * @param {string} class1
     * @param {string} class2
     * @returns {boolean}
     */
    areClassNamesSimilar(class1, class2) {
        if (class1 === class2) return true;

        const classes1 = class1.trim().split(/\s+/).filter(c => c);
        const classes2 = class2.trim().split(/\s+/).filter(c => c);

        // 找出不同的类名
        const diff1 = classes1.filter(c => !classes2.includes(c));
        const diff2 = classes2.filter(c => !classes1.includes(c));

        // 检查不同的类名是否都是显示/隐藏相关
        const hideShowPattern = /^(hide|show|hidden|visible|active|selected|open|closed|expanded|collapsed)$/i;

        const allDiffAreAnimations = [...diff1, ...diff2].every(c => hideShowPattern.test(c));

        return allDiffAreAnimations;
    }

    /**
     * 判断是否是按钮元素
     * @param {HTMLElement} element
     * @returns {boolean}
     */
    isButtonElement(element) {
        const text = element.textContent.trim();
        const buttonPattern = /^[\+\-\s]*(添加|增加|删除|移除|收起|展开)/;
        return buttonPattern.test(text);
    }

    /**
     * 关闭重复区域
     * @param {Array<HTMLElement>} addedElements
     * @returns {Promise<void>}
     */
    async closeRepeatedSection(addedElements) {
        // 查找删除按钮
        const deleteButtons = this.findDeleteButtons(addedElements);

        if (deleteButtons.length === 0) {
            console.log('[FormExpander] 未找到删除按钮');
            return;
        }

        // 点击第一个删除按钮（使用静态方法）
        const button = deleteButtons[0];
        await EventSimulator.click(button);
        await this.sleep(200);

        console.log('[FormExpander] 已关闭重复区域');
    }

    /**
     * 查找删除按钮
     * @param {Array<HTMLElement>} elements
     * @returns {Array<HTMLElement>}
     */
    findDeleteButtons(elements) {
        const buttons = [];

        for (const container of elements) {
            const allElements = container.querySelectorAll('*');

            for (const element of allElements) {
                let isDeleteButton = false;

                // 方法1: 通过文本查找
                const text = element.textContent.trim();
                if (/^(删\s*除|移\s*除)/.test(text)) {
                    isDeleteButton = true;
                }

                // 方法2: 通过属性查找
                if (!isDeleteButton) {
                    for (const attr of element.attributes) {
                        const value = attr.value;
                        if (/delete|remove|trash|shanchu/i.test(value)) {
                            isDeleteButton = true;
                            break;
                        }
                    }
                }

                if (isDeleteButton) {
                    buttons.push(element);
                }
            }
        }

        return this.removeDuplicateParentElements(buttons);
    }

    /**
     * 去除父子重复元素（只保留最外层）
     * @param {Array<HTMLElement>} elements
     * @returns {Array<HTMLElement>}
     */
    removeDuplicateParentElements(elements) {
        const result = [];

        for (const element of elements) {
            let isChild = false;

            for (const other of elements) {
                if (other !== element && other.contains(element)) {
                    isChild = true;
                    break;
                }
            }

            if (!isChild) {
                result.push(element);
            }
        }

        return result;
    }

    /**
     * 延迟函数
     * @param {number} ms
     * @returns {Promise<void>}
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FormExpander;
}
