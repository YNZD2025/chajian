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
    let simpleMDE = null;           // a - SimpleMDE编辑器实例

    // ============================================================================
    // 初始化函数
    // ============================================================================

    /**
     * 主初始化函数
     * 创建UI元素、加载样式、绑定事件
     */
    async function init() {
        try {
            console.log("init====>", init);
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

            console.log("UI初始化完成");
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

            // 附加Shadow DOM
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
        console.log("开始创建简历窗口...");
        const container = document.createElement("div");
        container.id = "resume-window-container";

        try {
            // 加载HTML模板 - 改为引用 fill.html
            const url = chrome.runtime.getURL("popup/fill.html");
            console.log(`正在加载HTML: ${url}`);
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`HTTP错误: ${response.status}`);
            }

            const html = await response.text();
            console.log(`✓ HTML加载成功 (${html.length} 字符)`);

            // 将HTML解析为DOM，移除head中的样式链接（我们已在loadStyles中处理）
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, "text/html");

            // 移除head中的link标签（避免重复加载）
            const links = doc.querySelectorAll("head link");
            console.log(`移除 ${links.length} 个<link>标签`);
            links.forEach(link => link.remove());

            // ⚠️ 关键修复：在注入前移除所有可能导致页面跳转的属性和事件
            console.log("清理HTML中的内联事件和危险属性...");

            // 1. 先移除所有script标签
            const scripts = doc.body.querySelectorAll('script');
            scripts.forEach(script => script.remove());
            console.log(`✓ 已移除 ${scripts.length} 个<script>标签`);

            // 2. 清理所有元素的内联事件
            const allElements = doc.body.querySelectorAll('*');
            let removedCount = 0;
            allElements.forEach(el => {
                // 移除所有on*事件属性
                Array.from(el.attributes).forEach(attr => {
                    if (attr.name.startsWith('on')) {
                        console.log(`  移除 ${el.tagName}.${attr.name} = "${attr.value}"`);
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
            console.log(`✓ 已移除 ${removedCount} 个内联事件属性`);

            // 只取body内容
            container.innerHTML = doc.body.innerHTML;
            console.log("✓ HTML内容已注入到容器");
        } catch (error) {
            console.error("✗ 加载简历窗口失败:", error);
            return null;
        }

        shadowRoot.appendChild(container);
        console.log("✓ 容器已添加到Shadow DOM");

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
        console.log("✓ 全局导航拦截器已启用");

        const window = container.querySelector(".plugin-container");
        if (!window) {
            console.error("✗ 未找到 .plugin-container 元素");
            return null;
        }
        console.log("✓ 找到.plugin-container元素");

        // 调试：检查导航栏按钮
        const navItems = container.querySelectorAll(".nav-item");
        console.log(`导航栏按钮数量: ${navItems.length}`);

        if (navItems.length === 0) {
            console.error("✗ 警告：没有找到任何导航按钮！");
            console.log("容器HTML:", container.innerHTML.substring(0, 500));
        }

        navItems.forEach((item, index) => {
            const label = item.querySelector(".nav-label");
            const icon = item.querySelector(".nav-icon-box i");
            // 优先读取data-href（如果已经处理过），否则读取原始href
            const originalHref = item.getAttribute('data-href') || item.getAttribute('href');
            console.log(`按钮 ${index + 1}: ${label ? label.textContent : '无标签'}, 图标: ${icon ? icon.className : '无图标'}, href: ${originalHref}`);

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
                    console.log(`点击了导航按钮: ${label ? label.textContent : '无标签'}, 切换到: ${targetPage}`);
                    navigateToPage(targetPage);
                });
            }
        });

        // 验证sidebar是否存在
        const sidebar = container.querySelector(".sidebar");
        if (sidebar) {
            console.log("✓ 找到.sidebar元素");
            console.log(`  sidebar子元素数量: ${sidebar.children.length}`);
        } else {
            console.error("✗ 未找到.sidebar元素");
        }

        return window;
    }

    /**
     * 页面导航函数 - 在Shadow DOM内切换页面
     * @param {string} pageHtml - 页面HTML文件名（如 fill.html, profile.html）
     */
    async function navigateToPage(pageHtml) {
        console.log(`开始导航到页面: ${pageHtml}`);

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
            console.log(`正在加载页面: ${url}`);

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
            console.log(`✓ 页面加载成功 (${html.length} 字符)`);

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
            console.log("清理页面HTML中的内联事件和危险属性...");

            // 1. 先移除所有script标签
            const scripts = doc.body.querySelectorAll('script');
            scripts.forEach(script => script.remove());
            console.log(`✓ 已移除 ${scripts.length} 个<script>标签`);

            // 2. 清理所有元素的内联事件
            const allElements = doc.body.querySelectorAll('*');
            let removedCount = 0;
            allElements.forEach(el => {
                // 移除所有on*事件属性
                Array.from(el.attributes).forEach(attr => {
                    if (attr.name.startsWith('on')) {
                        console.log(`  移除 ${el.tagName}.${attr.name} = "${attr.value}"`);
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
            console.log(`✓ 已移除 ${removedCount} 个内联事件属性`);

            // 获取清理后的body内容
            const bodyContent = doc.body.innerHTML;

            // 清空当前容器并注入新内容
            resumeWindowContainer.innerHTML = bodyContent;

            // 如果有内联样式，注入到Shadow DOM
            if (styleContents) {
                const pageStyle = document.createElement("style");
                pageStyle.textContent = styleContents;
                shadowRoot.appendChild(pageStyle);
                console.log("✓ 页面内联样式已注入");
            }

            console.log("✓ 页面内容已更新");

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

                    // 调试信息
                    console.log('=== 填充页面布局信息 ===');
                    console.log(`  .book-wrapper 高度: ${bookWrapper ? bookWrapper.offsetHeight : 'N/A'}px`);
                    console.log(`  .resume-page-current 高度: ${resumePageCurrent ? resumePageCurrent.offsetHeight : 'N/A'}px`);
                    console.log(`  .resume-header 高度: ${resumeHeader ? resumeHeader.offsetHeight : 'N/A'}px`);
                    console.log(`  .info-grid-compact 高度: ${infoGrid.offsetHeight}px`);
                    console.log(`  .info-grid-compact scrollHeight: ${infoGrid.scrollHeight}px`);
                    console.log(`  .info-grid-compact overflow-y: ${window.getComputedStyle(infoGrid).overflowY}`);
                    console.log(`  需要滚动: ${infoGrid.scrollHeight > infoGrid.offsetHeight ? '是' : '否'}`);
                    console.log('========================');
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
                console.log(`✓ 设置active: ${href}`);
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
        console.log(`重新绑定 ${navItems.length} 个导航按钮事件`);

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
                    console.log(`导航按钮点击: ${labelText} -> ${targetPage}`);
                    navigateToPage(targetPage);
                });
            }
        });

        console.log("✓ 导航事件重新绑定完成");
    }

    /**
     * 绑定特定页面的事件
     * @param {string} pageHtml - 页面HTML文件名
     */
    function bindPageSpecificEvents(pageHtml) {
        if (!resumeWindowContainer) return;

        console.log(`绑定页面特定事件: ${pageHtml}`);

        // fill.html - 填充页面
        if (pageHtml === 'fill.html') {
            const fillBtn = resumeWindowContainer.querySelector(".liquid-cta-btn");
            if (fillBtn) {
                // 使用克隆节点移除旧的事件监听器，防止重复绑定
                const newFillBtn = fillBtn.cloneNode(true);
                fillBtn.parentNode.replaceChild(newFillBtn, fillBtn);

                // 绑定新的事件监听器
                newFillBtn.addEventListener("click", () => {
                    console.log("一键智能填充按钮被点击");
                    startFilling();
                });
                console.log("✓ 填充按钮事件已绑定（已移除旧事件）");
            }
        }

        // profile.html - 个人页面
        if (pageHtml === 'profile.html') {
            const editResumeBtn = resumeWindowContainer.querySelector(".edit-resume-btn");
            if (editResumeBtn) {
                // 移除原有的内联onclick属性，防止页面跳转
                editResumeBtn.removeAttribute('onclick');

                editResumeBtn.addEventListener("click", (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log("编辑简历按钮被点击");

                    // 打开外部Web页面进行简历编辑
                    const resumeUrl = window.config?.WEB_URL || 'http://localhost:3000/resume';
                    console.log(`打开简历编辑页面: ${resumeUrl}`);
                    window.open(resumeUrl, '_blank');
                });
                console.log("✓ 编辑简历按钮事件已绑定（打开外部Web页面）");
            }
        }

        // history.html - 投递记录页面
        if (pageHtml === 'history.html') {
            // 加载并渲染投递记录
            loadApplicationRecords();
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
                console.log("右上角按钮被点击");

                // 判断按钮图标类型
                const icon = settingsBtn.querySelector('i');
                if (icon && icon.classList.contains('fa-times')) {
                    // 关闭图标 - 关闭整个窗口
                    console.log("关闭按钮 - 关闭窗口");
                    toggleWindow(false);
                } else {
                    // 设置图标 - 跳转到设置页面
                    console.log("设置按钮 - 跳转到设置页面");
                    navigateToPage('settings.html');
                }
            });
            console.log("✓ 右上角按钮事件已绑定");
        }
    }

    /**
     * 加载CSS样式
     */
    async function loadStyles() {
        console.log("开始加载样式...");
        try {
            // 1. 首先加载本地 CSS 文件（fetch 方式，最可靠）
            const cssFiles = [
                "popup/styles/common.css",
                "popup/styles/fill.css"
                // 移除 resumeInterface.css，因为它是为旧的深色主题设计的，会与新设计冲突
            ];

            const fetchPromises = cssFiles.map(async (file) => {
                try {
                    const url = chrome.runtime.getURL(file);
                    console.log(`正在加载CSS: ${file}`);
                    const response = await fetch(url);
                    if (response.ok) {
                        const content = await response.text();
                        console.log(`✓ CSS加载成功: ${file} (${content.length} 字符)`);
                        return content;
                    } else {
                        console.error(`✗ CSS加载失败: ${file}, 状态: ${response.status}`);
                        return "";
                    }
                } catch (error) {
                    console.error(`✗ CSS加载异常: ${file}`, error);
                    return "";
                }
            });

            const cssContents = await Promise.all(fetchPromises);

            // 创建内联样式标签
            const inlineStyle = document.createElement("style");
            inlineStyle.textContent = cssContents.join("\n\n");
            shadowRoot.appendChild(inlineStyle);
            console.log("✓ 本地CSS样式已注入Shadow DOM");

            // 添加Logo按钮和窗口容器的样式（从 resumeInterface.css 提取）
            const logoAndContainerStyle = document.createElement("style");
            logoAndContainerStyle.textContent = `
                /* Logo按钮样式 */
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

                /* 简历窗口容器样式 */
                #resume-window-container {
                    position: fixed;
                    bottom: 40px;
                    right: 40px;
                    max-height: calc(100vh - 80px);
                    width: 420px;
                    height: 600px;
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
                    background: rgba(255, 255, 255, 0.95);
                    backdrop-filter: blur(10px);
                    -webkit-backdrop-filter: blur(10px);
                    box-shadow: 0 0 20px rgba(0, 0, 0, 0.2), 0 0 40px rgba(0, 0, 0, 0.1);
                }
            `;
            shadowRoot.appendChild(logoAndContainerStyle);
            console.log("✓ Logo和容器样式已注入");

            // 2. 加载 Font Awesome - 直接使用备用emoji方案（避免CDN CSP问题）
            console.log("使用emoji图标方案（避免CDN CSP问题）");
            const iconStyle = document.createElement("style");
            iconStyle.textContent = `
                /* 图标基础样式 */
                .fas, .far, .fab, .fa {
                    display: inline-block;
                    font-style: normal;
                    font-variant: normal;
                    text-rendering: auto;
                    line-height: 1;
                }

                /* Emoji图标映射 */
                .fa-rocket::before { content: "🚀"; font-size: 1.2em; }
                .fa-magic::before { content: "✨"; font-size: 1.2em; }
                .fa-bolt::before { content: "⚡"; font-size: 1.2em; }
                .fa-history::before { content: "🕐"; font-size: 1.2em; }
                .fa-user::before { content: "👤"; font-size: 1.2em; }
                .fa-cog::before { content: "⚙️"; font-size: 1.2em; }
                .fa-info-circle::before { content: "ℹ️"; font-size: 1.2em; }
                .fa-times::before { content: "✖"; font-size: 1.2em; }
                .fa-edit::before { content: "✏️"; font-size: 1.2em; }
            `;
            shadowRoot.appendChild(iconStyle);
            console.log("✓ Emoji图标样式已注入");

            // 验证样式是否成功注入
            const styleCount = shadowRoot.querySelectorAll('style').length;
            console.log(`✓ 样式加载完成，共注入 ${styleCount} 个<style>标签到Shadow DOM`);

        } catch (error) {
            console.error("✗ 加载样式时出错:", error);
        }
    }

    /**
     * 加载Font Awesome字体
     * 注意：Font Awesome 的字体由 CDN CSS 自动处理
     */
    async function loadFontAwesome() {
        try {
            // Font Awesome CDN 会自动处理字体加载
            // 我们只需要确保 CDN CSS 已加载（在 loadStyles 中处理）

            // 等待一小段时间确保 CDN CSS 加载完成
            await new Promise(resolve => setTimeout(resolve, 100));

            console.log("Font Awesome CDN 已就绪");
        } catch (error) {
            console.error("Font Awesome 初始化失败:", error);
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
        console.log("resumeWin====>", resumeWin);
        if (!resumeWin) return;

        // Logo按钮点击 - 打开/关闭窗口
        console.log("logoBtn====>", logoBtn);
        logoBtn.addEventListener("click", async () => {
            console.log("logoBtn 被点击");
            console.log("window.config====>", window.config);
            const { auth } = await chrome.storage.local.get(["auth"]);
            console.log("auth====>", auth);
            if (auth) {
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
                    console.log("点击窗口外部，关闭窗口");
                    toggleWindow(false);
                }
            });
        }

        // 绑定ESC键关闭窗口
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && resumeWindowContainer && resumeWindowContainer.style.display === "block") {
                console.log("按下ESC键，关闭窗口");
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
        console.log("resumeWindow====>", resumeWindow)
        console.log("resumeWindowContainer====>", resumeWindowContainer)
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
                window.setStateText("加载简历...", "min");
                // todo 修改获取默认简历接口
                // resumeData = await apiRequest("initResume", {
                //     url: window.location.href
                // });
                try {
                    console.log("获取简历数据。。。。")
                    const url = chrome.runtime.getURL("test_data/resume.md");
                    const res = await fetch(url);
                    if (!res.ok) throw new Error(`load resume.md failed: ${res.status}`);
                    const md = await res.text();
                    resumeData = { 
                        status: "ok", 
                        resumeId: 123456, 
                        resumeMd: md ,
                        company: "测试",
                        position: "java"
                    };
                    const editor = resumeWindow.querySelector("#resume-editor");
                    if (editor) editor.value = md;
                    console.log("获取成功数据为：===",resumeData)
                } catch (e) {
                    resumeData = { status: "error", detail: "简历加载失败" };
                }

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
                window.setStateText("方舟已就位，等待启动", "show");
            } else {
                window.setStateText("方舟准备中，请先填写公司和职位", "show");
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
        console.log("填充表单数据。。。。")
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
        console.log(`[startFilling] 当前状态: ${fillState}, 编辑器状态: ${editorState}`);

        if (editorState !== "success") {
            console.log("[startFilling] 编辑器未就绪，退出");
            return;
        }

        // 检查是否可以开始
        if (!canStart()) {
            alert("要先填写公司和职位，才能生成专岗美化简历哦！");
            window.setStateText("方舟准备中，请先填写公司和职位", "show");
            // TODO: 焦点处理
            return;
        }

        // 只有在特定状态下才能开始
        if (["ready", "success", "error", "quota"].includes(fillState)) {
            console.log("[startFilling] 开始新的填充流程");
            // todo 检查配额接口
            // 检查配额
            // const quotaResult = await apiRequest("getQuota", {});
            const quotaResult = { remainQuota: 9999 };
            if (quotaResult.remainQuota <= 0) {
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

            // 开始运行
            changeState("running");

            // TODO: 从fill.html获取表单数据
            const company = "字节跳动"; // resumeWindow.querySelector("#company-name").value;
            const position = "java"; // resumeWindow.querySelector("#position-name").value;
            const resumeMd = resumeData?.resumeMd; // resumeWindow.querySelector("#resume-editor").value;
            const resumeId = resumeData?.resumeId;

            // 调用填充函数
            if (typeof window.runFillResume === 'function') {
                window.runFillResume(company, position, resumeMd, resumeId, false, (result) => {
                    console.log("[startFilling] 填充完成，结果:", result);
                    if (result.status === "success") {
                        changeState("success");
                        // 保存投递记录
                        saveApplicationRecord(company, position);
                    } else {
                        changeState("error");
                    }
                });
            } else {
                console.error("[startFilling] window.runFillResume 函数未定义！");
                alert("填充功能未加载，请刷新页面后重试");
                changeState("error");
            }
        } else if (fillState === "running") {
            // 暂停
            console.log("[startFilling] 暂停填充");
            changeState("pause");
        } else if (fillState === "pause") {
            // 继续
            console.log("[startFilling] 继续填充");
            changeState("running");
        }
    }

    /**
     * 改变填充状态
     * @param {string} state - 新状态
     */
    function changeState(state) {
        console.log(`[changeState] 状态变化: ${fillState} -> ${state}`);
        fillState = state;

        // TODO: 根据fill.html的按钮实现状态变化
        const startButton = resumeWindowContainer?.querySelector(".liquid-cta-btn");
        if (!startButton) {
            console.warn("[changeState] 未找到填充按钮");
            return;
        }

        const buttonContainer = startButton.parentElement;

        switch (state) {
            case "running":
                startButton.innerHTML = '<i class="fas fa-pause"></i> 暂停填充';
                startButton.classList.add("paused");
                startButton.style.pointerEvents = "auto";
                // 移除刷新按钮（如果存在）
                const runningRefreshBtn = buttonContainer?.querySelector('.refresh-btn');
                if (runningRefreshBtn) runningRefreshBtn.remove();
                console.log("[changeState] 按钮已更新为: 暂停填充");
                break;
            case "pause":
                startButton.innerHTML = '<i class="fas fa-play"></i> 继续填充';
                startButton.classList.remove("paused");
                startButton.style.pointerEvents = "auto";
                // 移除刷新按钮（如果存在）
                const pauseRefreshBtn = buttonContainer?.querySelector('.refresh-btn');
                if (pauseRefreshBtn) pauseRefreshBtn.remove();
                console.log("[changeState] 按钮已更新为: 继续填充");
                break;
            case "success":
                startButton.innerHTML = '<i class="fas fa-calendar-check"></i> 填充完成';
                startButton.classList.remove("paused");
                // 禁用填充完成按钮的点击
                startButton.style.pointerEvents = "none";
                startButton.style.opacity = "0.7";

                // 添加刷新按钮
                let refreshBtn = buttonContainer?.querySelector('.refresh-btn');
                if (!refreshBtn && buttonContainer) {
                    refreshBtn = document.createElement('div');
                    refreshBtn.className = 'refresh-btn';
                    refreshBtn.innerHTML = '<i class="fas fa-sync"></i> 刷新';
                    refreshBtn.style.cssText = `
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        padding: 12px 24px;
                        border-radius: 18px;
                        font-size: 13px;
                        font-weight: 700;
                        cursor: pointer;
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        gap: 8px;
                        transition: all 0.3s ease;
                        margin-left: 10px;
                        box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
                    `;

                    // 添加悬停效果
                    refreshBtn.addEventListener('mouseenter', () => {
                        refreshBtn.style.transform = 'translateY(-2px)';
                        refreshBtn.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.6)';
                    });
                    refreshBtn.addEventListener('mouseleave', () => {
                        refreshBtn.style.transform = 'translateY(0)';
                        refreshBtn.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)';
                    });

                    refreshBtn.addEventListener('click', () => {
                        console.log("[changeState] 刷新按钮被点击，重置状态");
                        fillState = "ready";
                        changeState("ready");
                    });

                    buttonContainer.appendChild(refreshBtn);
                }
                console.log("[changeState] 按钮已更新为: 填充完成，已添加刷新按钮");
                break;
            case "error":
                startButton.innerHTML = '<i class="fas fa-bug"></i> 填充失败';
                startButton.classList.remove("paused");
                startButton.style.pointerEvents = "auto";
                startButton.style.opacity = "1";
                // 移除刷新按钮（如果存在）
                const errorRefreshBtn = buttonContainer?.querySelector('.refresh-btn');
                if (errorRefreshBtn) errorRefreshBtn.remove();
                console.log("[changeState] 按钮已更新为: 填充失败");
                break;
            case "quota":
                startButton.innerHTML = '<i class="fas fa-charging-station"></i> 配额已用完';
                startButton.classList.remove("paused");
                startButton.style.pointerEvents = "auto";
                startButton.style.opacity = "1";
                // 移除刷新按钮（如果存在）
                const quotaRefreshBtn = buttonContainer?.querySelector('.refresh-btn');
                if (quotaRefreshBtn) quotaRefreshBtn.remove();
                console.log("[changeState] 按钮已更新为: 配额已用完");
                break;
            case "learning":
                startButton.innerHTML = '<i class="fas fa-wand-magic-sparkles"></i> 学习中';
                startButton.style.pointerEvents = "auto";
                startButton.style.opacity = "1";
                // 移除刷新按钮（如果存在）
                const learningRefreshBtn = buttonContainer?.querySelector('.refresh-btn');
                if (learningRefreshBtn) learningRefreshBtn.remove();
                console.log("[changeState] 按钮已更新为: 学习中");
                break;
            default:
                console.log("[changeState] 按钮已更新为: 一键智能填充");
                startButton.innerHTML = '<i class="fas fa-bolt"></i> 一键智能填充';
                startButton.classList.remove("paused");
                startButton.style.pointerEvents = "auto";
                startButton.style.opacity = "1";
                // 移除刷新按钮（如果存在）
                const defaultRefreshBtn = buttonContainer?.querySelector('.refresh-btn');
                if (defaultRefreshBtn) defaultRefreshBtn.remove();
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
     * @param {string|null} displayMode - 显示模式
     */
    function setStateText(text, displayMode = null) {
        // TODO: 根据fill.html的状态显示元素实现
        const stateTextEl = resumeWindow.querySelector("#status-message");
        if (!stateTextEl) return;

        if (stateTextEl.textContent === text) return;

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

        // 切换显示模式
        if (displayMode) {
            toggleDisplay(displayMode);
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
                throw new Error(response.error);
            }

            return response;
        } catch (error) {
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

            console.log("[saveApplicationRecord] 保存投递记录:", record);

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

            console.log("[saveApplicationRecord] 投递记录已保存，当前记录数:", applicationRecords.length);
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
            console.log("[getApplicationRecords] 读取到", applicationRecords.length, "条投递记录");
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
                        console.log("[loadApplicationRecords] 跳转到:", url);
                        window.open(url, '_blank');
                    }
                });
            });

            console.log(`✓ 已加载 ${records.length} 条投递记录`);
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
        console.log("[closeHighlight] 开始清除高亮");
        await delay(1000);

        // 清除所有高亮样式
        try {
            const highlightedElements = document.querySelectorAll('[class*="ark-color-"]');
            console.log(`[closeHighlight] 找到 ${highlightedElements.length} 个高亮元素`);

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

            console.log("[closeHighlight] 高亮已清除");
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

        console.log("resumeInterfaceTwo.js: 配置已就绪", window.config);

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
