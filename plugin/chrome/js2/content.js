"use strict";

(async () => {
    // ==================== 注入高亮样式 ====================
    (() => {
        if (document.getElementById('ark-highlight-styles')) return;

        const style = document.createElement('style');
        style.id = 'ark-highlight-styles';
        style.textContent = `
            /* 使用class控制高亮，更简单可靠 */
            html.ark-highlight-enabled .ark-color-green {
                background-color: #ebfeef99 !important;
            }
            html.ark-highlight-enabled .ark-color-green * {
                background-color: transparent !important;
            }

            html.ark-highlight-enabled .ark-color-yellow {
                background-color: #feffaf99 !important;
            }
            html.ark-highlight-enabled .ark-color-yellow * {
                background-color: transparent !important;
            }

            html.ark-highlight-enabled .ark-color-red {
                background-color: #ffe6e199 !important;
            }
            html.ark-highlight-enabled .ark-color-red * {
                background-color: transparent !important;
            }

            html.ark-highlight-enabled .ark-color-blue {
                background-color: #e8f2ff99 !important;
            }
            html.ark-highlight-enabled .ark-color-blue * {
                background-color: transparent !important;
            }

            html.ark-highlight-enabled .ark-color-purple {
                background-color: #e1e1ff99 !important;
            }
            html.ark-highlight-enabled .ark-color-purple * {
                background-color: transparent !important;
            }
        `;
        document.head.appendChild(style);
    })();

    // ==================== 全局变量 ====================
    // window.config 已在 configContent.js 中设置，这里不要覆盖
    window.runFillResume = null;

    let currentResumeId = null;            // 当前简历ID（由resumeInterfaceTwo.js传递和更新）
    let beautifiedResume = null;           // t - 美化后的简历数据
    let sessionId = null;                  // e - 会话ID
    let fieldStructures = [];              // n - 字段结构数组
    let serverFields = [];                 // o - 服务器返回的字段列表
    let fillValues = [];                   // i - 中间处理的字段
    let convertedFillData = [];            // s - 填充值数组
    let transformedFillData = [];          // r - 转换后的填充数据
    let inputDomList = [];                 // l - 输入框DOM列表
    let selectInputOptions = [];           // a - 输入框选项列表
    let selectDomList = [];                // c - 下拉框DOM列表
    let selectOptions = [];                // f - 下拉框选项列表
    let radioDomList = [];                 // u - 单选框DOM列表
    let radioOptions = [];                 // d - 单选框选项列表

    let isNetworkError = false;            // Tt - 网络错误标志
    let errorFunctionName = "";            // St - 错误函数名
    let deleteButtons = [];                // g - 删除按钮列表
    let isDomScanComplete = false;         // T - DOM扫描完成标志
    let isHighlightComplete = false;       // O - 高亮完成标志
    let mutationObserver = null;           // I - MutationObserver实例
    let newlyAddedDoms = [];               // ct - 新增DOM元素列表
    let styleCache = new WeakMap();        // ft - 样式缓存
    let cancelButtons = [];                // pt - 取消按钮列表
    let confirmButtons = [];               // gt - 确定按钮列表
    let deleteConfirmButtons = [];         // bt - 删除确认按钮列表
    let learningInterval = null;           // Ct - 学习间隔定时器
    let lastHtml = "";                     // Mt - 上次HTML内容
    let lastUrl = "";                      // $t - 上次URL

    // ==================== 重置函数 ====================
    function resetState() {
        beautifiedResume = null;
        sessionId = null;
        fieldStructures = [];
        serverFields = [];
        fillValues = [];
        convertedFillData = [];
        transformedFillData = [];
        inputDomList = [];
        selectInputOptions = [];
        selectDomList = [];
        selectOptions = [];
        radioDomList = [];
        radioOptions = [];
        isNetworkError = false;
        errorFunctionName = "";
        deleteButtons = [];
        isDomScanComplete = false;
        isHighlightComplete = false;
        mutationObserver = null;
        newlyAddedDoms = [];
        styleCache = new WeakMap();
        cancelButtons = [];
        confirmButtons = [];
        deleteConfirmButtons = [];

        // 清除所有高亮样式
        try {
            const highlightedElements = document.querySelectorAll('[class*="ark-color-"]');
            for (const el of highlightedElements) {
                setElementColor(el, "");
            }
            // 移除高亮启用标志
            document.documentElement.classList.remove('ark-highlight-enabled');
        } catch (error) { }
    }

    // ==================== 基础工具函数 ====================

    /**
     * 延迟函数
     * @param {number} ms - 延迟毫秒数
     */
    function delay(ms = 1000) {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve();
            }, ms);
        });
    }

    /**
     * 检查网络错误状态
     */
    function checkNetworkError() {
        if (isNetworkError) {
            throw new Error("网络响应不正常");
        }
    }

    /**
     * 带JWT的API请求
     * @param {string} url - 请求URL
     * @param {object} options - 请求选项
     */
    async function fetchWithJwt(url, options = {}) {
        try {
            const response = await chrome.runtime.sendMessage({
                type: "fetchWithJwt",
                url: url,
                options: options
            });
            if (response.error) {
                throw new Error(response.error);
            }
            return response;
        } catch (error) {
            isNetworkError = true;
            errorFunctionName = "fetchWithJwt";
            throw error;
        }
    }

    /**
     * 添加历史记录
     * @param {string} source - 来源类型
     * @param {object} data - 数据
     */
    function addHistory(source, data) {
        chrome.runtime.sendMessage({
            type: "addHistory",
            source: source,
            data: data
        }, (response) => { });
    }

    /**
     * 获取所有DOM元素（排除扩展UI）
     */
    function getAllElements() {
        let elements = document.body.querySelectorAll("*:not(#ark-ai)");
        return Array.from(elements);
    }

    /**
     * 检查元素是否可见
     * @param {HTMLElement} element - 要检查的元素
     */
    function isElementVisible(element) {
        if (!element.ownerDocument.contains(element)) {
            return false;
        }

        let current = element;
        while (current) {
            const style = getComputedStyle(current);
            if (
                style.display === "none" ||
                style.visibility === "hidden" ||
                style.opacity === "0" ||
                current.hidden ||
                (current.offsetWidth === 0 && current.offsetHeight === 0 && style.overflow === "hidden")
            ) {
                return false;
            }
            current = current.parentElement;
        }

        // 检查子元素是否全部不可见
        if (isAllChildrenHidden(element)) {
            return false;
        }

        // 检查是否在可视区域内
        function isInViewport(el) {
            const rect = el.getBoundingClientRect();
            if (rect.height === 0) return true;

            let parent = el.parentElement;
            while (parent && parent.tagName !== "BODY") {
                const parentStyle = getComputedStyle(parent);
                if (parentStyle.overflow === "hidden" || parentStyle.overflowY === "hidden") {
                    const parentRect = parent.getBoundingClientRect();
                    const top = rect.top;
                    const bottom = rect.bottom;
                    const parentTop = parentRect.top;
                    const parentBottom = parentRect.bottom;

                    if (bottom <= parentTop || top >= parentBottom) {
                        return false;
                    }
                    if ((Math.min(bottom, parentBottom) - Math.max(top, parentTop)) / rect.height < 0.1) {
                        return false;
                    }
                }
                parent = parent.parentElement;
            }
            return true;
        }

        if (!isInViewport(element)) {
            element.scrollIntoView({ block: "center", behavior: "instant" });
            if (!isInViewport(element)) {
                return false;
            }
        }

        return true;
    }

    /**
     * 检查元素的所有子元素是否都不可见
     */
    function isAllChildrenHidden(element) {
        const style = getComputedStyle(element);
        if (
            style.display === "none" ||
            style.visibility === "hidden" ||
            style.opacity === "0" ||
            element.hidden ||
            (element.offsetWidth === 0 && element.offsetHeight === 0 && style.overflow === "hidden")
        ) {
            return true;
        }

        if (element.offsetHeight === 0 || element.offsetWidth === 0) {
            for (const child of element.children) {
                if (!isAllChildrenHidden(child)) {
                    return false;
                }
            }
            return true;
        }
        return false;
    }

    /**
     * 滚动到页面顶部
     */
    async function scrollToTop() {
        try {
            window.scrollTo({ top: 0, left: 0, behavior: "instant" });
            await delay(50);

            const selectors = [
                "body", "html", "main", '[role="main"]',
                ".main-content", ".content", ".container", "section", "article", "div"
            ];

            for (const selector of selectors) {
                const elements = document.querySelectorAll(selector);
                for (const el of elements) {
                    const style = getComputedStyle(el);
                    if (
                        (el.scrollHeight > el.clientHeight ||
                            style.overflowY === "scroll" ||
                            style.overflowY === "auto" ||
                            style.overflow === "scroll" ||
                            style.overflow === "auto") &&
                        el.scrollTop > 0
                    ) {
                        el.scrollTop = 0;
                        await delay(10);
                    }
                }
            }

            const allElements = document.querySelectorAll("*");
            for (const el of allElements) {
                if (el.offsetHeight > 1.2 * window.innerHeight && el.scrollTop > 0) {
                    const style = getComputedStyle(el);
                    if (style.position !== "fixed" && style.position !== "absolute") {
                        el.scrollTop = 0;
                        await delay(10);
                    }
                }
            }

            window.scrollTo({ top: 0, left: 0, behavior: "instant" });
        } catch (error) {
            try {
                window.scrollTo({ top: 0, left: 0, behavior: "instant" });
            } catch (e) { }
        }
    }

    /**
     * 获取清理后的HTML内容（用于字段学习）
     */
    function getCleanHtml() {
        const { clone, stylesMap } = cloneWithStyles(document.body);
        const clonedBody = clone;
        let elements = [];

        // 移除扩展UI元素
        const excludeIds = ["ark-ai"];
        for (const id of excludeIds) {
            const el = clonedBody.querySelector(`#${id}`);
            if (el && el.parentNode) {
                el.remove();
            }
        }

        elements = clonedBody.querySelectorAll("*");

        // 移除不可见元素
        for (const el of elements) {
            if (!isElementVisibleInClone(el, stylesMap)) {
                el.remove();
            }
        }

        // 递归清理空节点
        const cleanEmptyNodes = (node) => {
            const children = node.childNodes;
            for (let i = children.length - 1; i >= 0; i--) {
                const child = children[i];
                if (child.nodeType === Node.COMMENT_NODE ||
                    (child.nodeType === Node.TEXT_NODE && child.nodeValue.trim() === "")) {
                    child.remove();
                } else if (child.nodeType === Node.ELEMENT_NODE) {
                    cleanEmptyNodes(child);
                }
            }
        };
        cleanEmptyNodes(clonedBody);

        // 移除脚本和样式标签
        elements = clonedBody.querySelectorAll("noscript, script, link, style, img, canvas, svg");
        for (const el of elements) {
            el.remove();
        }

        // 清理文本节点中的多余换行
        const allElements = clonedBody.querySelectorAll("*");
        for (const el of allElements) {
            if (el.childNodes.length > 0) {
                for (const child of el.childNodes) {
                    if (child.nodeType === Node.TEXT_NODE) {
                        child.nodeValue = child.nodeValue.replace(/\n\s*\n+/g, " ").trim();
                    }
                }
            }
        }

        // 替换输入框为span显示其值
        elements = clonedBody.querySelectorAll("input, textarea");
        for (const el of elements) {
            if (el.value) {
                const span = document.createElement("span");
                span.textContent = el.value;
                el.parentNode.replaceChild(span, el);
            }
        }

        // 替换select为span显示选中值
        elements = clonedBody.querySelectorAll("select");
        for (const el of elements) {
            const span = document.createElement("span");
            const selectedOption = el.querySelector(`option[value="${el.value}"]`);
            span.textContent = selectedOption ? selectedOption.textContent : el.value;
            el.parentNode.replaceChild(span, el);
        }

        // 移除空元素
        let hasEmpty = true;
        while (hasEmpty) {
            hasEmpty = false;
            elements = clonedBody.querySelectorAll("*");
            for (const el of elements) {
                if (el.innerText.trim() === "") {
                    el.remove();
                    hasEmpty = true;
                }
            }
        }

        // 移除所有属性
        elements = clonedBody.querySelectorAll("*");
        for (const el of elements) {
            for (const attr of Array.from(el.attributes)) {
                el.removeAttribute(attr.name);
            }
        }

        return clonedBody.innerHTML.trim();
    }

    /**
     * 克隆DOM并保存样式
     */
    function cloneWithStyles(element) {
        const clone = element.cloneNode(true);
        const originals = element.querySelectorAll("*");
        const clones = clone.querySelectorAll("*");
        const stylesMap = new Map();

        let index = 0;
        for (const orig of originals) {
            const style = getComputedStyle(orig);
            const styleObj = {
                display: style.display,
                visibility: style.visibility,
                opacity: style.opacity
            };
            stylesMap.set(clones[index], styleObj);
            index++;
        }

        return { clone, stylesMap };
    }

    /**
     * 检查克隆元素是否可见
     */
    function isElementVisibleInClone(element, stylesMap) {
        const style = stylesMap.get(element);
        if (!style) return true;
        return (
            style.display !== "none" &&
            style.visibility !== "hidden" &&
            style.opacity !== "0" &&
            !element.hidden
        );
    }

    /**
     * 获取元素当前的高亮颜色
     */
    function getElementColor(element) {
        const colors = ["ark-color-yellow", "ark-color-green", "ark-color-red", "ark-color-blue", "ark-color-purple"];
        for (const color of colors) {
            if (element.classList.contains(color)) {
                return color.replace("ark-color-", "");
            }
        }
        return null;
    }

    /**
     * 设置元素高亮颜色
     */
    function setElementColor(element, color = "") {
        if (!element) {
            return;
        }

        const colors = ["ark-color-yellow", "ark-color-green", "ark-color-red", "ark-color-blue", "ark-color-purple"];

        // 移除所有颜色类
        for (const c of colors) {
            element.classList.remove(c);
        }

        // 如果没有指定颜色，只是清除
        if (!color) return;

        // 添加新的颜色类
        const colorClass = `ark-color-${color}`;
        if (colors.includes(colorClass)) {
            element.classList.add(colorClass);
        } else {
            console.warn("不支持的颜色:", color);
        }
    }

    // ==================== DOM操作函数 ====================

    /**
     * 模拟点击元素
     */
    async function simulateClick(element) {
        let targetElement = element;

        element.scrollIntoViewIfNeeded();

        // 如果元素可见，获取中心点的实际元素
        if (element.offsetWidth > 0 && element.offsetHeight > 0 &&
            window.getComputedStyle(element).visibility !== "hidden") {
            const rect = element.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            targetElement = document.elementFromPoint(centerX, centerY);

            if (!targetElement ||
                (!element.contains(targetElement) && !targetElement.contains(element) &&
                    element.parentNode !== targetElement.parentNode)) {
                targetElement = element;
            }
        }

        // 确保元素有click方法
        if (targetElement) {
            while (targetElement && typeof targetElement.click !== "function") {
                targetElement = targetElement.parentElement;
            }
        } else {
            targetElement = element;
        }

        // 触发鼠标和焦点事件
        const eventOptions = { bubbles: true, cancelable: true, view: window };
        let event = null;

        event = new MouseEvent("mousedown", eventOptions);
        targetElement.dispatchEvent(event);

        event = new FocusEvent("focus", eventOptions);
        targetElement.dispatchEvent(event);

        event = new MouseEvent("mouseup", eventOptions);
        targetElement.dispatchEvent(event);

        event = new MouseEvent("click", eventOptions);
        targetElement.dispatchEvent(event);

        await delay(10);
    }

    /**
     * 触发焦点事件
     */
    async function triggerFocus(element) {
        const event = new FocusEvent("focus", { bubbles: true, cancelable: true, view: window });
        element.dispatchEvent(event);
        await delay(10);
    }

    /**
     * 触发失焦事件
     */
    async function triggerBlur(element) {
        const event = new FocusEvent("blur", { bubbles: true, cancelable: true, view: window });
        element.dispatchEvent(event);
        await delay(10);
    }

    // ==================== 表单扫描函数 ====================

    /**
     * 扫描页面中的表单元素
     */
    function scanFormElements(elements) {
        let inputs = [];
        let selects = [];
        let radios = [];

        for (const el of elements) {
            let isInput = false;
            let isSelect = false;
            let isRadio = false;

            // 跳过页面顶部150px以内的元素
            if (el.getBoundingClientRect().bottom <= 150) continue;

            const placeholder = el.getAttribute("placeholder");
            const title = el.getAttribute("title");

            // 检查是否为输入框
            if ((placeholder && el.tagName !== "TEXTAREA" &&
                !/^\s*(搜索|查找)/.test(placeholder) &&
                !/^\s*(搜索|查找)/.test(title)) ||
                el.classList.contains("ant-select")) {
                isInput = true;
            } else if (el.tagName === "INPUT" &&
                !/^\s*(搜索|查找)/.test(placeholder) &&
                !/^\s*(搜索|查找)/.test(title) &&
                ["text", "search"].includes(el.type)) {
                isInput = true;
            } else if (el.tagName === "SELECT") {
                isSelect = true;
            } else if (isRadioGroup(el)) {
                isRadio = true;
            }

            if (isInput || isSelect || isRadio) {
                if (isElementVisible(el)) {
                    if (isInput) inputs.push(el);
                    else if (isSelect) selects.push(el);
                    else radios.push(el);
                } else {
                    // 查找可见的父元素
                    let parent = el.parentElement;
                    while (parent && !isElementVisible(parent)) {
                        parent = parent.parentElement;
                    }
                    if (parent) {
                        if (isInput) inputs.push(parent);
                        else if (!isSelect) radios.push(parent);
                    }
                }
            }
        }

        inputs = filterChildElements(inputs);
        selects = filterChildElements(selects);
        radios = filterParentElements(radios);

        return { inputDoms: inputs, selectDoms: selects, radioDoms: radios };
    }

    /**
     * 检查元素是否为单选框组
     */
    function isRadioGroup(element) {
        // 检查className是否包含radio
        if ((/(?:^|\W+)(radio)(?:[^a-zA-Z]+|$)/i.test(element.className) ||
            /(?:^|\W+)([Rr]adio)(?:[A-Z0-9]|[^a-z]+|$)/.test(element.className)) &&
            getRadioOptions(element).length >= 2) {
            return true;
        }

        // 检查是否包含多个同名radio输入框
        const radioInputs = element.querySelectorAll('input[type="radio"]');
        if (radioInputs.length < 2) return false;

        const firstName = radioInputs[0].name;
        if (!firstName) return false;

        for (let i = 1; i < radioInputs.length; i++) {
            if (radioInputs[i].name !== firstName) return false;
        }

        // 找到包含所有radio的最小父元素
        let container = radioInputs[0];
        while (container) {
            let containsAll = true;
            for (const radio of radioInputs) {
                if (!container.contains(radio)) {
                    containsAll = false;
                    break;
                }
            }
            if (containsAll) break;
            container = container.parentElement;
        }

        return container === element;
    }

    /**
     * 过滤掉包含其他元素的父元素（保留子元素）
     */
    function filterChildElements(elements) {
        const result = [];
        for (const el of elements) {
            let isParent = false;
            for (const other of elements) {
                if (other !== el && el.contains(other)) {
                    isParent = true;
                    break;
                }
            }
            if (!isParent) result.push(el);
        }
        return result;
    }

    /**
     * 过滤掉被其他元素包含的子元素（保留父元素）
     */
    function filterParentElements(elements) {
        const result = [];
        for (const el of elements) {
            let isChild = false;
            for (const other of elements) {
                if (other !== el && other.contains(el)) {
                    isChild = true;
                    break;
                }
            }
            if (!isChild) result.push(el);
        }
        return result;
    }

    /**
     * 获取输入框的边框样式特征
     */
    function getInputBorderStyles(inputs) {
        let styles = [];
        for (const input of inputs) {
            let el = input;
            while (el && el.offsetHeight < 40 && el !== document.body) {
                const borderBottom = getComputedStyle(el).borderBottom;
                if (borderBottom && !borderBottom.includes("none") &&
                    !borderBottom.includes("hidden") &&
                    !/\b0(\s|$|\w)/.test(borderBottom) &&
                    !borderBottom.includes("transparent")) {
                    // 记录边框样式和高度的组合
                    for (let offset = -2; offset <= 2; offset++) {
                        const key = `${borderBottom}_${el.offsetHeight + offset}`;
                        if (!styles.includes(key)) {
                            styles.push(key);
                        }
                    }
                    break;
                }
                el = el.parentElement;
            }
        }
        return styles;
    }

    /**
     * 扩展输入框列表（添加有标签但无placeholder的输入框）
     */
    function expandInputList(inputs, selects, borderStyles, allElements) {
        let result = [...inputs];
        let lastFormElement = null;

        for (const el of allElements) {
            if (result.includes(el)) {
                lastFormElement = el;
                continue;
            }
            if (selects.includes(el)) {
                lastFormElement = el;
                continue;
            }
            if (lastFormElement && lastFormElement.contains(el)) continue;
            if (el.children.length > 0) continue;
            if (el.getBoundingClientRect().bottom <= 100) continue;

            const text = el.innerHTML.trim();
            if (!text || !/[\u4e00-\u9fa5]/.test(text)) continue;

            const cleanText = text.replace(/\s/g, "");
            // 跳过按钮文本
            if (/^(确定|取消|返回|关闭|提交|报名|投递|预览|保存|暂存|[上下]一步|编辑|\+?[添增]加|删除|移除|收起|展开|点击|(简历)?上传|立即)\s*/.test(cleanText)) {
                continue;
            }

            // 检查边框样式匹配
            let current = el;
            while (current && current.offsetHeight <= 50 && current !== document.body) {
                const borderKey = `${getComputedStyle(current).borderBottom}_${current.offsetHeight}`;
                if (borderStyles.includes(borderKey) && isElementVisible(current)) {
                    result.push(current);
                    lastFormElement = current;
                    break;
                }
                current = current.parentElement;
            }
        }

        result = filterChildElements(result);
        result.sort((a, b) => {
            return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
        });

        return result;
    }

    /**
     * 过滤重叠的输入框
     */
    function filterOverlappingInputs(inputs) {
        let result = [];
        let prevInput = null;

        for (const input of inputs) {
            if (!prevInput) {
                prevInput = input;
                result.push(input);
                continue;
            }

            const rect = input.getBoundingClientRect();
            const prevRect = prevInput.getBoundingClientRect();

            // 检查中心点是否在对方矩形内
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            const prevCenterX = prevRect.left + prevRect.width / 2;
            const prevCenterY = prevRect.top + prevRect.height / 2;

            const isOverlapping = (
                (centerX >= prevRect.left && centerX <= prevRect.right &&
                    centerY >= prevRect.top && centerY <= prevRect.bottom) ||
                (prevCenterX >= rect.left && prevCenterX <= rect.right &&
                    prevCenterY >= rect.top && prevCenterY <= rect.bottom)
            );

            if (isOverlapping) {
                // 选择有placeholder的那个
                const inputLabel = getInputPlaceholder(input);
                const prevLabel = getInputPlaceholder(prevInput);
                if (prevLabel.length > 0 || inputLabel.length > 0) {
                    result.pop();
                    result.push(input);
                    prevInput = input;
                }
            } else {
                result.push(input);
                prevInput = input;
            }
        }

        return result;
    }

    /**
     * 获取输入框的placeholder或文本标签
     */
    function getInputPlaceholder(element) {
        function cleanText(text) {
            let result = text.trim();
            result = result.replace(/^请?(选择|输入|填写|填入)/g, "");
            return result;
        }

        const descendants = [element, ...element.querySelectorAll("*")];

        // 优先获取placeholder属性
        for (const el of descendants) {
            const placeholder = el.getAttribute("placeholder")?.trim();
            if (placeholder) {
                return cleanText(placeholder);
            }
        }

        // 其次获取纯文本内容
        for (const el of descendants) {
            if (el.children.length === 0) {
                const text = el.textContent.trim();
                if (text && /[\u4e00-\u9fa5]/.test(text)) {
                    return cleanText(text);
                }
            }
        }

        return "";
    }

    // ==================== 字段匹配函数 ====================

    /**
     * 在DOM中查找字段标签元素
     */
    function findFieldLabel(name, afterElement, container) {
        try {
            const allElements = getAllElements();
            let started = !afterElement;

            for (const el of allElements) {
                if (container && container.contains(el)) continue;
                if (el === afterElement) {
                    started = true;
                    continue;
                }
                if (!started) continue;
                if (el.tagName === "OPTION") continue;

                let pattern = name.trim();
                pattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                const regex = new RegExp(`^[\\s\\*]*${pattern}[\\s\\*\\?？i]*(:|：)?[\\s\\*\\?？i]*$`);

                if (regex.test(el.textContent)) {
                    return findDeepestMatchingElement(el, regex);
                }
            }
        } catch (error) { }
        return null;
    }

    /**
     * 找到匹配正则的最深层元素
     */
    function findDeepestMatchingElement(element, regex) {
        let deepest = element;
        const descendants = Array.from(element.querySelectorAll("*")).reverse();

        for (const el of descendants) {
            if (regex.test(el.textContent)) {
                deepest = el;
                break;
            }
        }
        return deepest;
    }

    /**
     * 在弹窗中查找匹配文本的元素
     */
    function findMatchingElement(container, text, findFirst = true, checkVisible = true) {
        const elements = container.querySelectorAll("*");
        let exactMatches = [];
        let numericMatch = null;
        let prefixMatch = null;

        function isTextOnlyElement(el) {
            if (!el || el.childNodes.length === 0) return false;
            for (const child of el.childNodes) {
                if (child.nodeType !== Node.TEXT_NODE) return false;
            }
            return true;
        }

        for (const el of elements) {
            if (el.childNodes.length === 0) continue;
            if (!isTextOnlyElement(el)) continue;

            const elText = el.textContent.trim();

            // 精确匹配
            if (elText === text && (!checkVisible || isElementVisible(el))) {
                exactMatches.push(el);
                if (findFirst) return el;
                continue;
            }

            // 数字匹配
            if (/^\d+$/.test(elText) && /^\d+$/.test(text) &&
                parseInt(elText, 10) === parseInt(text, 10) &&
                (!checkVisible || isElementVisible(el))) {
                if (!numericMatch || !findFirst) {
                    numericMatch = el;
                }
                continue;
            }

            // 前缀匹配
            if (el.textContent.startsWith(text) && (!checkVisible || isElementVisible(el))) {
                if (!prefixMatch || !findFirst) {
                    prefixMatch = el;
                }
            }

            // 处理省/市后缀
            if (text.endsWith("省") || text.endsWith("市")) {
                const textWithoutSuffix = text.slice(0, -1);
                if (textWithoutSuffix && el.textContent.startsWith(textWithoutSuffix) &&
                    (!checkVisible || isElementVisible(el))) {
                    if (!prefixMatch || !findFirst) {
                        prefixMatch = el;
                    }
                }
            }
        }

        if (exactMatches.length === 0) {
            return numericMatch || prefixMatch || null;
        }

        if (exactMatches.length === 1) {
            return exactMatches[0];
        }

        // 多个精确匹配时，选择独立的元素
        let independentMatches = [];
        for (const el of exactMatches) {
            let isIndependent = true;
            const prevSibling = el.previousSibling;
            if (prevSibling && prevSibling.nodeType === Node.ELEMENT_NODE && isTextOnlyElement(prevSibling)) {
                isIndependent = false;
            }
            const nextSibling = el.nextSibling;
            if (nextSibling && nextSibling.nodeType === Node.ELEMENT_NODE && isTextOnlyElement(nextSibling)) {
                isIndependent = false;
            }
            if (isIndependent) {
                independentMatches.push(el);
                if (findFirst) return el;
            }
        }

        if (independentMatches.length > 0) {
            return findFirst ? independentMatches[0] : independentMatches[independentMatches.length - 1];
        }

        return findFirst ? exactMatches[0] : exactMatches[exactMatches.length - 1];
    }

    /**
     * 获取下拉框选项
     */
    function getSelectOptions(element) {
        const options = [];
        const descendants = element.querySelectorAll("*");

        for (const el of descendants) {
            let isTextOnly = true;
            for (const child of el.childNodes) {
                if (child.nodeType !== Node.TEXT_NODE) {
                    isTextOnly = false;
                    break;
                }
            }
            if (isTextOnly && el.childNodes.length > 0) {
                const text = el.textContent.trim();
                if (text !== "") {
                    options.push(text);
                }
            }
        }
        return options;
    }

    /**
     * 获取单选框选项
     */
    function getRadioOptions(element) {
        const options = [];
        const descendants = element.querySelectorAll("*");
        let skipContainer = null;

        for (const el of descendants) {
            if (skipContainer && skipContainer.contains(el)) continue;

            if (!isElementVisible(el)) {
                skipContainer = el;
                continue;
            }

            let isTextOnly = true;
            for (const child of el.childNodes) {
                if (child.nodeType !== Node.TEXT_NODE) {
                    isTextOnly = false;
                    break;
                }
            }

            if (isTextOnly && el.childNodes.length > 0) {
                const text = el.textContent.trim();
                if (text !== "") {
                    options.push(text);
                }
            }
        }
        return options;
    }

    // ==================== MutationObserver 函数 ====================

    /**
     * 启动DOM变化监听
     */
    function startDomObserver() {
        newlyAddedDoms = [];
        cancelButtons = [];
        confirmButtons = [];
        deleteConfirmButtons = [];

        const body = document.body;
        const observedElements = new WeakSet();
        const allElements = Array.from(body.querySelectorAll("*"));
        allElements.push(body);

        // 缓存所有元素的样式
        for (const el of allElements) {
            if (el.nodeType === Node.ELEMENT_NODE) {
                const style = getComputedStyle(el);
                styleCache.set(el, {
                    display: style.display,
                    visibility: style.visibility,
                    opacity: style.opacity
                });
            }
        }

        mutationObserver = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === "childList") {
                    // 处理新增节点
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === Node.ELEMENT_NODE && !observedElements.has(node)) {
                            observedElements.add(node);
                            newlyAddedDoms.push(node);
                            for (const child of node.querySelectorAll("*")) {
                                observedElements.add(child);
                            }
                        }
                    }
                } else if (mutation.type === "attributes") {
                    const target = mutation.target;
                    if (target.nodeType !== Node.ELEMENT_NODE || observedElements.has(target)) {
                        continue;
                    }

                    const oldStyle = styleCache.get(target) || {};
                    const newStyle = getComputedStyle(target);

                    const wasHidden = oldStyle.display === "none" ||
                        oldStyle.visibility === "hidden" ||
                        parseFloat(oldStyle.opacity) === 0;
                    const isVisible = newStyle.display !== "none" &&
                        newStyle.visibility !== "hidden" &&
                        parseFloat(newStyle.opacity) !== 0;

                    styleCache.set(target, {
                        display: newStyle.display,
                        visibility: newStyle.visibility,
                        opacity: newStyle.opacity
                    });

                    if (!isVisible) continue;

                    if (wasHidden) {
                        observedElements.add(target);
                        newlyAddedDoms.push(target);
                        for (const child of target.querySelectorAll("*")) {
                            observedElements.add(child);
                        }
                        continue;
                    }

                    // 检查子元素的可见性变化
                    const childDivs = target.querySelectorAll("div, ul");
                    for (const child of childDivs) {
                        if (observedElements.has(child)) continue;

                        const childOldStyle = styleCache.get(child) || {};
                        const childNewStyle = getComputedStyle(child);

                        const childWasHidden = childOldStyle.display === "none" ||
                            childOldStyle.visibility === "hidden" ||
                            parseFloat(childOldStyle.opacity) === 0;
                        const childIsVisible = childNewStyle.display !== "none" &&
                            childNewStyle.visibility !== "hidden" &&
                            parseFloat(childNewStyle.opacity) !== 0;

                        styleCache.set(child, {
                            display: childNewStyle.display,
                            visibility: childNewStyle.visibility,
                            opacity: childNewStyle.opacity
                        });

                        if (childWasHidden && childIsVisible) {
                            observedElements.add(child);
                            newlyAddedDoms.push(child);
                            for (const grandChild of child.querySelectorAll("*")) {
                                observedElements.add(grandChild);
                            }
                        }
                    }
                }
            }
        });

        mutationObserver.observe(body, {
            childList: true,
            subtree: true,
            attributeFilter: ["class", "style"]
        });
    }

    /**
     * 停止DOM变化监听
     */
    function stopDomObserver() {
        if (mutationObserver) {
            mutationObserver.disconnect();
            mutationObserver = null;
            styleCache = new WeakMap();
        }
        newlyAddedDoms = filterParentElements(newlyAddedDoms);
    }

    /**
     * 收集确定按钮
     */
    function collectConfirmButtons(container) {
        const elements = container.querySelectorAll("*");
        for (const el of elements) {
            if (el.innerHTML.replace(/\s+/g, "") === "确定" && isElementVisible(el)) {
                confirmButtons.push(el);
                break;
            }
        }
    }

    /**
     * 收集取消/关闭按钮
     */
    function collectCancelButtons(container) {
        const elements = container.querySelectorAll("*");

        // 查找"取消"文本按钮
        for (const el of elements) {
            if (el.innerHTML.replace(/\s+/g, "") === "取消" && isElementVisible(el)) {
                cancelButtons.push(el);
                break;
            }
        }

        // 查找关闭按钮（通过className）
        for (const el of elements) {
            let isCloseButton = false;
            const attrs = el.attributes;

            for (const attr of attrs) {
                const value = attr.value;
                if (/(?:^|\W+)(guanbi|(close|shut|exit|quit)(|btn|button)|关闭|退出|取消)(?:[^a-zA-Z]+|$)/i.test(value)) {
                    isCloseButton = true;
                    break;
                }
                if (/(?:^|\W+)([Gg]uanbi|[Cc]lose|[Ss]hut|[Ee]xit|[Qq]uit)(?:[A-Z0-9]|[^a-z]+|$)/.test(value)) {
                    isCloseButton = true;
                    break;
                }
            }

            if (isCloseButton && isElementVisible(el)) {
                cancelButtons.push(el);
            }
        }

        // 查找全屏遮罩层
        for (const el of elements) {
            const rect = el.getBoundingClientRect();
            if (rect.width === window.innerWidth && rect.height === window.innerHeight) {
                if (isElementVisible(el)) {
                    cancelButtons.push(el);
                }
            } else if (cancelButtons.length > 0) {
                break;
            }
        }
    }

    /**
     * 收集删除确认按钮
     */
    function collectDeleteConfirmButtons(container) {
        const elements = container.querySelectorAll("*");
        for (const el of elements) {
            const text = el.innerHTML.replace(/\s+/g, "");
            if (/^(确定)?删除$/.test(text) && isElementVisible(el)) {
                deleteConfirmButtons.push(el);
                break;
            }
        }
    }

    /**
     * 点击确定按钮
     */
    async function clickConfirmButtons() {
        if (confirmButtons.length > 0) {
            for (const btn of confirmButtons) {
                if (isElementVisible(btn)) {
                    await simulateClick(btn);
                }
            }
        }
    }

    /**
     * 关闭弹窗
     */
    async function closePopups(element) {
        if (cancelButtons.length > 0) {
            for (const btn of cancelButtons) {
                if (isElementVisible(btn)) {
                    await simulateClick(btn);
                }
            }
        } else {
            await simulateClick(element);
        }
        await delay(10);
        await triggerBlur(element);

        // 检查是否还有可见的弹窗
        let hasVisiblePopup = true;
        for (const popup of newlyAddedDoms) {
            if (isElementVisible(popup)) {
                hasVisiblePopup = false;
                break;
            }
        }

        if (!hasVisiblePopup) {
            const event = new Event("mousedown", { bubbles: true });
            document.body.dispatchEvent(event);
        }
    }

    /**
     * 点击删除确认按钮
     */
    async function clickDeleteConfirmButtons() {
        if (deleteConfirmButtons.length > 0) {
            for (const btn of deleteConfirmButtons) {
                if (isElementVisible(btn)) {
                    await simulateClick(btn);
                }
            }
        }
    }

    // ==================== 日期处理函数 ====================

    /**
     * 检查是否有弹窗
     */
    function hasPopup() {
        if (newlyAddedDoms.length === 0) return false;

        // 过滤掉只有svg的弹窗
        let hasRealPopup = false;
        for (const popup of [...newlyAddedDoms]) {
            let current = popup;
            let isSvgOnly = false;

            while (current.children.length === 1) {
                const child = current.children[0];
                if (child.tagName.toLowerCase() === "svg") {
                    isSvgOnly = true;
                    newlyAddedDoms.splice(newlyAddedDoms.indexOf(popup), 1);
                    break;
                }
                current = child;
            }

            if (!isSvgOnly) hasRealPopup = true;
        }

        if (!hasRealPopup) return false;

        // 检查是否有可见的弹窗内容
        for (const popup of newlyAddedDoms) {
            if (isElementVisible(popup) && hasVisibleContent(popup)) {
                return true;
            }
        }

        return false;
    }

    /**
     * 检查元素是否有可见内容
     */
    function hasVisibleContent(element) {
        const rect = element.getBoundingClientRect();
        if (rect.x >= 0 && rect.y >= 0 &&
            rect.right <= window.innerWidth &&
            rect.bottom <= window.innerHeight) {
            return true;
        }
        for (const child of element.children) {
            if (hasVisibleContent(child)) return true;
        }
        return false;
    }

    /**
     * 获取日历弹窗
     */
    function getCalendarPopup() {
        for (const popup of newlyAddedDoms) {
            if (isCalendarPopup(popup)) return popup;
        }
        return null;
    }

    /**
     * 检查是否为日历弹窗
     */
    function isCalendarPopup(element) {
        const options = getRadioOptions(element);
        if (options.length < 12) return false;

        let firstOption = options[0].replace(/\s+/g, "");
        let secondOption = options[1].replace(/\s+/g, "");
        let thirdOption = options[2].replace(/\s+/g, "");

        // 检查年-月格式
        if (/^(19|20)\d{2}(年)?$/.test(firstOption) && /^(0?[1-9]|1[0-2]|一)月$/.test(secondOption)) {
            return true;
        }

        // 检查年份范围格式
        if (/^(19|20)\d{2}(年)?-(19|20)\d{2}(年)?$/.test(firstOption) &&
            /^((19|20)\d{2}|(0?[1-9]|1[0-2]|一)月)$/.test(secondOption)) {
            return true;
        }

        return false;
    }

    /**
     * 检查是否为My97日期选择器
     */
    function getMy97DatePicker() {
        for (const popup of newlyAddedDoms) {
            if (popup.id === "_my97DP") return "-";
            if (popup.querySelector("iframe")) {
                const iframe = popup.querySelector("iframe");
                if (iframe.getAttribute("width") === "9" && iframe.getAttribute("height") === "7") {
                    return "/";
                }
            }
        }
        return null;
    }

    /**
     * 使用My97日期选择器填充日期
     */
    async function fillMy97Date(element, value, separator = "-") {
        let year, month, day = "1";

        if (value === "至今") {
            year = new Date().getFullYear();
            month = new Date().getMonth() + 1;
            day = new Date().getDate();
        } else {
            const match = value.match(/^(\d{4})(-|\.|年)(\d{1,2})(?:月)?(?:(-|\.|月)(\d{1,2})(日)?)?$/);
            if (!match) return;
            year = match[1];
            month = match[3];
            day = match[5] || "01";
        }

        // 获取当前值
        let currentValue = "";
        if (element.tagName === "INPUT" || element.tagName === "TEXTAREA") {
            currentValue = element.value || currentValue;
        } else if (element.isContentEditable) {
            currentValue = element.textContent || currentValue;
        }

        // 设置新值
        const newValue = `${year}${separator}${month}${separator}${day}`;
        if (element.tagName === "INPUT" || element.tagName === "TEXTAREA") {
            element.value = newValue;
        } else if (element.isContentEditable) {
            element.textContent = newValue;
        }

        // 触发事件
        const inputEvent = new Event("input", { bubbles: true });
        element.dispatchEvent(inputEvent);
        const changeEvent = new Event("change", { bubbles: true });
        element.dispatchEvent(changeEvent);

        await delay(300);
    }

    /**
     * 在日历弹窗中选择日期
     */
    async function selectDateInCalendar(calendar, value) {
        let year, month, day = "1";

        if (value === "至今") {
            year = new Date().getFullYear();
            month = new Date().getMonth() + 1;
            day = new Date().getDate();
        } else {
            const match = value.match(/^(\d{4})(-|\.|年)(\d{1,2})(?:月)?(?:(-|\.|月)(\d{1,2})(日)?)?$/);
            if (!match) return;
            year = match[1];
            month = match[3];
            day = match[5] || "1";

            // 去掉前导零
            if (month.startsWith("0")) month = month.slice(1);
            if (day.startsWith("0")) day = day.slice(1);
        }

        try {
            let options = getRadioOptions(calendar);
            let normalizedOptions = normalizeCalendarOptions(options);
            let optionsStr = normalizedOptions.join(";");

            // 处理年份范围选择器
            if (/(^|;)(19|20)\d{2}(年)?-(19|20)\d{2}(年)?/.test(optionsStr)) {
                let attempts = 0;
                while (attempts < 10) {
                    let yearIndex = normalizedOptions.indexOf(year + "年");
                    if (yearIndex === -1) yearIndex = normalizedOptions.indexOf(year);

                    if (yearIndex !== -1) {
                        const yearElement = findMatchingElement(calendar, options[yearIndex]);
                        await simulateClick(yearElement);
                        await delay(50);
                        options = getRadioOptions(calendar);
                        normalizedOptions = normalizeCalendarOptions(options);
                        optionsStr = normalizedOptions.join(";");
                        break;
                    } else {
                        // 需要翻页找到年份
                        const firstYearElement = findMatchingElement(calendar, options[0]);
                        const [prevBtn, nextBtn] = findCalendarNavButtons(calendar, firstYearElement);
                        if (!prevBtn || !nextBtn) return;

                        // 找到当前显示的年份范围
                        let currentYear = null;
                        for (let i = 0; i < normalizedOptions.length - 2; i++) {
                            const y1 = normalizedOptions[i].match(/^(19|20)\d{2}$/);
                            const y2 = normalizedOptions[i + 1].match(/^(19|20)\d{2}$/);
                            const y3 = normalizedOptions[i + 2].match(/^(19|20)\d{2}$/);
                            if (y1 && y2 && y3) {
                                const v1 = parseInt(y1[0]);
                                const v2 = parseInt(y2[0]);
                                const v3 = parseInt(y3[0]);
                                if (v2 === v1 + 1 && v3 === v2 + 1) {
                                    currentYear = v1;
                                    break;
                                }
                            }
                        }

                        if (currentYear === null) return;

                        const targetBtn = parseInt(year) < currentYear ? prevBtn : nextBtn;
                        await simulateClick(targetBtn);
                        await delay(50);
                        options = getRadioOptions(calendar);
                        normalizedOptions = normalizeCalendarOptions(options);
                        optionsStr = normalizedOptions.join(";");
                    }
                    attempts++;
                }

                if (attempts === 10) return;
            } else {
                // 处理年月选择器
                if (/1;2;3;4;5;6;7;8;9;10;11;12;13;14;15;16;17;18;19;20;21;22;23;24;25;26;27;28/.test(optionsStr)) {
                    // 判断顺序：年-月 还是 月-年
                    let order = "Y-M";
                    if ((normalizedOptions[0] && normalizedOptions[0].includes("月")) ||
                        (normalizedOptions[1] && normalizedOptions[1].includes("年"))) {
                        order = "M-Y";
                    }

                    let currentYear = order === "Y-M" ? normalizedOptions[0] : normalizedOptions[1];
                    let yearElement = order === "Y-M" ? options[0] : options[1];

                    // 如果当前年份不匹配，切换年份
                    if (currentYear.replace(/年$/, "") !== year) {
                        const yearBtn = findMatchingElement(calendar, yearElement);
                        await simulateClick(yearBtn);
                        await delay(50);
                        options = getRadioOptions(calendar);
                        normalizedOptions = normalizeCalendarOptions(options);
                        optionsStr = normalizedOptions.join(";");

                        let yearAttempts = 0;
                        while (yearAttempts < 10) {
                            let targetYearIndex = normalizedOptions.indexOf(year + "年");
                            if (targetYearIndex === -1) targetYearIndex = normalizedOptions.indexOf(year);

                            if (targetYearIndex !== -1) {
                                const targetYearElement = findMatchingElement(calendar, options[targetYearIndex]);
                                await simulateClick(targetYearElement);
                                await delay(50);
                                options = getRadioOptions(calendar);
                                normalizedOptions = normalizeCalendarOptions(options);
                                optionsStr = normalizedOptions.join(";");
                                break;
                            } else {
                                const navElement = findMatchingElement(calendar, order === "Y-M" ? options[0] : options[1]);
                                const [prevBtn, nextBtn] = findCalendarNavButtons(calendar, navElement);
                                if (!prevBtn || !nextBtn) return;

                                let baseYear = null;
                                for (let i = 0; i < normalizedOptions.length - 2; i++) {
                                    const y1 = normalizedOptions[i].match(/^(19|20)\d{2}$/);
                                    const y2 = normalizedOptions[i + 1].match(/^(19|20)\d{2}$/);
                                    const y3 = normalizedOptions[i + 2].match(/^(19|20)\d{2}$/);
                                    if (y1 && y2 && y3) {
                                        const v1 = parseInt(y1[0]);
                                        const v2 = parseInt(y2[0]);
                                        const v3 = parseInt(y3[0]);
                                        if (v2 === v1 + 1 && v3 === v2 + 1) {
                                            baseYear = v1;
                                            break;
                                        }
                                    }
                                }

                                if (baseYear === null) return;
                                const navBtn = parseInt(year) < baseYear ? prevBtn : nextBtn;
                                await simulateClick(navBtn);
                                await delay(50);
                                options = getRadioOptions(calendar);
                                normalizedOptions = normalizeCalendarOptions(options);
                                optionsStr = normalizedOptions.join(";");
                            }
                            yearAttempts++;
                        }

                        if (yearAttempts === 10) return;
                    }

                    // 检查是否有日期选择
                    let hasDateSelection = false;
                    if (/1;2;3;4;5;6;7;8;9;10;11;12;13;14;15;16;17;18;19;20;21;22;23;24;25;26;27;28/.test(optionsStr)) {
                        // 检查14和15是否可见
                        let hasVisibleDays = false;
                        for (let i = 0; i < normalizedOptions.length - 1; i++) {
                            if (normalizedOptions[i] === "14" && normalizedOptions[i + 1] === "15") {
                                const el14 = findMatchingElement(calendar, options[i]);
                                const el15 = findMatchingElement(calendar, options[i + 1]);
                                if (isElementClickable(el14) && isElementClickable(el15)) {
                                    hasVisibleDays = true;
                                }
                                break;
                            }
                        }

                        if (hasVisibleDays) {
                            // 先选择月份
                            if (normalizedOptions[1] !== month + "月") {
                                const monthBtn = findMatchingElement(calendar, order === "Y-M" ? options[1] : options[0]);
                                await simulateClick(monthBtn);
                                await delay(50);
                                options = getRadioOptions(calendar);
                                normalizedOptions = normalizeCalendarOptions(options);
                                optionsStr = normalizedOptions.join(";");
                                hasDateSelection = true;
                            }
                        } else {
                            hasDateSelection = true;
                        }

                        if (hasDateSelection) {
                            const monthElement = findMatchingElement(calendar, options[normalizedOptions.indexOf(month + "月")]);
                            await simulateClick(monthElement);
                            await delay(50);
                            options = getRadioOptions(calendar);
                            normalizedOptions = normalizeCalendarOptions(options);
                            optionsStr = normalizedOptions.join(";");
                        }

                        // 选择日期
                        const dayElement = findMatchingElement(calendar, day, Number(day) < 15);
                        await simulateClick(dayElement);
                        await delay(50);
                        return;
                    }
                } else if (/1月;2月;3月;4月;5月;6月;7月;8月;9月;10月;11月;12月/.test(optionsStr)) {
                    // 只有年月选择的情况
                    let order = "Y-M";
                    if ((normalizedOptions[0] && normalizedOptions[0].includes("月")) ||
                        (normalizedOptions[1] && normalizedOptions[1].includes("年"))) {
                        order = "M-Y";
                    }

                    let currentYear = order === "Y-M" ? normalizedOptions[0] : normalizedOptions[1];
                    let yearElement = order === "Y-M" ? options[0] : options[1];

                    if (currentYear.replace(/年$/, "") !== year) {
                        let navElement = yearElement;
                        if (normalizedOptions.length > 3 && /^(19|20)\d{2}$/.test(normalizedOptions[2])) {
                            navElement = options[2];
                        }
                        const yearBtn = findMatchingElement(calendar, navElement);
                        await simulateClick(yearBtn);
                        await delay(50);
                        options = getRadioOptions(calendar);
                        normalizedOptions = normalizeCalendarOptions(options);
                        optionsStr = normalizedOptions.join(";");

                        let yearAttempts = 0;
                        while (yearAttempts < 10) {
                            let targetYearIndex = normalizedOptions.indexOf(year + "年");
                            if (targetYearIndex === -1) targetYearIndex = normalizedOptions.indexOf(year);

                            if (targetYearIndex !== -1) {
                                const targetYearElement = findMatchingElement(calendar, options[targetYearIndex]);
                                await simulateClick(targetYearElement);
                                await delay(50);
                                options = getRadioOptions(calendar);
                                normalizedOptions = normalizeCalendarOptions(options);
                                optionsStr = normalizedOptions.join(";");

                                // 如果又变成年份范围选择，跳过
                                if (/^(19|20)\d{2}(年)?-(19|20)\d{2}(年)?/.test(optionsStr) &&
                                    !/1月;2月;3月;4月;5月;6月;7月;8月;9月;10月;11月;12月/.test(optionsStr)) {
                                    continue;
                                }
                                break;
                            } else {
                                const navBtn = findMatchingElement(calendar, order === "Y-M" ? options[0] : options[1]);
                                const [prevBtn, nextBtn] = findCalendarNavButtons(calendar, navBtn);
                                if (!prevBtn || !nextBtn) return;

                                let baseYear = null;
                                for (let i = 0; i < normalizedOptions.length - 2; i++) {
                                    const y1 = normalizedOptions[i].match(/^(19|20)\d{2}$/);
                                    const y2 = normalizedOptions[i + 1].match(/^(19|20)\d{2}$/);
                                    const y3 = normalizedOptions[i + 2].match(/^(19|20)\d{2}$/);
                                    if (y1 && y2 && y3) {
                                        const v1 = parseInt(y1[0]);
                                        const v2 = parseInt(y2[0]);
                                        const v3 = parseInt(y3[0]);
                                        if (v2 === v1 + 1 && v3 === v2 + 1) {
                                            baseYear = v1;
                                            break;
                                        }
                                    }
                                }

                                if (baseYear === null) return;
                                const targetNavBtn = parseInt(year) < baseYear ? prevBtn : nextBtn;
                                await simulateClick(targetNavBtn);
                                await delay(50);
                                options = getRadioOptions(calendar);
                                normalizedOptions = normalizeCalendarOptions(options);
                                optionsStr = normalizedOptions.join(";");
                            }
                            yearAttempts++;
                        }

                        if (yearAttempts === 10) return;
                    }

                    // 选择月份
                    let monthIndex = normalizedOptions.lastIndexOf(month + "月");
                    if (monthIndex === -1) return;
                    const monthElement = findMatchingElement(calendar, options[monthIndex], false);
                    await simulateClick(monthElement);
                    await delay(50);
                    return;
                }
            }
        } catch (error) { }
    }

    /**
     * 标准化日历选项（转换中文月份等）
     */
    function normalizeCalendarOptions(options) {
        const result = [];
        for (const opt of options) {
            let normalized = opt.replace(/\s+/g, "");
            // 转换中文月份
            normalized = normalized
                .replace(/十一月/, "11月")
                .replace(/十二月/, "12月")
                .replace(/一月/, "1月")
                .replace(/二月/, "2月")
                .replace(/三月/, "3月")
                .replace(/四月/, "4月")
                .replace(/五月/, "5月")
                .replace(/六月/, "6月")
                .replace(/七月/, "7月")
                .replace(/八月/, "8月")
                .replace(/九月/, "9月")
                .replace(/十月/, "10月");
            // 去掉前导零
            normalized = normalized.replace(/^0(\d+)月/, "$1月");
            normalized = normalized.replace(/^0(\d+)$/, "$1");
            result.push(normalized);
        }
        return result;
    }

    /**
     * 检查元素是否可点击（在视口内）
     */
    function isElementClickable(element) {
        const rect = element.getBoundingClientRect();
        if (rect.top < 0 || rect.left < 0 ||
            rect.bottom > window.innerHeight ||
            rect.right > window.innerWidth) {
            return false;
        }
        const centerElement = document.elementFromPoint(
            rect.left + rect.width / 2,
            rect.top + rect.height / 2
        );
        if (!centerElement) return false;
        return centerElement === element ||
            element.contains(centerElement) ||
            centerElement.contains(element);
    }

    /**
     * 查找日历导航按钮（上一页/下一页）
     */
    function findCalendarNavButtons(calendar, referenceElement) {
        const rect = referenceElement.getBoundingClientRect();
        const elements = calendar.querySelectorAll("*");

        let leftButtons = [];
        let rightButtons = [];

        for (const el of elements) {
            if (el instanceof SVGElement || el.closest("svg")) continue;

            const elRect = el.getBoundingClientRect();
            if (elRect.width > 50 || elRect.height > 50) continue;

            // 检查垂直位置是否在参考元素附近
            if (elRect.top < rect.top - 20 || elRect.bottom > rect.bottom + 20) continue;

            // 左侧按钮
            if (elRect.left < rect.left && elRect.right < rect.left) {
                leftButtons.push(el);
            }
            // 右侧按钮
            if (elRect.left > rect.right && elRect.right > rect.right) {
                rightButtons.push(el);
            }
        }

        leftButtons = filterChildElements(leftButtons);
        rightButtons = filterChildElements(rightButtons);

        if (rightButtons.length === 0) return [null, null];
        if (leftButtons.length === 0) {
            if (rightButtons.length === 1) return [null, null];
            return [rightButtons[rightButtons.length - 2], rightButtons[rightButtons.length - 1]];
        }

        return [leftButtons[0], rightButtons[rightButtons.length - 1]];
    }

    // ==================== 数据结构转换函数 ====================

    /**
     * 构建字段结构
     */
    function buildFieldStructures(serverFields) {
        const structures = [];
        try {
            if (serverFields.length === 0) {
                throw new Error("服务器返回错误");
            }

            for (const section of serverFields) {
                const sectionData = {
                    name: section.name,
                    dom: null,
                    fields: []
                };
                structures.push(sectionData);

                for (const field of section.fields) {
                    const fieldData = {
                        name: field.name,
                        field: { dom: null },
                        blanks: []
                    };
                    sectionData.fields.push(fieldData);
                }
            }
        } catch (error) { }
        return structures;
    }

    /**
     * 将字段结构转换为API请求格式
     */
    function convertToApiFormat(structures, serverFields) {
        
        try {
            const result = [];
            for (const section of serverFields) {
                result.push({ name: section.name, fields: [] });
            }

            for (let i = 0; i < structures.length; i++) {
                const section = structures[i];
                const apiFields = [];
                result[i].fields = apiFields;

                for (let j = 0; j < section.fields.length; j++) {
                    const field = section.fields[j];

                    // 没有输入框或只有一个且是日期字段
                    if (field.blanks.length === 0 ||
                        (field.blanks.length === 1 && /时间|日期|年月/.test(field.name))) {
                        const apiField = { name: field.name };
                        apiFields.push(apiField);
                    } else {
                        // 多个输入框时处理名称
                        if (field.blanks.length > 1) {
                            let allEmpty = true;
                            for (const blank of field.blanks) {
                                if (blank.name !== "") {
                                    allEmpty = false;
                                    break;
                                }
                            }

                            if (allEmpty) {
                                // 根据字段名推断子字段名
                                if (/(居住地|籍贯|户籍|户口|生源地|所在地|省份|城市|地点)/i.test(field.name)) {
                                    if (field.blanks.length === 2) {
                                        field.blanks[0].name = "省/直辖市";
                                        field.blanks[1].name = "市";
                                    } else if (field.blanks.length === 3) {
                                        field.blanks[0].name = "省/直辖市";
                                        field.blanks[1].name = "市";
                                        field.blanks[2].name = "区";
                                    }
                                }
                                if (/(手机号|电话号码|手机号码|联系电话)/i.test(field.name) &&
                                    field.blanks.length === 2) {
                                    field.blanks[0].name = "国家";
                                    field.blanks[1].name = "号码";
                                }
                                if (/(期望薪资|期望月薪|期望年薪)/i.test(field.name) &&
                                    field.blanks.length === 2) {
                                    field.blanks[0].name = "下限";
                                    field.blanks[1].name = "上限";
                                }
                            }
                        }

                        // 为每个输入框创建API字段
                        for (const blank of field.blanks) {
                            const apiField = {
                                name: field.blanks.length === 1 ?
                                    field.name : `${field.name} - ${blank.name}`
                            };
                            apiFields.push(apiField);

                            // 添加选项信息
                            let index = -1;
                            index = inputDomList.indexOf(blank.dom);
                            if (index !== -1 && selectInputOptions[index] && selectInputOptions[index].length > 0) {
                                apiField.items = selectInputOptions[index];
                            } else {
                                index = selectDomList.indexOf(blank.dom);
                                if (index !== -1 && selectOptions[index] && selectOptions[index].length > 0) {
                                    apiField.items = selectOptions[index];
                                } else {
                                    index = radioDomList.indexOf(blank.dom);
                                    if (index !== -1 && radioOptions[index] && radioOptions[index].length > 0) {
                                        apiField.items = radioOptions[index];
                                    }
                                }
                            }
                        }
                    }
                }
            }
            return result;
        } catch (error) {
            return null;
        }
    }

    /**
     * 将API返回的填充值转换为内部格式
     */
    function convertFillValues(values) {
        const result = [];
        for (const section of values) {
            const sectionData = {
                name: section.name,
                fields: []
            };

            for (const field of section.fields) {
                // 处理带" - "的字段名
                if (field.name.includes(" - ")) {
                    const [fieldName, blankName] = field.name.split(" - ");
                    let existingField = sectionData.fields.find(f => f.name === fieldName);
                    if (!existingField) {
                        existingField = { name: fieldName, blanks: [] };
                        sectionData.fields.push(existingField);
                    }
                    existingField.blanks.push({ name: blankName, value: field.value });
                } else {
                    sectionData.fields.push({
                        name: field.name,
                        blanks: [{ name: "", value: field.value }]
                    });
                }
            }
            result.push(sectionData);
        }
        return result;
    }

    /**
     * 处理手机号格式（去掉+86前缀）
     */
    function processPhoneNumbers(data) {
        for (const section of data) {
            for (const field of section.fields) {
                if (/(手机号|电话号码|手机号码|联系电话)/i.test(field.name) && field.blanks) {
                    for (const blank of field.blanks) {
                        if (blank.value && typeof blank.value === "string" &&
                            blank.value.startsWith("+86")) {
                            blank.value = blank.value.substring(3);
                        }
                    }
                }
            }
        }
        return data;
    }

    // ==================== 特殊选项检测函数 ====================

    /**
     * 获取弹窗中的选项（处理特殊情况如日期、省份、民族等）
     */
    function getPopupOptions() {
        let options = [];

        for (const popup of newlyAddedDoms) {
            collectCancelButtons(popup);
            const popupOptions = getRadioOptions(popup);

            // 检查是否为日期选择器（28天模式）
            if (popupOptions.length >= 40) {
                const datePattern = "1;2;3;4;5;6;7;8;9;10;11;12;13;14;15;16;17;18;19;20;21;22;23;24;25;26;27;28";
                const weekPattern = "一;二;三;四;五;六";
                const optionsStr = popupOptions.join(";");

                if (optionsStr.includes(datePattern) && optionsStr.includes(weekPattern)) {
                    options = ["(请填写日期)"];
                    break;
                }
            }

            // 检查是否为月份选择器
            if (popupOptions.length >= 12) {
                const monthPattern = "1月;2月;3月;4月;5月;6月;7月;8月;9月;10月;11月;12月";
                if (popupOptions.join(";").includes(monthPattern)) {
                    options = ["(请填写年月)"];
                    break;
                }
            }

            // 检查是否为省份选择器
            if (popupOptions.length >= 30) {
                const provinces = [
                    "北京", "天津", "上海", "重庆", "河北", "山西", "辽宁", "吉林", "黑龙江",
                    "江苏", "浙江", "安徽", "福建", "江西", "山东", "河南", "湖北", "湖南",
                    "广东", "海南", "四川", "贵州", "云南", "陕西", "甘肃", "青海", "台湾",
                    "内蒙古", "广西", "西藏", "宁夏", "新疆", "香港", "澳门"
                ];
                let matchCount = 0;
                for (const province of provinces) {
                    if (popupOptions.some(opt => opt.includes(province))) {
                        matchCount++;
                    }
                }
                if (matchCount >= 30) {
                    options = ["(请填写省份)"];
                    break;
                }
            }

            // 检查是否为民族选择器
            if (popupOptions.length >= 30) {
                const ethnicities = [
                    "汉族", "蒙古族", "回族", "藏族", "维吾尔族", "苗族", "彝族", "壮族",
                    "布依族", "朝鲜族", "满族", "侗族", "瑶族", "白族", "土家族", "哈尼族",
                    "哈萨克族", "傣族", "黎族", "傈僳族", "佤族", "畲族", "高山族", "拉祜族",
                    "水族", "东乡族", "纳西族", "景颇族", "柯尔克孜族", "土族", "达斡尔族",
                    "仫佬族", "羌族", "布朗族", "撒拉族", "毛南族", "仡佬族", "锡伯族",
                    "阿昌族", "普米族", "塔吉克族", "怒族", "乌孜别克族", "俄罗斯族",
                    "鄂温克族", "德昂族", "保安族", "裕固族", "京族", "塔塔尔族", "独龙族",
                    "鄂伦春族", "赫哲族", "门巴族", "珞巴族", "基诺族"
                ];
                let matchCount = 0;
                for (const ethnicity of ethnicities) {
                    if (popupOptions.some(opt => opt.includes(ethnicity))) {
                        matchCount++;
                    }
                }
                if (matchCount >= 30) {
                    options = ["(请填写民族)"];
                    break;
                }
            }

            // 检查是否为国家选择器
            if (popupOptions.length >= 30) {
                const countries = [
                    "中国", "美国", "日本", "德国", "英国", "法国", "意大利", "加拿大",
                    "澳大利亚", "俄罗斯", "印度", "巴西", "韩国", "西班牙", "墨西哥"
                    // ... 更多国家省略
                ];
                let matchCount = 0;
                for (const country of countries) {
                    if (popupOptions.some(opt => opt.includes(country))) {
                        matchCount++;
                    }
                }
                if (matchCount >= 30) {
                    options = ["(请填写国家)"];
                    break;
                }
            }

            // 检查是否为数字范围选择器
            if (popupOptions.length >= 10) {
                const numbers = [];
                for (const opt of popupOptions) {
                    const num = parseInt(opt.trim());
                    if (!isNaN(num)) numbers.push(num);
                }

                if (numbers.length >= 0.8 * popupOptions.length) {
                    numbers.sort((a, b) => a - b);
                    let isConsecutive = true;
                    for (let i = 1; i < numbers.length; i++) {
                        if (numbers[i] !== numbers[i - 1] + 1) {
                            isConsecutive = false;
                            break;
                        }
                    }

                    if (isConsecutive && numbers.length > 0) {
                        const min = numbers[0];
                        const max = numbers[numbers.length - 1];
                        if (max - min >= 10) {
                            options = [`(请填写${min}-${max}中的一个数字)`];
                            break;
                        }
                    }
                }
            }

            // 普通选项
            if (popupOptions.length >= 2) {
                options = popupOptions.join(";").length > 1000 ?
                    popupOptions.slice(0, 100) : popupOptions;
            }
        }

        return options;
    }

    /**
     * 等待输入值匹配
     */
    async function waitForValueMatch(element, value) {
        for (let i = 0; i < 10; i++) {
            await delay(100);
            if (element.value === value || element.textContent === value) {
                return true;
            } else {
                // 检查弹窗是否已关闭
                let allClosed = true;
                for (const popup of newlyAddedDoms) {
                    if (isElementVisible(popup)) {
                        allClosed = false;
                        break;
                    }
                }
                if (allClosed) return true;
            }
        }
        return false;
    }

    /**
     * 在弹窗中选择值
     */
    function findValueInPopup(value) {
        let element = null;
        for (const popup of newlyAddedDoms) {
            if (!element) {
                element = findMatchingElement(popup, value);
            }
            collectConfirmButtons(popup);
            collectCancelButtons(popup);
        }
        return element;
    }

    /**
     * 尝试选择弹窗选项
     */
    async function trySelectPopupOption(value) {
        const beforeOptions = [];
        for (const popup of newlyAddedDoms) {
            beforeOptions.push(...getRadioOptions(popup));
        }

        await delay(100);

        // 查找并点击匹配的选项
        const targetElement = findValueInPopup(value);
        if (!targetElement) return false;

        await simulateClick(targetElement);
        await delay(200);

        // 检查选项是否变化
        const afterOptions = [];
        for (const popup of newlyAddedDoms) {
            afterOptions.push(...getRadioOptions(popup));
        }

        // 如果选项没有变化，可能需要点击radio/checkbox
        if (beforeOptions.length === afterOptions.length &&
            beforeOptions.join(",") === afterOptions.join(",")) {
            // 查找关联的radio/checkbox
            const allElements = [];
            for (const popup of newlyAddedDoms) {
                allElements.push(...popup.querySelectorAll("*"));
            }
            allElements.reverse();

            const targetIndex = allElements.indexOf(targetElement);
            if (targetIndex === -1) return false;

            let radioElement = null;
            let svgElement = null;

            for (let i = targetIndex + 1; i < allElements.length; i++) {
                const el = allElements[i];
                if (el.contains(targetElement)) continue;
                if (el.textContent && el.textContent !== value) break;

                if (el.tagName === "INPUT" &&
                    (el.type === "radio" || el.type === "checkbox")) {
                    radioElement = el;
                    break;
                }

                if (el.className && el.tagName !== "g" && el.tagName !== "svg" &&
                    (/(?:^|\W+)([Rr]adio|[Cc]heckbox)(?:[A-Z0-9]|[^a-z]+|$)/.test(el.className) ||
                        /(?:^|\W+)(radio|checkbox)(?:[^a-zA-Z]+|$)/i.test(el.className))) {
                    radioElement = el;
                    break;
                }

                if (el.tagName === "svg" && !svgElement) {
                    svgElement = el;
                }
            }

            if (!radioElement && svgElement) {
                radioElement = svgElement;
            }

            if (radioElement) {
                await simulateClick(radioElement);
                await delay(200);
                return true;
            }
        } else {
            // 选项发生变化，检查相似度
            let isSimilar = false;
            const threshold = 0.1;
            const avgLength = (beforeOptions.length + afterOptions.length) / 2;

            if (Math.abs(beforeOptions.length - afterOptions.length) / avgLength < threshold) {
                let diffCount = 0;
                const beforeCopy = beforeOptions.slice();
                for (const opt of afterOptions) {
                    const index = beforeCopy.indexOf(opt);
                    if (index !== -1) {
                        beforeCopy.splice(index, 1);
                    } else {
                        diffCount++;
                    }
                }
                if (diffCount / avgLength < threshold) {
                    isSimilar = true;
                }
            }

            if (isSimilar) return true;
        }

        return false;
    }

    // ==================== 删除按钮相关函数 ====================

    /**
     * 扫描删除按钮
     */
    function scanDeleteButtons(container) {
        const elements = container.querySelectorAll("*");

        // 通过文本内容查找
        for (const el of elements) {
            let isDelete = false;
            if (el.innerText) {
                const text = el.innerText.trim();
                if (/^(删\s*除|移\s*除).{0,4}$/.test(text)) {
                    isDelete = true;
                }
            }
            if (isDelete) {
                deleteButtons.push(el);
            }
        }

        // 通过属性查找
        for (const el of elements) {
            if (deleteButtons.includes(el)) continue;

            let isDelete = false;
            const attrs = el.attributes;

            for (const attr of attrs) {
                const value = attr.value;
                if (/(?:^|\W+)(shanchu|(del|delete|remove|trash)(|btn|button)|删\s*除|移\s*除)(?:[^a-zA-Z]+|$)/i.test(value)) {
                    isDelete = true;
                    break;
                }
                if (/(?:^|\W+)([Ss]hanchu|[Dd]elete|[Rr]emove|[Tt]rash)(?:[A-Z0-9]|$)/.test(value)) {
                    isDelete = true;
                    break;
                }
            }

            if (isDelete) {
                deleteButtons.push(el);
            }
        }
    }

    /**
     * 检查是否为操作按钮（删除、编辑等）
     */
    function isActionButton(element) {
        if (!element || !element.className || typeof element.className !== "string") {
            return false;
        }

        const className = element.className;
        const isAction = /(?:^|\W+)(shanchu|delete|remove|trash|add|plus|minus|edit|modify|update|save|cancel|confirm)(|btn|button)(?:[^a-zA-Z]+|$)/i.test(className) ||
            /(?:^|\W+)([Ss]hanchu|[Dd]elete|[Rr]emove|[Tt]rash|[Aa]dd|[Pp]lus|[Mm]inus|[Ee]dit|[Mm]odify|[Uu]pdate|[Ss]ave|[Cc]ancel|[Cc]onfirm)(?:[A-Z0-9]|$)/.test(className);
        const isIcon = /(?:^|\W+)(ico|icon|btn|button|fa|fas|far|iconfont|symbol)(?:[^a-zA-Z]+|$)/i.test(className) ||
            /(?:^|\W+)([Ii]co|[Ii]con|[Bb]tn|[Bb]utton|[Ff]a|[Ff]as|[Ff]ar|[Ii]confont|[Ss]ymbol)(?:[A-Z0-9]|$)/.test(className);

        return isAction && isIcon;
    }

    // ==================== 重复条目检测函数 ====================

    /**
     * 扫描包含中文的可见元素
     */
    function scanChineseElements() {
        const result = [];
        for (const popup of newlyAddedDoms) {
            if (!isElementVisible(popup)) continue;
            const text = popup.textContent.trim();
            if (/[\u4e00-\u9fa5]/.test(text)) {
                result.push(popup);
            }
        }

        deleteButtons = [];
        for (const el of result) {
            scanDeleteButtons(el);
        }

        return result;
    }

    /**
     * 检查是否为重复的表单块
     */
    function isDuplicateBlock(blocks) {
        let allElements = [];
        for (const block of blocks) {
            allElements.push(block);
            const children = Array.from(block.querySelectorAll("*"));
            allElements = allElements.concat(children);
        }
        allElements = allElements.reverse();

        const firstBlock = blocks[0];
        const allPageElements = getAllElements().reverse();

        let matchIndex = 0;
        let started = false;

        for (let i = 0; i < allPageElements.length; i++) {
            const el = allPageElements[i];

            if (el === firstBlock) {
                started = true;
                continue;
            }

            if (!started) continue;
            if (matchIndex >= allElements.length) return true;

            const target = allElements[matchIndex];

            // 精确匹配
            if (el.nodeType === target.nodeType &&
                el.tagName === target.tagName &&
                el.className === target.className) {
                const elAttrs = Array.from(el.attributes)
                    .filter(a => a.name !== "style")
                    .map(a => a.name).sort();
                const targetAttrs = Array.from(target.attributes)
                    .filter(a => a.name !== "style")
                    .map(a => a.name).sort();

                if (JSON.stringify(elAttrs) === JSON.stringify(targetAttrs)) {
                    matchIndex++;
                    continue;
                }
            }

            // 对象类型className匹配
            if (el.nodeType === target.nodeType &&
                el.tagName === target.tagName &&
                typeof el.className === "object" &&
                typeof target.className === "object") {
                matchIndex++;
                continue;
            }

            // 相似className匹配
            if (el.nodeType === target.nodeType &&
                el.tagName === target.tagName &&
                typeof el.className === "string" &&
                typeof target.className === "string") {

                const isSimilarClass = compareClassNames(el.className, target.className);
                const elAttrs = Array.from(el.attributes).map(a => a.name).sort();
                const targetAttrs = Array.from(target.attributes).map(a => a.name).sort();
                const sameAttrs = JSON.stringify(elAttrs) === JSON.stringify(targetAttrs);

                if (isSimilarClass && sameAttrs &&
                    el.innerText !== "" && target.innerText !== "") {
                    if (el.innerText === target.innerText) {
                        matchIndex++;
                        continue;
                    } else {
                        const maxLen = Math.max(el.innerHTML.length, target.innerHTML.length);
                        const minLen = Math.min(el.innerHTML.length, target.innerHTML.length);
                        if (maxLen > 100 && minLen / maxLen > 0.8) {
                            if (compareInnerHTML(el, target)) {
                                matchIndex++;
                                continue;
                            }
                        }
                    }
                }
            }

            // 跳过操作按钮
            const skipPattern = /^[\+\- ]*(添加|增加|删除|移除|收起|展开)/;
            if (el.innerText && !skipPattern.test(el.innerText) && !isActionButton(el)) {
                if (target.innerText && !skipPattern.test(target.innerText) && !isActionButton(target)) {
                    break;
                }
                matchIndex++;
                i--;
            }
        }

        return false;
    }

    /**
     * 比较两个className是否相似
     */
    function compareClassNames(class1, class2) {
        if (class1.length === class2.length) {
            const pattern = /[^a-zA-Z0-9]/g;
            let matches1 = [...class1.matchAll(pattern)];
            let matches2 = [...class2.matchAll(pattern)];

            const sameCount = matches1.length === matches2.length;
            const samePositions = matches1.every((m, i) => {
                const m2 = matches2[i];
                return m.index === m2.index && m[0] === m2[0];
            });

            return sameCount && samePositions;
        }

        // 处理长度不同的情况
        const [shorter, longer] = class1.length < class2.length ? [class1, class2] : [class2, class1];
        const shorterParts = shorter.trim().split(/\s+/).filter(p => p);
        const longerParts = longer.trim().split(/\s+/).filter(p => p);

        // 检查差异部分是否为visibility相关类
        const visibilityPattern = /(?:^|\W+)(hide|show|hidden|visible|display|opacity|fade|toggle)(|d|ing|ed|able)(?:[^a-zA-Z]+|$)/i;
        const visibilityCamelPattern = /(?:^|\W+)([Hh]ide|[Ss]how|[Hh]idden|[Vv]isible|[Dd]isplay|[Oo]pacity|[Ff]ade|[Tt]oggle)(?:[A-Z0-9]|$)/;

        const diff = longerParts.filter(p => !shorterParts.includes(p));
        if (!diff.every(p => visibilityPattern.test(p) || visibilityCamelPattern.test(p))) {
            return false;
        }

        const remaining = longerParts.filter(p => !diff.includes(p));
        if (remaining.length !== shorterParts.length) return false;

        return remaining.every(p => shorterParts.includes(p));
    }

    /**
     * 比较两个元素的innerHTML相似度
     */
    function compareInnerHTML(el1, el2) {
        return calculateSimilarity(el1.innerHTML, el2.innerHTML) > 80;
    }

    /**
     * 计算两个字符串的相似度
     */
    function calculateSimilarity(str1, str2) {
        str1 = str1.replace(/\s+/g, "");
        str2 = str2.replace(/\s+/g, "");

        if (Math.min(str1.length, str2.length) === 0) return 0;
        if (str1 === str2) return 100;

        const chunkSize = 1000;
        const chunks1 = str1.match(new RegExp(`.{1,${chunkSize}}`, "g")) || [];
        const chunks2 = str2.match(new RegExp(`.{1,${chunkSize}}`, "g")) || [];

        let matchCount = 0;
        const maxChunks = Math.max(chunks1.length, chunks2.length);

        for (let i = 0; i < maxChunks; i++) {
            const c1 = chunks1[i] || "";
            const c2 = chunks2[i] || "";
            let chunkMatch = 0;
            const minLen = Math.min(c1.length, c2.length);

            for (let j = 0; j < minLen; j++) {
                if (c1[j] === c2[j]) chunkMatch++;
            }
            matchCount += chunkMatch;
        }

        return (2 * matchCount / (str1.length + str2.length)) * 100;
    }

    /**
     * 删除重复的表单块
     */
    async function deleteDuplicateBlocks(blocks) {
        const buttons = filterChildElements(deleteButtons);
        buttons.reverse();

        for (const btn of buttons) {
            startDomObserver();
            await simulateClick(btn);
            await delay(100);
            stopDomObserver();

            // 点击删除确认按钮
            for (const popup of newlyAddedDoms) {
                collectDeleteConfirmButtons(popup);
                await clickDeleteConfirmButtons();
            }
            await delay(100);

            // 检查是否删除成功
            let deleted = true;
            for (const block of blocks) {
                if (isElementVisible(block)) {
                    deleted = false;
                    break;
                }
            }

            if (deleted) return;
        }
    }

    // ==================== 字段定位函数 ====================

    /**
     * 定位字段标签和输入框
     */
    function locateFieldLabels(structures) {
        try {
            const fieldNames = structures.map(s => s.name);
            const allElements = getAllElements();
            let container = null;

            // 找到包含多个字段名的容器
            for (const el of allElements) {
                const children = el.childNodes;
                if (children.length < 5) continue;

                let matchCount = 0;
                for (const child of children) {
                    const text = child.textContent.trim();
                    if (text && fieldNames.includes(text)) {
                        matchCount++;
                    } else if (text.length > 10) {
                        matchCount = 0;
                        break;
                    }
                }

                if (matchCount >= 5) {
                    container = el;
                    break;
                }
            }

            // 为每个section和field定位DOM元素
            let lastDom = null;
            for (const section of structures) {
                section.dom = findFieldLabel(section.name, lastDom, container);
                lastDom = section.dom;

                for (const field of section.fields) {
                    field.field.dom = findFieldLabel(field.name, lastDom, container);
                    lastDom = field.field.dom;
                }
            }
        } catch (error) { }
    }

    /**
     * 为字段定位输入框
     */
    function locateFieldInputs(structures) {
        try {
            const fieldDoms = [];
            const fieldInputs = [];
            const isLastField = [];

            // 收集所有字段DOM和是否为最后一个字段的标记
            for (const section of structures) {
                for (const field of section.fields) {
                    if (field.field.dom) {
                        fieldDoms.push(field.field.dom);
                        fieldInputs.push([]);
                        const isLast = section.fields.indexOf(field) === section.fields.length - 1;
                        isLastField.push(isLast);
                    }
                }
            }

            const allElements = getAllElements();
            let currentFieldDom = null;
            let currentIndex = 0;
            let skipContainer = null;
            let pendingInputs = [];

            for (const el of allElements) {
                // 遇到字段DOM
                if (fieldDoms.includes(el)) {
                    // 处理之前积累的待定输入框
                    if (!fieldInputs[currentIndex].length && pendingInputs.length) {
                        for (const pending of pendingInputs) {
                            let parent = pending.parentElement;
                            while (parent && !isElementVisible(parent)) {
                                parent = parent.parentElement;
                            }
                            if (parent) {
                                fieldInputs[currentIndex].push(parent);
                            }
                        }
                    }

                    pendingInputs = [];
                    currentFieldDom = el;
                    currentIndex = fieldDoms.indexOf(el);
                    const nextFieldDom = currentIndex + 1 < fieldDoms.length ? fieldDoms[currentIndex + 1] : null;
                    skipContainer = null;
                    continue;
                }

                if (!currentFieldDom) continue;
                if (skipContainer && skipContainer.contains(el)) continue;

                const nextFieldDom = currentIndex + 1 < fieldDoms.length ? fieldDoms[currentIndex + 1] : null;
                if (nextFieldDom && el.contains(nextFieldDom)) continue;

                // 检查是否为输入元素
                let isInputElement = false;
                if ((el.tagName === "INPUT" && ["text", "search", "number"].includes(el.type)) ||
                    el.tagName === "TEXTAREA" ||
                    el.tagName === "SELECT" ||
                    el.isContentEditable) {
                    isInputElement = true;
                }

                if (inputDomList.includes(el)) {
                    isInputElement = true;
                }

                if (isInputElement) {
                    if (isElementVisible(el)) {
                        fieldInputs[currentIndex].push(el);
                    } else {
                        pendingInputs.push(el);
                    }
                } else {
                    if (selectDomList.includes(el)) {
                        fieldInputs[currentIndex].push(el);
                    }
                    if (radioDomList.includes(el)) {
                        fieldInputs[currentIndex].push(el);
                    }
                }
            }

            // 过滤每个字段的输入框
            for (const i in fieldInputs) {
                fieldInputs[i] = filterChildElements(fieldInputs[i]);
            }

            // 限制输入框数量
            for (const i in fieldInputs) {
                if ((fieldInputs[i].length > 4) ||
                    (isLastField[i] && fieldInputs[i].length > 2)) {
                    fieldInputs[i] = fieldInputs[i].slice(0, 1);
                }
            }

            // 选择合适的输入框
            const selectedInputs = [];
            for (let i = 0; i < fieldDoms.length; i++) {
                const inputs = fieldInputs[i];
                selectedInputs[i] = [];

                if (inputs.length === 0) continue;

                if (inputs.length === 1) {
                    selectedInputs[i].push(inputs[0]);
                } else {
                    // 优先选择radio类型
                    for (const input of inputs) {
                        if (isRadioGroup(input)) {
                            selectedInputs[i].push(input);
                            break;
                        }
                    }

                    if (selectedInputs[i].length) continue;
                    selectedInputs[i] = inputs;
                }
            }

            // 将选中的输入框关联到字段结构
            for (let i = 0; i < selectedInputs.length; i++) {
                if (selectedInputs[i].length === 0) continue;

                for (const section of structures) {
                    for (const field of section.fields) {
                        if (field.field.dom === fieldDoms[i]) {
                            if (selectedInputs[i].length === 1) {
                                const input = selectedInputs[i][0];
                                field.blanks.push({
                                    name: "",
                                    dom: input,
                                    type: radioDomList.includes(input) ? "radio" :
                                        selectDomList.includes(input) ? "select" : "input"
                                });
                            } else {
                                for (const input of selectedInputs[i]) {
                                    field.blanks.push({
                                        name: getInputPlaceholder(input),
                                        dom: input,
                                        type: radioDomList.includes(input) ? "radio" :
                                            selectDomList.includes(input) ? "select" : "input"
                                    });
                                }
                            }
                        }
                    }
                }
            }
        } catch (error) { }
    }

    /**
     * 查找"添加更多"按钮
     */
    function findAddMoreButton(afterDom, beforeDom) {
        const allElements = getAllElements().reverse();
        let started = !beforeDom;

        for (let i = 0; i < allElements.length; i++) {
            const el = allElements[i];

            if (el === beforeDom || el.contains(beforeDom)) {
                started = true;
                continue;
            }

            if (!started) continue;
            if (el === afterDom) return null;

            const pattern = /^[\s\*\+]*(添加|增加|新增).{0,10}$/;
            if (pattern.test(el.textContent)) {
                return findDeepestMatchingElement(el, pattern);
            }
        }

        return null;
    }

    /**
     * 在新的表单块中匹配字段
     */
    function matchFieldsInNewBlock(blocks, templateFields) {
        const allElements = [];
        for (const block of blocks) {
            allElements.push(block);
            allElements.push(...block.querySelectorAll("*"));
        }

        const templateCopy = JSON.parse(JSON.stringify(templateFields, (key, value) => {
            return value instanceof HTMLElement ? null : value;
        }));

        for (let i = 0; i < templateFields.length; i++) {
            const template = templateFields[i];
            const copy = templateCopy[i];

            let fieldMatch = null;
            if (template.field.dom) {
                fieldMatch = findMatchingDom(allElements, template.field.dom);
                if (!fieldMatch) return null;
                copy.field.dom = fieldMatch;
                allElements.splice(allElements.indexOf(fieldMatch), 1);
            }

            for (let j = 0; j < template.blanks.length; j++) {
                const blank = template.blanks[j];
                const blankCopy = copy.blanks[j];

                fieldMatch = findMatchingDom(allElements, blank.dom);
                if (!fieldMatch) return null;
                blankCopy.dom = fieldMatch;
                allElements.splice(allElements.indexOf(fieldMatch), 1);
            }
        }

        return templateCopy;
    }

    /**
     * 在元素列表中查找匹配的DOM
     */
    function findMatchingDom(elements, targetDom) {
        for (const el of elements) {
            // 检查className匹配
            if ((typeof el.className !== "string" || typeof targetDom.className !== "string") &&
                el.className !== targetDom.className) {
                continue;
            }

            const elClass = el.className.replace(/\s*ark-color-\w+/g, "");
            const targetClass = targetDom.className.replace(/\s*ark-color-\w+/g, "");
            if (elClass !== targetClass) continue;

            // 检查文本内容匹配
            if (el.textContent.trim() !== targetDom.textContent.trim()) continue;

            // 检查父元素路径匹配
            let targetParent = targetDom.parentElement;
            let elParent = el.parentElement;
            let pathMatches = true;

            while (targetParent && elParent && targetParent !== elParent) {
                if (targetParent.tagName !== elParent.tagName) {
                    pathMatches = false;
                    break;
                }

                if (typeof targetParent.className !== "string" || typeof elParent.className !== "string") {
                    if (targetParent.className === elParent.className) {
                        targetParent = targetParent.parentElement;
                        elParent = elParent.parentElement;
                        continue;
                    }
                    pathMatches = false;
                    break;
                }

                const targetParentClass = targetParent.className.replace(/\s*ark-color-\w+/g, "");
                const elParentClass = elParent.className.replace(/\s*ark-color-\w+/g, "");

                if (targetParentClass === elParentClass) {
                    targetParent = targetParent.parentElement;
                    elParent = elParent.parentElement;
                    continue;
                }

                // 检查是否只是长度相同但不同的类名
                if (targetParentClass.length === elParentClass.length) {
                    const pattern = /[^a-zA-Z0-9]/g;
                    let matches1 = [...targetParentClass.matchAll(pattern)];
                    let matches2 = [...elParentClass.matchAll(pattern)];

                    const sameCount = matches1.length === matches2.length;
                    const samePositions = matches1.every((m, idx) => {
                        const m2 = matches2[idx];
                        return m.index === m2.index && m[0] === m2[0];
                    });

                    if (sameCount && samePositions) {
                        targetParent = targetParent.parentElement;
                        elParent = elParent.parentElement;
                        continue;
                    }
                }

                // 检查类名差异是否只是状态类
                const targetParts = targetParentClass.trim().split(/\s+/);
                const elParts = elParentClass.trim().split(/\s+/);
                const diff1 = targetParts.filter(p => !elParts.includes(p));
                const diff2 = elParts.filter(p => !targetParts.includes(p));

                let allStateClasses = true;
                for (const cls of [...diff1, ...diff2]) {
                    if (!/focus|active|selected|hover|error|alert|red|warning/.test(cls)) {
                        allStateClasses = false;
                        break;
                    }
                }

                if (!allStateClasses) {
                    pathMatches = false;
                    break;
                }

                targetParent = targetParent.parentElement;
                elParent = elParent.parentElement;
            }

            if (pathMatches) return el;
        }

        return null;
    }

    // ==================== API调用函数 ====================

    /**
     * 获取需要填写的字段
     */
    async function getNeedFields(html) {
        console.log(`url=${window.config.API_BASE_URL}analyze-page`)
        try {
            const response = await fetchWithJwt(
                `${window.config.API_BASE_URL}analyze-page`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        url: window.location.href,
                        html: html
                    })
                }
            );
            if(response.error){
                // 接口返回错误，抛出异常
                isNetworkError = true;
                errorFunctionName = "getNeedFields";
                throw new Error(response.error || "获取需要填写的字段失败，请刷新页面重试");
            }
            serverFields = response.fields;
            sessionId = response.sessionId;
            
        } catch (error) {
            isNetworkError = true;
            errorFunctionName = "getNeedField";
            throw error;
        }

        // sessionId = "692972b5ce47bbfa55afa594";
        // serverFields = [
        //     {
        //         "name": "基本信息",
        //         "fields": [
        //             {
        //                 "name": "姓名"
        //             },
        //             {
        //                 "name": "手机号码"
        //             },
        //             {
        //                 "name": "邮箱"
        //             },
        //             {
        //                 "name": "期望工作地点"
        //             }
        //         ]
        //     },
        //     {
        //         "name": "工作经历",
        //         "fields": []
        //     },
        //     {
        //         "name": "教育经历",
        //         "fields": [
        //             {
        //                 "name": "学校名称"
        //             },
        //             {
        //                 "name": "学历"
        //             },
        //             {
        //                 "name": "专业"
        //             },
        //             {
        //                 "name": "起止时间"
        //             }
        //         ]
        //     },
        //     {
        //         "name": "实习经历",
        //         "fields": [
        //             {
        //                 "name": "公司名称"
        //             },
        //             {
        //                 "name": "职位名称"
        //             },
        //             {
        //                 "name": "起止时间"
        //             },
        //             {
        //                 "name": "描述"
        //             }
        //         ]
        //     },
        //     {
        //         "name": "项目经历",
        //         "fields": [
        //             {
        //                 "name": "项目名称"
        //             },
        //             {
        //                 "name": "项目角色"
        //             },
        //             {
        //                 "name": "起止时间"
        //             },
        //             {
        //                 "name": "项目链接"
        //             },
        //             {
        //                 "name": "描述"
        //             }
        //         ]
        //     },
        //     {
        //         "name": "作品",
        //         "fields": [
        //             {
        //                 "name": "作品链接"
        //             },
        //             {
        //                 "name": "作品附件"
        //             },
        //             {
        //                 "name": "描述"
        //             }
        //         ]
        //     },
        //     {
        //         "name": "获奖",
        //         "fields": [
        //             {
        //                 "name": "获奖名称"
        //             },
        //             {
        //                 "name": "获奖时间"
        //             },
        //             {
        //                 "name": "描述"
        //             }
        //         ]
        //     },
        //     {
        //         "name": "语言能力",
        //         "fields": [
        //             {
        //                 "name": "语言"
        //             },
        //             {
        //                 "name": "精通程度"
        //             }
        //         ]
        //     },
        //     {
        //         "name": "自我评价",
        //         "fields": [
        //             {
        //                 "name": "自我评价"
        //             }
        //         ]
        //     },
        //     {
        //         "name": "社交账号",
        //         "fields": [
        //             {
        //                 "name": "社交平台"
        //             },
        //             {
        //                 "name": "URL / ID"
        //             }
        //         ]
        //     }
        // ];

    }

    /**
     * 获取字段填充值
     */
    async function fillResumeValues(apiFields, company, position, resumeId,taskContent) {
            try {
            // todo 已修改为自己后端接口
            const response = await fetchWithJwt(
                `${window.config.API_BASE_URL}fill-values`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        sessionId: sessionId,
                        url: window.location.href,
                        version: chrome.runtime.getManifest().version,
                        fields: apiFields,
                        company: company,
                        position: position,
                        resumeId: resumeId,
                        task:taskContent
                    })
                }
            );
            if(response.error){
                // 接口返回错误，抛出异常
                isNetworkError = true;
                errorFunctionName = "fillResumeValues";
                throw new Error(response.error || "获取填充值失败，请刷新页面重试");
            }
            //convertedFillData = response.values;
            convertedFillData = response.matches;
        } catch (error) {
            isNetworkError = true;
            errorFunctionName = "fillResumeValue";
            throw error;
        }

        return null;
    }

    // ==================== 填充执行函数 ====================

    /**
     * 执行填充操作
     */
    async function executeFilling(structures, fillData) {

        try {
            let sectionIndex = 0;

            while (sectionIndex < structures.length) {
                const section = structures[sectionIndex];
                const matchingFillData = [];

                // 找到所有匹配的填充数据
                for (const data of fillData) {
                    if (data.name === section.name) {
                        matchingFillData.push(data.fields);
                    }
                }

                if (matchingFillData.length === 0) continue;

                const fieldGroups = [section.fields];

                // 处理多个相同section（如多段工作经历）
                for (let i = 1; i < matchingFillData.length; i++) {
                    let nextSectionDom = null;
                    if (sectionIndex + 1 < structures.length) {
                        nextSectionDom = structures[sectionIndex + 1].dom;
                    }

                    const addButton = findAddMoreButton(section.dom, nextSectionDom);
                    if (!addButton) break;

                    startDomObserver();
                    await simulateClick(addButton);
                    await delay(100);
                    stopDomObserver();

                    // 扫描新增的表单块
                    const newBlocks = scanChineseElements();
                    if (newBlocks.length === 0) break;

                    deleteButtons = [];
                    for (const block of newBlocks) {
                        const viewportHeight = window.innerHeight;
                        const rect = block.getBoundingClientRect();
                        const scrollTop = window.scrollY + rect.top - viewportHeight / 2;
                        window.scrollTo({ top: scrollTop, left: 0, behavior: "instant" });
                        await delay(10);

                        // 扫描新块中的输入框
                        const formElements = scanFormElements(block.querySelectorAll("*"));
                        let newInputs = formElements.inputDoms;
                        let newSelects = formElements.selectDoms;

                        newInputs = expandInputList(
                            newInputs, newSelects,
                            getInputBorderStyles(newInputs),
                            block.querySelectorAll("*")
                        );
                        newInputs = filterOverlappingInputs(newInputs);

                        for (const input of newInputs) {
                            await triggerFocus(input);
                            await delay(20);
                            await triggerBlur(input);
                            await delay(10);
                        }
                    }

                    await delay(600);

                    // 匹配字段
                    const newFields = matchFieldsInNewBlock(newBlocks, section.fields);
                    if (!newFields) break;

                    // 高亮新字段
                    for (const field of newFields) {
                        if (field.field.dom) {
                            setElementColor(field.field.dom, "yellow");
                        }
                        for (const blank of field.blanks) {
                            setElementColor(blank.dom, "green");
                        }
                    }

                    fieldGroups.push(newFields);
                }

                // 为每组字段填充值
                for (let groupIndex = 0; groupIndex < fieldGroups.length; groupIndex++) {
                    if (groupIndex >= matchingFillData.length) break;

                    const fields = fieldGroups[groupIndex];
                    const values = matchingFillData[groupIndex];

                    for (const field of fields) {
                        let valueIndex = 0;

                        for (const blank of field.blanks) {
                            let value = "";

                            // 查找匹配的值
                            for (const v of values) {
                                for (let vi = valueIndex; vi < v.blanks.length; vi++) {
                                    const vBlank = v.blanks[vi];
                                    if (v.name === field.name && vBlank.name === blank.name) {
                                        value = vBlank.value;
                                        valueIndex = vi + 1;
                                        break;
                                    }
                                }
                            }

                            if (value === "") continue;

                            const stateText = `尝试为你填写 ${field.name.substring(0, 8)}...`;
                            window.setStateText(stateText);

                            blank.dom.scrollIntoView({ block: "center" });
                            await delay(100);

                            const originalColor = getElementColor(blank.dom);
                            setElementColor(blank.dom, "red");
                            await delay(200);

                            // 根据类型填充
                            if (blank.type === "input") {
                                startDomObserver();
                                await simulateClick(blank.dom);
                                await delay(100);

                                // 处理日期字段
                                if (/时间|日期|年月/.test(field.name)) {
                                    await delay(300);
                                }
                                if (newlyAddedDoms.length > 0) {
                                    await delay(500);
                                }

                                stopDomObserver();

                                let filled = false;

                                // 检查是否有弹窗
                                if (hasPopup()) {
                                    // 尝试日历选择器
                                    const calendar = getCalendarPopup();
                                    if (calendar) {
                                        await selectDateInCalendar(calendar, value);
                                        filled = true;
                                    } else {
                                        // 尝试My97日期选择器
                                        const separator = getMy97DatePicker();
                                        if (separator) {
                                            await fillMy97Date(blank.dom, value, separator);
                                            filled = true;
                                        }
                                    }

                                    if (!filled) {
                                        // 尝试在弹窗中选择
                                        const matchElement = findValueInPopup(value);
                                        if (matchElement) {
                                            if (confirmButtons.length > 0 && cancelButtons.length > 0) {
                                                await trySelectPopupOption(value);
                                            } else {
                                                await simulateClick(matchElement);
                                                await delay(200);
                                            }
                                            filled = true;
                                        }
                                    }

                                    await clickConfirmButtons();
                                    if (!(await waitForValueMatch(blank.dom, value))) {
                                        await closePopups(blank.dom);
                                    }
                                }

                                if (!filled) {
                                    // 直接输入
                                    let canDirectInput = false;
                                    if (blank.dom.tagName === "INPUT" ||
                                        blank.dom.tagName === "TEXTAREA" ||
                                        blank.dom.isContentEditable) {
                                        canDirectInput = true;
                                    }

                                    if (canDirectInput) {
                                        startDomObserver();
                                        await triggerFocus(blank.dom);
                                        await delay(50);

                                        if (blank.dom.tagName === "INPUT" || blank.dom.tagName === "TEXTAREA") {
                                            if (blank.dom.type === "number") {
                                                const numValue = parseFloat(value);
                                                if (!isNaN(numValue)) {
                                                    blank.dom.value = numValue;
                                                }
                                            } else {
                                                blank.dom.value = value;
                                            }
                                        } else if (blank.dom.isContentEditable) {
                                            blank.dom.textContent = value;
                                        }

                                        const inputEvent = new Event("input", { bubbles: true });
                                        blank.dom.dispatchEvent(inputEvent);
                                        const changeEvent = new Event("change", { bubbles: true });
                                        blank.dom.dispatchEvent(changeEvent);

                                        await delay(300);

                                        if (newlyAddedDoms.length > 0) {
                                            await delay(1200);
                                        }

                                        stopDomObserver();

                                        // 处理自动完成弹窗
                                        if (hasPopup()) {
                                            const matchElement = findValueInPopup(value);
                                            if (matchElement) {
                                                await delay(200);
                                                await simulateClick(matchElement);
                                                await delay(200);
                                            }
                                            await clickConfirmButtons();
                                            if (!(await waitForValueMatch(blank.dom, value))) {
                                                await closePopups(blank.dom);
                                            }
                                        }
                                    }
                                }

                                setElementColor(blank.dom, originalColor);
                                await triggerBlur(blank.dom);
                                await delay(200);

                                while (!window.isRunning()) {
                                    await delay(500);
                                }
                            } else if (blank.type === "select") {
                                // 下拉框选择
                                const matchElement = findMatchingElement(blank.dom, value, true, false);
                                if (matchElement) {
                                    const optionValue = matchElement.value;
                                    if (optionValue !== null) {
                                        blank.dom.value = optionValue;
                                    }
                                    await delay(50);
                                }
                                setElementColor(blank.dom, originalColor);

                                while (!window.isRunning()) {
                                    await delay(500);
                                }
                            } else if (blank.type === "radio") {
                                // 单选框选择
                                let matchElement = findMatchingElement(blank.dom, value);

                                // 如果匹配到的是label或span，查找对应的radio input
                                if (matchElement &&
                                    (matchElement.tagName === "LABEL" || matchElement.tagName === "SPAN")) {
                                    let prev = matchElement.previousElementSibling;
                                    while (prev) {
                                        if (prev.tagName === "INPUT" && prev.type === "radio") {
                                            matchElement = prev;
                                            break;
                                        }
                                        prev = prev.previousElementSibling;
                                    }
                                }

                                if (matchElement) {
                                    await simulateClick(matchElement);
                                    await delay(50);
                                }
                                setElementColor(blank.dom, originalColor);

                                while (!window.isRunning()) {
                                    await delay(500);
                                }
                            }
                        }
                    }
                }

                sectionIndex++;
            }
        } catch (error) {
        } finally {
            // 滚动回第一个字段
            if (structures.length > 0) {
                if (structures[0].fields.length > 0 && structures[0].fields[0].field.dom) {
                    structures[0].fields[0].field.dom.scrollIntoView({ block: "center" });
                } else if (structures[0].dom) {
                    structures[0].dom.scrollIntoView({ block: "center" });
                }
            }
        }
    }

    /**
     * 高亮所有字段
     */
    async function highlightAllFields(structures) {
        isHighlightComplete = false;
        try {

            // 启用高亮样式 - 使用class
            document.documentElement.classList.add('ark-highlight-enabled');

            await scrollToTop();

            let highlightCount = 0;
            for (const section of structures) {
                if (section.dom !== null) {
                    section.dom.scrollIntoView({ block: "center" });
                    setElementColor(section.dom, "blue");
                    highlightCount++;
                    await delay(100);

                    for (const field of section.fields) {
                        if (field.field.dom !== null) {
                            field.field.dom.scrollIntoView({ block: "center" });
                            setElementColor(field.field.dom, "yellow");
                            highlightCount++;

                            for (const blank of field.blanks) {
                                if (blank.dom) {
                                    setElementColor(blank.dom, "green");
                                    highlightCount++;
                                    await delay(100);
                                }
                            }
                        }
                    }
                }
            }
            await scrollToTop();
        } catch (error) {
            console.error("高亮过程出错:", error);
        }
        isHighlightComplete = true;
    }

    // ==================== 学习和统计函数 ====================

    /**
     * 更新统计数据
     */
    async function updateStatistics() {
        const storage = await chrome.storage.local.get(["websiteCount", "fieldCount"]);
        const websiteCount = Number(storage.websiteCount) || 0;
        const fieldCount = Number(storage.fieldCount) || 0;

        let filledFields = 0;
        for (const section of convertedFillData) {
            for (const field of section.fields) {
                if (field.value) filledFields++;
            }
        }

        await chrome.storage.local.set({
            websiteCount: websiteCount + 1,
            fieldCount: fieldCount + filledFields
        });
    }

    /**
     * 检查是否需要学习简历
     */
    async function isLearningEnabled() {
        const storage = await chrome.storage.local.get(["learningResume"]);
        return storage.learningResume !== false;
    }

    /**
     * 启动学习模式
     */
    async function startLearningMode() {
        lastUrl = window.location.href;

        if (!(await isLearningEnabled())) return;

        if (!learningInterval) {
            learningInterval = setInterval(() => {
                if (window.location.href !== lastUrl) {
                    clearInterval(learningInterval);
                    learningInterval = null;
                    lastUrl = window.location.href;
                } else {
                    learnFields();
                }
            }, 5000);
        }
    }

    /**
     * 学习字段内容
     */
    function learnFields() {
        const html = getCleanHtml();
        if (html === lastHtml) return;

        if (lastHtml === "") {
            lastHtml = html;
            return;
        }

        lastHtml = html;

        chrome.runtime.sendMessage({
            type: "learnField",
            url: window.location.href,
            html: html
        }, (response) => { });

        window.setStateText("正在智能学习你新填写的内容~");
        window.changeStartButtonState("learning");
    }

    /**
     * 记录错误日志
     */
    function logError(functionName, errorStack, startTime, company, resumeId) {
        const now = new Date();
        const duration = Math.floor((now - startTime) / 1000);

        let browser = "Unknown";
        if (navigator.userAgent.indexOf("Edg") !== -1) {
            browser = "Edge";
        } else if (navigator.userAgent.indexOf("Chrome") !== -1) {
            browser = "Chrome";
        }

        let version = "Unknown";
        try {
            version = chrome.runtime.getManifest().version;
        } catch (e) { }

        chrome.runtime.sendMessage({
            type: "logError",
            functionName: functionName,
            errorStack: errorStack,
            duration: duration,
            browser: browser,
            version: version,
            resumeId: resumeId,
            company: company || ""
        }, (response) => { });
    }

    /**
     * 检查是否显示评分弹窗
     */
    async function checkShowRating(startTime, fillValues) {
        try {
            const shouldShow = await shouldShowRating(startTime, fillValues);
            if (!shouldShow) return;

            const storage = await chrome.storage.local.get(["websiteCount", "fieldCount"]);
            if (window.showStarRatingModal) {
                window.showStarRatingModal({
                    websiteCount: storage.websiteCount || 0,
                    fieldCount: storage.fieldCount || 0
                });
            }
        } catch (error) { }
    }

    /**
     * 判断是否应该显示评分
     */
    async function shouldShowRating(startTime, fillValues) {
        const hasEnoughData = await checkEnoughData(startTime, fillValues);
        if (!hasEnoughData) return false;

        const storage = await chrome.storage.local.get(["websiteCount", "starRatingCancelCount"]);
        const websiteCount = Number(storage.websiteCount) || 0;
        const cancelCount = Number(storage.starRatingCancelCount) || 0;

        if (websiteCount <= 20) return false;
        if (cancelCount > 0 && websiteCount - cancelCount < 20) return false;

        // 检查网络连接
        if (!navigator.userAgent.includes("Edg")) {
            const hasInternet = await new Promise((resolve) => {
                const img = new Image();
                img.onload = () => resolve(true);
                img.onerror = () => resolve(false);
                img.src = "https://www.google.com/favicon.ico?t=" + Date.now();
                setTimeout(() => resolve(false), 10000);
            });
            if (!hasInternet) return false;
        }

        // 检查是否已提交过评分
        if (await hasUploadedRating()) return false;

        return true;
    }

    /**
     * 检查是否有足够的数据
     */
    async function checkEnoughData(startTime, fillValues) {
        const now = new Date();
        const duration = Math.floor((now - startTime) / 1000);

        let filledCount = 0;
        for (const section of fillValues) {
            for (const field of section.fields) {
                if (field.value) filledCount++;
            }
        }

        return duration >= 6 && filledCount >= 10;
    }

    /**
     * 检查是否已提交评分
     */
    async function hasUploadedRating() {
        const { starRatingUploaded } = await chrome.storage.local.get(["starRatingUploaded"]);
        if (starRatingUploaded === true) return true;

        try {
            const response = await chrome.runtime.sendMessage({ type: "checkStarRating" });
            if (response && response.uploaded === true) {
                await chrome.storage.local.set({ starRatingUploaded: true });
                return true;
            }
        } catch (error) { }

        return false;
    }

    /**
     * 获取最近访问的URL
     */
    async function getRecentUrl() {
        try {
            const currentUrl = window.location.href;
            const response = await chrome.runtime.sendMessage({ type: "getHistoryUrls" });
            const urls = response.filter(url => url !== currentUrl);

            const positionKeywords = ["position"];
            const excludeKeywords = ["login", "signin", "register", "resume"];

            // 优先返回包含position的URL
            const positionUrl = urls.find(url => {
                const lowerUrl = url.toLowerCase();
                return positionKeywords.some(k => lowerUrl.includes(k)) &&
                    !excludeKeywords.some(k => lowerUrl.includes(k));
            });
            if (positionUrl) return positionUrl;

            // 其次返回不包含排除关键词的URL
            const normalUrl = urls.find(url => {
                const lowerUrl = url.toLowerCase();
                return !excludeKeywords.some(k => lowerUrl.includes(k));
            });

            return normalUrl || currentUrl;
        } catch (error) {
            return window.location.href;
        }
    }

    // ==================== main主函数 ====================

    /**
     * 主填充函数
     */
    window.runFillResume = async (
        company,
        position,
        resumeId,
        taskContent = '',
        enableBeautify = false,
        callback = (result) => { }
    ) => {
        let startTime = new Date();

        try {
            // 保存当前简历ID
            currentResumeId = resumeId;
            window.setStateText("一念职达！为您职达岗位！");
            resetState();

            // 阶段1：展开所有"添加更多"按钮
            await expandAllAddButtons();

            // 阶段2：获取服务器字段（异步）
            getNeedFields(getCleanHtml());

            // 阶段4：扫描输入框
            
            await scanAllInputs();

            window.setStateText("正在扫描网站...", "min");

            // 等待DOM扫描完成
            while (!isDomScanComplete || !window.isRunning()) {
                checkNetworkError();
                await delay(500);
            }

            // 等待服务器字段返回
            while (!serverFields.length || !window.isRunning()) {
                checkNetworkError();
                await delay(500);
            }

            // 阶段5：构建字段结构
            window.setStateText("正在标记简历字段...", "min");

            // 构建字段结构
            fieldStructures = buildFieldStructures(serverFields);
            if (fieldStructures.length === 0) {
                throw new Error("服务器返回错误");
            }
            // 定位字段标签和输入框
            locateFieldLabels(fieldStructures);
            // 定位字段输入框
            locateFieldInputs(fieldStructures);

            // 阶段6：转换为API格式
            
            fillValues = convertToApiFormat(fieldStructures, serverFields);

            // 获取填充值
            fillResumeValues(fillValues, company, position, resumeId, taskContent);

            // 阶段7：高亮字段（异步）
            
            highlightAllFields(fieldStructures);

            // 等待高亮完成
            while (!isHighlightComplete || !window.isRunning()) {
                checkNetworkError();
                await delay(500);
            }

            // 阶段8：等待填充值返回

            window.setStateText("正在理解简历...", "show");
            window.breatheResume("begin");

            let waitCount = 0;
            
            while (!convertedFillData.length || !window.isRunning()) {
                checkNetworkError();
                await delay(500);
                waitCount++;

                if (waitCount === 16) {
                    window.breatheResume("end");
                    window.setStateText("开始思考网站填写策略...");
                } else if (waitCount === 60) {
                    window.setStateText("思考时间稍长，请耐心等候...");
                } else if (waitCount === 90) {
                    window.setStateText("快要完成了，我在努力中...");
                }
            }

            window.breatheResume("end");

            // 阶段9：执行填充

            window.setStateText("尝试为你填写简历...", "min");
            await delay(500);
            // 将API返回的填充值转换为内部格式
            transformedFillData = convertFillValues(convertedFillData);
            // 处理手机号格式（去掉+86前缀）
            transformedFillData = processPhoneNumbers(transformedFillData);

            // 执行填充操作

            await executeFilling(fieldStructures, transformedFillData);

            // 完成
            window.setStateText("填写完成！剩下的空就交给你咯~", "show");
            callback({ status: "success" });

            // 更新统计
            //await updateStatistics();

            // 启动学习模式
            //await startLearningMode();

            // 记录历史
            // if (window.campusSource) {
            //     addHistory("campus", { campusId: window.campusSource.campusId });
            // } else {
            //     addHistory("user", {
            //         url: await getRecentUrl(),
            //         company: company || "未知公司",
            //         position: position || "未知职位"
            //     });
            // }

            // 检查评分
            //await checkShowRating(startTime, convertedFillData);

            window.closeHighlight();

        } catch (error) {
            const stack = error.stack || "";
            let errorFunction = "未知函数";

            if (isNetworkError) {
                errorFunction = errorFunctionName;
            } else {
                const lines = stack.split("\n");
                for (let i = 1; i < lines.length; i++) {
                    const line = lines[i].trim();
                    if (!line.includes("at new Error") && !line.includes("at catch")) {
                        const match = line.match(/at\s+([^\s(]+)|at\s+[^(]*\(([^)]*)\)/);
                        if (match) {
                            errorFunction = match[1] || match[2] || "未知函数";
                            errorFunction = errorFunction.split("/").pop().split(":")[0];
                            if (errorFunction.length <= 3) continue;
                            break;
                        }
                    }
                }
            }

            let errorMessage = "填写出错！我不行了，靠你咯...";
            if (isNetworkError && typeof error.message === "string" &&
                error.message && error.message.length < 100) {
                errorMessage = `填写出错：${error.message}`;
            }

            window.setStateText(errorMessage, "show");
            callback({ status: "error", error: error });

            try {
                logError(errorFunction, String(stack), startTime, company, resumeId);
            } catch (e) { }
        }

        return true;
    };

    /**
     * 展开所有"添加更多"按钮
     */
    async function expandAllAddButtons() {
        const allElements = getAllElements();
        const addButtons = [];

        for (const el of allElements) {
            const text = el.textContent.trim();
            if (/^[\+ ]*[添增]加/.test(text) && !/职位/.test(text)) {
                addButtons.push(el);
            }
        }

        const filteredButtons = filterChildElements(addButtons);

        for (const btn of filteredButtons) {
            btn.scrollIntoView({ block: "center" });
            await delay(100);

            startDomObserver();
            await simulateClick(btn);
            await delay(200);
            stopDomObserver();

            const newBlocks = scanChineseElements();
            if (newBlocks.length === 0) continue;

            if (isDuplicateBlock(newBlocks)) {
                await deleteDuplicateBlocks(newBlocks);
            }
        }

        await delay(100);
    }

    /**
     * 扫描所有输入框
     */
    async function scanAllInputs() {
        isDomScanComplete = false;
        await scrollToTop();
        await delay(10);

        const formElements = scanFormElements(getAllElements());
        inputDomList = formElements.inputDoms;
        selectDomList = formElements.selectDoms;
        radioDomList = formElements.radioDoms;

        const borderStyles = getInputBorderStyles(inputDomList);
        inputDomList = expandInputList(inputDomList, selectDomList, borderStyles, getAllElements());
        inputDomList = filterOverlappingInputs(inputDomList);

        selectInputOptions = [];

        // 扫描每个输入框的选项
        for (const input of inputDomList) {
            const originalColor = getElementColor(input);
            setElementColor(input, "yellow");
            input.scrollIntoViewIfNeeded();
            await delay(200);

            startDomObserver();
            await simulateClick(input);
            await delay(100);

            if (newlyAddedDoms.length > 0) {
                await delay(500);
            }

            stopDomObserver();

            const options = getPopupOptions();

            await closePopups(input);
            setElementColor(input, originalColor);

            selectInputOptions.push(options);
            await triggerBlur(input);

            if (options.length) {
                await delay(200);
            }

            while (!window.isRunning()) {
                await delay(500);
            }
        }

        // 处理"请选择"开头的选项
        const processedOptions = [];
        for (const options of selectInputOptions) {
            if (options.length > 0 && /^[-\s]*请选择/.test(options[0])) {
                processedOptions.push(options.slice(1));
            } else {
                processedOptions.push(options);
            }
        }
        selectInputOptions = processedOptions;

        // 获取下拉框选项
        selectOptions = [];
        for (const select of selectDomList) {
            const options = getSelectOptions(select);
            if (options.length >= 2) {
                if (/^[-\s]*请选择/.test(options[0])) {
                    selectOptions.push(options.slice(1));
                } else {
                    selectOptions.push(options);
                }
            } else {
                selectOptions.push([]);
            }
        }

        // 获取单选框选项
        radioOptions = [];
        for (const radio of radioDomList) {
            const options = getRadioOptions(radio);
            if (options.length >= 2) {
                radioOptions.push(options);
            } else {
                radioOptions.push([]);
            }
        }

        isDomScanComplete = true;
    }

    // ==================== 公开函数：更新简历ID ====================

    /**
     * 更新当前简历ID（由resumeInterfaceTwo.js调用）
     * @param {number} resumeId - 新的简历ID
     */
    window.updateCurrentResumeId = function(resumeId) {
        currentResumeId = resumeId;
    };

    /**
     * 获取当前简历ID
     * @returns {number|null} 当前简历ID
     */
    window.getCurrentResumeId = function() {
        return currentResumeId;
    };

    // ==================== 初始化 ====================

    (async () => {
        // 配置已在 configContent.js 中加载到 window.config
        // 这里不需要额外的配置加载逻辑
        if (!window.config) {
            console.error("配置未加载：window.config 不存在，请检查 configContent.js 是否正确加载");
        } else {
        }
    })();
})();
