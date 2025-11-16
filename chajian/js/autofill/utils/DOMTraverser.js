/**
 * DOM穿透工具类
 * 支持Shadow DOM和iframe的递归扫描
 * 参考求职方舟的实现，增强插件的适用范围
 */

class DOMTraverser {
    /**
     * 获取所有可访问的根节点（包括Shadow DOM和iframe）
     * @param {Document|HTMLElement} root - 起始根节点
     * @returns {Array<{root: Document|ShadowRoot, type: string, iframe: HTMLIFrameElement|null}>}
     */
    static getAllAccessibleRoots(root = document) {
        const roots = [];
        const visited = new WeakSet();

        // 添加主文档
        roots.push({
            root: root,
            type: 'document',
            iframe: null
        });

        // 递归收集所有根节点
        this._collectRoots(root, roots, visited);

        console.log(`[DOMTraverser] 找到 ${roots.length} 个可访问的根节点`);
        return roots;
    }

    /**
     * 递归收集所有根节点
     * @private
     */
    static _collectRoots(root, roots, visited) {
        if (visited.has(root)) return;
        visited.add(root);

        try {
            // 1. 查找所有Shadow DOM
            const shadowHosts = this._findAllShadowHosts(root);
            for (const host of shadowHosts) {
                if (host.shadowRoot && !visited.has(host.shadowRoot)) {
                    roots.push({
                        root: host.shadowRoot,
                        type: 'shadowRoot',
                        iframe: null
                    });

                    // 递归扫描Shadow DOM内部
                    this._collectRoots(host.shadowRoot, roots, visited);
                }
            }

            // 2. 查找所有iframe
            const iframes = this._findAllIframes(root);
            for (const iframe of iframes) {
                try {
                    // 检查是否可以访问iframe内容（同源策略）
                    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
                    if (iframeDoc && !visited.has(iframeDoc)) {
                        roots.push({
                            root: iframeDoc,
                            type: 'iframe',
                            iframe: iframe
                        });

                        // 递归扫描iframe内部
                        this._collectRoots(iframeDoc, roots, visited);
                    }
                } catch (e) {
                    // 跨域iframe，无法访问
                    console.log(`[DOMTraverser] 跨域iframe无法访问: ${iframe.src}`);
                }
            }
        } catch (error) {
            console.error('[DOMTraverser] 收集根节点失败:', error);
        }
    }

    /**
     * 查找所有Shadow Host（拥有Shadow DOM的元素）
     * @private
     */
    static _findAllShadowHosts(root) {
        const hosts = [];

        try {
            // 获取所有元素
            const allElements = root.querySelectorAll('*');

            for (const element of allElements) {
                if (element.shadowRoot) {
                    hosts.push(element);
                }
            }
        } catch (error) {
            console.error('[DOMTraverser] 查找Shadow Host失败:', error);
        }

        return hosts;
    }

    /**
     * 查找所有iframe
     * @private
     */
    static _findAllIframes(root) {
        try {
            return Array.from(root.querySelectorAll('iframe'));
        } catch (error) {
            console.error('[DOMTraverser] 查找iframe失败:', error);
            return [];
        }
    }

    /**
     * 在所有根节点中查询元素
     * @param {string} selector - CSS选择器
     * @param {Document|HTMLElement} startRoot - 起始根节点
     * @returns {HTMLElement[]} 找到的所有元素
     */
    static querySelectorAllDeep(selector, startRoot = document) {
        const elements = [];
        const roots = this.getAllAccessibleRoots(startRoot);

        for (const { root } of roots) {
            try {
                const found = root.querySelectorAll(selector);
                elements.push(...Array.from(found));
            } catch (error) {
                // 忽略查询错误
            }
        }

        return elements;
    }

    /**
     * 查找表单字段（穿透Shadow DOM和iframe）
     * @param {Document|HTMLElement} startRoot
     * @returns {HTMLElement[]}
     */
    static findAllFormFieldsDeep(startRoot = document) {
        console.log('[DOMTraverser] 开始深度扫描表单字段（包括Shadow DOM和iframe）...');

        const fields = [];
        const roots = this.getAllAccessibleRoots(startRoot);

        const selectors = [
            'input[type="text"]',
            'input[type="email"]',
            'input[type="tel"]',
            'input[type="number"]',
            'input[type="date"]',
            'input[type="month"]',
            'input[type="search"]',
            'input[type="url"]',
            'input[type="password"]',
            'input:not([type])', // 默认是 text 类型
            'textarea',
            'select',
            'input[type="radio"]',
            'input[type="checkbox"]',
            '[contenteditable="true"]'
        ];

        for (const { root, type, iframe } of roots) {
            try {
                for (const selector of selectors) {
                    const elements = root.querySelectorAll(selector);
                    for (const element of elements) {
                        // 标记元素来源
                        element._autofillSource = {
                            type: type,
                            iframe: iframe
                        };
                        fields.push(element);
                    }
                }
            } catch (error) {
                console.error(`[DOMTraverser] 扫描 ${type} 失败:`, error);
            }
        }

        console.log(`[DOMTraverser] 深度扫描完成，找到 ${fields.length} 个字段`);
        return fields;
    }

