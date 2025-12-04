"use strict";

/**
 * ============================================================================
 * 一念职达 (Job Ark) - Resume Interface 简历窗口UI
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
        img.src = chrome.runtime.getURL("image/icon128.png");
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
            // 加载HTML模板
            const response = await fetch(chrome.runtime.getURL("html/resumeWindow.html"));
            const html = await response.text();
            container.innerHTML = html;
        } catch (error) {
            return null;
        }

        shadowRoot.appendChild(container);

        const window = container.querySelector("#resume-window");
        if (!window) return null;

        // 设置Logo图片
        container.querySelector("#header-logo").src = chrome.runtime.getURL("image/icon128.png");

        return window;
    }

    /**
     * 加载CSS样式
     */
    function loadStyles() {
        // Font Awesome 图标库
        const fontAwesomeLink = document.createElement("link");
        fontAwesomeLink.rel = "stylesheet";
        fontAwesomeLink.href = chrome.runtime.getURL("css/lib/font-awesome.all.min.css");
        shadowRoot.appendChild(fontAwesomeLink);

        // SimpleMDE 编辑器样式
        const simpleMdeLink = document.createElement("link");
        simpleMdeLink.rel = "stylesheet";
        simpleMdeLink.href = chrome.runtime.getURL("css/lib/simplemde.min.css");
        shadowRoot.appendChild(simpleMdeLink);

        // 自定义样式
        const customLink = document.createElement("link");
        customLink.rel = "stylesheet";
        customLink.href = chrome.runtime.getURL("css/resumeInterface.css");
        shadowRoot.appendChild(customLink);
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
     * @param {HTMLElement} window - 简历窗口
     */
    async function bindEvents(logoBtn, window) {
        if (!window) return;

        // Logo按钮点击 - 打开/关闭窗口
        logoBtn.addEventListener("click", async () => {
            const { auth } = await chrome.storage.local.get(["auth"]);
            if (auth) {
                toggleWindow(true);
            } else {
                if (confirm("尚未登录到一念职达，是否立即前往登录？")) {
                    window.open(`${window.config.LOGIN_URL}`, "_blank");
                }
            }
        });

        // 关闭按钮
        const closeBtn = window.querySelector("#close-window");
        closeBtn.addEventListener("click", () => {
            toggleWindow(false);
        });

        // 开始按钮
        const startBtn = window.querySelector("#start-button");
        startBtn.addEventListener("click", () => {
            startFilling();
        });

        // 简历头部区域点击 - 展开/收起
        const header = window.querySelector(".resume-header");
        header.addEventListener("click", () => {
            toggleDisplay();
        });

        // 状态文字点击 - 展开/收起
        const stateText = window.querySelector("#state-text");
        stateText.addEventListener("click", () => {
            toggleDisplay();
        });

        // 简历版本切换
        const versionSelect = window.querySelector("#resume-version");
        versionSelect.addEventListener("change", (event) => {
            onResumeVersionChange(event);
        });

        // 美化简历复选框
        const beautifyCheckbox = window.querySelector("#beautify-checkbox");
        const storage = await chrome.storage.local.get(["beautifyResume"]);
        beautifyCheckbox.checked = storage.beautifyResume === true;

        beautifyCheckbox.addEventListener("change", (event) => {
            onBeautifyChange(event.target.checked);
            chrome.storage.local.set({ beautifyResume: event.target.checked });
        });

        // 绑定底部按钮
        bindFooterButtons();
    }

    /**
     * 绑定底部功能按钮
     */
    function bindFooterButtons() {
        const historyBtn = resumeWindow.querySelector("#history-table-btn");
        const campusBtn = resumeWindow.querySelector("#campus-table-btn");
        const resumeBtn = resumeWindow.querySelector("#my-resume-btn");

        if (historyBtn) {
            historyBtn.addEventListener("click", () => {
                window.open(window.config.HISTORY_URL, "_blank");
            });
        }

        if (campusBtn) {
            campusBtn.addEventListener("click", () => {
                window.open(window.config.CAMPUS_URL, "_blank");
            });
        }

        if (resumeBtn) {
            resumeBtn.addEventListener("click", () => {
                window.open(window.config.WEB_URL, "_blank");
            });
        }
    }

    // ============================================================================
    // 窗口控制
    // ============================================================================

    /**
     * 切换窗口显示/隐藏
     * @param {boolean} show - true显示，false隐藏
     */
    async function toggleWindow(show) {
        if (!resumeWindow) return;

        if (show) {
            // 显示窗口
            resumeWindow.classList.add("min");
            resumeWindow.style.display = "flex";
            resumeWindow.style.opacity = "0";

            await delay(10);
            resumeWindow.style.opacity = "1";
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
                resumeData = await apiRequest("initResume", {
                    url: window.location.href
                });

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
                window.setStateText("一念职达已就位，等待启动", "show");
            } else {
                window.setStateText("一念职达准备中，请先填写公司和职位", "show");
                await delay(600);
                resumeWindow.querySelector("#company-name").focus();
            }
        } else {
            // 隐藏窗口
            if (logoButton) {
                logoButton.style.display = "block";
            }

            await delay(10);
            resumeWindow.style.opacity = "0";
            await delay(200);
            resumeWindow.style.display = "none";
            resumeWindow.classList.add("min");
        }
    }

    /**
     * 切换简历详情显示/隐藏
     * @param {string|null} mode - "show"展开，"min"收起，null切换
     */
    async function toggleDisplay(mode = null) {
        const displayArea = resumeWindow.querySelector(".resume-display");

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
        const companyInput = resumeWindow.querySelector("#company-name");
        const positionInput = resumeWindow.querySelector("#position-name");

        // 填充公司和职位
        companyInput.value = data.company || "";
        positionInput.value = data.position || "";

        // 如果有校招来源，使用校招公司名
        if (window.campusSource && window.campusSource.company) {
            companyInput.value = window.campusSource.company;
        }

        // 填充简历版本下拉框
        const versionSelect = resumeWindow.querySelector("#resume-version");
        if (versionSelect) {
            let options = "";
            for (const resume of data.resumeList) {
                options += `<option value="${resume.id}">${resume.title}</option>`;
            }
            versionSelect.innerHTML = options;
            versionSelect.value = data.resumeId;
        }

        // 加载简历内容
        for (const resume of data.resumeList) {
            if (resume.id === data.resumeId) {
                setResumeContent(resume.resumeMd);
                break;
            }
        }
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
            window.setStateText("一念职达准备中，请先填写公司和职位", "show");
            resumeWindow.querySelector("#company-name").focus();
            return;
        }

        // 只有在特定状态下才能开始
        if (["ready", "success", "error", "quota"].includes(fillState)) {
            // todo 检查配额接口
            // 检查配额
            const quotaResult = await apiRequest("getQuota", {});
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

            const company = resumeWindow.querySelector("#company-name").value;
            const position = resumeWindow.querySelector("#position-name").value;
            const resumeMd = resumeWindow.querySelector("#resume-editor").value;
            const resumeId = resumeData.resumeId;

            // 调用填充函数
            // window.runFillResume(company, position, resumeMd, resumeId, isBeautifyEnabled(), (result) => {
            //     if (result.status === "success") {
            //         changeState("success");
            //     } else {
            //         changeState("error");
            //     }
            // });
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

        const startButton = resumeWindow.querySelector("#start-button");

        switch (state) {
            case "running":
                startButton.innerHTML = '<i class="fas fa-pause"></i>';
                startButton.classList.add("paused");
                break;
            case "pause":
                startButton.innerHTML = '<i class="fas fa-play"></i>';
                startButton.classList.remove("paused");
                break;
            case "success":
                startButton.innerHTML = '<i class="fas fa-calendar-check"></i>';
                startButton.classList.remove("paused");
                break;
            case "error":
                startButton.innerHTML = '<i class="fas fa-bug"></i>';
                startButton.classList.remove("paused");
                break;
            case "quota":
                startButton.innerHTML = '<i class="fas fa-charging-station"></i>';
                startButton.classList.remove("paused");
                break;
            case "learning":
                startButton.innerHTML = '<i class="fas fa-wand-magic-sparkles"></i>';
                break;
        }
    }

    /**
     * 检查是否可以开始填充
     * @returns {boolean}
     */
    function canStart() {
        if (isBeautifyEnabled()) {
            const companyInput = resumeWindow.querySelector("#company-name");
            const positionInput = resumeWindow.querySelector("#position-name");
            return companyInput.value && positionInput.value;
        }
        return true;
    }

    /**
     * 检查是否启用美化简历
     * @returns {boolean}
     */
    function isBeautifyEnabled() {
        return resumeWindow.querySelector("#beautify-checkbox").checked;
    }

    // ============================================================================
    // 简历版本和美化选项
    // ============================================================================

    /**
     * 处理简历版本切换
     * @param {Event} event - change事件
     */
    async function onResumeVersionChange(event) {
        const resumeId = event.target.value;
        let selectedResume;

        resumeData.resumeId = resumeId;
        setResumeContent("");
        window.setStateText("获取简历中...");

        // 查找选中的简历
        for (const resume of resumeData.resumeList) {
            if (Number(resume.id) === Number(resumeId)) {
                selectedResume = resume;
                break;
            }
        }

        if (selectedResume) {
            if (selectedResume.resumeMd) {
                // 使用缓存的内容
                setResumeContent(selectedResume.resumeMd);
            } else {
                // todo 获取简历接口
                // 从服务器获取
                const result = await apiRequest("getResumeMd", { resumeId: resumeId });
                if (!result.resumeMd) {
                    window.setStateText("糟糕！简历不存在");
                    return;
                }
                setResumeContent(result.resumeMd);
            }

            // 更新状态提示
            if (canStart()) {
                window.setStateText("一念职达已就位，等待启动", "show");
            } else {
                window.setStateText("一念职达准备中，请先填写公司和职位", "show");
                resumeWindow.querySelector("#company-name").focus();
            }
        } else {
            window.setStateText("未找到对应的简历");
        }
    }

    /**
     * 处理美化选项变化
     * @param {boolean} enabled - 是否启用
     */
    function onBeautifyChange(enabled) {
        if (canStart()) {
            window.setStateText("一念职达已就位，等待启动", "show");
        } else {
            window.setStateText("一念职达准备中，请先填写公司和职位", "show");
            resumeWindow.querySelector("#company-name").focus();
        }
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
        const stateTextEl = resumeWindow.querySelector("#state-text");

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
        if (typeof SimpleMDE === "undefined") {
            editorState = "error";
            return;
        }

        const textArea = shadowRoot.querySelector("#resume-editor");
        if (!textArea) {
            editorState = "error";
            return;
        }

        try {
            simpleMDE = new SimpleMDE({
                autosave: {
                    enabled: true,
                    uniqueId: "resume",
                    delay: 1000
                },
                element: textArea,
                forceSync: true,
                initialValue: "",
                placeholder: "请将简历粘贴到这里，建议使用Markdown格式",
                spellChecker: false,
                status: ["autosave", "lines", "words"],
                toolbar: false,
                autoDownloadFontAwesome: false
            });

            // 添加正常背景样式
            shadowRoot.querySelector(".CodeMirror").classList.add("normal-bg");

            let previousValue = "";

            // 监听内容变化
            simpleMDE.codemirror.on("change", () => {
                // 内容变化时的处理
            });

            // 聚焦时记录内容
            simpleMDE.codemirror.on("focus", () => {
                previousValue = simpleMDE.value();
            });

            // 失焦时保存变化
            simpleMDE.codemirror.on("blur", () => {
                if (previousValue !== simpleMDE.value()) {
                    saveResumeContent(simpleMDE.value());
                }
            });

            editorState = "success";
        } catch (error) {
            editorState = "error";
        }
    }

    /**
     * 保存简历内容
     * @param {string} content - 简历内容
     */
    async function saveResumeContent(content) {
        const currentState = resumeWindow.querySelector("#state-text").textContent;

        // 显示保存提示
        setStateText("简历已保存");
        setTimeout(() => {
            setStateText(currentState);
        }, 3000);

        // 更新本地缓存
        for (let resume of resumeData.resumeList) {
            if (resume.id === resumeData.resumeId) {
                resume.resumeMd = content;
                break;
            }
        }

        // todo 保存简历接口
        // 保存到服务器
        await apiRequest("saveResumeMd", {
            resumeId: resumeData.resumeId,
            resumeMd: content
        });
    }

    /**
     * 设置简历内容
     * @param {string} content - 简历内容
     */
    function setResumeContent(content) {
        const setContent = () => {
            if (simpleMDE === null) {
                setTimeout(setContent, 100);
            } else {
                simpleMDE.codemirror.setValue(content);
            }
        };
        setContent();
    }

    let typeContentTimer = null;

    /**
     * 打字机效果显示简历内容
     * @param {string} content - 简历内容
     */
    function typeResumeContent(content) {
        if (typeContentTimer) {
            clearTimeout(typeContentTimer);
        }

        let index = 0;
        simpleMDE.codemirror.setValue("");

        const typeChar = () => {
            if (index < content.length) {
                const doc = simpleMDE.codemirror.getDoc();
                const lastLine = doc.lastLine();
                const lastChar = {
                    line: lastLine,
                    ch: doc.getLine(lastLine)?.length || 0
                };

                doc.replaceRange(content.charAt(index), lastChar);

                // 换行时滚动到底部
                if (content.charAt(index) === "\n") {
                    const sizer = simpleMDE.codemirror.getScrollerElement().querySelector(".CodeMirror-sizer");
                    sizer.scrollIntoView({ block: "end" });
                }

                index++;
                typeContentTimer = setTimeout(typeChar, Math.floor(10000 / content.length));
            } else {
                typeContentTimer = null;
                // 完成后滚动到顶部
                const sizer = simpleMDE.codemirror.getScrollerElement().querySelector(".CodeMirror-sizer");
                sizer.scrollIntoView({ block: "start" });
            }
        };

        typeChar();
    }

    /**
     * 调整窗口高度
     */
    function adjustWindowHeight() {
        if (!resumeWindow) return;

        const maxHeight = window.innerHeight - 80;
        let targetHeight = 700;

        if (targetHeight > maxHeight) {
            targetHeight = Math.max(maxHeight, 600);
        }

        const codeMirror = shadowRoot.querySelector(".CodeMirror");
        const hasNewVersion = codeMirror.classList.contains("showNewVersion");
        const headerHeight = hasNewVersion ? 350 : 310;

        codeMirror.style.setProperty("height", (targetHeight - headerHeight) + "px", "important");
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
        return new Promise(async (resolve) => {
            const modal = shadowRoot.querySelector("#star-rating-modal-step1");
            if (!modal) {
                resolve();
                return;
            }

            const overlay = modal.querySelector(".star-rating-overlay");
            const websiteCount = overlay.querySelector("#star-rating-website-count");
            const fieldCount = overlay.querySelector("#star-rating-field-count");

            // 显示统计数据
            if (websiteCount) {
                websiteCount.textContent = stats.websiteCount || 0;
            }
            if (fieldCount) {
                fieldCount.textContent = stats.fieldCount || 0;
            }

            modal.style.display = "block";

            // 不感兴趣按钮
            const notInterestedBtn = overlay.querySelector("#star-rating-not-interested");
            notInterestedBtn.addEventListener("click", async () => {
                const { websiteCount } = await chrome.storage.local.get(["websiteCount"]);
                await chrome.storage.local.set({
                    starRatingCancelCount: Number(websiteCount) || 0
                });
                modal.style.display = "none";
                resolve();
            });

            // 前往商店按钮
            const goToStoreBtn = overlay.querySelector("#star-rating-go-to-store");
            goToStoreBtn.addEventListener("click", async () => {
                modal.style.display = "none";

                // 根据浏览器打开对应商店
                if (navigator.userAgent.includes("Edg")) {
                    window.open(
                        "https://microsoftedge.microsoft.com/addons/detail/fhefgbbghlmmedjppiglmfkgeggaikno",
                        "_blank"
                    );
                } else {
                    window.open(
                        "https://chromewebstore.google.com/detail/ohjbldefcgdafflncjpnlajjnbkebjap",
                        "_blank"
                    );
                }

                // 显示步骤2
                await showStep2Modal();
                resolve();
            });
        });
    }

    /**
     * 显示评分弹窗 - 步骤2（上传截图）
     */
    async function showStep2Modal() {
        return new Promise(async (resolve) => {
            const modal = shadowRoot.querySelector("#star-rating-modal-step2");
            if (!modal) {
                resolve();
                return;
            }

            const overlay = modal.querySelector(".star-rating-overlay");
            modal.style.display = "block";

            const fileInput = overlay.querySelector("#star-rating-file-input");
            const preview = overlay.querySelector("#star-rating-preview");
            const cancelBtn = overlay.querySelector("#star-rating-cancel");
            const submitBtn = overlay.querySelector("#star-rating-submit");
            const demoImg = overlay.querySelector("#star-rating-demo-img");

            // 设置示例图片
            if (demoImg) {
                demoImg.src = chrome.runtime.getURL("image/starRatingDemo.png");
            }

            let imageData = null;

            /**
             * 设置预览图片
             */
            function setPreviewImage(data) {
                imageData = data;
                preview.innerHTML = `
                    <img src="${data}" style="max-width: 100%; max-height: 300px; border-radius: 4px;">
                `;
                submitBtn.disabled = false;
            }

            // 初始化预览区域
            submitBtn.disabled = true;
            preview.innerHTML = `
                <div class="star-rating-preview-placeholder">
                    <div class="star-rating-preview-icon"><i class="fas fa-camera"></i></div>
                    <div>支持粘贴截图 或 上传图片文件</div>
                </div>
            `;

            // 点击预览区域选择文件
            preview.addEventListener("click", () => {
                fileInput.click();
            });

            // 文件选择
            fileInput.addEventListener("change", (event) => {
                const file = event.target.files[0];
                if (file && file.type.startsWith("image/")) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        setPreviewImage(e.target.result);
                    };
                    reader.readAsDataURL(file);
                }
            });

            // 粘贴图片
            const onPaste = async (event) => {
                const items = event.clipboardData.items;
                for (let i = 0; i < items.length; i++) {
                    if (items[i].type.indexOf("image") !== -1) {
                        event.preventDefault();
                        const file = items[i].getAsFile();
                        const reader = new FileReader();
                        reader.onload = (e) => {
                            setPreviewImage(e.target.result);
                        };
                        reader.readAsDataURL(file);
                        break;
                    }
                }
            };

            document.addEventListener("paste", onPaste);

            const cleanupPaste = () => {
                document.removeEventListener("paste", onPaste);
            };

            // 取消按钮
            cancelBtn.addEventListener("click", async () => {
                cleanupPaste();
                const { websiteCount } = await chrome.storage.local.get(["websiteCount"]);
                await chrome.storage.local.set({
                    starRatingCancelCount: Number(websiteCount) || 0
                });
                modal.style.display = "none";
                resolve();
            });

            // 提交按钮
            submitBtn.addEventListener("click", async () => {
                if (!imageData) return;

                submitBtn.disabled = true;
                submitBtn.textContent = "上传中...";

                try {
                    // 转换图片格式
                    const { imageData: processedData, imageType } = await processImage(imageData);

                    // 上传到服务器
                    const result = await chrome.runtime.sendMessage({
                        type: "uploadStarRating",
                        imageData: processedData,
                        imageType: imageType
                    });

                    if (result && result.success) {
                        cleanupPaste();
                        modal.style.display = "none";
                        await chrome.storage.local.set({ starRatingUploaded: true });
                        await showStep3Modal();
                        resolve();
                    } else {
                        alert("上传失败：" + (result?.error || "未知错误"));
                        submitBtn.disabled = false;
                        submitBtn.textContent = "提交";
                    }
                } catch (error) {
                    alert("上传失败：" + error.message);
                    submitBtn.disabled = false;
                    submitBtn.textContent = "提交";
                }
            });
        });
    }

    /**
     * 处理图片（转换为PNG格式）
     * @param {string} dataUrl - 图片DataURL
     */
    async function processImage(dataUrl) {
        return new Promise((resolve, reject) => {
            const img = new Image();

            img.onload = () => {
                try {
                    const canvas = document.createElement("canvas");
                    canvas.width = img.width;
                    canvas.height = img.height;

                    const ctx = canvas.getContext("2d");
                    ctx.drawImage(img, 0, 0);

                    const pngData = canvas.toDataURL("image/png");
                    resolve({
                        imageData: pngData,
                        imageType: "image/png"
                    });
                } catch (error) {
                    reject(error);
                }
            };

            img.onerror = () => {
                reject(new Error("图片加载失败"));
            };

            img.src = dataUrl;
        });
    }

    /**
     * 显示评分弹窗 - 步骤3（感谢）
     */
    async function showStep3Modal() {
        return new Promise(async (resolve) => {
            const modal = shadowRoot.querySelector("#star-rating-modal-step3");
            if (!modal) {
                resolve();
                return;
            }

            const overlay = modal.querySelector(".star-rating-overlay");
            modal.style.display = "block";

            const okBtn = overlay.querySelector("#star-rating-ok");
            okBtn.addEventListener("click", () => {
                modal.style.display = "none";
                resolve();
            });
        });
    }

    // ============================================================================
    // 版本检查
    // ============================================================================

    /**
     * 检查新版本
     */
    async function checkVersion() {
        try {
            const currentVersion = chrome.runtime.getManifest().version;
            const { lastVersionCheck, latestVersion } = await chrome.storage.local.get([
                "lastVersionCheck",
                "latestVersion"
            ]);

            const now = Date.now();
            let serverVersion;

            // 缓存1小时
            if (lastVersionCheck && latestVersion && (now - lastVersionCheck < 3600000)) {
                serverVersion = latestVersion;
            } else {
                try {
                    const url = `${window.config.VERSION_URL}?t=${Date.now()}`;
                    const response = await fetch(url);

                    if (!response.ok) {
                        throw new Error(`获取版本信息失败: ${response.status}`);
                    }

                    serverVersion = (await response.text()).trim();

                    // 缓存版本信息
                    await chrome.storage.local.set({
                        lastVersionCheck: now,
                        latestVersion: serverVersion
                    });
                } catch (error) {
                    if (!latestVersion) throw error;
                    serverVersion = latestVersion;
                }
            }

            // 比较版本
            if (isNewerVersion(serverVersion, currentVersion)) {
                showVersionNotification();
            }
        } catch (error) {
            // 静默处理版本检查错误
        }
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
        const notification = resumeWindow.querySelector("#version-notification");
        if (!notification) return;

        notification.style.display = "block";

        // 调整编辑器高度
        const codeMirror = resumeWindow.querySelector(".CodeMirror");
        if (codeMirror) {
            codeMirror.classList.add("showNewVersion");
            adjustWindowHeight();
        }

        // 更新按钮事件
        const updateBtn = notification.querySelector("#update-now-btn");
        if (updateBtn) {
            updateBtn.addEventListener("click", () => {
                window.open(`${window.config.AUTOFILL_URL}?newversion=true`, "_blank");
            });
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
            const checkbox = resumeWindow.querySelector("#beautify-checkbox");
            if ((message.state && !checkbox.checked) || (!message.state && checkbox.checked)) {
                checkbox.click();
            }
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
        const { isNew, resumeItem, resumeId, resumeMd } = data;

        if (isNew) {
            // 新建的美化简历
            resumeItem.resumeMd = resumeMd;
            resumeData.resumeList.unshift(resumeItem);
            resumeData.resumeId = resumeId;
            resumeData.company = resumeWindow.querySelector("#company-name").value || "";
            resumeData.position = resumeWindow.querySelector("#position-name").value || "";

            // 更新下拉框
            const versionSelect = resumeWindow.querySelector("#resume-version");
            versionSelect.innerHTML = "";
            let options = "";
            for (const resume of resumeData.resumeList) {
                options += `<option value="${resume.id}">${resume.title}</option>`;
            }
            versionSelect.innerHTML = options;

            // 打字机效果显示新内容
            typeResumeContent(resumeMd);
        } else {
            typeResumeContent(resumeMd);
        }
    };

    /**
     * 停止打字机效果
     */
    window.stopTypeResumeContent = function (content) {
        if (typeContentTimer) {
            clearTimeout(typeContentTimer);
            simpleMDE.codemirror.setValue(content);
        }
    };

    /**
     * 公司和职位输入框呼吸效果
     */
    window.breatheJobInfo = async function () {
        const companyInput = resumeWindow.querySelector("#company-name");
        const positionInput = resumeWindow.querySelector("#position-name");

        companyInput.classList.remove("normal-bg");
        positionInput.classList.remove("normal-bg");
        companyInput.classList.add("breathing-bg");
        positionInput.classList.add("breathing-bg");

        await delay(5000);

        companyInput.classList.remove("breathing-bg");
        positionInput.classList.remove("breathing-bg");
        companyInput.classList.add("normal-bg");
        positionInput.classList.add("normal-bg");
    };

    /**
     * 简历编辑器呼吸效果
     */
    window.breatheResume = async function (action) {
        const codeMirror = shadowRoot.querySelector(".CodeMirror");

        if (action === "begin") {
            codeMirror.classList.remove("normal-bg");
            codeMirror.classList.add("breathing-bg");
        } else if (action === "end") {
            codeMirror.classList.remove("breathing-bg");
            codeMirror.classList.add("normal-bg");
        }
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
        if (!shadowRoot) return;

        // 检查是否已有弹窗显示
        const step1 = shadowRoot.querySelector("#star-rating-modal-step1");
        const step2 = shadowRoot.querySelector("#star-rating-modal-step2");
        const step3 = shadowRoot.querySelector("#star-rating-modal-step3");

        if ((step1 && step1.style.display === "block") ||
            (step2 && step2.style.display === "block") ||
            (step3 && step3.style.display === "block")) {
            return;
        }

        await showStep1Modal(stats);
    };

    /**
     * 校招来源（由content.js设置）
     */
    window.campusSource = null;

    /**
     * 测试评分弹窗
     */
    window.testStarRatingModal = async function (options = {}) {
        const { websiteCount = 25, fieldCount = 360, step = 1 } = options;

        if (!shadowRoot) return;

        const stats = { websiteCount, fieldCount };

        if (step === 1) {
            await showStep1Modal(stats);
        } else if (step === 2) {
            await showStep2Modal();
        } else if (step === 3) {
            await showStep3Modal();
        }
    };

    // ============================================================================
    // 主入口
    // ============================================================================

    (async () => {
        // 等待配置加载
        if (!window.config) {
            await new Promise((resolve) => {
                Object.defineProperty(window, "config", {
                    set(value) {
                        delete window.config;
                        window.config = value;
                        resolve();
                    },
                    configurable: true
                });
            });
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
                        }, (response) => {});
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
