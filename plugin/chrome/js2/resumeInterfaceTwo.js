"use strict";

/**
 * ============================================================================
 * 一念职达 (Job Ark) - Resume Interface Two 简历窗口UI（基于fill.html）
 * ============================================================================
 *
 * 此文件是 Chrome 扩展的简历窗口界面模块
 * 负责处理以下核心功能：
 * - Shadow DOM 隔离的UI界面
 * - SimpleMDE Markdown编辑器集成
 * - 用户交互和状态管理
 * - 填充流程控制
 * - 评分弹窗功能
 *
 * @author 一念职达团队
 * @version 基于 Manifest V3 规范
 */

(async () => {
    // ============================================================================
    // 全局变量
    // ============================================================================

    let shadowRoot = null;          // e - Shadow DOM根节点
    let logoButton = null;          // t - Logo按钮元素
    let resumeWindow = null;        // n - 简历窗口主容器
    let resumeWindowContainer = null; // 简历窗口容器
    let resumeData = null;          // o - 简历数据对象
    let currentPage = 'fill.html';  // 当前页面（默认为fill.html）
    let previousPage = '';          // 上一个页面（用于页面切换动画）

    // ============================================================================
    // 初始化函数
    // ============================================================================

    /**
     * 主初始化函数
     * 创建UI元素、加载样式、绑定事件
     */
    async function init() {
        try {
            // 创建DOM结构
            await createDomStructure();

            // 加载CSS样式 - 等待样式加载完成
            await loadStyles();

            // 加载字体图标 - 等待字体加载完成
            await loadFontAwesome();

            // 初始化高亮设置
            await initHighlight();

            // 绑定事件监听
            await bindEvents(logoButton, resumeWindow);

            // 初始化Markdown编辑器
            initMarkdownEditor();

            // 调整窗口高度
            adjustWindowHeight();

            // 监听窗口大小变化
            window.addEventListener("resize", debounce(adjustWindowHeight, 200));
        } catch (error) {
            console.error("初始化错误:", error);
        }
    }

    /**
     * 创建DOM结构
     * 使用Shadow DOM隔离样式
     */
    async function createDomStructure() {
        try {
            // 创建宿主元素
            const hostElement = document.createElement("div");
            hostElement.id = "ark-ai";

            // 附加Shadow DOM - 使用 open 模式
            shadowRoot = hostElement.attachShadow({ mode: "open" });
            document.body.appendChild(hostElement);

            // 初始化按钮显示模式
            await initButtonMode();

            // 创建Logo按钮
            logoButton = createLogoButton();
            if (!logoButton) return;

            // 创建简历窗口
            resumeWindow = await createResumeWindow();
            if (!resumeWindow) return;
        } catch (error) {
            // 静默处理错误
        }
    }

    /**
     * 初始化按钮显示模式
     */
    async function initButtonMode() {
        try {
            const { arcButtonMode = "auto" } = await chrome.storage.local.get(["arcButtonMode"]);
            setButtonMode(arcButtonMode);
        } catch (error) {
            // 使用默认设置
        }
    }

    /**
     * 创建Logo按钮
     * @returns {HTMLElement} Logo按钮元素
     */
    function createLogoButton() {
        const button = document.createElement("button");
        button.id = "logo-button";

        const img = document.createElement("img");
        img.src = chrome.runtime.getURL("popup/logo-small.png");
        button.appendChild(img);

        shadowRoot.appendChild(button);

        // 添加拖拽功能
        makeDraggable(button);

        return button;
    }

    /**
     * 使元素可拖拽
     * @param {HTMLElement} element - 要添加拖拽功能的元素
     */
    function makeDraggable(element) {
        let isDragging = false;
        let startX = 0;
        let startY = 0;
        let initialLeft = 0;
        let initialTop = 0;
        let hasMoved = false;
        const threshold = 10; // 拖拽阈值（像素）

        /**
         * 处理鼠标移动
         */
        const onMouseMove = (event) => {
            if (!isDragging) return;

            const deltaX = event.clientX - startX;
            const deltaY = event.clientY - startY;

            // 检查是否超过拖拽阈值
            if (Math.abs(deltaX) > threshold || Math.abs(deltaY) > threshold) {
                hasMoved = true;
            }

            // 计算新位置
            let newLeft = initialLeft + deltaX;
            let newTop = initialTop + deltaY;

            // 获取元素和窗口尺寸
            const rect = element.getBoundingClientRect();
            const elementWidth = rect.width;
            const elementHeight = rect.height;
            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;

            // 限制在窗口范围内
            newLeft = Math.max(0, Math.min(newLeft, windowWidth - elementWidth));
            newTop = Math.max(0, Math.min(newTop, windowHeight - elementHeight));

            // 应用新位置
            element.style.position = "fixed";
            element.style.left = `${newLeft}px`;
            element.style.top = `${newTop}px`;
            element.style.right = "auto";
            element.style.bottom = "auto";
        };

        /**
         * 处理鼠标释放
         */
        const onMouseUp = (event) => {
            if (!isDragging) return;

            isDragging = false;
            element.style.cursor = "pointer";
            element.style.userSelect = "auto";

            // 如果发生了拖拽，阻止点击事件
            if (hasMoved) {
                event.preventDefault();
                event.stopPropagation();

                // 临时禁用指针事件，防止触发点击
                element.style.pointerEvents = "none";
                setTimeout(() => {
                    element.style.pointerEvents = "auto";
                }, 100);
            }

            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);

            // 延迟重置移动标志
            setTimeout(() => {
                hasMoved = false;
            }, 200);
        };

        // 监听鼠标按下事件
        element.addEventListener("mousedown", (event) => {
            if (event.target === element || event.target === element.querySelector("img")) {
                isDragging = true;
                hasMoved = false;

                const rect = element.getBoundingClientRect();
                initialLeft = rect.left;
                initialTop = rect.top;
                startX = event.clientX;
                startY = event.clientY;

                event.preventDefault();
                element.style.cursor = "grabbing";
                element.style.userSelect = "none";

                document.addEventListener("mousemove", onMouseMove);
                document.addEventListener("mouseup", onMouseUp);
            }
        });

        // 阻止拖拽时的点击事件
        element.addEventListener("click", (event) => {
            if (hasMoved) {
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation();
                return false;
            }
        }, true);
    }

    /**
     * 创建简历窗口
     * @returns {HTMLElement} 简历窗口元素
     */
    async function createResumeWindow() {
        const container = document.createElement("div");
        container.id = "resume-window-container";

        try {
            // 加载HTML模板 - 改为引用 fill.html
            const url = chrome.runtime.getURL("popup/fill.html");
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`HTTP错误: ${response.status}`);
            }

            const html = await response.text();

            // 将HTML解析为DOM，移除head中的样式链接（我们已在loadStyles中处理）
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, "text/html");

            // 移除head中的link标签（避免重复加载）
            const links = doc.querySelectorAll("head link");
            links.forEach(link => link.remove());

            // ⚠️ 关键修复：在注入前移除所有可能导致页面跳转的属性和事件
            // 1. 先移除所有script标签
            const scripts = doc.body.querySelectorAll('script');
            scripts.forEach(script => script.remove());
            // 2. 清理所有元素的内联事件
            const allElements = doc.body.querySelectorAll('*');
            let removedCount = 0;
            allElements.forEach(el => {
                // 移除所有on*事件属性
                Array.from(el.attributes).forEach(attr => {
                    if (attr.name.startsWith('on')) {
                        el.removeAttribute(attr.name);
                        removedCount++;
                    }
                });

                // 处理a标签的href
                if (el.tagName === 'A') {
                    const href = el.getAttribute('href');
                    if (href && href !== '#' && href !== 'javascript:void(0)') {
                        el.setAttribute('data-href', href);
                        el.setAttribute('href', 'javascript:void(0)');
                    }
                }

                // 处理button标签
                if (el.tagName === 'BUTTON') {
                    el.setAttribute('type', 'button');
                }
            });
            // 只取body内容
            container.innerHTML = doc.body.innerHTML;
        } catch (error) {
            console.error("✗ 加载简历窗口失败:", error);
            return null;
        }

        shadowRoot.appendChild(container);
        // 保存容器引用
        resumeWindowContainer = container;

        // ⚠️ 额外安全措施：添加全局点击事件监听，拦截所有可能的导航
        container.addEventListener('click', (e) => {
            const target = e.target;

            // 检查是否是a标签或button
            if (target.tagName === 'A' || target.closest('a')) {
                const link = target.tagName === 'A' ? target : target.closest('a');
                const href = link.getAttribute('href');

                // 如果href会导致页面跳转（不是 # 或 javascript:void(0)）
                if (href && href !== '#' && href !== 'javascript:void(0)' && !href.startsWith('data-')) {
                    console.warn(`⚠️ 拦截潜在的页面跳转: ${href}`);
                    e.preventDefault();
                    e.stopPropagation();
                }
            }

            // 检查button的onclick
            if (target.tagName === 'BUTTON' && target.hasAttribute('onclick')) {
                console.warn(`⚠️ 检测到button的onclick属性，已阻止`);
                e.preventDefault();
                e.stopPropagation();
            }
        }, true); // 使用捕获阶段，优先拦截
        const window = container.querySelector(".plugin-container");
        if (!window) {
            console.error("✗ 未找到 .plugin-container 元素");
            return null;
        }
        // 调试：检查导航栏按钮
        const navItems = container.querySelectorAll(".nav-item");
        if (navItems.length === 0) {
            console.error("✗ 警告：没有找到任何导航按钮！");
            
        }

        navItems.forEach((item, index) => {
            const label = item.querySelector(".nav-label");
            const icon = item.querySelector(".nav-icon-box i");
            // 优先读取data-href（如果已经处理过），否则读取原始href
            const originalHref = item.getAttribute('data-href') || item.getAttribute('href');
            // 阻止导航链接的默认跳转行为，改为页面切换
            if (item.tagName === 'A' && originalHref && originalHref !== 'javascript:void(0)') {
                // 保存原始href到data属性（如果还没有），然后替换href防止跳转
                if (!item.hasAttribute('data-href')) {
                    item.setAttribute('data-href', originalHref);
                }
                item.setAttribute('href', 'javascript:void(0)');

                // 使用闭包保存原始href，避免后续读取问题
                const targetPage = originalHref;
                item.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    navigateToPage(targetPage);
                });
            }
        });

        // 验证sidebar是否存在
        const sidebar = container.querySelector(".sidebar");
        if (sidebar) {
        } else {
            console.error("✗ 未找到.sidebar元素");
        }

        return window;
    }

    /**
     * 获取页面切换动画方向
     * @param {string} fromPage - 来源页面
     * @param {string} toPage - 目标页面
     * @returns {string} 动画方向类名
     */
    function getPageAnimationDirection(fromPage, toPage) {
        // 导航栏页面顺序（从上到下）
        const navOrder = ['fill.html', 'history.html', 'profile.html', 'settings.html'];

        // 子页面（通过 > 按钮进入的页面）
        const subPages = [
            'edit-resume.html',
            'change-password.html',
            'privacy-settings.html',
            'about.html',
            'help.html',
            'feedback.html'
        ];

        // 没有上一页，使用默认动画
        if (!fromPage) {
            return 'animate-from-bottom';
        }

        const fromNavIndex = navOrder.indexOf(fromPage);
        const toNavIndex = navOrder.indexOf(toPage);
        const isFromSubPage = subPages.includes(fromPage);
        const isToSubPage = subPages.includes(toPage);

        // 当前页面是子页面（从主页面进入子页面）
        if (isToSubPage && !isFromSubPage) {
            return 'animate-from-right';
        }

        // 从子页面返回主页面
        if (!isToSubPage && isFromSubPage) {
            return 'animate-from-left';
        }

        // 子页面之间切换
        if (isToSubPage && isFromSubPage) {
            return 'animate-from-right';
        }

        // 导航栏页面之间切换
        if (fromNavIndex !== -1 && toNavIndex !== -1) {
            if (toNavIndex > fromNavIndex) {
                // 向下导航（从上面的页面到下面的页面）
                return 'animate-from-bottom';
            } else if (toNavIndex < fromNavIndex) {
                // 向上导航（从下面的页面到上面的页面）
                return 'animate-from-top';
            }
        }

        // 默认动画
        return 'animate-from-bottom';
    }

    /**
     * 页面导航函数 - 在Shadow DOM内切换页面
     * @param {string} pageHtml - 页面HTML文件名（如 fill.html, profile.html）
     */
    async function navigateToPage(pageHtml) {
        // 记录即将离开的页面
        const leavingPage = currentPage;

        // 验证参数
        if (!pageHtml || pageHtml === 'javascript:void(0)' || pageHtml === '#') {
            console.error(`✗ 无效的页面参数: ${pageHtml}`);
            return;
        }

        if (!resumeWindowContainer) {
            console.error("✗ 容器未初始化");
            return;
        }

        try {
            // 加载新页面HTML
            const url = chrome.runtime.getURL(`popup/${pageHtml}`);
            // 验证URL是否有效
            if (!url || url.includes('invalid')) {
                console.error(`✗ 生成的URL无效: ${url}`);
                return;
            }

            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`HTTP错误: ${response.status}`);
            }

            const html = await response.text();

            // 解析HTML
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, "text/html");

            // 移除head中的link标签（避免重复加载）
            const links = doc.querySelectorAll("head link");
            links.forEach(link => link.remove());

            // 提取内联样式（如果有）
            const inlineStyles = doc.querySelectorAll("head style");
            const styleContents = Array.from(inlineStyles).map(style => style.textContent).join('\n');

            // ⚠️ 关键修复：在注入前移除所有可能导致页面跳转的属性和事件
            // 1. 先移除所有script标签
            const scripts = doc.body.querySelectorAll('script');
            scripts.forEach(script => script.remove());
            // 2. 清理所有元素的内联事件
            const allElements = doc.body.querySelectorAll('*');
            let removedCount = 0;
            allElements.forEach(el => {
                // 移除所有on*事件属性
                Array.from(el.attributes).forEach(attr => {
                    if (attr.name.startsWith('on')) {
                        el.removeAttribute(attr.name);
                        removedCount++;
                    }
                });

                // 处理a标签的href
                if (el.tagName === 'A') {
                    const href = el.getAttribute('href');
                    if (href && href !== '#' && href !== 'javascript:void(0)') {
                        el.setAttribute('data-href', href);
                        el.setAttribute('href', 'javascript:void(0)');
                    }
                }

                // 处理button标签
                if (el.tagName === 'BUTTON') {
                    el.setAttribute('type', 'button');
                }
            });
            // 获取清理后的body内容
            const bodyContent = doc.body.innerHTML;

            // 清空当前容器并注入新内容
            resumeWindowContainer.innerHTML = bodyContent;

            // 移除之前页面的内联样式（避免样式累积）
            const oldPageStyles = shadowRoot.querySelectorAll('style[data-page-style]');
            oldPageStyles.forEach(style => style.remove());
            if (oldPageStyles.length > 0) {
            }

            // 如果有内联样式，注入到Shadow DOM
            if (styleContents) {
                const pageStyle = document.createElement("style");
                pageStyle.setAttribute('data-page-style', pageHtml); // 标记样式来源
                pageStyle.textContent = styleContents;
                shadowRoot.appendChild(pageStyle);
            }

            // ========== 方案1: 页面切换时注入增强版内联样式 ==========
            // 移除之前页面的强化样式（避免样式累积）
            const oldEnhancedStyles = shadowRoot.querySelectorAll('style[data-enhanced-inline-styles]');
            oldEnhancedStyles.forEach(style => style.remove());

            // 注入新页面的强化内联样式
            const enhancedInlineStyle = document.createElement("style");
            enhancedInlineStyle.setAttribute('data-enhanced-inline-styles', 'true');
            enhancedInlineStyle.setAttribute('data-enhanced-for-page', pageHtml);
            enhancedInlineStyle.setAttribute('data-priority', 'highest');
            // enhancedInlineStyle.textContent = generateInlineStylesForPage(pageHtml);
            shadowRoot.appendChild(enhancedInlineStyle);

            console.log(`✅ 已为 ${pageHtml} 页面注入增强版内联样式保护`);
            // ⚠️ 验证：确保所有危险的属性都被移除
            const dangerousElements = resumeWindowContainer.querySelectorAll('[onclick], [onload]');
            if (dangerousElements.length > 0) {
                console.warn(`⚠️ 警告：发现 ${dangerousElements.length} 个元素仍有内联事件，立即清理`);
                dangerousElements.forEach(el => {
                    Array.from(el.attributes).forEach(attr => {
                        if (attr.name.startsWith('on')) {
                            el.removeAttribute(attr.name);
                        }
                    });
                });
            }

            // 更新导航按钮的active状态
            updateActiveNav(pageHtml);

            // 应用页面切换动画（只对内容区域应用动画，背景保持固定）
            const pluginContent = resumeWindowContainer.querySelector('.plugin-content');
            if (pluginContent) {
                // 移除所有旧的动画类
                pluginContent.classList.remove('animate-from-bottom', 'animate-from-top', 'animate-from-right', 'animate-from-left');

                // 确定动画方向
                const animationClass = getPageAnimationDirection(leavingPage, pageHtml);

                // 强制重绘，确保动画类被移除
                void pluginContent.offsetHeight;

                // 添加新的动画类
                pluginContent.classList.add(animationClass);

                // 动画结束后移除动画类，避免影响后续交互
                setTimeout(() => {
                    pluginContent.classList.remove(animationClass);
                }, 400); // 与 CSS 动画时长一致
            }

            // 更新当前页面变量
            previousPage = leavingPage;
            currentPage = pageHtml;
            // 重新绑定导航按钮事件（因为DOM已更新）
            rebindNavigationEvents();

            // 根据页面类型绑定特定事件
            bindPageSpecificEvents(pageHtml);

            // ⚠️ 强制触发布局重新计算（修复页面切换后滚动失效的问题）
            if (pageHtml === 'fill.html') {
                // 对于 fill.html，强制重新计算 flex 布局
                const bookWrapper = resumeWindowContainer.querySelector('.book-wrapper');
                const resumePageCurrent = resumeWindowContainer.querySelector('.resume-page-current');
                const resumeHeader = resumeWindowContainer.querySelector('.resume-header');
                const infoGrid = resumeWindowContainer.querySelector('.info-grid-compact');

                if (infoGrid) {
                    // 强制浏览器重新计算布局
                    void infoGrid.offsetHeight;
                }
            }

        } catch (error) {
            console.error("✗ 页面导航失败:", error);
        }
    }

    /**
     * 更新导航栏active状态
     * @param {string} pageHtml - 当前页面HTML文件名
     */
    function updateActiveNav(pageHtml) {
        if (!resumeWindowContainer) return;

        const navItems = resumeWindowContainer.querySelectorAll(".nav-item");
        navItems.forEach(item => {
            // 检查 data-href 或原始 href
            const href = item.getAttribute('data-href') || item.getAttribute('href');
            if (href === pageHtml) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }

    /**
     * 重新绑定导航按钮事件
     */
    function rebindNavigationEvents() {
        if (!resumeWindowContainer) return;

        const navItems = resumeWindowContainer.querySelectorAll(".nav-item");
        navItems.forEach((item, index) => {
            const label = item.querySelector(".nav-label");
            // 优先读取data-href，然后才是href
            const originalHref = item.getAttribute('data-href') || item.getAttribute('href');

            // 移除旧的事件监听器（通过克隆节点）
            const newItem = item.cloneNode(true);
            item.parentNode.replaceChild(newItem, item);

            // 添加新的事件监听器
            if (newItem.tagName === 'A' && originalHref && originalHref !== 'javascript:void(0)') {
                // 确保data-href存在
                if (!newItem.hasAttribute('data-href')) {
                    newItem.setAttribute('data-href', originalHref);
                }
                newItem.setAttribute('href', 'javascript:void(0)');

                // 使用闭包保存原始href
                const targetPage = originalHref;
                newItem.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const labelText = newItem.querySelector(".nav-label")?.textContent || '无标签';
                    navigateToPage(targetPage);
                });
            }
        });
    }

    /**
     * 初始化状态弹窗功能（在Shadow DOM中）
     */
    function initStatusPopup() {
        if (!resumeWindowContainer) {
            console.error("✗ Shadow DOM容器未初始化");
            return;
        }

        // 检查是否已经初始化过
        if (window.updateStatusPopup) {
            return;
        }
        // 获取Shadow DOM中的元素
        const fillButton = resumeWindowContainer.querySelector('#fill-action-btn');
        const statusPopup = resumeWindowContainer.querySelector('#status-popup');
        const closeButton = statusPopup?.querySelector('.status-popup-close');
        const statusMessage = resumeWindowContainer.querySelector('#status-message');
        const btnIcon = fillButton?.querySelector('i');
        const btnText = fillButton?.querySelector('.btn-text');
        if (!fillButton || !statusPopup || !statusMessage) {
            console.error("✗ 状态弹窗元素未找到", {
                fillButton,
                statusPopup,
                statusMessage
            });
            return;
        }

        if (!btnIcon || !btnText) {
            console.error("✗ 按钮内部元素未找到", {
                btnIcon,
                btnText,
                fillButtonHTML: fillButton.innerHTML
            });
            return;
        }

        // 弹窗状态
        let isPopupOpen = false;
        let currentStatus = 'idle';

        /**
         * 切换弹窗显示状态
         */
        function togglePopup() {
            isPopupOpen = !isPopupOpen;
            if (isPopupOpen) {
                statusPopup.classList.add('show');
            } else {
                statusPopup.classList.remove('show');
            }
        }

        /**
         * 关闭弹窗
         */
        function closePopup() {
            isPopupOpen = false;
            statusPopup.classList.remove('show');
        }

        /**
         * 重置按钮到初始状态
         */
        function resetButton() {
            // 每次重置时重新获取元素引用
            const currentFillButton = resumeWindowContainer?.querySelector('#fill-action-btn');
            const currentBtnIcon = currentFillButton?.querySelector('i');
            const currentBtnText = currentFillButton?.querySelector('.btn-text');

            if (!currentFillButton || !currentBtnIcon || !currentBtnText) {
                console.warn('⚠️ 重置按钮时元素未找到');
                return;
            }

            currentBtnIcon.className = 'fas fa-bolt';
            currentBtnText.textContent = '一键智能填充';
            currentFillButton.classList.remove('btn-processing', 'btn-success', 'btn-error', 'btn-idle');
            currentFillButton.style.pointerEvents = 'auto';
            currentStatus = 'idle';
        }

        /**
         * 更新状态展示框
         */
        function updateStatusDisplay(type, text) {
            // 获取状态展示框元素
            const statusDisplay = resumeWindowContainer?.querySelector('#status-display');
            const statusIcon = statusDisplay?.querySelector('.status-icon');
            const statusText = statusDisplay?.querySelector('.status-text');

            if (!statusDisplay || !statusIcon || !statusText) {
                console.error('✗ 状态展示框元素未找到', {
                    statusDisplay: !!statusDisplay,
                    statusIcon: !!statusIcon,
                    statusText: !!statusText,
                    resumeWindowContainer: !!resumeWindowContainer
                });
                return;
            }
            // 移除所有状态类
            statusDisplay.classList.remove('status-success', 'status-error');

            // 根据状态设置图标和样式
            switch(type) {
                case 'processing':
                    statusIcon.className = 'status-icon fas fa-spinner fa-spin';
                    statusText.textContent = text || '正在处理...';
                    statusDisplay.style.display = 'flex';
                    break;
                case 'success':
                    statusIcon.className = 'status-icon fas fa-check-circle';
                    statusText.textContent = text || '填充完成';
                    statusDisplay.classList.add('status-success');
                    statusDisplay.style.display = 'flex';
                    // 3秒后自动隐藏
                    setTimeout(() => {
                        if (currentStatus === 'success') {
                            hideStatusDisplay();
                        }
                    }, 3000);
                    break;
                case 'error':
                    statusIcon.className = 'status-icon fas fa-exclamation-triangle';
                    statusText.textContent = text || '出错了';
                    statusDisplay.classList.add('status-error');
                    statusDisplay.style.display = 'flex';
                    // 5秒后自动隐藏
                    setTimeout(() => {
                        if (currentStatus === 'error') {
                            hideStatusDisplay();
                        }
                    }, 5000);
                    break;
                case 'idle':
                default:
                    hideStatusDisplay();
            }
        }

        /**
         * 隐藏状态展示框
         */
        function hideStatusDisplay() {
            const statusDisplay = resumeWindowContainer?.querySelector('#status-display');
            if (statusDisplay) {
                statusDisplay.style.display = 'none';
            }
        }

        /**
         * 更新状态消息（主函数）
         */
        function updateStatusText(text, type = 'processing') {
            if (!statusMessage) {
                console.error('✗ statusMessage 元素未找到');
                return;
            }

            currentStatus = type;

            // 更新消息内容
            statusMessage.textContent = text || '准备就绪';

            // 根据状态类型更新样式
            statusMessage.className = 'status-message';
            if (type === 'error') {
                statusMessage.classList.add('status-error');
            } else if (type === 'success') {
                statusMessage.classList.add('status-success');
            } else if (type === 'processing') {
                statusMessage.classList.add('status-processing');
            }
            // 更新状态展示框（新方案：在按钮旁边显示状态）
            updateStatusDisplay(type, text);

            // 添加动画效果
            statusMessage.style.animation = 'none';
            setTimeout(() => {
                statusMessage.style.animation = 'messageSlideIn 0.4s ease';
            }, 10);

            // 🔧 修复：不自动打开弹窗，只更新按钮状态
            // 用户可以通过右键点击按钮来查看详细状态
            // 注释掉自动弹窗逻辑，只保留按钮状态变化
            /*
            if (!isPopupOpen) {
                togglePopup();

                const autoCloseDelay = type === 'error' ? 10000 : 5000;
                setTimeout(() => {
                    if (isPopupOpen && !statusPopup.matches(':hover')) {
                        closePopup();
                    }
                }, autoCloseDelay);
            }
            */
        }

        // 绑定填充按钮右键点击事件
        fillButton.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            togglePopup();
        });

        // 添加悬停提示
        fillButton.addEventListener('mouseenter', () => {
            fillButton.title = '右键查看详细状态';
        });

        // 绑定关闭按钮点击事件
        if (closeButton) {
            closeButton.addEventListener('click', (e) => {
                e.stopPropagation();
                closePopup();
            });
        }

        // 点击容器外部关闭弹窗
        resumeWindowContainer.addEventListener('click', (e) => {
            if (isPopupOpen && !statusPopup.contains(e.target) && !fillButton.contains(e.target)) {
                closePopup();
            }
        });

        // 阻止弹窗内部点击事件冒泡
        statusPopup.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        // 暴露全局接口
        window.updateStatusPopup = updateStatusText;

        // 暴露测试接口（用于调试）
        window.testStatusPopup = {
            processing: (text) => updateStatusText(text || '正在处理中...', 'processing'),
            success: (text) => updateStatusText(text || '操作成功完成', 'success'),
            error: (text) => updateStatusText(text || '发生错误', 'error'),
            idle: () => updateStatusText('准备就绪', 'idle'),
            getElements: () => ({
                fillButton,
                statusPopup,
                statusMessage,
                btnIcon,
                btnText,
                buttonClasses: fillButton?.className,
                iconClasses: btnIcon?.className,
                buttonText: btnText?.textContent
            })
        };
        
    }

    /**
     * 绑定特定页面的事件
     * @param {string} pageHtml - 页面HTML文件名
     */
    function bindPageSpecificEvents(pageHtml) {
        if (!resumeWindowContainer) return;
        // fill.html - 填充页面
        if (pageHtml === 'fill.html') {
            // 初始化状态弹窗功能
            initStatusPopup();

            const fillBtn = resumeWindowContainer.querySelector(".liquid-cta-btn");
            if (fillBtn) {
                // 使用克隆节点移除旧的事件监听器，防止重复绑定
                const newFillBtn = fillBtn.cloneNode(true);
                fillBtn.parentNode.replaceChild(newFillBtn, fillBtn);

                // 绑定新的事件监听器
                newFillBtn.addEventListener("click", () => {
                    startFilling();
                });
            }

            // 初始化简历数据（切换菜单时强制刷新）
            initResumeData(true);
        }

        // profile.html - 个人页面
        if (pageHtml === 'profile.html') {
            // 加载用户信息（昵称和头像）
            loadUserInfo();

            // 初始化简历数据（会自动调用bindResumeSwitchEvents）
            // 等待初始化完成后再绑定编辑按钮事件
            initResumeData().then(() => {
                const editResumeBtn = resumeWindowContainer.querySelector(".edit-resume-btn");
                if (editResumeBtn) {
                    // 移除原有的内联onclick属性，防止页面跳转
                    editResumeBtn.removeAttribute('onclick');

                    editResumeBtn.addEventListener("click", (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        // 打开外部Web页面进行简历编辑
                        const resumeUrl = window.config?.WEB_URL || 'http://localhost:3000/resume';
                        window.open(resumeUrl, '_blank');
                    });
                }
            });
        }

        // history.html - 投递记录页面
        if (pageHtml === 'history.html') {
            // 加载并渲染投递记录
            loadApplicationRecords();
        }

        // settings.html - 设置页面
        if (pageHtml === 'settings.html') {
            // 绑定"修改简历信息"按钮
            // 先尝试多种选择器
            let editResumeLink = resumeWindowContainer.querySelector('a[href="edit-resume.html"]');
            if (!editResumeLink) {
                editResumeLink = resumeWindowContainer.querySelector('.settings-item');
            }
            if (editResumeLink) {
                // 移除原有的href属性，防止页面跳转
                editResumeLink.removeAttribute('href');
                editResumeLink.setAttribute('href', 'javascript:void(0)');

                // 使用克隆节点移除旧的事件监听器，防止重复绑定
                const newEditResumeLink = editResumeLink.cloneNode(true);
                editResumeLink.parentNode.replaceChild(newEditResumeLink, editResumeLink);

                newEditResumeLink.addEventListener('click', async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    // 使用配置文件中的 WEB_URL（已经包含 /resume 路径）
                    const resumeUrl = window.config?.WEB_URL || 'http://localhost:3000/resume';
                    // 方式1: 通过 background script 打开新标签页
                    try {
                        const response = await chrome.runtime.sendMessage({
                            type: 'openTab',
                            url: resumeUrl
                        });

                        if (response?.success) {

                        } else {
                            throw new Error('background 返回失败');
                        }
                    } catch (error) {
                        console.error('✗ 通过 background 打开失败:', error);

                        // 方式2: 降级到直接使用 window.open
                        try {
                            const newWindow = window.open(resumeUrl, '_blank');
                            if (newWindow) {
                                
                            } else {
                                console.error('✗ 新标签页被阻止');
                                alert('请允许浏览器弹出窗口以打开简历编辑页面');
                            }
                        } catch (err) {
                            console.error('✗ window.open 也失败:', err);
                            alert('无法打开简历编辑页面，请手动访问：\n' + resumeUrl);
                        }
                    }
                });
            } else {
                console.error('✗ 未找到修改简历信息按钮');
            }

            // 绑定退出登录按钮
            const logoutBtn = resumeWindowContainer.querySelector('.btn-danger');
            if (logoutBtn) {
                // 移除原有的内联onclick属性
                logoutBtn.removeAttribute('onclick');

                logoutBtn.addEventListener('click', async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    // 确认对话框
                    if (!confirm('确定要退出登录吗？')) {
                        return;
                    }

                    try {
                        // 发送退出登录消息到 background.js
                        const response = await chrome.runtime.sendMessage({
                            type: 'logout'
                        });

                        if (response?.status === 'success') {
                            alert('已成功退出登录');

                            // 关闭插件窗口
                            toggleWindow(false);

                            // 可选：刷新当前页面
                            // window.location.reload();
                        } else {
                            console.error('退出登录失败:', response);
                            alert('退出登录失败，请重试');
                        }
                    } catch (error) {
                        console.error('退出登录异常:', error);
                        alert('退出登录出错，请重试');
                    }
                });
            }
        }

        // 绑定右上角设置按钮（或关闭按钮）
        const settingsBtn = resumeWindowContainer.querySelector(".liquid-close");
        if (settingsBtn) {
            // 移除原有的内联事件属性，防止页面跳转
            settingsBtn.removeAttribute('onclick');
            settingsBtn.removeAttribute('href');
            settingsBtn.setAttribute('href', 'javascript:void(0)');

            settingsBtn.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                // 判断按钮图标类型
                const icon = settingsBtn.querySelector('i');
                if (icon && icon.classList.contains('fa-times')) {
                    // 关闭图标 - 关闭整个窗口
                    toggleWindow(false);
                } else {
                    // 设置图标 - 跳转到设置页面
                    navigateToPage('settings.html');
                }
            });
        }
    }

    /**
     * 生成页面专用内联样式（方案1：增强版内联样式）
     * @param {string} pageType - 页面类型（如 'fill.html'）
     * @returns {string} 生成的CSS样式文本
     */
    function generateInlineStylesForPage(pageType) {
        const baseStyles = `
            /* ========== 增强版内联样式保护 ========== */
            /* CSS变量定义（内联版本，优先级最高） */
            :host, .plugin-container, #ark-ai {
                --primary: #57c5b6 !important;
                --primary-dark: #3a8e82 !important;
                --accent: #ff9a9e !important;
                --text-main: #2d3436 !important;
                --text-gray: #636e72 !important;
                --bg-fluid: radial-gradient(circle at 10% 10%, rgba(87, 197, 182, 0.4) 0%, transparent 50%),
                            radial-gradient(circle at 90% 90%, rgba(255, 154, 158, 0.4) 0%, transparent 50%),
                            linear-gradient(135deg, #def7fa 0%, #ffecec 100%) !important;
                --glass-clear-bg: rgba(255, 255, 255, 0.35) !important;
                --glass-clear-blur: blur(12px) !important;
                --glass-clear-border: 1px solid rgba(255, 255, 255, 0.6) !important;
                --glass-clear-shadow: 0 8px 30px rgba(0, 0, 0, 0.05) !important;
                --card-white: rgba(255, 255, 255, 0.85) !important;
                --card-blur: blur(20px) !important;
                --card-shadow: 0 5px 20px rgba(0, 0, 0, 0.03) !important;
                --r-card: 20px !important;
                --r-btn: 25px !important;
                --dark-green: #006666 !important;
            }

            /* 强制样式重置和隔离 */
            .plugin-container, .plugin-container * {
                all: revert !important;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
                box-sizing: border-box !important;
                margin: 0 !important;
                padding: 0 !important;
                border: none !important;
                outline: none !important;
                background: none !important;
                text-decoration: none !important;
                text-transform: none !important;
                letter-spacing: normal !important;
                word-spacing: normal !important;
                text-align: left !important;
                text-indent: 0 !important;
                text-shadow: none !important;
                transform: none !important;
                zoom: 1 !important;
                scale: 1 !important;
            }

            /* 恢复重要样式 */
            .plugin-container {
                display: flex !important;
                width: 420px !important;
                height: 600px !important;
                background: var(--bg-fluid) !important;
                border-radius: 20px !important;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15) !important;
                overflow: hidden !important;
                color: var(--text-main) !important;
            }

            .sidebar {
                width: 70px !important;
                height: 100% !important;
                background: var(--primary) !important;
                display: flex !important;
                flex-direction: column !important;
                align-items: center !important;
                padding: 30px 0 !important;
                gap: 18px !important;
                flex-shrink: 0 !important;
                border-radius: 20px !important;
                box-shadow: 5px 0 20px rgba(87, 197, 182, 0.2) !important;
            }

            .main-area {
                flex: 1 !important;
                height: 100% !important;
                position: relative !important;
                overflow: hidden !important;
                border-radius: 0 20px 20px 0 !important;
                background: var(--bg-fluid) !important;
            }

            /* Unicode图标替换（不依赖外部字体） */
            .fas, .far, .fab {
                font-family: inherit !important;
                font-style: normal !important;
                font-weight: normal !important;
                speak: none !important;
                display: inline-block !important;
                text-decoration: inherit !important;
                text-align: center !important;
                font-variant: normal !important;
                text-transform: none !important;
                line-height: 1em !important;
            }

            /* 关键图标Unicode字符直接定义 */
            .fa-magic::before { content: "✨" !important; font-family: inherit !important; }
            .fa-bolt::before { content: "⚡" !important; font-family: inherit !important; }
            .fa-history::before { content: "📋" !important; font-family: inherit !important; }
            .fa-user::before { content: "👤" !important; font-family: inherit !important; }
            .fa-cog::before { content: "⚙️" !important; font-family: inherit !important; }
            .fa-times::before { content: "❌" !important; font-family: inherit !important; }
            .fa-edit::before { content: "✏️" !important; font-family: inherit !important; }
            .fa-info-circle::before { content: "ℹ️" !important; font-family: inherit !important; }
            .fa-spinner::before {
                content: "⏳" !important;
                font-family: inherit !important;
                animation: fa-spin 2s infinite linear !important;
            }
            .fa-check-circle::before { content: "✅" !important; font-family: inherit !important; }
            .fa-exclamation-triangle::before { content: "⚠️" !important; font-family: inherit !important; }
            .fa-pause::before { content: "⏸️" !important; font-family: inherit !important; }
            .fa-play::before { content: "▶️" !important; font-family: inherit !important; }
            .fa-battery-empty::before { content: "🔋" !important; font-family: inherit !important; }
            .fa-brain::before { content: "🧠" !important; font-family: inherit !important; }
            .fa-chevron-right::before { content: "▶" !important; font-family: inherit !important; }

            @keyframes fa-spin {
                0% { transform: rotate(0deg) !important; }
                100% { transform: rotate(360deg) !important; }
            }

            /* 导航栏样式保护 */
            .nav-item {
                display: flex !important;
                flex-direction: column !important;
                align-items: center !important;
                cursor: pointer !important;
                transition: 0.3s !important;
                width: 100% !important;
                text-decoration: none !important;
                color: rgba(255,255,255,0.7) !important;
            }

            .nav-icon-box {
                width: 38px !important;
                height: 38px !important;
                border-radius: 14px !important;
                display: flex !important;
                justify-content: center !important;
                align-items: center !important;
                font-size: 16px !important;
                color: rgba(255,255,255,0.7) !important;
                transition: 0.3s !important;
            }

            .nav-label {
                font-size: 9px !important;
                font-weight: 500 !important;
                color: rgba(255,255,255,0.9) !important;
                transition: 0.3s !important;
                margin-top: 4px !important;
            }

            .nav-item.active .nav-icon-box {
                background: rgba(255,255,255,0.2) !important;
                color: white !important;
            }

            /* 悬浮元素样式保护 */
            .liquid-title {
                position: absolute !important;
                top: 20px !important;
                left: 20px !important;
                background: var(--glass-clear-bg) !important;
                backdrop-filter: var(--glass-clear-blur) !important;
                -webkit-backdrop-filter: var(--glass-clear-blur) !important;
                border: var(--glass-clear-border) !important;
                box-shadow: var(--glass-clear-shadow) !important;
                padding: 10px 20px !important;
                border-radius: 18px !important;
                font-size: 16px !important;
                font-weight: 800 !important;
                color: var(--text-main) !important;
                z-index: 30 !important;
            }

            .liquid-close {
                position: absolute !important;
                top: 20px !important;
                right: 15px !important;
                width: 40px !important;
                height: 40px !important;
                border-radius: 14px !important;
                background: var(--glass-clear-bg) !important;
                backdrop-filter: var(--glass-clear-blur) !important;
                -webkit-backdrop-filter: var(--glass-clear-blur) !important;
                border: var(--glass-clear-border) !important;
                box-shadow: var(--glass-clear-shadow) !important;
                display: flex !important;
                justify-content: center !important;
                align-items: center !important;
                color: var(--text-gray) !important;
                z-index: 30 !important;
                cursor: pointer !important;
                font-size: 16px !important;
                text-decoration: none !important;
                transition: all 0.3s ease !important;
            }

            .plugin-content {
                height: 100% !important;
                overflow-y: auto !important;
                padding: 75px 15px 15px !important;
                display: flex !important;
                flex-direction: column !important;
                gap: 12px !important;
                scrollbar-width: none !important;
            }

            .plugin-content::-webkit-scrollbar {
                display: none !important;
            }
        `;

        // 页面特定样式
        const pageSpecificStyles = {
            'fill.html': `
                /* ========== 填充页面专用样式 ========== */
                .book-wrapper {
                    position: relative !important;
                    width: 96% !important;
                    height: 280px !important;
                    perspective: 1000px !important;
                    cursor: pointer !important;
                    flex-shrink: 0 !important;
                    min-height: 280px !important;
                    max-height: 280px !important;
                }

                .resume-page-current {
                    position: absolute !important;
                    top: 0 !important;
                    left: 0 !important;
                    width: 100% !important;
                    height: 100% !important;
                    background: white !important;
                    border-radius: 18px !important;
                    padding: 14px !important;
                    border: 1px solid rgba(0, 0, 0, 0.05) !important;
                    box-shadow: -5px 10px 30px rgba(0, 0, 0, 0.1) !important;
                    z-index: 2 !important;
                    transition: transform 0.4s ease !important;
                    display: flex !important;
                    flex-direction: column !important;
                    min-height: 0 !important;
                }

                .resume-page-next {
                    position: absolute !important;
                    top: 8px !important;
                    right: -16px !important;
                    width: 98% !important;
                    height: 100% !important;
                    background: rgba(255, 255, 255, 0.8) !important;
                    border: 1px solid rgba(255, 255, 255, 0.5) !important;
                    border-radius: 18px !important;
                    padding: 14px !important;
                    transform: rotate(3deg) translateZ(-10px) !important;
                    box-shadow: 2px 2px 10px rgba(0, 0, 0, 0.05) !important;
                    z-index: 1 !important;
                    transition: transform 0.4s ease, filter 0.4s ease, opacity 0.4s ease !important;
                    filter: blur(1px) !important;
                    opacity: 0.8 !important;
                    overflow: hidden !important;
                }

                .liquid-cta-container {
                    position: absolute !important;
                    bottom: 40px !important;
                    left: 34px !important;
                    right: 0 !important;
                    width: calc(100% - 70px) !important;
                    display: flex !important;
                    justify-content: center !important;
                    pointer-events: none !important;
                    z-index: 40 !important;
                }

                .liquid-cta-btn {
                    pointer-events: auto !important;
                    cursor: pointer !important;
                    background: var(--glass-clear-bg) !important;
                    backdrop-filter: var(--glass-clear-blur) !important;
                    -webkit-backdrop-filter: var(--glass-clear-blur) !important;
                    box-shadow: 0 10px 30px rgba(255, 154, 158, 0.25) !important;
                    border: 1px solid var(--accent) !important;
                    padding: 12px 25px !important;
                    border-radius: 25px !important;
                    color: var(--accent) !important;
                    font-size: 14px !important;
                    font-weight: 700 !important;
                    display: flex !important;
                    align-items: center !important;
                    gap: 6px !important;
                    transition: 0.2s !important;
                }

                .liquid-cta-btn:hover {
                    transform: translateY(-2px) !important;
                    background: rgba(255,255,255,0.35) !important;
                }

                .task-card {
                    background: white !important;
                    border-radius: 16px !important;
                    padding: 12px !important;
                    box-shadow: 0 5px 20px rgba(0,0,0,0.03) !important;
                    border: 1px solid rgba(0,0,0,0.02) !important;
                }

                .task-card h4 {
                    margin-bottom: 8px !important;
                    font-size: 12px !important;
                    color: var(--text-main) !important;
                    display: flex !important;
                    align-items: center !important;
                    gap: 5px !important;
                }

                .task-input {
                    width: 100% !important;
                    padding: 10px !important;
                    border: 1px solid #e8e8e8 !important;
                    border-radius: 10px !important;
                    font-size: 11px !important;
                    color: var(--text-main) !important;
                    background: #fafafa !important;
                    min-height: 60px !important;
                    resize: none !important;
                    line-height: 1.5 !important;
                }

                .task-input:focus {
                    outline: none !important;
                    border-color: var(--primary) !important;
                    background: white !important;
                }

                .info-grid-compact {
                    display: grid !important;
                    grid-template-columns: repeat(2, 1fr) !important;
                    gap: 6px !important;
                    font-size: 10px !important;
                    flex: 1 !important;
                    overflow-y: auto !important;
                }

                .info-cell {
                    background: #f9f9f9 !important;
                    padding: 5px 6px !important;
                    border-radius: 6px !important;
                }

                .info-cell-label {
                    font-size: 8px !important;
                    color: #999 !important;
                    margin-bottom: 2px !important;
                }

                .info-cell-value {
                    color: var(--text-main) !important;
                    font-weight: 500 !important;
                    white-space: nowrap !important;
                    overflow: hidden !important;
                    text-overflow: ellipsis !important;
                }
            `,
            'history.html': `
                /* ========== 历史记录页面专用样式 ========== */
                .job-item {
                    display: flex !important;
                    align-items: center !important;
                    justify-content: space-between !important;
                    padding: 12px !important;
                    background: white !important;
                    border-radius: 14px !important;
                    margin-bottom: 10px !important;
                }

                .status-dot {
                    width: 8px !important;
                    height: 8px !important;
                    background: var(--accent) !important;
                    border-radius: 50% !important;
                    margin-right: 12px !important;
                    box-shadow: 0 0 8px var(--accent) !important;
                }

                .status-dot.inactive {
                    background: #ccc !important;
                    box-shadow: none !important;
                }

                .view-btn {
                    background: #f7f9fa !important;
                    padding: 5px 12px !important;
                    border-radius: 12px !important;
                    font-size: 11px !important;
                    color: var(--text-gray) !important;
                    border: none !important;
                    font-weight: 600 !important;
                    cursor: pointer !important;
                }

                .view-btn:hover {
                    background: #edf1f3 !important;
                    color: var(--primary) !important;
                }
            `,
            'profile.html': `
                /* ========== 个人中心页面专用样式 ========== */
                .profile-header {
                    display: flex !important;
                    flex-direction: column !important;
                    align-items: center !important;
                    margin-bottom: 15px !important;
                }

                .profile-avatar {
                    width: 60px !important;
                    height: 60px !important;
                    border-radius: 50% !important;
                    border: 3px solid white !important;
                    box-shadow: 0 5px 15px rgba(0,0,0,0.1) !important;
                }

                .profile-name {
                    margin-top: 8px !important;
                    font-size: 16px !important;
                    font-weight: 700 !important;
                    color: var(--text-main) !important;
                }

                .profile-status {
                    font-size: 10px !important;
                    color: var(--accent) !important;
                    border: 1px solid var(--accent) !important;
                    padding: 2px 8px !important;
                    border-radius: 8px !important;
                    margin-top: 5px !important;
                }

                .edit-resume-btn {
                    margin-top: auto !important;
                    border: 1px solid var(--accent) !important;
                    color: var(--accent) !important;
                    background: white !important;
                    padding: 8px 0 !important;
                    border-radius: 18px !important;
                    font-size: 11px !important;
                    width: 100% !important;
                    font-weight: 600 !important;
                    cursor: pointer !important;
                    transition: 0.2s !important;
                }

                .edit-resume-btn:hover {
                    background: var(--accent) !important;
                    color: white !important;
                }

                .resume-section {
                    margin-bottom: 12px !important;
                }

                .resume-section h4 {
                    color: var(--primary) !important;
                    font-size: 12px !important;
                    margin-bottom: 6px !important;
                }

                .skill-tags {
                    display: flex !important;
                    flex-wrap: wrap !important;
                    gap: 4px !important;
                }

                .skill-tag {
                    font-size: 9px !important;
                    background: #e0f7fa !important;
                    color: var(--dark-green) !important;
                    padding: 2px 6px !important;
                    border-radius: 5px !important;
                }
            `,
            'settings.html': `
                /* ========== 设置页面专用样式 ========== */
                .content-card {
                    background: white !important;
                    border-radius: 16px !important;
                    padding: 16px !important;
                    margin-bottom: 12px !important;
                    box-shadow: 0 5px 20px rgba(0,0,0,0.03) !important;
                }

                .card-title {
                    font-size: 14px !important;
                    font-weight: 700 !important;
                    color: var(--text-main) !important;
                    margin-bottom: 12px !important;
                    display: flex !important;
                    align-items: center !important;
                    gap: 8px !important;
                }

                .settings-item {
                    display: flex !important;
                    align-items: center !important;
                    justify-content: space-between !important;
                    padding: 12px !important;
                    background: #f8f9fa !important;
                    border-radius: 12px !important;
                    margin-bottom: 8px !important;
                    cursor: pointer !important;
                    text-decoration: none !important;
                    color: inherit !important;
                    transition: background 0.2s !important;
                }

                .settings-item:hover {
                    background: #e9ecef !important;
                }

                .settings-item-left {
                    display: flex !important;
                    align-items: center !important;
                    gap: 12px !important;
                }

                .settings-item-label {
                    font-size: 13px !important;
                    font-weight: 500 !important;
                    color: var(--text-main) !important;
                }

                .btn-danger {
                    background: #dc3545 !important;
                    color: white !important;
                    border: none !important;
                    padding: 12px 20px !important;
                    border-radius: 12px !important;
                    font-size: 14px !important;
                    font-weight: 600 !important;
                    cursor: pointer !important;
                    width: 100% !important;
                    margin-top: 20px !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    gap: 8px !important;
                    transition: background 0.2s !important;
                }

                .btn-danger:hover {
                    background: #c82333 !important;
                }
            `
        };

        return baseStyles + (pageSpecificStyles[pageType] || '');
    }

    /**
     * 加载CSS样式
     */
    async function loadStyles() {
        try {
            // 1. 加载本地 CSS 文件（fetch 方式，最可靠）
            const cssFiles = [
                // "popup/styles/simple-icons.css",  // 简单图标系统（Unicode字符 + CSS）- 已禁用，使用 Font Awesome 代替
                "popup/styles/common.css",
                "popup/styles/fill.css"
                // 移除 resumeInterface.css，因为它是为旧的深色主题设计的，会与新设计冲突
            ];

            // 2. Font Awesome CSS（本地文件，需要替换字体路径）
            const fontAwesomeCssFile = "popup/styles/font-awesome.min.css";

            // 验证 CSS 文件是否可访问
            cssFiles.forEach((file) => {
                const url = chrome.runtime.getURL(file);
            });

            // ✅ Shadow DOM专用样式：CSS变量定义 + 强制样式隔离（防止外部网站样式渗透）
            const cssVariables = document.createElement("style");
            cssVariables.textContent = `
                /* Shadow DOM变量定义 */
                :host {
                    /* --- 核心色板 --- */
                    --primary: #57c5b6;
                    --primary-dark: #3a8e82;
                    --accent: #ff9a9e;
                    --text-main: #2d3436;
                    --text-gray: #636e72;

                    /* --- 背景流体 --- */
                    --bg-fluid: radial-gradient(circle at 10% 10%, rgba(87, 197, 182, 0.4) 0%, transparent 50%),
                                radial-gradient(circle at 90% 90%, rgba(255, 154, 158, 0.4) 0%, transparent 50%),
                                linear-gradient(135deg, #def7fa 0%, #ffecec 100%);

                    /* --- 材质系统 --- */
                    --glass-clear-bg: rgba(255, 255, 255, 0.35);
                    --glass-clear-blur: blur(12px);
                    --glass-clear-border: 1px solid rgba(255, 255, 255, 0.6);
                    --glass-clear-shadow: 0 8px 30px rgba(0, 0, 0, 0.05);

                    --card-white: rgba(255, 255, 255, 0.85);
                    --card-blur: blur(20px);
                    --card-shadow: 0 5px 20px rgba(0, 0, 0, 0.03);

                    /* --- 圆角 --- */
                    --r-card: 20px;
                    --r-btn: 25px;

                    /* --- 深绿色 --- */
                    --dark-green: #006666;
                }

                /* 针对插件容器内的表单元素进行强制样式重置，防止外部网站样式影响 */
                .plugin-container input,
                .plugin-container textarea,
                .plugin-container button,
                .plugin-container select {
                    /* 防止外部网站的transform/scale影响 */
                    transform: none !important;
                    zoom: 1 !important;
                    scale: 1 !important;

                    /* 基础盒模型重置 */
                    box-sizing: border-box !important;

                    /* 字体重置 - 让外部网站的font-size不影响我们的样式 */
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
                }

                /* 针对所有插件容器内的元素进行基础重置 */
                .plugin-container * {
                    box-sizing: border-box !important;
                    transform: none !important;
                }
            `;
            shadowRoot.appendChild(cssVariables);
            // 使用 adoptedStyleSheets API 加载 CSS（保持 Unicode 转义序列）
            const styleSheets = [];

            for (const file of cssFiles) {
                try {
                    const url = chrome.runtime.getURL(file);
                    const response = await fetch(url);
                    if (!response.ok) {
                        console.error(`❌ 加载CSS失败: ${file} - ${response.status}`);
                        continue;
                    }

                    let cssText = await response.text();

                    // 使用 adoptedStyleSheets API 加载样式
                    const sheet = new CSSStyleSheet();
                    await sheet.replace(cssText);
                    styleSheets.push(sheet);
                } catch (error) {
                    console.error(`❌ 加载CSS时出错: ${file}`, error);
                }
            }

            // 将本地样式表应用到 Shadow DOM
            shadowRoot.adoptedStyleSheets = styleSheets;

            // 加载 Font Awesome CSS（本地文件）- 需要替换字体路径
            try {
                const fontAwesomeUrl = chrome.runtime.getURL(fontAwesomeCssFile);
                const response = await fetch(fontAwesomeUrl);
                if (!response.ok) {
                    console.error(`❌ 加载 Font Awesome CSS 失败: ${fontAwesomeCssFile} - ${response.status}`);
                } else {
                    let cssText = await response.text();

                    // 将相对字体路径替换为本地扩展的绝对路径
                    // Font Awesome CSS 中使用 ../webfonts/ 路径
                    const fontFiles = ['fa-solid-900', 'fa-regular-400', 'fa-brands-400'];
                    const fontExtensions = ['woff2', 'woff', 'ttf'];

                    for (const fontFile of fontFiles) {
                        for (const ext of fontExtensions) {
                            const localUrl = chrome.runtime.getURL(`popup/webfonts/${fontFile}.${ext}`);
                            // 匹配各种可能的字体路径格式
                            const patterns = [
                                new RegExp(`url\\(["']?\\.\\.\/webfonts\/${fontFile}\\.${ext}["']?\\)`, 'g'),
                                new RegExp(`url\\(["']?[^"')]*\/webfonts\/${fontFile}\\.${ext}["']?\\)`, 'g')
                            ];
                            for (const pattern of patterns) {
                                cssText = cssText.replace(pattern, `url("${localUrl}")`);
                            }
                        }
                    }

                    // 调试：打印前几个 @font-face 规则，验证路径转换
                    // const fontFaceMatches = cssText.match(/@font-face\{[^}]+\}/g);

                    // 先加载 Font Awesome CSS
                    const styleElement = document.createElement('style');
                    styleElement.textContent = cssText;
                    shadowRoot.appendChild(styleElement);

                    // 然后在 Font Awesome CSS 之后，注入覆盖样式以确保优先级最高
                    const faOverrideStyle = document.createElement('style');
                    faOverrideStyle.textContent = `
                        /* Font Awesome 覆盖样式 - 最高优先级，覆盖 common.css 的通配符规则 */
                        .fas, .far, .fab, .fa {
                            font-family: "Font Awesome 6 Free" !important;
                            font-weight: 900 !important;
                            display: inline-block !important;
                            font-style: normal !important;
                            font-variant: normal !important;
                            line-height: 1 !important;
                            text-rendering: auto !important;
                            -webkit-font-smoothing: antialiased !important;
                            -moz-osx-font-smoothing: grayscale !important;
                        }
                        .far {
                            font-weight: 400 !important;
                        }
                        .fab {
                            font-family: "Font Awesome 6 Brands" !important;
                            font-weight: 400 !important;
                        }

                        /* 确保::before伪元素继承正确的字体 */
                        .fas::before, .far::before, .fab::before {
                            font-family: inherit !important;
                            font-weight: inherit !important;
                            display: inline-block !important;
                        }
                    `;
                    shadowRoot.appendChild(faOverrideStyle);

                    // 使用 FontFace API 手动加载字体
                    try {
                        const solidFontUrl = chrome.runtime.getURL('popup/webfonts/fa-solid-900.woff2');
                        const solidFont = new FontFace('Font Awesome 6 Free', `url(${solidFontUrl})`, {
                            weight: '900',
                            style: 'normal'
                        });

                        await solidFont.load();
                        document.fonts.add(solidFont);
                        console.log('✅ 手动加载 Font Awesome 6 Free (900) 成功');

                        // 也加载 Regular 版本（fa-regular）
                        const regularFontUrl = chrome.runtime.getURL('popup/webfonts/fa-regular-400.woff2');
                        const regularFont = new FontFace('Font Awesome 6 Free', `url(${regularFontUrl})`, {
                            weight: '400',
                            style: 'normal'
                        });

                        await regularFont.load();
                        document.fonts.add(regularFont);
                        console.log('✅ 手动加载 Font Awesome 6 Free (400) 成功');

                        // 加载 Brands 版本
                        const brandsFontUrl = chrome.runtime.getURL('popup/webfonts/fa-brands-400.woff2');
                        const brandsFont = new FontFace('Font Awesome 6 Brands', `url(${brandsFontUrl})`, {
                            weight: '400',
                            style: 'normal'
                        });

                        await brandsFont.load();
                        document.fonts.add(brandsFont);
                        console.log('✅ 手动加载 Font Awesome 6 Brands (400) 成功');

                        // 触发页面重绘
                        shadowRoot.host.style.display = 'none';
                        shadowRoot.host.offsetHeight; // 强制重排
                        shadowRoot.host.style.display = '';
                    } catch (error) {
                        console.error('❌ FontFace API 加载字体失败:', error);
                    }

                    // 测试字体文件是否可访问
                    const testFontUrls = [
                        chrome.runtime.getURL('popup/webfonts/fa-solid-900.woff2'),
                        chrome.runtime.getURL('popup/webfonts/fa-regular-400.woff2'),
                        chrome.runtime.getURL('popup/webfonts/fa-brands-400.woff2')
                    ];

                    for (const fontUrl of testFontUrls) {
                        try {
                            const response = await fetch(fontUrl);
                            if (response.ok) {
                                const size = (await response.blob()).size;
                            } else {
                                console.error(`  ❌ 字体文件无法访问: ${fontUrl.split('/').pop()} - HTTP ${response.status}`);
                            }
                        } catch (error) {
                            console.error(`  ❌ 字体文件访问失败: ${fontUrl.split('/').pop()}`, error);
                        }
                    }

                    // ✅ 图标备用样式已移至各个HTML文件，此处注释掉避免重复
                    // const iconFallbackStyle = document.createElement('style');
                    // iconFallbackStyle.textContent = `
                    //     /* 图标备用方案 */
                    //     .fas::before, .far::before, .fab::before {
                    //         font-family: "Font Awesome 6 Free" !important;
                    //         font-weight: 900 !important;
                    //         display: inline-block !important;
                    //         font-style: normal !important;
                    //         font-variant: normal !important;
                    //         text-rendering: auto !important;
                    //         line-height: 1 !important;
                    //     }
                    //
                    //     .fa-magic::before { content: "\\f0d0"; }
                    //     .fa-bolt::before { content: "\\f0e7"; }
                    //     .fa-history::before { content: "\\f1da"; }
                    //     .fa-user::before { content: "\\f007"; }
                    //     .fa-cog::before { content: "\\f013"; }
                    //     .fa-times::before { content: "\\f00d"; }
                    //     .fa-info-circle::before { content: "\\f05a"; }
                    //     .fa-edit::before { content: "\\f044"; }
                    //     .fa-spinner::before { content: "\\f110"; }
                    //     .fa-spin {
                    //         animation: fa-spin 2s infinite linear;
                    //     }
                    //     @keyframes fa-spin {
                    //         0% { transform: rotate(0deg); }
                    //         100% { transform: rotate(360deg); }
                    //     }
                    //
                    //     /* 如果Font Awesome没加载，使用文字备用 */
                    //     .fas:not([class*="fa-"])::before,
                    //     .far:not([class*="fa-"])::before {
                    //         content: "●";
                    //     }
                    // `;
                    // shadowRoot.appendChild(iconFallbackStyle);
                }
            } catch (error) {
                console.error(`❌ 加载 Font Awesome CSS 时出错:`, error);
            }
            // ✅ 只保留插件注入时需要的特定样式（Logo按钮和窗口容器）
            const logoAndContainerStyle = document.createElement("style");
            logoAndContainerStyle.textContent = `
                /* Logo按钮样式 - 用于外部网站注入 */
                #logo-button {
                    position: fixed;
                    bottom: 40px;
                    right: 40px;
                    z-index: 100000000;
                    background-color: #111;
                    border: 1px solid #222;
                    border-radius: 20px;
                    cursor: pointer !important;
                    width: 50px;
                    height: 50px;
                    padding: 0;
                    overflow: hidden;
                    transition: display 0.2s ease;
                    animation: logo-button-breathe 3s ease-in-out infinite;
                }

                #logo-button:hover {
                    cursor: pointer !important;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.2);
                }

                #logo-button img {
                    width: 100%;
                    height: 100%;
                    vertical-align: initial;
                }

                @keyframes logo-button-breathe {
                    0% { transform: scale(1); }
                    10% { transform: scale(1.02); }
                    15% { transform: scale(1.1); }
                    20% { transform: scale(1.05); }
                    25% { transform: scale(1.1); }
                    30% { transform: scale(1.02); }
                    40% { transform: scale(1); }
                    100% { transform: scale(1); }
                }

                /* 简历窗口容器样式 - 用于外部网站注入 */
                #resume-window-container {
                    position: fixed;
                    bottom: 40px;
                    right: 40px;
                    max-height: calc(100vh - 80px);
                    width: 420px;
                    height: min(600px, calc(100vh - 80px));
                    border-radius: 20px;
                    z-index: 100000001;
                    display: none;
                    opacity: 0;
                    transition: opacity 0.2s ease;
                }

                #resume-window-container .plugin-container {
                    position: relative;
                    width: 100%;
                    height: 100%;
                    border-radius: 20px;
                    background: radial-gradient(circle at 10% 10%, rgba(87, 197, 182, 0.4) 0%, transparent 50%),
                                radial-gradient(circle at 90% 90%, rgba(255, 154, 158, 0.4) 0%, transparent 50%),
                                linear-gradient(135deg, #def7fa 0%, #ffecec 100%);
                    box-shadow: 0 0 20px rgba(0, 0, 0, 0.2), 0 0 40px rgba(0, 0, 0, 0.1);
                    display: flex;
                    overflow: hidden;
                }

                /* ✅ 以下样式已移至 common.css 和各HTML文件，此处注释掉避免重复 */
                /* .sidebar, .main-area, .liquid-title, .liquid-close, .plugin-content */
                /* .switch-tooltip, .book-wrapper, .resume-page-current, .resume-page-next */
            `;
            shadowRoot.appendChild(logoAndContainerStyle);

            // ✅ 添加最终样式保护层（最高优先级），防止特殊网站（如美团）的样式渗透
            const finalProtectionStyle = document.createElement("style");
            finalProtectionStyle.textContent = `
                /* 全局重置 - 防止美团等网站的全局样式影响 */
                .plugin-container,
                .plugin-container * {
                    /* 重置line-height，防止元素高度被拉长 - 使用具体数值避免继承外部样式 */
                    line-height: 1.4 !important;

                    /* 重置letter-spacing和word-spacing */
                    letter-spacing: 0 !important;
                    word-spacing: 0 !important;

                    /* 重置text相关属性 */
                    text-indent: 0 !important;
                    text-shadow: none !important;
                }

                /* 窗口容器固定定位保护 */
                #resume-window-container {
                    position: fixed !important;
                    top: auto !important;
                    bottom: 40px !important;
                    left: auto !important;
                    right: 40px !important;
                    margin: 0 !important;
                    padding: 0 !important;
                }

                /* 主容器尺寸保护 */
                .plugin-container {
                    width: 420px !important;
                    height: 600px !important;
                    max-width: 420px !important;
                    max-height: 600px !important;
                    min-width: 420px !important;
                    min-height: 600px !important;
                    margin: 0 !important;
                    padding: 0 !important;
                }

                /* 滚动内容区padding保护 */
                .plugin-content {
                    padding: 75px 15px 20px !important;
                    margin: 0 !important;
                    line-height: 1.4 !important;
                    display: flex !important;
                    flex-direction: column !important;
                    gap: 12px !important;
                }

                /* task-input样式保护 */
                .plugin-container .task-input {
                    width: 100% !important;
                    min-height: auto !important;
                    max-height: none !important;
                    height: auto !important;
                    box-sizing: border-box !important;
                    padding: 10px !important;
                    margin: 0 !important;
                    font-size: 11px !important;
                    line-height: 1.5 !important;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
                    transform: none !important;
                    zoom: 1 !important;
                    scale: 1 !important;
                    flex: 1 !important;
                }

                /* job-item（记录页面项）样式保护 */
                .job-item {
                    display: flex !important;
                    align-items: center !important;
                    padding: 12px !important;
                    margin: 0 0 10px 0 !important;
                    line-height: 1.4 !important;
                    height: auto !important;
                    min-height: auto !important;
                }

                .job-item * {
                    line-height: 1.4 !important;
                }

                /* 所有文本元素line-height重置为具体值 */
                .plugin-container p,
                .plugin-container div,
                .plugin-container span,
                .plugin-container a,
                .plugin-container button,
                .plugin-container h1,
                .plugin-container h2,
                .plugin-container h3,
                .plugin-container h4,
                .plugin-container h5,
                .plugin-container h6 {
                    line-height: 1.4 !important;
                }

                /* 卡片样式保护 */
                .content-card,
                .task-card {
                    margin: 0 0 15px 0 !important;
                    padding: 15px !important;
                    line-height: 1.4 !important;
                }

                .task-card {
                    padding: 12px !important;
                    height: 110px !important;
                    flex-shrink: 0 !important;
                }

                /* 按钮样式保护 */
                .view-btn,
                .btn-primary,
                .btn-danger,
                .liquid-cta-btn {
                    line-height: 1.4 !important;
                    height: auto !important;
                }

                .liquid-cta-btn {
                    padding: 12px 25px !important;
                }

                .btn-primary,
                .btn-danger {
                    padding: 12px 20px !important;
                }

                .view-btn {
                    padding: 5px 12px !important;
                }
            `;
            shadowRoot.appendChild(finalProtectionStyle);

            // 2. Font Awesome 已在 loadStyles() 中加载，这里不需要额外处理

            // 验证样式是否成功注入
            const styleCount = shadowRoot.querySelectorAll('style').length;

            // 调试：检查图标元素的实际状态
            setTimeout(() => {

                const iconElements = shadowRoot.querySelectorAll('.fas, .far, .fab, [class*="fa-"]');

                if (iconElements.length > 0) {
                    const firstIcon = iconElements[0];

                    // 检查元素本身的样式
                    const elemStyle = window.getComputedStyle(firstIcon);

                    // 检查::before伪元素的样式
                    const beforeStyle = window.getComputedStyle(firstIcon, '::before');

                    // 检查<style>标签内容
                    const styles = shadowRoot.querySelectorAll('style');

                    // 直接检查 CSS 中是否有 fa-info-circle 的 content 定义
                    for (let i = 0; i < styles.length; i++) {
                        const content = styles[i].textContent;
                        if (content.includes('fa-info-circle')) {
                            // 查找包含 fa-info-circle 和 content 的规则
                            const pattern = /\.fa-info-circle[^{]*::?before[^}]*content[^}]*\}/gi;
                            const matches = content.match(pattern);
                        }
                    }

                    // 手动测试：直接给第一个图标添加content
                    const testStyle = document.createElement('style');
                    testStyle.textContent = `
                        .fas.fa-info-circle::before {
                            content: "\\f05a" !important;
                        }
                        .fas.fa-magic::before {
                            content: "\\f0d0" !important;
                        }
                        .fas.fa-bolt::before {
                            content: "\\f0e7" !important;
                        }
                    `;
                    shadowRoot.appendChild(testStyle);

                    // 再次检查content
                    setTimeout(() => {
                        const afterTestStyle = window.getComputedStyle(firstIcon, '::before');

                        for (let i = 0; i < styles.length; i++) {
                            const styleText = styles[i].textContent;
                            // 查找设置 content: "" 或 content: none 的规则
                            const emptyContentMatches = styleText.match(/[^}]*::?before[^}]*content\s*:\s*(""|''|none)[^}]*/gi);
                            if (emptyContentMatches && emptyContentMatches.length > 0) {
                                console.warn(`  ⚠️ <style>#${i} 中发现空content规则:`, emptyContentMatches);
                            }
                        }

                        // 尝试直接在元素上设置内联样式（最高优先级）
                        firstIcon.style.setProperty('--fa-content', '\\f05a');
                        const directStyle = document.createElement('style');
                        directStyle.textContent = `
                            i.fas.fa-info-circle::before {
                                content: "\\f05a" !important;
                                font-family: "Font Awesome 6 Free" !important;
                                font-weight: 900 !important;
                                display: inline-block !important;
                            }
                        `;
                        shadowRoot.appendChild(directStyle);

                        setTimeout(() => {
                            const finalStyle = window.getComputedStyle(firstIcon, '::before');
                            if (finalStyle.content === '""' || finalStyle.content === '') {
                                console.error(`❌ 即使使用最高优先级样式，content 仍然为空！可能是Shadow DOM内部机制问题。`);
                            }
                        }, 100);
                    }, 100);

                    for (let i = 0; i < styles.length; i++) {
                        const content = styles[i].textContent;

                        // 检查是否包含.fa-图标规则
                        if (content.includes('.fa-magic') || content.includes('.fa-bolt')) {
                            console.log(`  ✅ <style>标签 #${i} 包含 Font Awesome 图标规则`);

                            // 提取一个示例规则
                            const match = content.match(/\.fa-magic::?before[^}]+content[^}]+/);
                            if (match) {
                                console.log(`     示例规则: ${match[0].substring(0, 100)}...`);
                            }
                        }
                    }
                }

                // 检查字体是否真的加载了
                if (document.fonts) {
                    document.fonts.ready.then(() => {
                        const fontAwesomeFonts = [];
                        document.fonts.forEach((font) => {
                            if (font.family.includes('Font Awesome')) {
                                fontAwesomeFonts.push(`${font.family} ${font.weight} ${font.style}`);
                            }
                        });
                        if (fontAwesomeFonts.length > 0) {
                            console.log(`✅ 字体已加载: `, fontAwesomeFonts);
                        } else {
                            console.warn(`⚠️ 未找到已加载的 Font Awesome 字体`);
                        }
                    });
                }
            }, 1500);

            // ========== 方案1: 注入增强版内联样式 ==========
            console.log("🚀 正在注入增强版内联样式保护...");

            // 生成并注入当前页面的强化内联样式
            const enhancedInlineStyle = document.createElement("style");
            enhancedInlineStyle.setAttribute('data-enhanced-inline-styles', 'true');
            enhancedInlineStyle.setAttribute('data-priority', 'highest');
            // enhancedInlineStyle.textContent = generateInlineStylesForPage(currentPage);
            shadowRoot.appendChild(enhancedInlineStyle);

            console.log("✅ 增强版内联样式已注入完成");

        } catch (error) {
            console.error("✗ 加载样式时出错:", error);
        }
    }

    /**
     * 加载Font Awesome字体
     * 注意：Font Awesome 的字体由本地 CSS 文件自动处理
     */
    async function loadFontAwesome() {
        try {
            // Font Awesome 本地文件会自动处理字体加载
            // 字体文件路径在 font-awesome.all.min.css 中配置为 ../webfonts/
            // 我们只需要等待 CSS 加载完成（在 loadStyles 中已处理）

            // 等待一小段时间，确保字体文件开始加载
            await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
            console.error("✗ Font Awesome 初始化失败:", error);
        }
    }

    /**
     * 设置按钮显示模式
     * @param {string|boolean} mode - 显示模式：show/auto/hidden 或 布尔值
     */
    function setButtonMode(mode) {
        const hostElement = document.getElementById("ark-ai");
        if (!hostElement) return;

        if (typeof mode === "boolean") {
            hostElement.style.display = mode ? "block" : "none";
        } else {
            switch (mode) {
                case "show":
                    hostElement.style.display = "block";
                    break;
                case "auto":
                    // 自动模式，不做处理
                    break;
                case "hidden":
                    hostElement.style.display = "none";
                    break;
            }
        }
    }

    /**
     * 初始化高亮设置
     */
    async function initHighlight() {
        try {
            const { highlightEnabled } = await chrome.storage.local.get(["highlightEnabled"]);
            const enabled = highlightEnabled !== false;
            document.documentElement.style.setProperty("--highlight-enabled", enabled ? "1" : "0");
        } catch (error) {
            document.documentElement.style.setProperty("--highlight-enabled", "1");
        }
    }

    // ============================================================================
    // 事件绑定
    // ============================================================================

    /**
     * 绑定所有事件监听器
     * @param {HTMLElement} logoBtn - Logo按钮
     * @param {HTMLElement} resumeWin - 简历窗口
     */
    async function bindEvents(logoBtn, resumeWin) {
        if (!resumeWin) return;

        // Logo按钮点击 - 打开/关闭窗口
        logoBtn.addEventListener("click", async () => {
            const { auth } = await chrome.storage.local.get(["auth"]);
            if (auth) {
                // 打开窗口前，如果当前在 fill.html 页面，强制刷新简历数据
                if (currentPage === 'fill.html') {
                    await initResumeData(true);
                }
                toggleWindow(true);
            } else {
                if (confirm("尚未登录到一念职达，是否立即前往登录？")) {
                    window.open(`${window.config.LOGIN_URL}`, "_blank");
                }
            }
        });

        // 注意：填充按钮的绑定已在 bindPageSpecificEvents('fill.html') 中处理
        // 这里不需要重复绑定，否则会导致点击一次触发两次事件

        // 绑定点击窗口外部关闭功能
        if (resumeWindowContainer) {
            resumeWindowContainer.addEventListener("click", (e) => {
                // 如果点击的是容器本身（而不是窗口内容），则关闭窗口
                if (e.target === resumeWindowContainer) {
                    toggleWindow(false);
                }
            });
        }

        // 绑定ESC键关闭窗口
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && resumeWindowContainer && resumeWindowContainer.style.display === "block") {
                toggleWindow(false);
            }
        });

        // 绑定初始页面（fill.html）的特定事件（包括关闭按钮）
        bindPageSpecificEvents('fill.html');

        // TODO: 绑定简历头部区域点击 - 暂未实现
        // const header = resumeWin.querySelector(".resume-header");

        // TODO: 绑定简历版本切换 - 暂未实现
        // const versionSelect = resumeWin.querySelector("#resume-version");

        // TODO: 绑定美化简历复选框 - 暂未实现
        // const beautifyCheckbox = resumeWin.querySelector("#beautify-checkbox");

        // TODO: 绑定底部功能按钮 - 暂未实现
        // bindFooterButtons();

        // TODO: 绑定状态弹窗相关事件 - 暂未实现
        // const floatStatusButton = resumeWin.querySelector("#float-status-button");
        // const statusPopup = resumeWin.querySelector("#status-popup");
        // const statusPopupClose = resumeWin.querySelector(".status-popup-close");

        // TODO: 绑定任务背景输入框事件 - 暂未实现
        // const taskInput = resumeWin.querySelector(".task-input");

        // TODO: 绑定简历切换事件（book-wrapper） - 暂未实现
        // const bookWrapper = resumeWin.querySelector(".book-wrapper");
    }

    /**
     * 绑定底部功能按钮
     */
    function bindFooterButtons() {
        // TODO: 实现底部按钮绑定
        // const historyBtn = resumeWindow.querySelector("#history-table-btn");
        // const campusBtn = resumeWindow.querySelector("#campus-table-btn");
        // const resumeBtn = resumeWindow.querySelector("#my-resume-btn");
    }

    // ============================================================================
    // 窗口控制
    // ============================================================================

    /**
     * 切换窗口显示/隐藏
     * @param {boolean} show - true显示，false隐藏
     */
    async function toggleWindow(show) {
        if (!resumeWindow || !resumeWindowContainer) return;

        if (show) {
            // 显示窗口容器
            resumeWindowContainer.style.display = "block";
            resumeWindowContainer.style.opacity = "0";

            await delay(10);
            resumeWindowContainer.style.opacity = "1";
            await delay(200);

            // 隐藏Logo按钮
            if (logoButton) {
                logoButton.style.display = "none";
            }

            // 根据编辑器状态处理
            if (editorState === "init") {
                window.setStateText("初始化中...", "min");
                setTimeout(() => {
                    toggleDisplay("show");
                }, 1000);
                return;
            }

            if (editorState === "error") {
                window.setStateText("初始化失败！我不行了，靠你咯...", "min");
                return;
            }

            // 加载简历数据
            if (!resumeData) {
                renderResumeData();

                if (resumeData.status === "error") {
                    if (resumeData.detail && resumeData.detail === "用户没有简历") {
                        await toggleWindow(false);
                        if (confirm("你还没有简历，快前往【一念职达】上传简历吧！")) {
                            window.open(`${window.config.WEB_URL}`, "_blank");
                        }
                    } else {
                        window.setStateText("糟糕！简历请求失败，刷新再试试", "min");
                    }
                    resumeData = null;
                    return;
                }

                if (!resumeData) {
                    window.setStateText("糟糕！简历加载失败，刷新再试试", "min");
                    return;
                }

                // 填充表单数据
                fillFormData(resumeData);
            }

            // 更新状态提示
            if (canStart()) {
                window.setStateText("一念职达已准备，等待启动", "show");
            } else {
                window.setStateText("一念职达准备中，请先填写公司和职位", "show");
                await delay(600);
                // TODO: 焦点处理需要根据fill.html的实际元素调整
                // resumeWindow.querySelector("#company-name").focus();
            }
        } else {
            // 隐藏窗口
            if (logoButton) {
                logoButton.style.display = "block";
            }

            await delay(10);
            resumeWindowContainer.style.opacity = "0";
            await delay(200);
            resumeWindowContainer.style.display = "none";
        }
    }

    /**
     * 切换简历详情显示/隐藏
     * @param {string|null} mode - "show"展开，"min"收起，null切换
     */
    async function toggleDisplay(mode = null) {
        // TODO: 根据fill.html的实际结构实现
        const displayArea = resumeWindow.querySelector(".plugin-content");
        if (!displayArea) return;

        // 自动判断模式
        if (mode === null) {
            mode = resumeWindow.classList.contains("min") ? "show" : "min";
        }

        if (mode === "show" && resumeWindow.classList.contains("min")) {
            // 展开
            resumeWindow.classList.remove("min");
            displayArea.style.display = "block";
            await delay(100);
            displayArea.style.opacity = "1";
        } else if (mode === "min" && !resumeWindow.classList.contains("min")) {
            // 收起
            displayArea.style.opacity = "0";
            await delay(200);
            displayArea.style.display = "none";
            resumeWindow.classList.add("min");
        }
    }

    /**
     * 填充表单数据
     * @param {Object} data - 简历数据
     */
    function fillFormData(data) {
        
        // TODO: 根据fill.html的实际表单元素实现
        // const companyInput = resumeWindow.querySelector("#company-name");
        // const positionInput = resumeWindow.querySelector("#position-name");

        // 如果有校招来源，使用校招公司名
        if (window.campusSource && window.campusSource.company) {
            // TODO: 填充公司名称
        }

        // TODO: 填充简历版本下拉框
        // TODO: 加载简历内容

        // 填充公司和职位
        // companyInput.value = data.company || "";
        // positionInput.value = data.position || "";

        // 如果有校招来源，使用校招公司名
        // if (window.campusSource && window.campusSource.company) {
        //     companyInput.value = window.campusSource.company;
        // }

        // 填充简历版本下拉框
        // const versionSelect = resumeWindow.querySelector("#resume-version");
        // if (versionSelect) {
        //     let options = "";
        //     for (const resume of data.resumeList) {
        //         options += `<option value="${resume.id}">${resume.title}</option>`;
        //     }
        //     versionSelect.innerHTML = options;
        //     versionSelect.value = data.resumeId;
        // }

        // // 加载简历内容
        // for (const resume of data.resumeList) {
        //     if (resume.id === data.resumeId) {
        //         setResumeContent(resume.resumeMd);
        //         break;
        //     }
        // }
    }

    // ============================================================================
    // 状态管理
    // ============================================================================

    // 填充状态：ready/running/pause/success/error/quota/learning
    let fillState = "ready";

    // main执行入口
    /**
     * 开始填充流程
     */
    async function startFilling() {
        if (editorState !== "success") {
            return;
        }

        // 检查是否可以开始
        if (!canStart()) {
            alert("要先填写公司和职位，才能生成专岗美化简历哦！");
            window.setStateText("一念职达准备中，请先填写公司和职位", "show");
            // TODO: 焦点处理
            return;
        }

        // 只有在特定状态下才能开始
        if (["ready", "success", "error", "quota"].includes(fillState)) {
            // 检查登录状态
            const { auth } = await chrome.storage.local.get(["auth"]);
            if (!auth || !auth.token) {
                const shouldLogin = confirm("暂未登录，请先登录。是否立即前往登录页面？");
                if (shouldLogin) {
                    window.open(window.config.LOGIN_URL, "_blank");
                }
                return;
            }

            // 检查简历数据是否为空
            if (!resumeList || resumeList.length === 0) {
                const shouldUpload = confirm(
                    "您还没有上传简历，无法使用智能填充功能。\n" +
                    "是否立即前往上传简历？"
                );
                if (shouldUpload) {
                    const resumeUrl = window.config?.WEB_URL || 'http://localhost:3000/resume';
                    window.open(resumeUrl, "_blank");
                }
                return;
            }

            // todo 检查配额接口
            // 检查配额
            const quotaResult = await apiRequestForGet("quota", {},false);
            // const quotaResult = { remainQuota: 9999 };
            if (quotaResult.quota <= 0) {
                const goToPricing = confirm(
                    "抱歉，一念职达AI本月的试用配额已用完，请升级会员方案~\n" +
                    "点击\"取消\"稍后再试，\n" +
                    "点击\"确定\"前往查看会员方案。"
                );
                if (goToPricing) {
                    window.open(window.config.PRICING_URL, "_blank");
                }
                setStateText("本月试用配额已用完，请升级会员");
                changeState("quota");
                return;
            }

            // 重新初始化高亮
            initHighlight();

            // 锁定简历，防止填充过程中切换
            isResumeLocked = true;
            // 锁定任务背景输入框
            lockTaskInput();

            // 开始运行
            changeState("running");

            // 从fill.html获取表单数据
            // 如果 resumeData 中没有公司名称，尝试重新获取
            let company = resumeData?.company;
            if (!company || company.trim() === '') {
                company = getCurrentCompanyName();
            }
            const position = resumeData?.position;
            const resumeId = resumeData?.resumeId;

            // 获取任务背景
            let taskContent = '';
            const taskInput = resumeWindowContainer?.querySelector('.task-input');
            if (taskInput) {
                taskContent = taskInput.value.trim();
            } else {
            }
            // 调用填充函数
            if (typeof window.runFillResume === 'function') {
                window.runFillResume(company, position, resumeId, taskContent, false, (result) => {
                    if (result.status === "success") {
                        changeState("success");
                        // 保存投递记录
                        saveApplicationRecord(company, position);
                    } else {
                        // 处理错误情况
                        console.error("[startFilling] 填充失败:", result);

                        // 提取错误信息
                        let errorMessage = "填充过程中发生错误";
                        if (result.error) {
                            errorMessage = result.error;
                        } else if (result.message) {
                            errorMessage = result.message;
                        } else if (result.detail) {
                            errorMessage = result.detail;
                        }

                        // 显示错误提示
                        setStateText(`错误: ${errorMessage}`, "show");

                        // 同时使用alert提示用户
                        alert(`自动填充失败\n\n错误信息: ${errorMessage}\n\n请点击"刷新重试"按钮重新尝试`);

                        // 更改状态为错误
                        changeState("error", errorMessage);
                    }
                    // 填充完成后解锁简历
                    isResumeLocked = false;
                });
            } else {
                console.error("[startFilling] window.runFillResume 函数未定义！");
                const errorMsg = "填充功能未加载，请刷新页面后重试";
                alert(errorMsg);
                setStateText(`错误: ${errorMsg}`, "show");
                changeState("error", errorMsg);
                // 发生错误时也要解锁
                isResumeLocked = false;
            }
        } else if (fillState === "running") {
            // 暂停
            changeState("pause");
        } else if (fillState === "pause") {
            // 继续
            changeState("running");
        }
    }

    /**
     * 改变填充状态
     * @param {string} state - 新状态
     * @param {string} errorMessage - 错误消息（仅在state为"error"时使用）
     */
    function changeState(state, errorMessage = null) {
        if (errorMessage) {
        }
        fillState = state;

        // 在结束状态时解锁简历和任务背景输入框
        if (["ready", "success", "error", "quota"].includes(state)) {
            if (isResumeLocked) {
                isResumeLocked = false;
            }
            // 解锁任务背景输入框
            unlockTaskInput();
        }

        // TODO: 根据fill.html的按钮实现状态变化
        const startButton = resumeWindowContainer?.querySelector(".liquid-cta-btn");
        if (!startButton) {
            console.warn("[changeState] 未找到填充按钮");
            return;
        }

        const buttonContainer = startButton.parentElement;

        switch (state) {
            case "running":
                startButton.innerHTML = '<i class="fas fa-pause"></i><span class="btn-text">暂停填充</span>';
                startButton.classList.add("paused");
                startButton.style.pointerEvents = "auto";
                break;
            case "pause":
                startButton.innerHTML = '<i class="fas fa-play"></i><span class="btn-text">继续填充</span>';
                startButton.classList.remove("paused");
                startButton.style.pointerEvents = "auto";
                break;
            case "success":
                startButton.innerHTML = '<i class="fas fa-check-circle"></i><span class="btn-text">填充完成</span>';
                startButton.classList.remove("paused");
                // 重新启用按钮，允许再次点击
                startButton.style.pointerEvents = "auto";
                startButton.style.opacity = "1";
                break;
            case "error":
                startButton.innerHTML = '<i class="fas fa-exclamation-circle"></i><span class="btn-text">填充错误</span>';
                startButton.classList.remove("paused");
                // 重新启用按钮，允许再次点击重试
                startButton.style.pointerEvents = "auto";
                startButton.style.opacity = "1";
                break;
            case "quota":
                startButton.innerHTML = '<i class="fas fa-battery-empty"></i><span class="btn-text">配额已用完</span>';
                startButton.classList.remove("paused");
                startButton.style.pointerEvents = "auto";
                startButton.style.opacity = "1";
                break;
            case "learning":
                startButton.innerHTML = '<i class="fas fa-brain"></i><span class="btn-text">学习中</span>';
                startButton.style.pointerEvents = "auto";
                startButton.style.opacity = "1";
                break;
            default:
                startButton.innerHTML = '<i class="fas fa-bolt"></i><span class="btn-text">一键智能填充</span>';
                startButton.classList.remove("paused");
                startButton.style.pointerEvents = "auto";
                startButton.style.opacity = "1";
                break;
        }
    }

    /**
     * 检查是否可以开始填充
     * @returns {boolean}
     */
    function canStart() {
        // TODO: 根据fill.html的实际表单元素实现
        // if (isBeautifyEnabled()) {
        //     const companyInput = resumeWindow.querySelector("#company-name");
        //     const positionInput = resumeWindow.querySelector("#position-name");
        //     return companyInput.value && positionInput.value;
        // }
        return true;
    }

    /**
     * 检查是否启用美化简历
     * @returns {boolean}
     */
    function isBeautifyEnabled() {
        // TODO: 根据fill.html的实际元素实现
        // return resumeWindow.querySelector("#beautify-checkbox").checked;
        return false;
    }

    // ============================================================================
    // 简历版本和美化选项
    // ============================================================================

    /**
     * 处理简历版本切换
     * @param {Event} event - change事件
     */
    async function onResumeVersionChange(event) {
        // TODO: 实现简历版本切换逻辑
    }

    /**
     * 处理美化选项变化
     * @param {boolean} enabled - 是否启用
     */
    function onBeautifyChange(enabled) {
        // TODO: 实现美化选项变化逻辑
    }

    // ============================================================================
    // 状态文字显示
    // ============================================================================

    let stateTextTimer = null;

    /**
     * 设置状态文字（带打字机效果）
     * @param {string} text - 状态文字
     * @param {string|null} displayMode - 显示模式（fill.html 页面会忽略此参数）
     */
    function setStateText(text, displayMode = null) {
        // 根据文本内容判断状态类型
        let statusType = 'processing';

        // 检测错误状态
        if (/(错误|失败|糟糕|不行了|用完|刷新)/.test(text)) {
            statusType = 'error';
        }
        // 检测成功状态
        else if (/(完成|成功|已就位|已保存)/.test(text)) {
            statusType = 'success';
        }
        // 检测准备就绪状态
        else if (/(等待|准备中)/.test(text)) {
            statusType = 'idle';
        }
        // 更新状态弹窗（如果存在）
        // 直接使用 window.updateStatusPopup，因为它在 initStatusPopup 中被暴露
        if (typeof window.updateStatusPopup === 'function') {
            window.updateStatusPopup(text, statusType);
        } else {
            console.error('  ✗ window.updateStatusPopup 函数不存在！');
        }

        // 更新 #status-message 元素（保留原有功能）
        const stateTextEl = resumeWindow?.querySelector("#status-message");
        if (stateTextEl) {
            // 🔧 移除文本相同时的提前返回，确保后续逻辑正常执行
            // if (stateTextEl.textContent === text) return;

            // 清除之前的定时器
            if (stateTextTimer) {
                clearTimeout(stateTextTimer);
            }

            let index = 0;
            stateTextEl.textContent = "";

            // 打字机效果
            const typeChar = () => {
                if (index < text.length) {
                    stateTextEl.textContent += text.charAt(index);
                    index++;
                    stateTextTimer = setTimeout(typeChar, 500 / text.length);
                } else {
                    stateTextTimer = null;
                }
            };

            typeChar();
        }

        // 🔧 修复：fill.html 使用新的悬浮按钮设计，不需要隐藏/显示内容区域
        // 对于 fill.html，我们只更新按钮状态，不切换显示模式
        // 因为按钮是悬浮在内容上方的，不需要收起内容
        const isFillPage = currentPage === 'fill.html';

        if (displayMode && !isFillPage) {
            // 只有非 fill.html 页面才执行显示模式切换
            toggleDisplay(displayMode);
        }

        if (isFillPage && displayMode) {
        }
    }

    // ============================================================================
    // Markdown编辑器
    // ============================================================================

    // 编辑器状态：init/success/error
    let editorState = "init";

    /**
     * 初始化Markdown编辑器
     */
    function initMarkdownEditor() {
        // TODO: 根据fill.html的实际需求实现编辑器初始化
        // fill.html中可能不需要SimpleMDE编辑器
        // 暂时标记为成功
        editorState = "success";
    }

    /**
     * 保存简历内容
     * @param {string} content - 简历内容
     */
    async function saveResumeContent(content) {
        // TODO: 实现简历内容保存逻辑
    }

    /**
     * 设置简历内容
     * @param {string} content - 简历内容
     */
    function setResumeContent(content) {
        // TODO: 实现简历内容设置逻辑
    }

    let typeContentTimer = null;

    /**
     * 打字机效果显示简历内容
     * @param {string} content - 简历内容
     */
    function typeResumeContent(content) {
        // TODO: 实现打字机效果
    }

    /**
     * 调整窗口高度
     */
    function adjustWindowHeight() {
        if (!resumeWindow) return;

        // TODO: 根据fill.html的实际布局调整高度
    }

    // ============================================================================
    // API请求
    // ============================================================================
    // todo 所有API接口
    /**
     * 发送API请求
     * @param {string} endpoint - API端点
     * @param {Object} data - 请求数据
     * @returns {Promise<Object>} 响应数据
     */
    async function apiRequest(endpoint, data) {
        try {
            const response = await fetchWithJwt(
                `${window.config.API_BASE_URL}${endpoint}`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(data)
                }
            );
            return response;
        } catch (error) {
            return { status: "error", detail: error.message || "未知错误" };
        }
    }

    /**
     * 发送GET API请求
     * @param {string} endpoint - API端点
     * @param {Object} params - 查询参数
     * @param {boolean} useResumeApi - 是否使用简历API路径（默认false使用autofill路径）
     * @returns {Promise<Object>} 响应数据
     */
    async function apiRequestForGet(endpoint, params = {}, useResumeApi = false) {
        try {
            // 根据参数选择API基础路径
            const baseUrl = useResumeApi ? window.config.API_RESUME_URL : window.config.API_BASE_URL;

            // 将params转换为URL查询字符串
            let url = `${baseUrl}${endpoint}`;
            if (params && Object.keys(params).length > 0) {
                const queryString = new URLSearchParams(params).toString();
                url += `?${queryString}`;
            }
            const response = await fetchWithJwt(url, {
                method: "GET",
                headers: { "Content-Type": "application/json" }
            });

            return response;
        } catch (error) {
            console.error("[apiRequestForGet] 请求失败:", error);
            return { status: "error", detail: error.message || "未知错误" };
        }
    }

    /**
     * 带JWT的请求
     * @param {string} url - 请求URL
     * @param {Object} options - 请求选项
     */
    async function fetchWithJwt(url, options = {}) {
        try {
            const response = await chrome.runtime.sendMessage({
                type: "fetchWithJwt",
                url: url,
                options: options
            });
            if (response.error) {
                console.error("[fetchWithJwt] 请求返回错误:", response.error);

                // 只在刷新token失败时才清空Auth并引导登录
                const errorMsg = response.error.toLowerCase();
                const isRefreshTokenError = errorMsg.includes('刷新token失败');

                if (isRefreshTokenError) {
                    console.warn("[fetchWithJwt] Token刷新失败，清空Auth并引导重新登录");

                    // 清空Auth
                    try {
                        await chrome.storage.local.remove(["auth"]);
                    } catch (clearError) {
                        console.error("[fetchWithJwt] 清空Auth失败:", clearError);
                    }

                    // 提示用户并引导重新登录
                    alert("登录已失效，请重新登录");
                    window.open(window.config.LOGIN_URL, "_blank");
                }

                throw new Error(response.error);
            }

            return response;
        } catch (error) {
            console.error("[fetchWithJwt] 捕获到异常:", error);

            // 只在刷新token失败时才清空Auth并引导登录
            const errorMsg = error.message?.toLowerCase() || '';
            const isRefreshTokenError = errorMsg.includes('刷新token失败');

            if (isRefreshTokenError) {
                console.warn("[fetchWithJwt] Token刷新失败（异常），清空Auth并引导重新登录");

                // 清空Auth
                try {
                    await chrome.storage.local.remove(["auth"]);
                } catch (clearError) {
                    console.error("[fetchWithJwt] 清空Auth失败:", clearError);
                }

                // 提示用户并引导重新登录
                alert("登录已失效，请重新登录");
                window.open(window.config.LOGIN_URL, "_blank");
            }

            throw error;
        }
    }

    // ============================================================================
    // 评分弹窗
    // ============================================================================

    /**
     * 显示评分弹窗 - 步骤1
     * @param {Object} stats - 统计数据
     */
    async function showStep1Modal(stats) {
        // TODO: 实现评分弹窗逻辑
    }

    /**
     * 显示评分弹窗 - 步骤2（上传截图）
     */
    async function showStep2Modal() {
        // TODO: 实现上传截图逻辑
    }

    /**
     * 处理图片（转换为PNG格式）
     * @param {string} dataUrl - 图片DataURL
     */
    async function processImage(dataUrl) {
        // TODO: 实现图片处理逻辑
    }

    /**
     * 显示评分弹窗 - 步骤3（感谢）
     */
    async function showStep3Modal() {
        // TODO: 实现感谢弹窗逻辑
    }

    // ============================================================================
    // 版本检查
    // ============================================================================

    /**
     * 检查新版本
     */
    async function checkVersion() {
        // TODO: 实现版本检查逻辑
    }

    /**
     * 比较版本号
     * @param {string} v1 - 版本1
     * @param {string} v2 - 版本2
     * @returns {boolean} v1是否比v2新
     */
    function isNewerVersion(v1, v2) {
        const parts1 = v1.split(".").map(Number);
        const parts2 = v2.split(".").map(Number);

        for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
            const p1 = parts1[i] || 0;
            const p2 = parts2[i] || 0;

            if (p1 > p2) return true;
            if (p1 < p2) return false;
        }

        return false;
    }

    /**
     * 显示新版本通知
     */
    function showVersionNotification() {
        // TODO: 实现版本通知逻辑
    }

    // ============================================================================
    // 简历数据管理
    // ============================================================================

    let resumeList = []; // 简历列表
    let currentResumeIndex = 0; // 当前选中的简历索引
    let isResumeLocked = false; // 简历锁定状态（填充过程中锁定，防止切换）

    /**
     * 获取简历列表
     * @returns {Promise<Array>} 简历列表
     */
    async function getResumeList() {
        try {
            // todo 简历接口
            // 调用后端API获取简历列表
            const response = await apiRequestForGet("resume/list", {}, false);
            // 检查响应是否成功，并且有列表数据
            if (response && response.success && response.list && Array.isArray(response.list)) {
                const processedList = processResumeList(response.list);
                return processedList;
            }

            console.warn("[getResumeList] API响应格式不正确或无数据");
            return [];
        } catch (error) {
            console.error("[getResumeList] 获取简历列表失败:", error);
            console.error("[getResumeList] 错误详情:", error.message);
            return [];
        }
    }

    /**
     * 处理简历列表数据
     * @param {Array} list - 原始简历列表
     * @returns {Array} 处理后的简历列表
     */
    function processResumeList(list) {
        return list.map((resume, index) => {
            // 处理coreSkills - 从JSON字符串转换为逗号分隔的字符串
            let coreSkillsText = '';
            if (resume.coreSkills) {
                try {
                    const skillsArray = JSON.parse(resume.coreSkills);
                    if (Array.isArray(skillsArray)) {
                        coreSkillsText = skillsArray.join(', ');
                    }
                } catch (e) {
                    coreSkillsText = resume.coreSkills;
                }
            }

            // 处理毕业年份 - 只显示年份
            let graduationYearText = '';
            if (resume.graduationYear) {
                const year = resume.graduationYear.split('-')[0];
                graduationYearText = year;
            }

            // 如果没有resumeName，生成一个默认名称
            const resumeName = resume.resumeName || `简历 ${index + 1}`;

            return {
                id: resume.id,
                name: resume.name || '未命名',
                resumeName: resumeName,
                school: resume.school || '',
                educationDegreeText: resume.educationDegreeText || '',
                major: resume.major || '',
                graduationYear: graduationYearText,
                phone: resume.phone || '',
                email: resume.email || '',
                jobIntention: resume.jobIntention || '',
                expectedCity: resume.expectedCity || '',
                coreSkills: coreSkillsText
            };
        });
    }

    /**
     * 获取当前选中的简历
     * @returns {Object|null} 当前简历对象
     */
    function getCurrentResume() {
        if (resumeList.length === 0) return null;
        return resumeList[currentResumeIndex] || null;
    }

    /**
     * 切换到下一个简历
     */
    async function switchToNextResume() {
        if (resumeList.length === 0) return;

        // 检查简历是否被锁定
        if (isResumeLocked) {
            console.warn("[switchToNextResume] 简历已锁定，无法切换");
            alert("填充正在进行中，无法切换简历！\n请等待填充完成或取消填充后再切换。");
            return;
        }

        // 确认是否切换
        if (!confirm("确定要切换到下一份简历吗？\n切换后将刷新当前页面。")) {
            return;
        }

        // 计算下一个索引
        const nextIndex = (currentResumeIndex + 1) % resumeList.length;

        // 存储切换后的索引和当前列表长度到 storage
        try {
            await chrome.storage.local.set({
                currentResumeIndex: nextIndex,
                lastResumeListLength: resumeList.length  // 保存当前列表长度
            });

            // 刷新当前页面
            window.location.reload();
        } catch (error) {
            console.error("[switchToNextResume] 切换失败:", error);
        }
    }

    /**
     * 切换到上一个简历
     */
    async function switchToPrevResume() {
        if (resumeList.length === 0) return;

        // 检查简历是否被锁定
        if (isResumeLocked) {
            console.warn("[switchToPrevResume] 简历已锁定，无法切换");
            alert("填充正在进行中，无法切换简历！\n请等待填充完成或取消填充后再切换。");
            return;
        }

        // 确认是否切换
        if (!confirm("确定要切换到上一份简历吗？\n切换后将刷新当前页面。")) {
            return;
        }

        // 计算上一个索引
        const prevIndex = (currentResumeIndex - 1 + resumeList.length) % resumeList.length;

        // 存储切换后的索引和当前列表长度到 storage
        try {
            await chrome.storage.local.set({
                currentResumeIndex: prevIndex,
                lastResumeListLength: resumeList.length  // 保存当前列表长度
            });

            // 刷新当前页面
            window.location.reload();
        } catch (error) {
            console.error("[switchToPrevResume] 切换失败:", error);
        }
    }

    /**
     * 渲染简历数据到UI
     */
    function renderResumeData() {
        if (!resumeWindowContainer) {
            console.warn("[renderResumeData] 容器未初始化");
            return;
        }

        const resume = getCurrentResume();
        if (!resume) {
            console.warn("[renderResumeData] 没有可用的简历数据");
            return;
        }
        // 更新姓名 (resume-name)
        const resumeNameEl = resumeWindowContainer.querySelector('.resume-name');
        if (resumeNameEl) {
            resumeNameEl.textContent = resume.name || '未命名';
        }

        // 更新简历名称 (resume-type)
        const resumeType = resumeWindowContainer.querySelector('.resume-type');
        if (resumeType) {
            resumeType.textContent = resume.resumeName || '未命名简历';
        }

        // 更新简历字段映射（根据真实API数据）
        const fieldMapping = {
            '学校': 'school',
            '学历': 'educationDegreeText',
            '专业': 'major',
            '毕业年份': 'graduationYear',
            '手机': 'phone',
            '邮箱': 'email',
            '意向岗位': 'jobIntention',
            '期望城市': 'expectedCity',
            '核心技能': 'coreSkills'
        };

        // 遍历所有info-cell
        const infoCells = resumeWindowContainer.querySelectorAll('.info-cell');
        infoCells.forEach(cell => {
            const label = cell.querySelector('.info-cell-label');
            const value = cell.querySelector('.info-cell-value');

            if (label && value) {
                const labelText = label.textContent.trim();
                const fieldKey = fieldMapping[labelText];

                if (fieldKey && resume[fieldKey]) {
                    value.textContent = resume[fieldKey];
                } else if (fieldKey && !resume[fieldKey]) {
                    // 如果字段为空，显示默认提示
                    value.textContent = '-';
                }
            }
        });

        // 更新下一个简历的预览
        updateNextResumePreview();

        // 通知content.js更新当前简历ID
        if (typeof window.updateCurrentResumeId === 'function') {
            window.updateCurrentResumeId(resume.id);
        }

        // 更新全局resumeData对象，绑定选中的简历数据
        const companyName = getCurrentCompanyName();
        resumeData = {
            status: "ok",
            detail: resume.id,
            resumeId: resume.id,
            company: companyName || '',
            position: resume.jobIntention || '',
            name: resume.name || '',
            resumeName: resume.resumeName || '',
            school: resume.school || '',
            educationDegreeText: resume.educationDegreeText || '',
            major: resume.major || '',
            graduationYear: resume.graduationYear || '',
            phone: resume.phone || '',
            email: resume.email || '',
            jobIntention: resume.jobIntention || '',
            expectedCity: resume.expectedCity || '',
            coreSkills: resume.coreSkills || ''
        };
    }

    /**
     * 更新下一个简历的预览
     */
    function updateNextResumePreview() {
        if (!resumeWindowContainer) return;

        // 更新切换提示文字（始终更新）
        const tooltip = resumeWindowContainer.querySelector('.switch-tooltip');
        if (tooltip) {
            tooltip.textContent = `切换下一份简历`;
        }

        // 只有多个简历时才更新预览内容
        if (resumeList.length <= 1) return;

        const nextIndex = (currentResumeIndex + 1) % resumeList.length;
        const nextResume = resumeList[nextIndex];

        const nextPage = resumeWindowContainer.querySelector('.resume-page-next');
        if (nextPage && nextResume) {
            // 更新提示文字
            const nextTitle = nextPage.querySelector('div[style*="text-align:right"]');
            if (nextTitle) {
                nextTitle.textContent = nextResume.resumeName || '简历 B';
            }
        }
    }

    /**
     * 加载用户信息（昵称和头像）
     */
    function loadUserInfo() {
        chrome.storage.local.get(['auth'], function(result) {
            if (result.auth && result.auth.userInfo) {
                const userInfo = result.auth.userInfo;
                const nickname = userInfo.nickname || '未设置昵称';
                const avatar = userInfo.avatar || 'logo-small.png';
                // 更新个人信息头像下方的昵称
                const userNickname = resumeWindowContainer.querySelector('#user-nickname');
                if (userNickname) {
                    userNickname.textContent = nickname;
                } else {
                    console.warn('⚠ 未找到 #user-nickname 元素');
                }

                // 更新简历卡片中的昵称
                const resumeNickname = resumeWindowContainer.querySelector('#resume-nickname');
                if (resumeNickname) {
                    resumeNickname.textContent = nickname;
                } else {
                    console.warn('⚠ 未找到 #resume-nickname 元素');
                }

                // 更新头像
                const userAvatar = resumeWindowContainer.querySelector('#user-avatar');
                if (userAvatar) {
                    userAvatar.src = avatar;
                    userAvatar.style.display = 'block';
                } else {
                    console.warn('⚠ 未找到 #user-avatar 元素');
                }
            } else {
                console.warn('⚠ 未找到用户信息，使用默认值');
            }
        });
    }

    /**
     * 从 API 加载简历数据（仅在 fill.html 页面调用）
     * 此函数会调用接口并将数据存储到 chrome.storage.local
     */
    async function loadResumeDataFromAPI() {
        try {

            // 获取简历列表（调用接口）
            resumeList = await getResumeList();

            if (resumeList.length === 0) {
                console.warn("[loadResumeDataFromAPI] API 返回空数据");
                // 在简历卡片区域显示提示信息
                showNoResumeMessage();

                // 即使没有数据，也要清空 storage 中的缓存
                try {
                    await chrome.storage.local.set({
                        resumeList: [],
                        resumeListUpdateTime: Date.now()
                    });
                } catch (storageError) {
                    console.error("[loadResumeDataFromAPI] 清空 storage 缓存失败:", storageError);
                }
                return;
            }

            // 存储简历列表到 chrome.storage.local（供其他页面使用）
            try {
                await chrome.storage.local.set({
                    resumeList: resumeList,
                    resumeListUpdateTime: Date.now()
                });
            } catch (storageError) {
                console.error("[loadResumeDataFromAPI] 存储简历列表到 storage 失败:", storageError);
            }

            // 恢复或重置索引，并根据列表长度变化智能调整
            try {
                const { currentResumeIndex: savedIndex, lastResumeListLength } = await chrome.storage.local.get(['currentResumeIndex', 'lastResumeListLength']);

                if (savedIndex !== undefined && savedIndex >= 0) {
                    const newLength = resumeList.length;
                    const oldLength = lastResumeListLength || newLength;  // 如果没有保存的长度，使用当前长度

                    let adjustedIndex = savedIndex;

                    // 根据列表长度变化调整索引
                    if (newLength > oldLength) {
                        // 列表增加了，索引+1（显示新增的简历，但不能超过最大索引）
                        adjustedIndex = Math.min(savedIndex + 1, newLength - 1);
                    } else if (newLength < oldLength) {
                        // 列表减少了，索引-1（避免越界，但不能小于0）
                        adjustedIndex = Math.max(savedIndex - 1, 0);
                    } else {
                        // 列表长度未变，保持索引不变（但要确保不越界）
                        adjustedIndex = Math.min(savedIndex, newLength - 1);
                    }

                    currentResumeIndex = adjustedIndex;
                } else {
                    currentResumeIndex = 0;
                }
            } catch (error) {
                console.error("[loadResumeDataFromAPI] 读取保存的索引失败:", error);
                currentResumeIndex = 0;
            }

            // 渲染简历数据
            renderResumeData();

            // 绑定简历切换事件
            bindResumeSwitchEvents();

        } catch (error) {
            console.error("[loadResumeDataFromAPI] 加载简历数据失败:", error);
        }
    }

    /**
     * 从 storage 加载简历数据（在非 fill.html 页面调用）
     * 此函数不调用接口，只从 chrome.storage.local 读取数据
     */
    async function loadResumeDataFromStorage() {
        try {

            // 从 chrome.storage.local 读取简历列表
            const { resumeList: cachedList, resumeListUpdateTime } = await chrome.storage.local.get(['resumeList', 'resumeListUpdateTime']);

            if (!cachedList || !Array.isArray(cachedList) || cachedList.length === 0) {
                console.warn("[loadResumeDataFromStorage] storage 中没有简历数据");
                console.info("[loadResumeDataFromStorage] 提示：请先访问智能填充页面以加载简历数据");
                showNoResumeMessage();
                resumeList = [];
                return;
            }

            // 使用缓存的数据
            resumeList = cachedList;

            // 恢复或重置索引，并根据列表长度变化智能调整
            try {
                const { currentResumeIndex: savedIndex, lastResumeListLength } = await chrome.storage.local.get(['currentResumeIndex', 'lastResumeListLength']);

                if (savedIndex !== undefined && savedIndex >= 0) {
                    const newLength = resumeList.length;
                    const oldLength = lastResumeListLength || newLength;  // 如果没有保存的长度，使用当前长度

                    let adjustedIndex = savedIndex;

                    // 根据列表长度变化调整索引
                    if (newLength > oldLength) {
                        // 列表增加了，索引+1（显示新增的简历，但不能超过最大索引）
                        adjustedIndex = Math.min(savedIndex + 1, newLength - 1);
                    } else if (newLength < oldLength) {
                        // 列表减少了，索引-1（避免越界，但不能小于0）
                        adjustedIndex = Math.max(savedIndex - 1, 0);
                    } else {
                        // 列表长度未变，保持索引不变（但要确保不越界）
                        adjustedIndex = Math.min(savedIndex, newLength - 1);
                    }

                    currentResumeIndex = adjustedIndex;
                } else {
                    currentResumeIndex = 0;
                }
            } catch (error) {
                console.error("[loadResumeDataFromStorage] 读取保存的索引失败:", error);
                currentResumeIndex = 0;
            }

            // 渲染简历数据
            renderResumeData();

            // 绑定简历切换事件
            bindResumeSwitchEvents();

        } catch (error) {
            console.error("[loadResumeDataFromStorage] 从 storage 加载简历数据失败:", error);
        }
    }

    /**
     * 初始化简历数据（兼容旧代码的包装函数）
     * 根据当前页面决定是从 API 还是从 storage 加载
     * @param {boolean} forceRefresh - 是否强制刷新（调用接口）。默认false
     */
    async function initResumeData(forceRefresh = false) {
        // 判断当前是否在 fill.html 页面
        const isFillPage = currentPage === 'fill.html';

        if (isFillPage) {
            if (forceRefresh) {
                // 强制刷新：调用接口并更新 storage
                await loadResumeDataFromAPI();
            } else {
                // 非强制刷新：先检查 storage 中是否有数据
                const { resumeList: cachedList } = await chrome.storage.local.get(['resumeList']);

                if (cachedList && Array.isArray(cachedList) && cachedList.length > 0) {
                    // storage 中有数据，直接使用
                    await loadResumeDataFromStorage();
                } else {
                    // storage 中没有数据，调用接口
                    await loadResumeDataFromAPI();
                }
            }
        } else {
            // 其他页面：从 storage 读取
            await loadResumeDataFromStorage();
        }
    }

    /**
     * 显示无简历数据提示信息
     */
    function showNoResumeMessage() {
        if (!resumeWindowContainer) return;

        const resumeNameElement = resumeWindowContainer.querySelector('.resume-name');
        const resumeTypeElement = resumeWindowContainer.querySelector('.resume-type');

        if (resumeNameElement) {
            resumeNameElement.textContent = '暂无简历';
        }
        if (resumeTypeElement) {
            resumeTypeElement.textContent = '请先上传简历';
            resumeTypeElement.style.color = '#ff9a9e';
        }

        // 清空所有信息单元格
        const infoCells = resumeWindowContainer.querySelectorAll('.info-cell-value');
        infoCells.forEach(cell => {
            cell.textContent = '-';
        });
    }

    /**
     * 绑定简历切换事件
     */
    function bindResumeSwitchEvents() {
        if (!resumeWindowContainer) return;

        // 绑定"往前切换"按钮
        const prevBtn = resumeWindowContainer.querySelector('.resume-switch-prev');
        if (prevBtn) {
            // 移除旧的事件监听器
            const newPrevBtn = prevBtn.cloneNode(true);
            prevBtn.parentNode.replaceChild(newPrevBtn, prevBtn);

            // 绑定点击事件
            newPrevBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                if (resumeList.length > 1) {
                    switchToPrevResume();
                }
            });
        }

        // 绑定"往后切换"按钮
        const nextBtn = resumeWindowContainer.querySelector('.resume-switch-next');
        if (nextBtn) {
            // 移除旧的事件监听器
            const newNextBtn = nextBtn.cloneNode(true);
            nextBtn.parentNode.replaceChild(newNextBtn, nextBtn);

            // 绑定点击事件
            newNextBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                if (resumeList.length > 1) {
                    switchToNextResume();
                }
            });
        }
    }

    // ============================================================================
    // 投递记录管理
    // ============================================================================

    /**
     * 保存投递记录
     * @param {string} company - 公司名称
     * @param {string} position - 岗位名称
     */
    async function saveApplicationRecord(company, position) {
        try {
            const record = {
                position: position,
                company: company,
                time: formatDateTime(new Date()),
                url: window.location.href
            };
            // 从本地存储读取现有记录
            const { applicationRecords = [] } = await chrome.storage.local.get(['applicationRecords']);

            // 添加新记录到数组开头（最新的在前面）
            applicationRecords.unshift(record);

            // 限制最多保存100条记录
            if (applicationRecords.length > 100) {
                applicationRecords.pop();
            }

            // 保存到本地存储
            await chrome.storage.local.set({ applicationRecords });
        } catch (error) {
            console.error("[saveApplicationRecord] 保存投递记录失败:", error);
        }
    }

    /**
     * 获取投递记录列表
     * @returns {Promise<Array>} 投递记录数组
     */
    async function getApplicationRecords() {
        try {
            const { applicationRecords = [] } = await chrome.storage.local.get(['applicationRecords']);
            return applicationRecords;
        } catch (error) {
            console.error("[getApplicationRecords] 读取投递记录失败:", error);
            return [];
        }
    }

    /**
     * 格式化日期时间为 yyyy-MM-dd HH:mm:ss
     * @param {Date} date - 日期对象
     * @returns {string} 格式化后的日期时间字符串
     */
    function formatDateTime(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');

        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }

    /**
     * 格式化显示时间（简化版）
     * @param {string} dateTimeStr - 完整时间字符串 yyyy-MM-dd HH:mm:ss
     * @returns {string} 简化的时间字符串 yyyy/MM/dd HH:mm
     */
    function formatDisplayTime(dateTimeStr) {
        if (!dateTimeStr) return '';

        try {
            // yyyy-MM-dd HH:mm:ss -> yyyy/MM/dd HH:mm
            const parts = dateTimeStr.split(' ');
            const datePart = parts[0].replace(/-/g, '/');
            const timePart = parts[1].substring(0, 5); // 只取 HH:mm
            return `${datePart} ${timePart}`;
        } catch (error) {
            return dateTimeStr;
        }
    }

    /**
     * 加载并渲染投递记录列表
     */
    async function loadApplicationRecords() {
        if (!resumeWindowContainer) return;

        const container = resumeWindowContainer.querySelector(".plugin-content");
        if (!container) {
            console.error("[loadApplicationRecords] 未找到容器");
            return;
        }

        try {
            // 获取投递记录
            const records = await getApplicationRecords();

            // 清空容器
            container.innerHTML = '';

            if (records.length === 0) {
                // 显示空状态
                container.innerHTML = `
                    <div style="text-align: center; padding: 60px 20px; color: #999;">
                        <i class="fas fa-inbox" style="font-size: 48px; margin-bottom: 16px; color: #ddd;"></i>
                        <div style="font-size: 14px;">暂无投递记录</div>
                        <div style="font-size: 12px; margin-top: 8px;">完成填充后将自动记录</div>
                    </div>
                `;
                return;
            }

            // 渲染记录列表
            records.forEach((record, index) => {
                const jobItem = document.createElement('div');
                jobItem.className = 'job-item';
                jobItem.innerHTML = `
                    <div style="display:flex;align-items:center;">
                        <div class="status-dot ${index === 0 ? '' : 'inactive'}"></div>
                        <div>
                            <div style="font-weight:600;font-size:13px;">${record.position} - ${record.company}</div>
                            <div style="font-size:10px;color:#999;">${formatDisplayTime(record.time)}</div>
                        </div>
                    </div>
                    <button class="view-btn" data-url="${record.url}">查看</button>
                `;

                container.appendChild(jobItem);
            });

            // 绑定查看按钮事件
            const viewBtns = container.querySelectorAll(".view-btn");
            viewBtns.forEach((btn) => {
                btn.addEventListener("click", (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const url = btn.getAttribute('data-url');
                    if (url) {
                        window.open(url, '_blank');
                    }
                });
            });
        } catch (error) {
            console.error("[loadApplicationRecords] 加载投递记录失败:", error);
            container.innerHTML = `
                <div style="text-align: center; padding: 60px 20px; color: #f44336;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 16px;"></i>
                    <div style="font-size: 14px;">加载失败</div>
                    <div style="font-size: 12px; margin-top: 8px;">请刷新页面重试</div>
                </div>
            `;
        }
    }

    // ============================================================================
    // 消息监听
    // ============================================================================

    /**
     * 监听来自popup的消息
     */
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === "toggleArcButtonMode") {
            setButtonMode(message.state);
            sendResponse({ success: true });
            return true;
        }

        if (message.action === "toggleHighlight") {
            const enabled = message.state;
            document.documentElement.style.setProperty(
                "--highlight-enabled",
                enabled ? "1" : "0"
            );
            sendResponse({ success: true });
            return true;
        }

        if (message.action === "toggleBeautifyResume") {
            // TODO: 根据fill.html实现美化简历切换
            sendResponse({ success: true });
            return true;
        }
    });

    // ============================================================================
    // 工具函数
    // ============================================================================

    /**
     * 延迟函数
     * @param {number} ms - 毫秒数
     */
    function delay(ms = 1000) {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve();
            }, ms);
        });
    }

    /**
     * 锁定任务背景输入框
     */
    function lockTaskInput() {
        const taskInput = resumeWindowContainer?.querySelector('.task-input');
        if (taskInput) {
            taskInput.disabled = true;
            taskInput.style.opacity = '0.6';
            taskInput.style.cursor = 'not-allowed';
        } else {
            console.warn("[lockTaskInput] 未找到任务背景输入框");
        }
    }

    /**
     * 解锁任务背景输入框
     */
    function unlockTaskInput() {
        const taskInput = resumeWindowContainer?.querySelector('.task-input');
        if (taskInput) {
            taskInput.disabled = false;
            taskInput.style.opacity = '1';
            taskInput.style.cursor = 'text';
        } else {
            console.warn("[unlockTaskInput] 未找到任务背景输入框");
        }
    }

    /**
     * 防抖函数
     * @param {Function} func - 要执行的函数
     * @param {number} wait - 等待时间
     */
    function debounce(func, wait) {
        let timeout;
        return function (...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * 获取当前网站的公司名称
     * 从页面URL、页面标题或DOM元素中提取公司名称
     * 支持主流招聘网站：Boss直聘、前程无忧、智联招聘、拉勾网、猎聘等
     *
     * 降级策略：如果无法从页面提取公司名称，则使用当前网站域名作为公司名称
     *
     * @returns {string} 公司名称，优先返回提取的名称，其次返回域名（去除www和端口号）
     */
    function getCurrentCompanyName() {
        try {
            const url = window.location.href;
            const hostname = window.location.hostname;
            let companyName = '';

            // ========================================
            // 针对不同招聘网站使用特定的提取策略
            // ========================================

            // Boss直聘 (www.zhipin.com)
            if (hostname.includes('zhipin.com')) {
                const selectors = [
                    '.company-name a',
                    '.sider-company .company-name',
                    '.job-company-name',
                    'h3.name',
                    'a[ka="job-detail-company"]',
                    '.info-company h3.name'
                ];
                companyName = trySelectorsInOrder(selectors);
            }

            // 前程无忧/51job (www.51job.com)
            else if (hostname.includes('51job.com')) {
                const selectors = [
                    '.cname a',
                    '.tCompany a',
                    '.companyName',
                    'p.cname a',
                    '.cn a'
                ];
                companyName = trySelectorsInOrder(selectors);
            }

            // 智联招聘 (www.zhaopin.com)
            else if (hostname.includes('zhaopin.com')) {
                const selectors = [
                    '.company__title',
                    'a.company-text',
                    '.companyInfo h3 a',
                    '.company-info__name',
                    'h3.company a'
                ];
                companyName = trySelectorsInOrder(selectors);
            }

            // 拉勾网 (www.lagou.com)
            else if (hostname.includes('lagou.com')) {
                const selectors = [
                    '.job-name .company',
                    '.company-name a',
                    'em.b2',
                    '#job_company .c_feature_name',
                    '.position-head .company a'
                ];
                companyName = trySelectorsInOrder(selectors);
            }

            // 猎聘 (www.liepin.com)
            else if (hostname.includes('liepin.com')) {
                const selectors = [
                    '.company-name a',
                    '.job-info .company-name',
                    '.company-logo a',
                    'p.company-name a',
                    '.job-apply-content .name'
                ];
                companyName = trySelectorsInOrder(selectors);
            }

            // 脉脉 (maimai.cn)
            else if (hostname.includes('maimai.cn')) {
                const selectors = [
                    '.company-name',
                    '.company-info-name',
                    '.job-cpy-name'
                ];
                companyName = trySelectorsInOrder(selectors);
            }

            // ========================================
            // 通用提取策略（适用于其他招聘网站）
            // ========================================
            else {
                const generalSelectors = [
                    '.company-name',
                    '.company',
                    '.job-company',
                    '.employer-name',
                    '[class*="company-name"]',
                    '[class*="companyName"]',
                    '[class*="company_name"]',
                    '[data-company]',
                    'h1.company',
                    'h2.company',
                    'h3.company',
                    '.job-company-name'
                ];
                companyName = trySelectorsInOrder(generalSelectors);

                // 尝试从页面标题提取
                if (!companyName) {
                    const title = document.title;
                    // 常见格式: "职位名称-公司名称-招聘网站"
                    const titleParts = title.split(/[-_|]/);
                    if (titleParts.length >= 2) {
                        companyName = titleParts[1].trim();
                    }
                }

                // 尝试从URL参数提取
                if (!companyName) {
                    const urlParams = new URLSearchParams(window.location.search);
                    const companyParam = urlParams.get('company') ||
                                       urlParams.get('companyName') ||
                                       urlParams.get('employer') ||
                                       urlParams.get('co');
                    if (companyParam) {
                        companyName = decodeURIComponent(companyParam);
                    }
                }
            }

            // ========================================
            // 清理和验证公司名称
            // ========================================
            if (companyName) {
                // 清理公司名称：去除多余空格、换行符等
                companyName = companyName
                    .replace(/\s+/g, ' ')  // 多个空格替换为单个空格
                    .replace(/[\r\n\t]/g, '') // 去除换行和制表符
                    .trim();

                // 验证公司名称是否有效（长度合理，不是纯数字或特殊字符）
                if (companyName.length > 0 && companyName.length <= 100 && !/^[\d\s\-_]+$/.test(companyName)) {
                    return companyName;
                }
            }

            // ========================================
            // 降级策略：使用当前网站域名
            // ========================================
            console.warn("[getCurrentCompanyName] ⚠ 无法获取有效的公司名称，使用域名作为降级方案");

            // 清理域名：去除 www. 前缀和端口号
            let fallbackName = hostname
                .replace(/^www\./i, '')  // 去除 www. 前缀
                .replace(/:\d+$/, '')    // 去除端口号
                .trim();
            return fallbackName;

        } catch (error) {
            console.error("[getCurrentCompanyName] ✗ 获取公司名称时出错:", error);

            // 即使出错也尝试返回域名
            try {
                const fallbackName = window.location.hostname
                    .replace(/^www\./i, '')
                    .replace(/:\d+$/, '')
                    .trim();
                return fallbackName;
            } catch (err) {
                console.error("[getCurrentCompanyName] ✗ 无法获取域名:", err);
                return '';
            }
        }
    }

    /**
     * 按顺序尝试多个选择器，返回第一个有效的文本内容
     * @param {string[]} selectors - 选择器数组
     * @returns {string} 提取到的文本，如果都失败则返回空字符串
     */
    function trySelectorsInOrder(selectors) {
        for (const selector of selectors) {
            try {
                const element = document.querySelector(selector);
                if (element) {
                    const text = element.textContent || element.innerText;
                    if (text && text.trim()) {
                        const cleanText = text.trim();
                        return cleanText;
                    }
                }
            } catch (err) {
                console.warn(`[trySelectorsInOrder] 选择器 "${selector}" 出错:`, err.message);
            }
        }
        return '';
    }

    // ============================================================================
    // 全局API暴露
    // ============================================================================

    /**
     * 设置状态文字
     */
    window.setStateText = setStateText;

    /**
     * 检查是否正在运行
     */
    window.isRunning = function () {
        return fillState === "running";
    };

    /**
     * 获取投递记录
     */
    window.getApplicationRecords = getApplicationRecords;

    /**
     * 格式化显示时间
     */
    window.formatDisplayTime = formatDisplayTime;

    /**
     * 获取当前网站的公司名称（暴露到全局以便调试）
     */
    window.getCurrentCompanyName = getCurrentCompanyName;

    /**
     * 绑定美化后的简历
     */
    window.bindBeautifyResume = function (data) {
        // TODO: 实现美化简历绑定逻辑
    };

    /**
     * 停止打字机效果
     */
    window.stopTypeResumeContent = function (content) {
        // TODO: 实现停止打字机效果逻辑
    };

    /**
     * 公司和职位输入框呼吸效果
     */
    window.breatheJobInfo = async function () {
        // TODO: 实现呼吸效果逻辑
    };

    /**
     * 简历编辑器呼吸效果
     */
    window.breatheResume = async function (action) {
        // TODO: 实现简历编辑器呼吸效果逻辑
    };

    /**
     * 改变开始按钮状态
     */
    window.changeStartButtonState = changeState;

    /**
     * 关闭高亮
     */
    window.closeHighlight = async function () {
        await delay(1000);

        // 清除所有高亮样式
        try {
            const highlightedElements = document.querySelectorAll('[class*="ark-color-"]');
            for (const el of highlightedElements) {
                // 移除所有 ark-color-* 类
                const classes = Array.from(el.classList);
                classes.forEach(className => {
                    if (className.startsWith('ark-color-')) {
                        el.classList.remove(className);
                    }
                });
            }

            // 移除高亮启用标志
            document.documentElement.classList.remove('ark-highlight-enabled');

            // 同时也设置 CSS 变量为 0（向后兼容）
            document.documentElement.style.setProperty("--highlight-enabled", "0");
        } catch (error) {
            console.error("[closeHighlight] 清除高亮失败:", error);
        }
    };

    /**
     * 显示评分弹窗
     */
    window.showStarRatingModal = async function (stats) {
        // TODO: 实现显示评分弹窗逻辑
    };

    /**
     * 校招来源（由content.js设置）
     */
    window.campusSource = null;

    /**
     * 测试评分弹窗
     */
    window.testStarRatingModal = async function (options = {}) {
        // TODO: 实现测试评分弹窗逻辑
    };

    // ============================================================================
    // 主入口
    // ============================================================================

    (async () => {
        // 配置已在 configContent.js 中加载到 window.config
        // 检查配置是否存在
        if (!window.config) {
            console.error("resumeInterfaceTwo.js: 配置未加载，window.config 不存在");
            return;
        }
        /**
         * 检查是否为官网URL
         */
        function isOfficialWebsite() {
            const currentUrl = new URL(window.location.href);
            return window.config.ALL_WEB_URLS.some((url) => currentUrl.href.startsWith(url));
        }

        // 如果是官网，不显示填充UI
        if (isOfficialWebsite()) {
            // 监听校招页面的点击事件
            setupCampusClickHandler();
            // 监听历史记录消息
            setupHistoryMessageHandler();
            return;
        }

        /**
         * 设置校招点击处理
         */
        function setupCampusClickHandler() {
            const currentUrl = new URL(window.location.href);
            if (window.config.CAMPUS_URL && currentUrl.href.startsWith(window.config.CAMPUS_URL)) {
                document.addEventListener("click", (event) => {
                    const link = event.target.closest("a");
                    if (link?.dataset.campusId && link?.dataset.company) {
                        chrome.runtime.sendMessage({
                            type: "clickSource",
                            source: {
                                campusId: link.dataset.campusId,
                                company: link.dataset.company
                            }
                        }, (response) => { });
                    }
                }, true);
            }
        }

        /**
         * 设置历史记录消息处理
         */
        function setupHistoryMessageHandler() {
            const currentUrl = new URL(window.location.href);
            if (window.config.CAMPUS_URL && currentUrl.href.startsWith(window.config.CAMPUS_URL)) {
                chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
                    if (message.type === "addHistoryCampusId") {
                        window.postMessage({
                            type: "addHistoryCampusId",
                            data: message.data
                        }, "*");
                    }
                });
            }
        }

        // 等待页面加载或检测到简历相关内容
        await new Promise((resolve) => {
            // 白名单URL，直接显示
            const whitelistUrls = [
                "https://xyz.51job.com/External/MyResume/FillInResume.aspx",
                "https://xiaoyuan.zhaopin.com/scrd/resume2"
            ];

            const currentUrl = new URL(window.location.href);
            for (const url of whitelistUrls) {
                if (currentUrl.href.startsWith(url)) {
                    resolve(true);
                    return;
                }
            }

            // 检测页面内容
            const checkContent = async () => {
                const { arcButtonMode = "auto" } = await chrome.storage.local.get(["arcButtonMode"]);

                // 强制显示模式
                if (arcButtonMode === "show") {
                    clearInterval(checkInterval);
                    resolve(true);
                    return;
                }

                // 检测简历相关关键词
                const bodyText = document.body.innerText;
                const hasResumeKeyword = /(?:^|[^\u4e00-\u9fa5])(简历|姓名)|(简历|姓名)(?:[^\u4e00-\u9fa5]|$)/.test(bodyText);

                if (hasResumeKeyword) {
                    clearInterval(checkInterval);
                    resolve(true);
                }
            };

            const checkInterval = setInterval(checkContent, 2000);
            checkContent();
        });

        // 获取校招来源
        chrome.runtime.sendMessage({ type: "getSource" }, (response) => {
            if (response?.source) {
                window.campusSource = response.source;
            }
        });

        // 初始化UI
        await init();

        // 非Edge浏览器检查版本更新
        if (!navigator.userAgent.includes("Edg/")) {
            setTimeout(() => {
                checkVersion();
            }, 3000);
        }
    })();
})();
