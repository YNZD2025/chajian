/**
 * HTML简化算法模块
 *
 * 核心功能：
 * 1. 移除不可见元素（display:none, visibility:hidden等）
 * 2. 移除无用标签（script, style, img等）
 * 3. 清理文本节点（移除多余换行）
 * 4. 简化输入框为文本标记
 * 5. 移除所有HTML属性
 * 6. 递归移除空元素
 *
 * 目标：将复杂HTML压缩为纯文本结构，减少AI token消耗80%
 */

/**
 * 主函数：获取简化后的HTML
 * @returns {string} 简化后的HTML字符串
 */
function getSimplifiedHTML() {
    console.log('[HTML简化] 开始简化页面HTML...');

    // 1. 克隆DOM并记录所有元素的computed styles
    const { clone, stylesMap } = cloneDOMWithStyles(document.body);

    // 2. 移除插件自身元素（避免干扰）
    const pluginIds = ['yinianzhida-floating-container', 'yinianzhida-shadow-root'];
    for (const id of pluginIds) {
        const element = clone.querySelector(`#${id}`);
        if (element && element.parentNode) {
            element.parentNode.removeChild(element);
        }
    }

    // 3. 移除所有不可见元素
    const allElements = clone.querySelectorAll('*');
    for (const elem of allElements) {
        if (!isElementVisible(elem, stylesMap)) {
            if (elem.parentNode) {
                elem.parentNode.removeChild(elem);
            }
        }
    }

    // 4. 移除无用标签
    const uselessTags = [
        'noscript', 'script', 'link', 'style',
        'img', 'canvas', 'svg', 'video', 'audio'
    ];
    for (const tag of uselessTags) {
        const elements = clone.querySelectorAll(tag);
        elements.forEach(e => {
            if (e.parentNode) {
                e.parentNode.removeChild(e);
            }
        });
    }

    // 5. 清理文本节点（移除多余换行和空白）
    cleanTextNodes(clone);

    // 6. 输入框/下拉框替换为文本标记
    const inputs = clone.querySelectorAll('input, textarea');
    inputs.forEach(input => {
        const span = document.createElement('span');
        span.textContent = `[INPUT:${input.type || 'text'}:${input.placeholder || ''}]`;
        if (input.parentNode) {
            input.parentNode.replaceChild(span, input);
        }
    });

    const selects = clone.querySelectorAll('select');
    selects.forEach(select => {
        const span = document.createElement('span');
        const selectedOption = select.querySelector('option:checked') || select.querySelector('option');
        span.textContent = `[SELECT:${selectedOption ? selectedOption.textContent : ''}]`;
        if (select.parentNode) {
            select.parentNode.replaceChild(span, select);
        }
    });

    // 7. 递归移除空元素（需要多次迭代）
    let iteration = 0;
    const maxIterations = 10;
    while (hasEmptyElements(clone) && iteration < maxIterations) {
        removeEmptyElements(clone);
        iteration++;
    }

    // 8. 移除所有HTML属性（减少token）
    const finalElements = clone.querySelectorAll('*');
    finalElements.forEach(elem => {
        const attributes = Array.from(elem.attributes);
        attributes.forEach(attr => {
            elem.removeAttribute(attr.name);
        });
    });

    const result = clone.innerHTML.trim();
    console.log(`[HTML简化] 完成！原始长度: ${document.body.innerHTML.length}, 简化后: ${result.length}, 压缩率: ${(100 - result.length * 100 / document.body.innerHTML.length).toFixed(1)}%`);

    return result;
}

/**
 * 克隆DOM并记录computed styles
 * @param {HTMLElement} root - 根元素
 * @returns {{clone: HTMLElement, stylesMap: Map}} 克隆的DOM和样式映射
 */
