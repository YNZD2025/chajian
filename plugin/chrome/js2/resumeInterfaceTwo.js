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

            // 加载CSS样式
            loadStyles();

            // 加载字体图标
            loadFontAwesome();

            // 初始化高亮设置
            initHighlight();

            // 绑定事件监听
            await bindEvents(logoButton, resumeWindow);

            // 初始化Markdown编辑器
            initMarkdownEditor();

            // 调整窗口高度
            adjustWindowHeight();

            // 监听窗口大小变化
            window.addEventListener("resize", debounce(adjustWindowHeight, 200));
        } catch (error) {
            // 静默处理初始化错误
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
        const container = document.createElement("div");
        container.id = "resume-window-container";

        try {
            // 加载HTML模板 - 改为引用 fill.html
            const response = await fetch(chrome.runtime.getURL("popup/fill.html"));
            const html = await response.text();
            container.innerHTML = html;
        } catch (error) {
            return null;
        }

        shadowRoot.appendChild(container);

        // 保存容器引用
        resumeWindowContainer = container;

        const window = container.querySelector(".plugin-container");
        if (!window) return null;

        return window;
    }

    /**
     * 加载CSS样式
     */
    function loadStyles() {
        // Font Awesome 图标库
        const fontAwesomeLink = document.createElement("link");
        fontAwesomeLink.rel = "stylesheet";
        fontAwesomeLink.href = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css";
        shadowRoot.appendChild(fontAwesomeLink);

        // Common 通用样式
        const commonLink = document.createElement("link");
        commonLink.rel = "stylesheet";
        commonLink.href = chrome.runtime.getURL("popup/styles/common.css");
        shadowRoot.appendChild(commonLink);

        // Fill 页面样式
        const fillLink = document.createElement("link");
        fillLink.rel = "stylesheet";
        fillLink.href = chrome.runtime.getURL("popup/styles/fill.css");
        shadowRoot.appendChild(fillLink);

        // ✨ 新增：Logo 按钮样式（包含在 resumeInterface.css 中）
        const resumeInterfaceLink = document.createElement("link");
        resumeInterfaceLink.rel = "stylesheet";
        resumeInterfaceLink.href = chrome.runtime.getURL("case/css/resumeInterface.css");
        shadowRoot.appendChild(resumeInterfaceLink);
    }

    /**
     * 加载Font Awesome字体
     */
    function loadFontAwesome() {
        const fontUrl = chrome.runtime.getURL("webfonts/fa-solid-900.woff2");
        const fontFace = new FontFace("Font Awesome 6 Free", `url(${fontUrl})`, {
            weight: "900"
        });

        fontFace.load().then((loadedFont) => {
            document.fonts.add(loadedFont);
        }).catch((error) => {
            // 字体加载失败，静默处理
        });
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

        // 绑定一键智能填充按钮
        const fillBtn = resumeWin.querySelector(".liquid-cta-btn");
        if (fillBtn) {
            fillBtn.addEventListener("click", () => {
                console.log("一键智能填充按钮被点击");
                startFilling();
            });
        }

        // TODO: 绑定关闭按钮 - 暂未实现
        // const closeBtn = resumeWin.querySelector("#close-window");

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
                        resumeId: "resume-md-default", 
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
        if (editorState !== "success") return;

        // 检查是否可以开始
        if (!canStart()) {
            alert("要先填写公司和职位，才能生成专岗美化简历哦！");
            window.setStateText("方舟准备中，请先填写公司和职位", "show");
            // TODO: 焦点处理
            return;
        }

        // 只有在特定状态下才能开始
        if (["ready", "success", "error", "quota"].includes(fillState)) {
            // todo 检查配额接口
            // 检查配额
            // const quotaResult = await apiRequest("getQuota", {});
            const quotaResult = 9999;
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
            window.runFillResume(company, position, resumeMd, resumeId, false, (result) => {
                if (result.status === "success") {
                    changeState("success");
                } else {
                    changeState("error");
                }
            });
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
     */
    function changeState(state) {
        fillState = state;

        // TODO: 根据fill.html的按钮实现状态变化
        const startButton = resumeWindow.querySelector(".liquid-cta-btn");
        if (!startButton) return;

        switch (state) {
            case "running":
                startButton.innerHTML = '<i class="fas fa-pause"></i> 暂停填充';
                startButton.classList.add("paused");
                break;
            case "pause":
                startButton.innerHTML = '<i class="fas fa-play"></i> 继续填充';
                startButton.classList.remove("paused");
                break;
            case "success":
                startButton.innerHTML = '<i class="fas fa-calendar-check"></i> 填充完成';
                startButton.classList.remove("paused");
                break;
            case "error":
                startButton.innerHTML = '<i class="fas fa-bug"></i> 填充失败';
                startButton.classList.remove("paused");
                break;
            case "quota":
                startButton.innerHTML = '<i class="fas fa-charging-station"></i> 配额已用完';
                startButton.classList.remove("paused");
                break;
            case "learning":
                startButton.innerHTML = '<i class="fas fa-wand-magic-sparkles"></i> 学习中';
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
        document.documentElement.style.setProperty("--highlight-enabled", "0");
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
