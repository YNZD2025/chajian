/**
 * DOM操作工具类
 * 提供常用的DOM查询、判断、操作方法
 */

class DOMUtils {
    /**
     * 判断元素是否可见
     * @param {HTMLElement} element
     * @param {boolean} checkViewport - 是否检查视口范围（默认false，因为可以滚动到视野）
     * @returns {boolean}
     */
    static isVisible(element, checkViewport = false) {
        if (!element || !document.contains(element)) {
            return false;
        }

        // 检查元素自身和所有祖先元素的可见性
        let el = element;
        while (el) {
            const style = window.getComputedStyle(el);

            if (style.display === 'none' ||
                style.visibility === 'hidden' ||
                parseFloat(style.opacity) === 0 ||
                el.hidden) {
                return false;
            }

            // 检查尺寸 - 放宽条件，只要有一个维度大于0就可以
            if (el.offsetWidth === 0 && el.offsetHeight === 0 && el.getClientRects().length === 0) {
                return false;
            }

            el = el.parentElement;
        }

        // 可选：检查是否在视口范围内（默认不检查，因为ProgressiveFiller可以滚动）
        if (checkViewport) {
            const rect = element.getBoundingClientRect();
            return rect.bottom > 0 &&
                   rect.right > 0 &&
                   rect.top < window.innerHeight &&
                   rect.left < window.innerWidth;
        }

        return true;
    }

    /**
     * 滚动元素到视野中心
     * @param {HTMLElement} element
     */
    static async scrollIntoView(element) {
        if (!element) return;

        try {
            element.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
                inline: 'center'
            });

