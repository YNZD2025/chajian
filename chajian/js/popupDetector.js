/**
 * 动态弹窗检测模块
 *
 * 核心功能：
 * 1. 使用MutationObserver实时监听DOM变化
 * 2. 自动检测新出现的弹窗（下拉选项、日期选择器、自动完成等）
 * 3. 区分弹窗类型（dropdown/datepicker/autocomplete）
 * 4. 提供弹窗中选项的智能匹配功能
 *
 * 目标：解决动态UI组件无法填写的问题，填写成功率从30%提升至90%+
 */

// 全局变量
let dynamicPopups = []; // 存储所有检测到的弹窗
let popupObserver = null; // MutationObserver实例
let elementsStylesCache = new Map(); // 元素样式缓存

/**
 * 初始化动态弹窗检测
 */
function initDynamicPopupDetection() {
    console.log('[弹窗检测] 初始化动态弹窗检测器...');

    // 清理旧的observer
    if (popupObserver) {
        popupObserver.disconnect();
    }

    // 重置状态
    dynamicPopups = [];
    elementsStylesCache.clear();

    // 创建MutationObserver
    popupObserver = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            // 检测新增节点
            if (mutation.type === 'childList') {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // 检测是否为潜在弹窗
                        if (isPotentialPopup(node)) {
                            const popupType = inferPopupType(node);
                            console.log('[弹窗检测] 检测到新弹窗:', popupType, node);

                            dynamicPopups.push({
                                element: node,
                                type: popupType,
                                timestamp: Date.now()
                            });
                        }
                    }
                }

                // 检测移除的节点
                for (const node of mutation.removedNodes) {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // 从列表中移除
                        dynamicPopups = dynamicPopups.filter(p => p.element !== node);
                    }
                }
            }

            // 检测属性变化（style, class）
            if (mutation.type === 'attributes') {
                const target = mutation.target;
                if (target.nodeType === Node.ELEMENT_NODE) {
                    // 检测元素是否从不可见变为可见
                    const oldStyles = elementsStylesCache.get(target) || {};
                    const newStyles = window.getComputedStyle(target);

                    const wasHidden = oldStyles.display === 'none' ||
                                      oldStyles.visibility === 'hidden' ||
                                      parseFloat(oldStyles.opacity) === 0;

                    const isNowVisible = newStyles.display !== 'none' &&
                                          newStyles.visibility !== 'hidden' &&
                                          parseFloat(newStyles.opacity) > 0;

                    if (wasHidden && isNowVisible && isPotentialPopup(target)) {
                        const popupType = inferPopupType(target);
                        console.log('[弹窗检测] 元素变为可见（弹窗）:', popupType, target);

                        // 避免重复添加
                        const alreadyExists = dynamicPopups.some(p => p.element === target);
                        if (!alreadyExists) {
                            dynamicPopups.push({
                                element: target,
                                type: popupType,
                                timestamp: Date.now()
                            });
                        }
                    }

                    // 更新缓存
                    elementsStylesCache.set(target, {
                        display: newStyles.display,
                        visibility: newStyles.visibility,
                        opacity: newStyles.opacity
                    });
                }
            }
        }
    });

    // 开始监听（监听整个body的所有子节点变化）
    popupObserver.observe(document.body, {
        childList: true,
        subtree: true,
        attributeFilter: ['class', 'style']
    });

    console.log('[弹窗检测] 动态弹窗检测器已启动');
}

/**
 * 停止动态弹窗检测
 */
function stopDynamicPopupDetection() {
    if (popupObserver) {
        popupObserver.disconnect();
        popupObserver = null;
        console.log('[弹窗检测] 动态弹窗检测器已停止');
    }
}

/**
 * 判断元素是否为潜在弹窗
 * @param {HTMLElement} element - 待检测元素
 * @returns {boolean} 是否为潜在弹窗
 */
function isPotentialPopup(element) {
    // 0. 排除我们自己添加的元素
    const className = (typeof element.className === 'string' ? element.className : element.className.baseVal || '');
    const id = element.id || '';

    // 如果是插件自己添加的元素，直接排除
    if (className.includes('yinianzhida') || id.includes('yinianzhida')) {
        return false;
    }

    const styles = window.getComputedStyle(element);

    // 1. 检查是否为浮动定位
    const isFloating = ['absolute', 'fixed'].includes(styles.position);
    if (!isFloating) {
        return false;
    }

    // 2. 检查z-index是否较高
    const zIndex = parseInt(styles.zIndex) || 0;
    const hasHighZIndex = zIndex > 100;
    if (!hasHighZIndex) {
        return false;
    }

    // 3. 检查是否可见
    const isVisible = styles.display !== 'none' &&
                      styles.visibility !== 'hidden' &&
                      parseFloat(styles.opacity) > 0;
    if (!isVisible) {
        return false;
    }

    // 4. 检查是否在视口内
    const rect = element.getBoundingClientRect();
    const inViewport = rect.width > 0 &&
                       rect.height > 0 &&
                       rect.top >= 0 &&
                       rect.left >= 0 &&
                       rect.bottom <= window.innerHeight * 1.5 && // 允许一定的超出
                       rect.right <= window.innerWidth * 1.5;

    return inViewport;
}