function cloneDOMWithStyles(root) {
    const clone = root.cloneNode(true);
    const originals = root.querySelectorAll('*');
    const clones = clone.querySelectorAll('*');
    const stylesMap = new Map();

    let index = 0;
    for (const original of originals) {
        const computed = window.getComputedStyle(original);
        const styles = {
            display: computed.display,
            visibility: computed.visibility,
            opacity: computed.opacity
        };
        stylesMap.set(clones[index], styles);
        index++;
    }

    return { clone, stylesMap };
}

/**
 * 判断元素是否可见
 * @param {HTMLElement} elem - 待检测元素
 * @param {Map} stylesMap - 样式映射
 * @returns {boolean} 是否可见
 */
function isElementVisible(elem, stylesMap) {
    const styles = stylesMap.get(elem);
    if (!styles) {
        return true; // 默认可见
    }

    // 检查display
    if (styles.display === 'none') {
        return false;
    }

    // 检查visibility
    if (styles.visibility === 'hidden') {
        return false;
    }

    // 检查opacity
    if (parseFloat(styles.opacity) === 0) {
        return false;
    }

    // 检查hidden属性
    if (elem.hidden) {
        return false;
    }

    return true;
}

/**
 * 清理文本节点中的多余换行和空白
 * @param {HTMLElement} root - 根元素
 */
function cleanTextNodes(root) {
    const allElements = root.querySelectorAll('*');
    for (const elem of allElements) {
        if (elem.childNodes.length > 0) {
            for (const child of elem.childNodes) {
                if (child.nodeType === Node.TEXT_NODE) {
                    // 将多个连续的换行符替换为单个空格
                    child.nodeValue = child.nodeValue.replace(/\n\s*\n+/g, ' ').trim();
                }
            }
        }
    }
}

/**
 * 判断是否还有空元素
 * @param {HTMLElement} root - 根元素
 * @returns {boolean} 是否有空元素
 */
function hasEmptyElements(root) {
    const allElements = root.querySelectorAll('*');
    for (const elem of allElements) {
        if (elem.childNodes.length === 0 && elem.textContent.trim() === '') {
            return true;
        }

        // 检查是否只包含空的子元素
        let hasNonEmptyChild = false;
        for (const child of elem.childNodes) {
            if (child.nodeType === Node.TEXT_NODE && child.textContent.trim() !== '') {
                hasNonEmptyChild = true;
                break;
            }
            if (child.nodeType === Node.ELEMENT_NODE && child.textContent.trim() !== '') {
                hasNonEmptyChild = true;
                break;
            }
        }

        if (!hasNonEmptyChild && elem.childNodes.length > 0) {
            return true;
        }
    }
    return false;
}

/**
 * 移除空元素
 * @param {HTMLElement} root - 根元素
 */
function removeEmptyElements(root) {
    const allElements = Array.from(root.querySelectorAll('*')).reverse();

    for (const elem of allElements) {
        // 检查是否为空元素
        const isEmpty = elem.childNodes.length === 0 && elem.textContent.trim() === '';

        // 检查是否只包含空的子元素
        let hasOnlyEmptyChildren = true;
        if (elem.childNodes.length > 0) {
            for (const child of elem.childNodes) {
                if (child.nodeType === Node.TEXT_NODE && child.textContent.trim() !== '') {
                    hasOnlyEmptyChildren = false;
                    break;
                }
                if (child.nodeType === Node.ELEMENT_NODE && child.textContent.trim() !== '') {
                    hasOnlyEmptyChildren = false;
                    break;
                }
            }
        } else {
            hasOnlyEmptyChildren = false;
        }

        if (isEmpty || (hasOnlyEmptyChildren && elem.childNodes.length > 0)) {
            if (elem.parentNode) {
                elem.parentNode.removeChild(elem);
            }
        }
    }
}

// 导出函数（供其他模块使用）
if (typeof window !== 'undefined') {
    window.getSimplifiedHTML = getSimplifiedHTML;
    console.log('[HTML简化] 模块已加载');
}