            // 等待滚动完成
            await this.delay(300);
        } catch (error) {
            // 降级方案
            element.scrollIntoView();
            await this.delay(100);
        }
    }

    /**
     * 获取元素的标签文本（增强版 - 参考求职方舟的8层策略）
     * @param {HTMLElement} element
     * @returns {string}
     */
    static getLabel(element) {
        if (!element) return '';

        const cleanLabel = (text) => {
            if (!text) return '';
            let cleaned = text.trim();
            // 移除常见的提示词
            cleaned = cleaned.replace(/^请?(选择|输入|填写|填入)\s*/g, '');
            cleaned = cleaned.replace(/^\s*(请选择|请输入|请填写|您的|你的)\s*/g, '');
            // 移除冒号、星号和多余空格
            cleaned = cleaned.replace(/[:\s*]*$/g, '');
            cleaned = cleaned.replace(/^\s*[*]\s*/g, '');
            return cleaned;
        };

        // ========== 策略1: 优先获取placeholder（最直接） ==========
        const placeholder = element.getAttribute('placeholder');
        if (placeholder && !/^(请选择|请输入|请填写|YYYY|MM|DD|---)$/.test(placeholder)) {
            return cleanLabel(placeholder);
        }

        // ========== 策略2: 查找关联的<label>标签 ==========
        // 2.1 通过for属性关联
        if (element.id) {
            const label = document.querySelector(`label[for="${element.id}"]`);
            if (label) {
                const text = label.textContent.trim();
                if (text && /[\u4e00-\u9fa5]/.test(text)) {
                    return cleanLabel(text);
                }
            }
        }

        // 2.2 查找父级label
        let parent = element.parentElement;
        let depth = 0;
        while (parent && parent !== document.body && depth < 5) {
            if (parent.tagName === 'LABEL') {
                // 获取label的直接文本，排除子元素
                let labelText = '';
                for (const node of parent.childNodes) {
                    if (node.nodeType === Node.TEXT_NODE) {
                        labelText += node.nodeValue;
                    }
                }
                labelText = labelText.trim();
                if (labelText && /[\u4e00-\u9fa5]/.test(labelText)) {
                    return cleanLabel(labelText);
                }
            }
            parent = parent.parentElement;
            depth++;
        }

        // ========== 策略3: 查找前置的兄弟元素（智能定位） ==========
        try {
            const rect = element.getBoundingClientRect();
            const searchDistance = 200; // 搜索范围：200px

            let bestLabel = '';
            let bestDistance = Infinity;

            // 获取所有可能的标签候选
            const allElements = Array.from(document.querySelectorAll('*')).filter(el => {
                return this.isVisible(el) && el !== element && !element.contains(el) && !el.contains(element);
            });

            for (const candidate of allElements) {
                // 跳过没有中文的元素
                const text = candidate.textContent.trim();
                if (!text || !/[\u4e00-\u9fa5]/.test(text)) continue;

                // 跳过太长的文本（可能是段落）
                if (text.length > 30) continue;

                // 跳过包含输入框的元素
                if (candidate.querySelector('input, select, textarea')) continue;

                // 必须是叶子节点或接近叶子节点
                const hasOnlyTextChildren = Array.from(candidate.children).every(child =>
                    child.children.length === 0
                );
                if (candidate.children.length > 3 && !hasOnlyTextChildren) continue;

                const candidateRect = candidate.getBoundingClientRect();

                // 计算位置关系
                const isOnLeft = candidateRect.right <= rect.left + 20; // 在左侧
                const isAbove = candidateRect.bottom <= rect.top + 20;  // 在上方
                const isSameRow = Math.abs(candidateRect.top - rect.top) < 40; // 同一行
                const isSameColumn = Math.abs(candidateRect.left - rect.left) < 20; // 同一列

                // 只考虑在左侧同行 或 在上方同列的元素
                if (!((isOnLeft && isSameRow) || (isAbove && isSameColumn))) {
                    continue;
                }

                // 计算距离
                let distance;
                if (isOnLeft && isSameRow) {
                    // 左侧同行：计算水平距离
                    distance = rect.left - candidateRect.right;
                } else {
                    // 上方同列：计算垂直距离
                    distance = rect.top - candidateRect.bottom;
                }

                // 距离必须在合理范围内
                if (distance < 0 || distance > searchDistance) continue;

                // 选择距离最近的标签
                if (distance < bestDistance) {
                    bestDistance = distance;
                    bestLabel = text;
                }
            }

            if (bestLabel) {
                return cleanLabel(bestLabel);
            }
        } catch (e) {
            // 忽略错误，继续下一个策略
        }

        // ========== 策略4: 查找父容器的首个文本节点 ==========
        parent = element.parentElement;
        depth = 0;
        while (parent && parent !== document.body && depth < 3) {
            for (const child of parent.childNodes) {
                if (child.nodeType === Node.TEXT_NODE) {
                    const text = child.nodeValue.trim();
                    if (text && /[\u4e00-\u9fa5]/.test(text) && text.length < 20) {
                        return cleanLabel(text);
                    }
                } else if (child.nodeType === Node.ELEMENT_NODE && child !== element && !child.contains(element)) {
                    if (child.children.length === 0) {
                        const text = child.textContent.trim();
                        if (text && /[\u4e00-\u9fa5]/.test(text) && text.length < 20) {
                            return cleanLabel(text);
                        }
                    }
                }
            }
            parent = parent.parentElement;
            depth++;
        }

        // ========== 策略5: 通过属性推断字段类型 ==========
        const inferredLabel = this.inferFieldTypeFromAttributes(element);
        if (inferredLabel) {
            return inferredLabel;
        }

        // ========== 策略6: 查找aria-label属性 ==========
        const ariaLabel = element.getAttribute('aria-label');
        if (ariaLabel && /[\u4e00-\u9fa5]/.test(ariaLabel)) {
            return cleanLabel(ariaLabel);
        }

        // ========== 策略7: 查找title属性 ==========
        const title = element.getAttribute('title');
        if (title && /[\u4e00-\u9fa5]/.test(title) && title.length < 20) {
            return cleanLabel(title);
        }

        // ========== 策略8: 查找data-*属性 ==========
        for (const attr of element.attributes) {
            if (attr.name.startsWith('data-')) {
                const value = attr.value;
                if (value && /[\u4e00-\u9fa5]/.test(value) && value.length < 20) {
                    return cleanLabel(value);
                }
            }
        }

        return '';
    }

    /**
     * 通过属性推断字段类型
     * @param {HTMLElement} element
     * @returns {string}
     */
    static inferFieldTypeFromAttributes(element) {
        // 收集所有属性值
        let allAttributes = '';
        for (const attr of element.attributes) {
            allAttributes += ' ' + attr.value.toLowerCase();
        }

        const name = (element.name || '').toLowerCase();
        const id = (element.id || '').toLowerCase();
        const className = (element.className || '').toLowerCase();

        const combined = `${allAttributes} ${name} ${id} ${className}`;

        // 根据属性值推断字段类型
        if (/name|姓名/.test(combined)) return '姓名';
        if (/gender|性别|sex/.test(combined)) return '性别';
        if (/phone|mobile|tel|电话|手机/.test(combined)) return '手机号';
        if (/email|邮箱/.test(combined)) return '邮箱';
        if (/birth|birthday|生日|出生/.test(combined)) return '出生日期';
        if (/education|学历|edu/.test(combined)) return '学历';
        if (/degree|学位/.test(combined)) return '学位';
        if (/school|院校|学校|university/.test(combined)) return '学校';
        if (/major|专业/.test(combined)) return '专业';
        if (/company|公司/.test(combined)) return '公司';
        if (/position|职位|岗位/.test(combined)) return '职位';
        if (/salary|薪资|工资/.test(combined)) return '薪资';

        return '';
    }

    /**
     * 获取元素的占位符文本
     * @param {HTMLElement} element
     * @returns {string}
     */
    static getPlaceholder(element) {
        if (!element) return '';

        // input/textarea 的 placeholder 属性
        if (element.placeholder) {
            return element.placeholder.trim();
        }

        // contenteditable 元素的 data-placeholder
        if (element.dataset?.placeholder) {
            return element.dataset.placeholder.trim();
        }

        return '';
    }

    /**
     * 查找所有表单字段
     * @param {HTMLElement} root
     * @param {boolean} deep - 是否深度扫描（包括Shadow DOM和iframe）
     * @returns {HTMLElement[]}
     */
    static findAllFormFields(root = document.body, deep = true) {
        // ✅ 如果启用深度扫描，使用DOMTraverser
        if (deep && typeof DOMTraverser !== 'undefined') {
            console.log('[DOMUtils] 使用深度扫描模式（包括Shadow DOM和iframe）');
            return DOMTraverser.findAllFormFieldsDeep(root);
        }

        // 传统扫描模式
        const fields = [];

        // 查找所有可能的表单元素
        const selectors = [
            'input[type="text"]',
            'input[type="email"]',
            'input[type="tel"]',
            'input[type="number"]',
            'input[type="date"]',
            'input[type="search"]',
            'input:not([type])', // 默认是 text 类型
            'textarea',
            'select',
            'input[type="radio"]',
            'input[type="checkbox"]',
            '[contenteditable="true"]'
        ];

        for (const selector of selectors) {
            const elements = root.querySelectorAll(selector);
            fields.push(...Array.from(elements));
        }

        // 去重
        return Array.from(new Set(fields));
    }

    /**
     * 查找"添加"按钮
     * @param {boolean} deep - 是否深度扫描（包括Shadow DOM和iframe）
     * @returns {HTMLElement[]}
     */
    static findAddButtons(deep = true) {
        // ✅ 如果启用深度扫描，使用DOMTraverser
        if (deep && typeof DOMTraverser !== 'undefined') {
            console.log('[DOMUtils] 使用深度扫描查找添加按钮');
            return DOMTraverser.findAddButtonsDeep();
        }

        // 传统扫描模式
        const buttons = [];

        // 查找所有可点击元素
        const clickables = document.querySelectorAll('button, a, div[onclick], span[onclick]');

        for (const el of clickables) {
            if (!this.isVisible(el)) continue;

            const text = el.textContent.trim();
            const className = el.className || '';
            const id = el.id || '';

            // 匹配"添加"相关文字
            const addPatterns = [
                /^[\+\s]*(添加|增加|新增)/,
                /^[\+\s]*(add|plus|new)/i
            ];

            const hasAddText = addPatterns.some(pattern => pattern.test(text));

            // 匹配class/id中的add关键词
            const hasAddClass = /add|plus|append/i.test(className) || /add|plus|append/i.test(id);

            // 排除包含"职位"、"投递"等无关按钮
            const excludePatterns = [
                /职位|岗位|投递|收藏|关注|保存|提交/
            ];
            const isExcluded = excludePatterns.some(pattern => pattern.test(text));

            if ((hasAddText || hasAddClass) && !isExcluded) {
                buttons.push(el);
            }
        }

        return buttons;
    }

    /**
     * 获取元素的所有可见祖先
     * @param {HTMLElement} element
     * @returns {HTMLElement[]}
     */
    static getVisibleAncestors(element) {
        const ancestors = [];
        let el = element.parentElement;

        while (el && el !== document.body) {
            if (this.isVisible(el)) {
                ancestors.push(el);
            }
            el = el.parentElement;
        }

        return ancestors;
    }

    /**
     * 延迟工具方法
     * @param {number} ms
     * @returns {Promise<void>}
     */
    static delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 清理文本（去除多余空白和特殊字符）
     * @param {string} text
     * @returns {string}
     */
    static cleanText(text) {
        if (!text) return '';

        return text
            .trim()
            .replace(/\s+/g, ' ')           // 多个空格合并为一个
            .replace(/^[-\s*?？]+/, '')      // 去除开头的符号
            .replace(/[:：]\s*$/, '');       // 去除结尾的冒号
    }

    /**
     * 判断两个元素是否为同一个
     * @param {HTMLElement} el1
     * @param {HTMLElement} el2
     * @returns {boolean}
     */
    static isSameElement(el1, el2) {
        if (el1 === el2) return true;
        if (!el1 || !el2) return false;

        // 比较标签名
        if (el1.tagName !== el2.tagName) return false;

        // 比较className
        if (el1.className !== el2.className) return false;

        // 比较位置
        const rect1 = el1.getBoundingClientRect();
        const rect2 = el2.getBoundingClientRect();

        return rect1.left === rect2.left &&
               rect1.top === rect2.top &&
               rect1.width === rect2.width &&
               rect1.height === rect2.height;
    }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DOMUtils;
}