/**
 * 基于内容模式检测日期选择器类型
 * 借鉴求职方舟的实现：通过检测弹窗内容特征来识别，不依赖UI框架
 * @param {HTMLElement} element - 弹窗元素
 * @returns {string|null} 'date-panel' | 'month-picker' | 'year-picker' | null
 */
function detectDatePickerPattern(element) {
    if (!element) {
        return null;
    }

    // 获取弹窗中所有可见的文本选项
    const options = getPopupTextOptionsStrict(element);

    // 如果选项太少，不太可能是日期选择器
    if (options.length < 4) {
        return null;
    }

    const joined = options.join(';');

    // 🎯 检测年份选择器（连续的年份，如：2020;2021;2022;2023...）
    const yearPattern = /20\d{2}/g;
    const years = joined.match(yearPattern) || [];
    if (years.length >= 5) {
        // 检查是否是连续的年份
        const yearNumbers = years.map(y => parseInt(y)).sort((a, b) => a - b);
        let consecutive = 0;
        for (let i = 1; i < yearNumbers.length; i++) {
            if (yearNumbers[i] === yearNumbers[i-1] + 1) {
                consecutive++;
            }
        }
        if (consecutive >= 3) {
            console.log('[日期识别] 检测到年份选择器:', options.slice(0, 10));
            return 'year-picker';
        }
    }

    // 🎯 检测月份选择器（1月-12月 或 一月-十二月）
    if (options.length >= 12) {
        const monthPattern = "1月;2月;3月;4月;5月;6月;7月;8月;9月;10月;11月;12月";
        const monthPatternEn = "January;February;March;April;May;June;July;August;September;October;November;December";
        const monthPatternShort = "Jan;Feb;Mar;Apr;May;Jun;Jul;Aug;Sep;Oct;Nov;Dec";

        if (joined.includes(monthPattern) ||
            joined.includes(monthPatternEn) ||
            joined.includes(monthPatternShort)) {
            console.log('[日期识别] 检测到月份选择器:', options.slice(0, 12));
            return 'month-picker';
        }

        // 检测"一月"、"二月"等中文大写月份
        const chineseMonths = ["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"];
        const matchedChineseMonths = chineseMonths.filter(m => options.includes(m));
        if (matchedChineseMonths.length >= 10) {
            console.log('[日期识别] 检测到中文月份选择器:', matchedChineseMonths);
            return 'month-picker';
        }
    }

    // 🎯 检测日期面板（1-31的数字 + 可能包含星期）
    if (options.length >= 28) {
        // 检查是否包含连续的日期数字（1-28至少要有20个）
        const datePattern = "1;2;3;4;5;6;7;8;9;10;11;12;13;14;15;16;17;18;19;20;21;22;23;24;25;26;27;28";
        const dateNumbers = datePattern.split(';');

        let matchCount = 0;
        for (const num of dateNumbers) {
            if (options.includes(num)) {
                matchCount++;
            }
        }

        // 如果匹配到至少20个日期数字，认为是日期面板
        if (matchCount >= 20) {
            // 进一步验证：检查是否有星期（一、二、三、四、五、六、日 或 Mon、Tue等）
            const chineseWeekdays = ["一", "二", "三", "四", "五", "六", "日"];
            const hasWeekdays = chineseWeekdays.some(w => options.includes(w) || joined.includes(w));

            const englishWeekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
            const hasEnglishWeekdays = englishWeekdays.some(w => options.includes(w));

            if (hasWeekdays || hasEnglishWeekdays) {
                console.log('[日期识别] 检测到日期面板（带星期）:', options.slice(0, 35));
                return 'date-panel';
            }

            // 即使没有星期，匹配足够多的连续数字也认为是日期面板
            if (matchCount >= 25) {
                console.log('[日期识别] 检测到日期面板（纯数字）:', options.slice(0, 31));
                return 'date-panel';
            }
        }
    }

    return null;
}

/**
 * 推断弹窗类型
 * @param {HTMLElement} element - 弹窗元素
 * @returns {string} 弹窗类型 (datepicker|month-picker|year-picker|dropdown|autocomplete|unknown)
 */