    /**
     * 获取元素的真实根节点（document/shadowRoot/iframeDocument）
     * @param {HTMLElement} element
     * @returns {Document|ShadowRoot}
     */
    static getRootNode(element) {
        if (!element) return document;

        // 使用原生getRootNode方法
        if (typeof element.getRootNode === 'function') {
            return element.getRootNode();
        }

        // 降级方案：向上查找
        let current = element;
        while (current.parentNode) {
            current = current.parentNode;
        }

        return current;
    }

    /**
     * 判断元素是否在Shadow DOM中
     * @param {HTMLElement} element
     * @returns {boolean}
     */
    static isInShadowDOM(element) {
        const root = this.getRootNode(element);
        return root instanceof ShadowRoot;
    }

    /**
     * 判断元素是否在iframe中
     * @param {HTMLElement} element
     * @returns {boolean}
     */
    static isInIframe(element) {
        try {
            return element.ownerDocument !== window.document;
        } catch (error) {
            return false;
        }
    }

    /**
     * 获取元素的标签（增强版：支持Shadow DOM）
     * @param {HTMLElement} element
     * @param {Function} getLabelFn - DOMUtils.getLabel函数
     * @returns {string}
     */
    static getLabelDeep(element, getLabelFn) {
        // 先尝试常规方法
        let label = getLabelFn(element);
        if (label) return label;

        // 如果在Shadow DOM中，需要在同一个Shadow Root中查找label
        if (this.isInShadowDOM(element)) {
            const shadowRoot = this.getRootNode(element);

            // 查找关联的label
            if (element.id) {
                const labelEl = shadowRoot.querySelector(`label[for="${element.id}"]`);
                if (labelEl) {
                    return labelEl.textContent.trim();
                }
            }
        }

        return '';
    }

    /**
     * 在所有根节点中查找"添加"按钮
     * @returns {HTMLElement[]}
     */
    static findAddButtonsDeep() {
        const buttons = [];
        const roots = this.getAllAccessibleRoots();

        for (const { root } of roots) {
            try {
                // 查找所有可点击元素
                const clickables = root.querySelectorAll('button, a, div[onclick], span[onclick]');

                for (const el of clickables) {
                    // 可见性检查（需要在正确的document上下文中）
                    if (!this._isVisibleInContext(el)) continue;

                    const text = el.textContent.trim();
                    const className = el.className || '';
                    const id = el.id || '';

                    // 匹配"添加"相关文字
                    const addPatterns = [
                        /^[\+\s]*(添加|增加|新增)/,
                        /^[\+\s]*(add|plus|new)/i
                    ];

                    const hasAddText = addPatterns.some(pattern => pattern.test(text));
                    const hasAddClass = /add|plus|append/i.test(className) || /add|plus|append/i.test(id);

                    // 排除无关按钮
                    const excludePatterns = [
                        /职位|岗位|投递|收藏|关注|保存|提交/
                    ];
                    const isExcluded = excludePatterns.some(pattern => pattern.test(text));

                    if ((hasAddText || hasAddClass) && !isExcluded) {
                        buttons.push(el);
                    }
                }
            } catch (error) {
                console.error('[DOMTraverser] 查找添加按钮失败:', error);
            }
        }

        return buttons;
    }

    /**
     * 判断元素在其上下文中是否可见
     * @private
     */
    static _isVisibleInContext(element) {
        if (!element) return false;

        try {
            // 获取元素所在的window对象
            const elementWindow = element.ownerDocument.defaultView || window;
            const computedStyle = elementWindow.getComputedStyle(element);

            if (computedStyle.display === 'none' ||
                computedStyle.visibility === 'hidden' ||
                parseFloat(computedStyle.opacity) === 0) {
                return false;
            }

            if (element.offsetWidth === 0 && element.offsetHeight === 0) {
                return false;
            }

            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * 获取统计信息
     * @returns {Object}
     */
    static getStats() {
        const roots = this.getAllAccessibleRoots();

        const stats = {
            totalRoots: roots.length,
            documents: roots.filter(r => r.type === 'document').length,
            shadowRoots: roots.filter(r => r.type === 'shadowRoot').length,
            iframes: roots.filter(r => r.type === 'iframe').length
        };

        return stats;
    }

    /**
     * 调试：打印所有根节点信息
     */
    static debugPrintRoots() {
        const roots = this.getAllAccessibleRoots();
        console.log('=== DOM Traverser 根节点信息 ===');
        console.log(`总计: ${roots.length} 个根节点`);

        roots.forEach((item, index) => {
            console.log(`\n[${index + 1}] ${item.type}`);
            if (item.iframe) {
                console.log(`  - iframe src: ${item.iframe.src || '(空)'}`);
            }
            console.log(`  - 表单字段数量: ${item.root.querySelectorAll('input, select, textarea').length}`);
        });

        console.log('\n统计信息:');
        console.log(this.getStats());
    }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DOMTraverser;
}