function inferPopupType(element) {
    const className = element.className ? element.className.toLowerCase() : '';
    const innerText = element.innerText ? element.innerText.toLowerCase() : '';

    // ✅ 优先使用基于内容的模式识别（更准确、更通用）
    const contentPattern = detectDatePickerPattern(element);
    if (contentPattern) {
        return contentPattern; // 'date-panel' | 'month-picker' | 'year-picker'
    }

    // 日期选择器特征（基于class和文本）
    if (className.includes('datepicker') ||
        className.includes('calendar') ||
        className.includes('date-picker') ||
        /\d{4}.*年.*\d{1,2}.*月/.test(innerText) ||
        innerText.includes('今天') && innerText.includes('确定')) {
        return 'datepicker';
    }

    // 下拉选项特征
    if (className.includes('dropdown') ||
        className.includes('select-dropdown') ||
        className.includes('options') ||
        className.includes('menu') ||
        element.querySelector('li') ||
        element.querySelector('.option')) {
        return 'dropdown';
    }

    // 自动完成特征
    if (className.includes('autocomplete') ||
        className.includes('suggestions') ||
        className.includes('typeahead')) {
        return 'autocomplete';
    }

    return 'unknown';
}

/**
 * 获取当前可见的弹窗
 * @returns {Object|null} 弹窗对象 {element, type, timestamp}
 */
function getVisiblePopup() {
    const now = Date.now();

    for (const popup of dynamicPopups) {
        // 确认弹窗仍然可见
        const styles = window.getComputedStyle(popup.element);
        const isVisible = styles.display !== 'none' &&
                          styles.visibility !== 'hidden' &&
                          parseFloat(styles.opacity) > 0;

        if (!isVisible) {
            continue;
        }

        // 确认弹窗在视口内
        const rect = popup.element.getBoundingClientRect();
        const inViewport = rect.width > 0 &&
                           rect.height > 0 &&
                           rect.top >= 0 &&
                           rect.left >= 0 &&
                           rect.bottom <= window.innerHeight &&
                           rect.right <= window.innerWidth;

        if (inViewport) {
            return popup;
        }
    }

    return null;
}

/**
 * 检测是否有可见的弹窗
 * @returns {boolean} 是否有可见弹窗
 */
function hasVisiblePopup() {
    return getVisiblePopup() !== null;
}

/**
 * 在弹窗中查找匹配的选项
 * @param {HTMLElement} popupElement - 弹窗元素
 * @param {string} value - 要匹配的值
 * @param {boolean} exactMatch - 是否精确匹配
 * @param {boolean} fuzzyMatch - 是否模糊匹配
 * @returns {HTMLElement|null} 匹配的选项元素
 */
function findOptionInPopup(popupElement, value, exactMatch = true, fuzzyMatch = false) {
    if (!popupElement || !value) {
        return null;
    }

    // ✅ 优化：优先查找标准选项元素，然后才查找其他元素
    const priorityCandidates = popupElement.querySelectorAll('[role="option"], li');
    const allCandidates = popupElement.querySelectorAll('li, span, div, a, button, [role="option"]');

    // ✅ 过滤函数：排除头部工具栏、图标等非选项元素
    const isValidOption = (elem) => {
        const className = elem.className || '';
        const text = elem.textContent?.trim() || '';

        // 排除图标、箭头、旋转按钮等
        if (/icon|arrow|rotate|close|header|toolbar|nav/i.test(className)) {
            return false;
        }

        // 排除空文本或过长文本
        if (!text || text.length === 0 || text.length > 200) {
            return false;
        }

        // ✅ 排除嵌套元素（只保留叶子节点或浅层节点）
        const childrenWithText = Array.from(elem.children).filter(child =>
            child.textContent?.trim() && child.textContent.trim() !== text
        );
        if (childrenWithText.length > 3) {
            return false;
        }

        return true;
    };

    // ✅ 1. 优先在标准选项中精确匹配
    if (exactMatch) {
        for (const elem of priorityCandidates) {
            if (!isValidOption(elem)) continue;
            const text = elem.textContent?.trim();
            if (text === value) {
                console.log(`[findOptionInPopup] ✅ 精确匹配（优先）: "${text}"`, elem);
                return elem;
            }
        }
    }

    // 2. 在所有候选元素中精确匹配
    if (exactMatch) {
        for (const elem of allCandidates) {
            if (priorityCandidates.includes && Array.from(priorityCandidates).includes(elem)) {
                continue; // 已经检查过了
            }
            if (!isValidOption(elem)) continue;
            const text = elem.textContent?.trim();
            if (text === value) {
                console.log(`[findOptionInPopup] ✅ 精确匹配: "${text}"`, elem);
                return elem;
            }
        }
    }

    // 3. 前缀匹配（例如：匹配"北京市" 可以找到 "北京"）
    if (fuzzyMatch) {
        for (const elem of allCandidates) {
            if (!isValidOption(elem)) continue;
            const text = elem.textContent?.trim();
            if (text && text.startsWith(value)) {
                console.log(`[findOptionInPopup] ✅ 模糊匹配（前缀）: "${text}"`, elem);
                return elem;
            }
            if (value.startsWith(text)) {
                console.log(`[findOptionInPopup] ✅ 模糊匹配（包含）: "${text}"`, elem);
                return elem;
            }
        }
    }

    // 4. 数字范围匹配（例如：匹配"25" 可以找到 "20-30"）
    if (fuzzyMatch && /^\d+$/.test(value)) {
        const numValue = parseInt(value);
        for (const elem of allCandidates) {
            if (!isValidOption(elem)) continue;
            const text = elem.textContent?.trim();
            const rangeMatch = text?.match(/^(\d+)\s*-\s*(\d+)$/);
            if (rangeMatch) {
                const min = parseInt(rangeMatch[1]);
                const max = parseInt(rangeMatch[2]);
                if (numValue >= min && numValue <= max) {
                    console.log(`[findOptionInPopup] ✅ 数字范围匹配: "${text}"`, elem);
                    return elem;
                }
            }
        }
    }

    console.log(`[findOptionInPopup] ❌ 未找到匹配: "${value}"`);
    return null;
}

/**
 * 获取弹窗中的所有文本选项（宽松版本，用于一般匹配）
 * @param {HTMLElement} popupElement - 弹窗元素
 * @returns {Array<string>} 文本选项数组
 */
function getPopupTextOptions(popupElement) {
    if (!popupElement) {
        return [];
    }

    const options = [];
    const candidates = popupElement.querySelectorAll('li, span, div, a, button, [role="option"]');

    for (const elem of candidates) {
        const text = elem.textContent?.trim();
        if (text && text.length > 0 && text.length < 100) {
            // 确保是叶子节点（没有子元素）或者子元素文本相同
            const hasChildText = Array.from(elem.children).some(child =>
                child.textContent?.trim() && child.textContent !== text
            );

            if (!hasChildText) {
                options.push(text);
            }
        }
    }

    // 去重
    return [...new Set(options)];
}

/**
 * 获取弹窗中的所有文本选项（严格版本，用于日期选择器识别）
 * 借鉴求职方舟的实现：只提取纯文本叶子节点，避免提取父容器
 * @param {HTMLElement} popupElement - 弹窗元素
 * @returns {Array<string>} 文本选项数组
 */
function getPopupTextOptionsStrict(popupElement) {
    if (!popupElement) {
        return [];
    }

    const options = [];
    const elements = popupElement.querySelectorAll('*');
    let skipContainer = null;

    for (const element of elements) {
        // 🎯 跳过已处理的容器（性能优化）
        if (skipContainer && skipContainer.contains(element)) {
            continue;
        }

        // 检查元素是否可见
        const styles = window.getComputedStyle(element);
        const isVisible = styles.display !== 'none' &&
                          styles.visibility !== 'hidden' &&
                          parseFloat(styles.opacity) > 0;

        if (!isVisible) {
            skipContainer = element;
            continue;
        }

        // 🎯 关键：只提取纯文本节点（childNodes中只有TEXT_NODE）
        let onlyText = true;
        for (const child of element.childNodes) {
            if (child.nodeType !== Node.TEXT_NODE) {
                onlyText = false;
                break;
            }
        }

        if (onlyText && element.childNodes.length > 0) {
            const text = element.textContent?.trim();
            if (text && text !== "") {
                options.push(text);
            }
        }
    }

    // 去重
    return [...new Set(options)];
}

/**
 * 清理过期的弹窗（超过5秒未使用）
 */
function cleanupOldPopups() {
    const now = Date.now();
    const timeout = 5000; // 5秒

    dynamicPopups = dynamicPopups.filter(popup => {
        return now - popup.timestamp < timeout;
    });
}

// 定时清理过期弹窗
setInterval(cleanupOldPopups, 2000);

// 导出函数（供其他模块使用）
if (typeof window !== 'undefined') {
    window.initDynamicPopupDetection = initDynamicPopupDetection;
    window.stopDynamicPopupDetection = stopDynamicPopupDetection;
    window.getVisiblePopup = getVisiblePopup;
    window.hasVisiblePopup = hasVisiblePopup;
    window.findOptionInPopup = findOptionInPopup;
    window.getPopupTextOptions = getPopupTextOptions;
    window.getPopupTextOptionsStrict = getPopupTextOptionsStrict;
    window.detectDatePickerPattern = detectDatePickerPattern;
    console.log('[弹窗检测] 模块已加载，新增基于内容的日期选择器识别功能 ✅');
}
