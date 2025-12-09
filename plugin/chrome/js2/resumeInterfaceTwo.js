"use strict";

/**
 * ============================================================================
 * 一念职达 (Job Ark) - Resume Interface Two 简历窗口UI（基于fill.html）
 * ============================================================================
 *
 * 此文件是 Chrome 扩展的简历窗口界面模块
 * 负责处理以下核心功能：
 * - Shadow DOM 隔离的UI界面
 * - SimpleMDE Myndown编辑器集成
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
            hostElement.id = "yn-ai";

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
            const { arcButtonMode = "always" } = await chrome.storage.local.get(["arcButtonMode"]);
            setButtonMode(arcButtonMode);
        } catch (error) {
            console.warn('[initButtonMode] 读取按钮模式失败，使用默认值 always:', error);
            // 使用默认设置：常驻显示
            setButtonMode("always");
        }
    }

    /**
     * 创建Logo按钮
     * @returns {HTMLElement} Logo按钮元素
     */
    function createLogoButton() {
        const button = document.createElement("button");
        button.id = "logo-button";

        // 创建 SVG 动画容器
        const animationContainer = document.createElement("div");
        animationContainer.className = "character-container";

        const character = document.createElement("div");
        character.className = "character";

        // 插入 SVG 动画
        character.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1008 1024">
                <!-- 定义渐变和滤镜 -->
                <defs>
                    <!-- 主体颜色渐变 -->
                    <linearGradient id="bodyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:#8FD9C6;stop-opacity:1" />
                        <stop offset="50%" style="stop-color:#6EC5B2;stop-opacity:1" />
                        <stop offset="100%" style="stop-color:#5AB09D;stop-opacity:1" />
                    </linearGradient>
                    <radialGradient id="shadowGradient" cx="50%" cy="5%">
                        <stop offset="0%" style="stop-color:#BFBFBE;stop-opacity:1" />
                        <stop offset="100%" style="stop-color:#A7A7A7;stop-opacity:1" />
                    </radialGradient>
                    <radialGradient id="lightGradient" cx="50%" cy="20%">
                        <stop offset="0%" style="stop-color:#FFFFFF;stop-opacity:0.5" />
                        <stop offset="40%" style="stop-color:#F5F5F5;stop-opacity:0.3" />
                        <stop offset="70%" style="stop-color:#E8E8E7;stop-opacity:1" />
                        <stop offset="100%" style="stop-color:#D8D8D7;stop-opacity:1" />
                    </radialGradient>
                    <radialGradient id="eyeGradient" cx="40%" cy="40%">
                        <stop offset="0%" style="stop-color:#54998c;stop-opacity:1" />
                        <stop offset="100%" style="stop-color:#54998c;stop-opacity:1" />
                    </radialGradient>
                    <linearGradient id="mouthGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" style="stop-color:#E84A3D;stop-opacity:1" />
                        <stop offset="100%" style="stop-color:#D43022;stop-opacity:1" />
                    </linearGradient>
                    <radialGradient id="starGradient">
                        <stop offset="0%" style="stop-color:#FFF44F;stop-opacity:1" />
                        <stop offset="100%" style="stop-color:#FFD700;stop-opacity:1" />
                    </radialGradient>
                    <filter id="shadow3d">
                        <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
                        <feOffset dx="2" dy="4" result="offsetblur"/>
                        <feComponentTransfer>
                            <feFuncA type="linear" slope="0.5"/>
                        </feComponentTransfer>
                        <feMerge>
                            <feMergeNode/>
                            <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                    </filter>
                    <filter id="innerShadow">
                        <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
                        <feOffset dx="0" dy="2" result="offsetblur"/>
                        <feFlood flood-color="#000000" flood-opacity="0.2"/>
                        <feComposite in2="offsetblur" operator="in"/>
                        <feMerge>
                            <feMergeNode/>
                            <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                    </filter>
                </defs>
                <!-- 身体主体 -->
                <path fill="url(#bodyGradient)" filter="url(#shadow3d)" d="M196.709 442.047C205.565 422.21 217.462 399.957 228.194 380.982C277.435 293.915 342.079 212.862 423.366 153.691C492.836 103.121 580.161 64.9773 667.685 78.8524C714.966 86.3477 778.018 120.667 806.202 159.683C807.225 159.074 808.268 158.498 809.327 157.955C788.162 223.71 779.837 201.053 788.262 178.587C768.94 153.17 732.111 132.178 701.067 149.129C668.274 167.035 666.796 207.938 680.723 238.697C690.925 261.23 706.287 282.107 720.455 302.267C727.97 313.096 735.33 324.032 742.532 335.072C764.66 368.91 780.727 399.014 799.444 434.417L800.115 434.83C801.721 435.801 806.097 437.683 808.012 438.563C818.632 443.446 827.281 449.98 831.114 461.594C836.018 465.09 844.38 471.534 847.418 477.291C862.545 505.963 865.584 542.676 871.927 574.111C874.562 587.172 872.376 597.179 865.557 607.672C873.519 626.055 864.512 631.22 850.492 640.071C850.559 650.891 850.728 661.111 849.902 671.917C844.282 748.679 811.63 820.963 757.747 875.923C690.048 944.475 597.968 976.274 502.788 976.453C403.987 976.638 313.045 948.214 241.917 877.584C184.209 819.774 150.462 742.303 147.432 660.676C146.665 657.205 147 647.996 147.059 644.077C132.121 637.353 123.916 627.739 133.758 611.597C133.271 611.01 132.799 610.411 132.342 609.8C126.207 601.512 125.495 592.005 127.365 581.765C133.074 550.505 135.972 514.904 150.485 486.38C153.837 479.792 162.519 473.184 168.19 468.911C170.809 458.974 180.246 451.85 188.637 446.891C191.25 445.346 194.369 443.907 196.709 442.047Z"/>
                <!-- 触角 -->
                <g class="antenna">
                    <path fill="url(#bodyGradient)" filter="url(#shadow3d)" d="M809.327 157.955C817.956 153.479 829.519 152.404 838.754 155.417C848.817 158.786 857.12 166.03 861.824 175.542C866.752 185.507 867.134 196.869 863.498 207.316C859.959 217.663 852.365 226.125 842.46 230.758C832.699 235.446 821.457 235.988 811.291 232.262C788.162 223.71 779.837 201.053 788.262 178.587C793.5 168.5 800.5 162.5 809.327 157.955Z"/>
                </g>
                <!-- 底部阴影 -->
                <path fill="url(#shadowGradient)" filter="url(#innerShadow)" d="M147.502 644.425C152.839 646.83 158.221 649.137 163.644 651.344C210.312 669.825 265.547 685.02 314.507 696.364C341.192 702.186 368.665 707.441 395.932 707.799C424.309 708.172 437.089 697.298 456.611 678.723C465.845 669.937 479.767 660.586 491.519 655.339C536.057 635.451 558.571 687.872 593.623 701.893C608.478 707.85 624.347 706.438 640.066 704.62C679.411 700.068 719.062 690.773 756.884 678.943C773.407 673.648 789.754 667.822 805.901 661.472C816.07 657.358 826.057 652.807 835.833 647.833C838.586 646.418 847.901 641.124 849.915 640.301L850.492 640.071C850.559 650.891 850.728 661.111 849.902 671.917C844.282 748.679 811.63 820.963 757.747 875.923C690.048 944.475 597.968 976.274 502.788 976.453C403.987 976.638 313.045 948.214 241.917 877.584C184.209 819.774 150.462 742.303 147.432 660.676C147.614 655.574 147.488 649.592 147.502 644.425Z"/>
                <!-- 嘴巴 -->
                <path class="mouth" fill="url(#mouthGradient)" filter="url(#shadow3d)" d="M566.503 709.565C569.322 709.508 574.163 710.13 576.014 712.368C582.445 720.144 570.565 731.719 565.945 736.413C551.211 751.288 531.133 759.642 510.196 759.609C484.501 759.766 465.111 750.624 447.126 732.843C444.164 729.567 437.762 722.263 439.701 718.33C447.626 702.257 456.671 715.975 461.252 721.266C483.47 746.768 528.578 748.83 552.41 724.509C557.158 719.663 560.593 712.77 566.503 709.565Z"/>
                <!-- 中间阴影层 -->
                <path fill="url(#shadowGradient)" d="M196.709 442.047C205.565 422.21 217.462 399.957 228.194 380.982C277.435 293.915 342.079 212.862 423.366 153.691C492.836 103.121 580.161 64.9773 667.685 78.8524C714.966 86.3477 778.018 120.667 806.202 159.683C807.225 159.074 808.268 158.498 809.327 157.955C817.956 153.479 829.519 152.404 838.754 155.417C848.817 158.786 857.12 166.03 861.824 175.542C866.752 185.507 867.134 196.869 863.498 207.316C859.959 217.663 852.365 226.125 842.46 230.758C832.699 235.446 821.457 235.988 811.291 232.262C788.162 223.71 779.837 201.053 788.262 178.587C768.94 153.17 732.111 132.178 701.067 149.129C668.274 167.035 666.796 207.938 680.723 238.697C690.925 261.23 706.287 282.107 720.455 302.267C727.97 313.096 735.33 324.032 742.532 335.072C764.66 368.91 780.727 399.014 799.444 434.417C793.267 433.63 782.986 429.132 776.184 427.428C758.097 423 739.747 419.725 721.245 417.621C675.446 412.142 625.886 410.798 579.868 410.375L487.5 410.251C418.271 410.831 347.58 410.935 278.826 420.386C259.23 423.08 239.916 427.562 220.896 432.959C215.573 434.47 199.634 441.557 196.709 442.047Z"/>
                <!-- 亮部高光层 -->
                <path fill="url(#lightGradient)" d="M133.758 611.597C148.258 623.831 168.96 630.398 186.561 637.034C235.587 655.518 371.536 697.026 419.672 681.259C426.648 678.974 432.472 674.559 438.202 670.107C459.01 653.939 479.5 629.213 507.792 627.759C531.892 626.52 548.703 642.902 565.285 657.942C587.371 677.973 599.737 683.504 630.067 682.009C694.077 678.854 775.666 656.133 833.239 627.493C844.734 621.775 856.753 617.39 865.557 607.672C873.519 626.055 864.512 631.22 850.492 640.071L849.915 640.301C847.901 641.124 838.586 646.418 835.833 647.833C826.057 652.807 816.07 657.358 805.901 661.472C789.754 667.822 773.407 673.648 756.884 678.943C719.062 690.773 679.411 700.068 640.066 704.62C624.347 706.438 608.478 707.85 593.623 701.893C558.571 687.872 536.057 635.451 491.519 655.339C479.767 660.586 465.845 669.937 456.611 678.723C437.089 697.298 424.309 708.172 395.932 707.799C368.665 707.441 341.192 702.186 314.507 696.364C265.547 685.02 210.312 669.825 163.644 651.344C158.221 649.137 152.839 646.83 147.502 644.425C147.488 649.592 147.614 655.574 147.432 660.676C146.665 657.205 147 647.996 147.059 644.077C132.121 637.353 123.916 627.739 133.758 611.597Z"/>
                <!-- 亮部装饰层 -->
                <path fill="url(#lightGradient)" d="M196.709 442.047C199.634 441.557 215.573 434.47 220.896 432.959C239.916 427.562 259.23 423.08 278.826 420.386C347.58 410.935 418.271 410.831 487.5 410.251L579.868 410.375C625.886 410.798 675.446 412.142 721.245 417.621C739.747 419.725 758.097 423 776.184 427.428C782.986 429.132 793.267 433.63 799.444 434.417L800.115 434.83C801.721 435.801 806.097 437.683 808.012 438.563C818.632 443.446 827.281 449.98 831.114 461.594C820.179 456.902 808.94 452.014 797.395 449.066C758.078 439.028 716.584 436.548 676.173 434.764C629.055 433.153 581.908 432.524 534.763 432.878C522.679 432.958 510.588 433.385 498.502 433.457C429.193 433.868 359.239 432.51 290.118 438.391C252.547 441.587 200.667 448.116 168.19 468.911C170.809 458.974 180.246 451.85 188.637 446.891C191.25 445.346 194.369 443.907 196.709 442.047Z"/>
                <!-- 眼睛腮红区域 -->
                <path fill="url(#eyeGradient)" filter="url(#shadow3d)" d="M516.729 456.264C557.699 455.631 601.857 457.135 642.926 458.603C671.512 459.624 716.843 461.294 743.986 467.878C749.118 469.137 754.031 471.163 758.559 473.887C777.734 485.278 784.544 503.972 790.081 524.998C798.068 555.331 801.203 600.534 773.217 621.801C756.499 634.506 728.874 641.949 708.318 646.935C715.014 637.471 719.516 626.633 721.495 615.21C724.786 595.327 720.001 574.953 708.203 558.614C686.176 527.619 647.825 521.798 617.043 543.819C601.31 555.182 590.65 572.252 587.345 591.375C582.897 618.693 594.19 635.03 609.067 655.746C564.849 634.556 549.706 593.086 492.891 604.921C481.217 608.156 467.805 613.753 458.145 621.053C437.055 636.993 432.335 647.685 406.38 657.539C415.949 647.369 425.114 630.779 427.697 616.967C431.203 597.485 426.7 577.413 415.207 561.297C393.274 529.971 352.42 523.925 322.125 546.368C288.847 571.02 283.458 617.667 307.658 650.315C302.012 648.639 295.56 647.637 289.801 646.052C270.154 640.645 247.754 634.067 232.85 619.635C220.596 607.771 213.64 584.864 213.902 567.897C214.291 542.61 221.993 502.919 239.667 484.166C244.442 479.099 258.579 471.018 265.222 469.464C299.295 461.497 339.045 460.576 373.852 459.356C421.458 457.553 469.09 456.522 516.729 456.264Z"/>
                <!-- 左眼 -->
                <g class="eye-left">
                    <path class="eye-circle-left" fill="url(#eyeGradient)" filter="url(#shadow3d)" d="M361.31 561.203C369.854 560.652 378.872 563.646 385.565 569.037C410.05 588.762 407.618 632.159 379.328 647.272C374.158 650.034 369.675 650.962 363.874 651.522C354.15 651.595 345.18 649.329 337.55 643.114C328.506 635.63 322.739 624.913 321.476 613.243C319.01 588.253 335.192 563.374 361.31 561.203Z"/>
                    <path class="eye-wink-left" fill="none" stroke="url(#eyeGradient)" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" d="M340 575 L370 605 L340 635"/>
                </g>
                
                <polygon class="star star-left" fill="url(#starGradient)" filter="url(#shadow3d)" points="320,540 325,555 340,555 328,565 333,580 320,570 307,580 312,565 300,555 315,555"/>
                <!-- 右眼 -->
                <g class="eye-right">
                    <path fill="url(#eyeGradient)" filter="url(#shadow3d)" d="M651.151 558.644C672.884 556.213 689.776 574.256 693.175 594.525C695.425 607.887 692.196 621.592 684.217 632.543C677.361 641.969 668.693 647.188 657.258 648.982C634.535 649.961 618.159 634.913 614.584 612.797C612.419 599.965 615.485 586.8 623.097 576.245C630.08 566.612 639.387 560.474 651.151 558.644Z"/>
                </g>
                
            </svg>
        `;

        animationContainer.appendChild(character);
        button.appendChild(animationContainer);

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
            // 允许在按钮元素、SVG 或其子元素上拖拽
            if (event.target === element || element.contains(event.target)) {
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
        let styleContents = ''; // 在函数作用域声明，以便后续使用

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

            // 🔧 提取内联样式（fill.html 中的 <style> 标签）
            const inlineStyles = doc.querySelectorAll("head style");
            styleContents = Array.from(inlineStyles).map(style => style.textContent).join('\n');

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

        // 🔧 修复图片路径：将相对路径转换为 Chrome extension 绝对路径
        const images = container.querySelectorAll('img');
        images.forEach(img => {
            const src = img.getAttribute('src');
            if (src && !src.startsWith('http') && !src.startsWith('chrome-extension://') && !src.startsWith('data:')) {
                // 相对路径，需要转换
                const absoluteUrl = chrome.runtime.getURL(`popup/${src}`);
                img.setAttribute('src', absoluteUrl);
            }
        });

        // 🔧 注入提取的内联样式到 Shadow DOM
        if (styleContents) {
            const pageStyle = document.createElement("style");
            pageStyle.setAttribute('data-page-style', 'fill.html');
            pageStyle.textContent = styleContents;
            shadowRoot.appendChild(pageStyle);

            // 🔧 强制触发重绘，确保样式立即生效
            void container.offsetHeight;
        }

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

                    // 检查填充状态，如果正在运行则阻止导航
                    if (fillState === 'running') {
                        alert('智能填充正在进行中，无法切换菜单！\n\n您可以点击"暂停填充"按钮暂停后再切换。');
                        return;
                    }

                    // 如果是暂停状态，允许切换但重置填充状态
                    if (fillState === 'pause') {
                        // 重置填充状态到 ready
                        changeState('ready');
                        // 解锁简历
                        isResumeLocked = false;
                        // 解锁任务背景输入框
                        unlockTaskInput();
                        console.log('[createResumeWindow] 暂停状态下切换菜单，已重置填充状态');
                    }

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

            // 🔧 修复图片路径：将相对路径转换为 Chrome extension 绝对路径
            const images = resumeWindowContainer.querySelectorAll('img');
            images.forEach(img => {
                const src = img.getAttribute('src');
                if (src && !src.startsWith('http') && !src.startsWith('chrome-extension://') && !src.startsWith('data:')) {
                    // 相对路径，需要转换
                    const absoluteUrl = chrome.runtime.getURL(`popup/${src}`);
                    img.setAttribute('src', absoluteUrl);
                }
            });

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

                // 🔧 强制触发重绘，确保样式立即生效
                void resumeWindowContainer.offsetHeight;
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
            shadowRoot.appendChild(enhancedInlineStyle);

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

            // 应用页面切换动画（对标题、额度显示和内容区域都应用动画）
            const pluginContent = resumeWindowContainer.querySelector('.plugin-content, .plugin-content-centered');
            const liquidTitle = resumeWindowContainer.querySelector('.liquid-title');
            const headerRightContainer = resumeWindowContainer.querySelector('.header-right-container');

            // 确定动画方向
            const animationClass = getPageAnimationDirection(leavingPage, pageHtml);

            // 对内容区域应用动画
            if (pluginContent) {
                // 移除所有旧的动画类
                pluginContent.classList.remove('animate-from-bottom', 'animate-from-top', 'animate-from-right', 'animate-from-left');

                // 强制重绘，确保动画类被移除
                void pluginContent.offsetHeight;

                // 添加新的动画类
                pluginContent.classList.add(animationClass);

                // 动画结束后移除动画类，避免影响后续交互
                setTimeout(() => {
                    pluginContent.classList.remove(animationClass);
                }, 400); // 与 CSS 动画时长一致
            }

            // 对标题应用动画
            if (liquidTitle) {
                // 移除所有旧的动画类
                liquidTitle.classList.remove('animate-from-bottom', 'animate-from-top', 'animate-from-right', 'animate-from-left');

                // 强制重绘，确保动画类被移除
                void liquidTitle.offsetHeight;

                // 添加新的动画类
                liquidTitle.classList.add(animationClass);

                // 动画结束后移除动画类，避免影响后续交互
                setTimeout(() => {
                    liquidTitle.classList.remove(animationClass);
                }, 400); // 与 CSS 动画时长一致
            }

            // 对右上角容器（额度显示 + 关闭按钮）应用动画
            if (headerRightContainer) {
                // 移除所有旧的动画类
                headerRightContainer.classList.remove('animate-from-bottom', 'animate-from-top', 'animate-from-right', 'animate-from-left');

                // 强制重绘，确保动画类被移除
                void headerRightContainer.offsetHeight;

                // 添加新的动画类
                headerRightContainer.classList.add(animationClass);

                // 动画结束后移除动画类，避免影响后续交互
                setTimeout(() => {
                    headerRightContainer.classList.remove(animationClass);
                }, 400); // 与 CSS 动画时长一致
            }

            // 对独立的关闭按钮应用动画（针对没有 header-right-container 的页面）
            const liquidClose = resumeWindowContainer.querySelector('.liquid-close');
            if (liquidClose && !headerRightContainer) {
                // 只有当页面没有 headerRightContainer 时才单独处理 liquidClose
                // 移除所有旧的动画类
                liquidClose.classList.remove('animate-from-bottom', 'animate-from-top', 'animate-from-right', 'animate-from-left');

                // 强制重绘，确保动画类被移除
                void liquidClose.offsetHeight;

                // 添加新的动画类
                liquidClose.classList.add(animationClass);

                // 动画结束后移除动画类，避免影响后续交互
                setTimeout(() => {
                    liquidClose.classList.remove(animationClass);
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
     * 更新菜单锁定状态的视觉反馈
     */
    function updateMenuLockState() {
        if (!resumeWindowContainer) return;

        const navItems = resumeWindowContainer.querySelectorAll(".nav-item");
        // 只有 running 状态才锁定菜单，pause 状态允许切换
        const isLocked = fillState === 'running';

        navItems.forEach(item => {
            if (isLocked) {
                // 锁定状态：降低透明度，添加禁用样式
                item.style.opacity = '0.5';
                item.style.cursor = 'not-allowed';
                item.style.pointerEvents = 'auto'; // 保持可点击以便显示提示
            } else {
                // 解锁状态：恢复正常样式
                item.style.opacity = '1';
                item.style.cursor = 'pointer';
                item.style.pointerEvents = 'auto';
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

                    // 检查填充状态，如果正在运行则阻止导航
                    if (fillState === 'running') {
                        alert('智能填充正在进行中，无法切换菜单！\n\n您可以点击"暂停填充"按钮暂停后再切换。');
                        return;
                    }

                    // 如果是暂停状态，允许切换但重置填充状态
                    if (fillState === 'pause') {
                        // 重置填充状态到 ready
                        changeState('ready');
                        // 解锁简历
                        isResumeLocked = false;
                        // 解锁任务背景输入框
                        unlockTaskInput();
                        console.log('[rebindNavigationEvents] 暂停状态下切换菜单，已重置填充状态');
                    }

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
        // 获取Shadow DOM中的元素 - 使用新的 status-display 替代 status-popup
        const fillButton = resumeWindowContainer.querySelector('#fill-action-btn');
        const statusDisplay = resumeWindowContainer.querySelector('#status-display');
        const statusPopup = resumeWindowContainer.querySelector('#status-popup'); // 旧元素，可能不存在
        const closeButton = statusPopup?.querySelector('.status-popup-close'); // 旧元素
        const statusMessage = resumeWindowContainer.querySelector('#status-message');
        const btnIcon = fillButton?.querySelector('i');
        const btnText = fillButton?.querySelector('.btn-text');

        if (!fillButton) {
            console.error("✗ 填充按钮元素未找到", { fillButton });
            return;
        }

        // status-display 是必需的（fill.html 新设计）
        if (!statusDisplay) {
            console.warn("⚠️ 状态展示框 (#status-display) 未找到，状态更新功能可能不可用");
        }
        // statusMessage 是旧设计的元素（fill.html 已移除），不存在是正常的

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
            if (!statusPopup) return; // 新设计中没有弹窗
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
            if (!statusPopup) return; // 新设计中没有弹窗
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
                // 静默失败 - 某些页面可能没有 status-display（使用旧设计）
                return;
            }
            // 移除所有状态类
            statusDisplay.classList.remove('status-success', 'status-error');

            // 根据状态设置图标和样式
            switch (type) {
                case 'processing':
                    // 显示状态框
                    statusDisplay.classList.remove('hidden');
                    statusIcon.className = 'status-icon fas fa-spinner fa-spin';
                    statusText.textContent = text || '正在处理...';
                    break;
                case 'success':
                    // success 状态由 changeState() 控制隐藏，这里只更新内容
                    statusIcon.className = 'status-icon fas fa-check-circle';
                    statusText.textContent = text || '填充完成';
                    statusDisplay.classList.add('status-success');
                    break;
                case 'error':
                    // error 状态由 changeState() 控制隐藏，这里只更新内容
                    statusIcon.className = 'status-icon fas fa-exclamation-triangle';
                    statusText.textContent = text || '出错了';
                    statusDisplay.classList.add('status-error');
                    break;
                case 'idle':
                default:
                    // idle 状态：保持隐藏（不移除 hidden 类）
                    statusIcon.className = 'status-icon fas fa-info-circle';
                    statusText.textContent = text || '准备就绪';
                // 不移除 hidden 类，保持隐藏状态
            }
        }

        /**
         * 隐藏状态展示框
         */
        function hideStatusDisplay() {
            const statusDisplay = resumeWindowContainer?.querySelector('#status-display');
            if (statusDisplay) {
                statusDisplay.classList.add('hidden');
            }
        }

        /**
         * 更新状态消息（主函数）
         */
        function updateStatusText(text, type = 'processing') {
            currentStatus = type;

            // 优先使用新的状态展示框（fill.html 中的 #status-display）
            updateStatusDisplay(type, text);

            // 如果存在旧的 statusMessage 元素，也更新它（兼容其他页面）
            if (statusMessage) {
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

                // 添加动画效果
                statusMessage.style.animation = 'none';
                setTimeout(() => {
                    statusMessage.style.animation = 'messageSlideIn 0.4s ease';
                }, 10);
            }

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

        // 点击容器外部关闭弹窗（仅旧设计需要）
        if (statusPopup) {
            resumeWindowContainer.addEventListener('click', (e) => {
                if (isPopupOpen && !statusPopup.contains(e.target) && !fillButton.contains(e.target)) {
                    closePopup();
                }
            });

            // 阻止弹窗内部点击事件冒泡
            statusPopup.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }

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

            // 加载并显示额度
            loadQuota();
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
            // 绑定"修改简历信息"按钮 - 使用文本内容精确查找
            let editResumeLink = null;
            const allSettingsItems = resumeWindowContainer.querySelectorAll('.settings-item');
            for (const item of allSettingsItems) {
                const label = item.querySelector('.settings-item-label');
                if (label && label.textContent.trim() === '修改简历信息') {
                    editResumeLink = item;
                    break;
                }
            }

            if (editResumeLink) {
                console.log('[settings] 找到修改简历信息按钮');
                // 移除原有的href属性，防止页面跳转
                editResumeLink.removeAttribute('href');
                editResumeLink.removeAttribute('data-href');
                editResumeLink.setAttribute('href', 'javascript:void(0)');

                // 使用克隆节点移除旧的事件监听器，防止重复绑定
                const newEditResumeLink = editResumeLink.cloneNode(true);
                editResumeLink.parentNode.replaceChild(newEditResumeLink, editResumeLink);

                newEditResumeLink.addEventListener('click', async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('[settings] 修改简历信息按钮被点击');
                    // 使用配置文件中的 WEB_URL（已经包含 /resume 路径）
                    const resumeUrl = window.config?.WEB_URL || 'http://localhost:3000/resume';
                    // 方式1: 通过 background script 打开新标签页
                    try {
                        const response = await chrome.runtime.sendMessage({
                            type: 'openTab',
                            url: resumeUrl
                        });

                        if (response?.success) {
                            console.log('[settings] 成功打开简历编辑页面');
                        } else {
                            throw new Error('background 返回失败');
                        }
                    } catch (error) {
                        console.error('✗ 通过 background 打开失败:', error);

                        // 方式2: 降级到直接使用 window.open
                        try {
                            const newWindow = window.open(resumeUrl, '_blank');
                            if (newWindow) {
                                console.log('[settings] 通过 window.open 打开成功');
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

            // 绑定所有设置页面的导航链接（不包括 edit-resume.html，它由上面专门处理）
            const settingsLinks = [
                { selector: 'a[data-href="privacy-settings.html"]', page: 'privacy-settings.html' },
                { selector: 'a[data-href="feedback.html"]', page: 'feedback.html' },
                { selector: 'a[data-href="help.html"]', page: 'help.html' },
                { selector: 'a[data-href="about.html"]', page: 'about.html' }
            ];

            settingsLinks.forEach(({ selector, page }) => {
                const link = resumeWindowContainer.querySelector(selector);
                if (link) {
                    // 使用克隆节点移除旧的事件监听器
                    const newLink = link.cloneNode(true);
                    link.parentNode.replaceChild(newLink, link);

                    newLink.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('[settings] Navigation link clicked:', page);
                        navigateToPage(page);
                    });
                }
            });

            // 绑定"清理缓存"按钮 - 使用文本内容查找
            const settingsItems = resumeWindowContainer.querySelectorAll('.settings-item');
            settingsItems.forEach(item => {
                // 跳过包含 toggle-switch 的 item
                if (item.querySelector('.toggle-switch')) {
                    return;
                }

                const label = item.querySelector('.settings-item-label');
                if (label && label.textContent.includes('清理缓存')) {
                    item.removeAttribute('onclick');
                    const newItem = item.cloneNode(true);
                    item.parentNode.replaceChild(newItem, item);

                    newItem.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        alert('缓存已清理');
                    });
                }
            });

            // 最后绑定 toggle-switch 切换功能
            const toggleSwitches = resumeWindowContainer.querySelectorAll('.toggle-switch');
            toggleSwitches.forEach(toggle => {
                // 移除 onclick 属性
                toggle.removeAttribute('onclick');

                // 使用克隆节点移除旧的事件监听器
                const newToggle = toggle.cloneNode(true);
                toggle.parentNode.replaceChild(newToggle, toggle);

                // 绑定新的事件监听器
                newToggle.addEventListener('click', function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    this.classList.toggle('active');
                    console.log('[settings] Toggle switch clicked, active:', this.classList.contains('active'));
                });
            });

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

        // privacy-settings.html - 隐私设置页面
        if (pageHtml === 'privacy-settings.html') {
            // 先绑定"清除填充记录"和"删除所有数据"按钮 - 使用文本内容查找
            // 注意：只处理不包含 toggle-switch 的 settings-item
            const privacyItems = resumeWindowContainer.querySelectorAll('.settings-item');
            privacyItems.forEach(item => {
                // 跳过包含 toggle-switch 的 item
                if (item.querySelector('.toggle-switch')) {
                    return;
                }

                const label = item.querySelector('.settings-item-label');
                if (label) {
                    item.removeAttribute('onclick');
                    const newItem = item.cloneNode(true);
                    item.parentNode.replaceChild(newItem, item);

                    if (label.textContent.includes('清除填充记录')) {
                        newItem.addEventListener('click', async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            await clearDeliveryRecords("确定要清除所有填充记录吗？此操作不可恢复。");
                        });
                    } else if (label.textContent.includes('删除所有数据')) {
                        newItem.addEventListener('click', async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            await clearDeliveryRecords("确定要删除所有数据吗？此操作不可恢复。");
                        });
                    }
                }
            });

            // 然后绑定 toggle-switch 切换功能
            const toggleSwitches = resumeWindowContainer.querySelectorAll('.toggle-switch');
            toggleSwitches.forEach(toggle => {
                // 移除 onclick 属性
                toggle.removeAttribute('onclick');

                // 使用克隆节点移除旧的事件监听器
                const newToggle = toggle.cloneNode(true);
                toggle.parentNode.replaceChild(newToggle, toggle);

                // 绑定新的事件监听器
                newToggle.addEventListener('click', function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    this.classList.toggle('active');
                    console.log('[privacy-settings] Toggle switch clicked, active:', this.classList.contains('active'));
                });
            });
        }

        // feedback.html - 反馈页面
        if (pageHtml === 'feedback.html') {
            // 绑定反馈类型按钮
            const feedbackTypeBtns = resumeWindowContainer.querySelectorAll('.feedback-type-btn');
            feedbackTypeBtns.forEach(btn => {
                btn.removeAttribute('onclick');
                btn.addEventListener('click', function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    // 移除所有按钮的 active 类
                    feedbackTypeBtns.forEach(b => b.classList.remove('active'));
                    // 给当前按钮添加 active 类
                    this.classList.add('active');
                });
            });

            // 绑定提交反馈按钮
            const submitBtn = resumeWindowContainer.querySelector('.btn-primary');
            if (submitBtn) {
                submitBtn.removeAttribute('onclick');
                const newSubmitBtn = submitBtn.cloneNode(true);
                submitBtn.parentNode.replaceChild(newSubmitBtn, submitBtn);

                newSubmitBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    alert('反馈已提交！');
                });
            }
        }

        // help.html - 帮助中心页面
        if (pageHtml === 'help.html') {
            // 绑定手风琴展开/收起功能
            const helpItems = resumeWindowContainer.querySelectorAll('.help-item');
            helpItems.forEach(item => {
                item.removeAttribute('onclick');
                item.addEventListener('click', function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    this.classList.toggle('expanded');
                });
            });

            // 绑定"提交反馈"按钮（跳转到反馈页面）
            // 在 help.html 中是 <a href="feedback.html"><button>...</button></a>
            const feedbackLinks = resumeWindowContainer.querySelectorAll('a');
            feedbackLinks.forEach(link => {
                const dataHref = link.getAttribute('data-href');
                if (dataHref === 'feedback.html') {
                    const newLink = link.cloneNode(true);
                    link.parentNode.replaceChild(newLink, link);

                    newLink.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        navigateToPage('feedback.html');
                    });
                }
            });
        }

        // about.html - 关于页面
        if (pageHtml === 'about.html') {
            // 绑定三个外部链接：官方网站、用户协议、隐私政策
            const aboutLinks = resumeWindowContainer.querySelectorAll('.about-link');
            aboutLinks.forEach(link => {
                const linkType = link.getAttribute('data-link-type');

                // 移除原有的 href 属性，防止页面跳转
                link.setAttribute('href', 'javascript:void(0)');

                // 使用克隆节点移除旧的事件监听器
                const newLink = link.cloneNode(true);
                link.parentNode.replaceChild(newLink, link);

                newLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    // 获取官网 URL
                    const webUrl = window.config?.HOME_URL;

                    if (!webUrl) {
                        console.error('[about.html] 未找到官网 URL 配置');
                        alert('配置错误，无法打开链接');
                        return;
                    }

                    // 根据链接类型跳转到官网不同页面
                    let targetUrl = webUrl;

                    // if (linkType === 'website') {
                    //     // 官方网站 - 跳转到官网首页
                    //     targetUrl = webUrl;
                    // } else if (linkType === 'agreement') {
                    //     // 用户协议 - 跳转到官网用户协议页面
                    //     targetUrl = webUrl + '/';
                    // } else if (linkType === 'privacy') {
                    //     // 隐私政策 - 跳转到官网隐私政策页面
                    //     targetUrl = webUrl + '/';
                    // }

                    // 在新标签页中打开
                    window.open(targetUrl, '_blank');

                    console.log(`[about.html] 打开链接: ${linkType} -> ${targetUrl}`);
                });
            });
        }

        // 绑定右上角按钮（关闭/返回/设置按钮）
        const topRightBtn = resumeWindowContainer.querySelector(".liquid-close");
        if (topRightBtn) {
            // 移除原有的内联事件属性，防止页面跳转
            topRightBtn.removeAttribute('onclick');

            // 检查是否有 data-href 属性（在 HTML 清理时保存的原始 href）
            const dataHref = topRightBtn.getAttribute('data-href');
            topRightBtn.setAttribute('href', 'javascript:void(0)');

            // 使用克隆节点移除旧的事件监听器，防止重复绑定
            const newTopRightBtn = topRightBtn.cloneNode(true);
            topRightBtn.parentNode.replaceChild(newTopRightBtn, topRightBtn);

            newTopRightBtn.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();

                // 判断按钮功能
                const icon = newTopRightBtn.querySelector('i');

                if (icon && icon.classList.contains('fa-times')) {
                    // 关闭图标 (×)
                    if (dataHref && dataHref !== 'javascript:void(0)' && dataHref !== '#') {
                        // 如果有 data-href，说明是子页面的返回按钮，跳转到对应页面
                        navigateToPage(dataHref);
                    } else {
                        // 否则关闭整个窗口
                        toggleWindow(false);
                    }
                } else {
                    // 设置图标 (⚙) - 跳转到设置页面
                    navigateToPage('settings.html');
                }
            });
        }
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
                }

                /* 排除动画元素和简历框，允许它们使用transform */
                .plugin-container *:not(.status-icon):not(.status-display):not(.resume-page-current):not(.resume-page-next):not(.plugin-content):not(.plugin-content-centered):not(.liquid-title):not(.nav-icon-box):not(.header-right-container):not(.liquid-close)  {
                    transform: none !important;
                }

                /* --- 页面切换动画 --- */
                /* 从上往下（导航栏从上到下） */
                @keyframes slideFromBottom {
                    from {
                        opacity: 0;
                        transform: translateY(30px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                /* 从下往上（导航栏从下到上） */
                @keyframes slideFromTop {
                    from {
                        opacity: 0;
                        transform: translateY(-30px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                /* 从右往左（进入子页面） */
                @keyframes slideFromRight {
                    from {
                        opacity: 0;
                        transform: translateX(30px);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }

                /* 从左往右（返回上级页面） */
                @keyframes slideFromLeft {
                    from {
                        opacity: 0;
                        transform: translateX(-30px);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }

                /* 应用动画的类 */
                .animate-from-bottom {
                    animation: slideFromBottom 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards !important;
                }

                .animate-from-top {
                    animation: slideFromTop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards !important;
                }

                .animate-from-right {
                    animation: slideFromRight 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards !important;
                }

                .animate-from-left {
                    animation: slideFromLeft 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards !important;
                }

                /* ========== 呼吸动画效果 ========== */
                /* 状态框呼吸效果 - 边框和阴影脉动 */
                @keyframes status-breathe {
                    0%, 100% {
                        border-color: var(--accent);
                        box-shadow: 0 10px 10px rgba(255, 154, 158, 0.25),
                                    0 0 0 0 rgba(255, 154, 158, 0.4);
                    }
                    50% {
                        border-color: var(--primary);
                        box-shadow: 0 10px 20px rgba(255, 154, 158, 0.35),
                                    0 0 15px 5px rgba(87, 197, 182, 0.3);
                    }
                }

                /* 图标脉动效果 */
                @keyframes icon-pulse {
                    0%, 100% {
                        transform: scale(1);
                        opacity: 1;
                    }
                    50% {
                        transform: scale(1.15);
                        opacity: 0.8;
                    }
                }

                /* 运行状态的呼吸效果类 */
                .status-display.breathing {
                    animation: status-breathe 2s ease-in-out infinite !important;
                }

                .status-icon.pulsing {
                    animation: icon-pulse 1.5s ease-in-out infinite !important;
                }

                /* 转圈图标（processing 状态）颜色 */
                .status-icon.fa-spinner {
                    color: #FF9A9E !important;
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

                        // 也加载 Regular 版本（fa-regular）
                        const regularFontUrl = chrome.runtime.getURL('popup/webfonts/fa-regular-400.woff2');
                        const regularFont = new FontFace('Font Awesome 6 Free', `url(${regularFontUrl})`, {
                            weight: '400',
                            style: 'normal'
                        });

                        await regularFont.load();
                        document.fonts.add(regularFont);

                        // 加载 Brands 版本
                        const brandsFontUrl = chrome.runtime.getURL('popup/webfonts/fa-brands-400.woff2');
                        const brandsFont = new FontFace('Font Awesome 6 Brands', `url(${brandsFontUrl})`, {
                            weight: '400',
                            style: 'normal'
                        });

                        await brandsFont.load();
                        document.fonts.add(brandsFont);

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
                    background-color: transparent;
                    border: none;
                    border-radius: 50%;
                    cursor: pointer !important;
                    width: 80px;
                    height: 80px;
                    padding: 0;
                    overflow: visible;
                    transition: transform 0.3s ease;
                }

                #logo-button:hover {
                    cursor: pointer !important;
                    transform: scale(1.05);
                }

                #logo-button .character-container {
                    width: 100%;
                    height: 100%;
                    position: relative;
                }

                #logo-button .character {
                    width: 100%;
                    height: 100%;
                    animation: wiggle 3s ease-in-out infinite;
                    transform-origin: bottom center;
                }

                #logo-button .character svg {
                    width: 100%;
                    height: 100%;
                }

                /* 身体扭动动画 */
                @keyframes wiggle {
                    0%, 100% {
                        transform: rotate(-1deg) translateY(0);
                    }
                    25% {
                        transform: rotate(0deg) translateY(-3px);
                    }
                    50% {
                        transform: rotate(1deg) translateY(0);
                    }
                    75% {
                        transform: rotate(0deg) translateY(-3px);
                    }
                }

                /* 眼睛动画 - 左右移动 */
                #logo-button .eye-left, #logo-button .eye-right {
                    transform-origin: center;
                    animation: eyeMove 10s ease-in-out infinite;
                }

                /* 左眼圆形 - wink时隐藏 */
                #logo-button .eye-circle-left {
                    animation: eyeCircleAnim 10s ease-in-out infinite;
                }

                /* 左眼高光 - wink时隐藏 */
                #logo-button .eye-highlight-left {
                    animation: eyeCircleAnim 10s ease-in-out infinite;
                }

                /* 左眼 > 形状 - wink时显示 */
                #logo-button .eye-wink-left {
                    opacity: 0;
                    animation: eyeWinkAnim 10s ease-in-out infinite;
                }

                @keyframes eyeMove {
                    0%, 100% {
                        transform: translateX(0);
                    }
                    12% {
                        transform: translateX(6px);
                    }
                    25% {
                        transform: translateX(-6px);
                    }
                    37%, 100% {
                        transform: translateX(0);
                    }
                }

                @keyframes eyeCircleAnim {
                    0%, 40% {
                        opacity: 1;
                        visibility: visible;
                    }
                    42%, 67% {
                        opacity: 0;
                        visibility: hidden;
                    }
                    69%, 100% {
                        opacity: 1;
                        visibility: visible;
                    }
                }

                @keyframes eyeWinkAnim {
                    0%, 40% {
                        opacity: 0;
                    }
                    42%, 67% {
                        opacity: 1;
                    }
                    69%, 100% {
                        opacity: 0;
                    }
                }

                /* 星星动画 */
                #logo-button .star {
                    opacity: 0;
                    transform-origin: center;
                    animation: starPop 10s ease-in-out infinite;
                }

                #logo-button .star-left {
                    animation-delay: 0s;
                }

                @keyframes starPop {
                    0%, 40% {
                        opacity: 0;
                        transform: scale(0) rotate(0deg);
                    }
                    44% {
                        opacity: 1;
                        transform: scale(1.3) rotate(20deg);
                    }
                    50% {
                        opacity: 1;
                        transform: scale(1) rotate(0deg);
                    }
                    65% {
                        opacity: 1;
                        transform: scale(1) rotate(5deg);
                    }
                    70% {
                        opacity: 0;
                        transform: scale(0.3) rotate(-20deg);
                    }
                    100% {
                        opacity: 0;
                        transform: scale(0) rotate(0deg);
                    }
                }

                /* 嘴巴表情动画 */
                #logo-button .mouth {
                    transform-origin: center;
                    animation: mouthExpression 8s ease-in-out infinite;
                }

                @keyframes mouthExpression {
                    0%, 100% {
                        transform: scaleX(1) scaleY(1.07);
                    }
                    25% {
                        transform: scaleX(1.1) scaleY(1.03);
                    }
                    50% {
                        transform: scaleX(0.95) scaleY(1.07);
                    }
                    75% {
                        transform: scaleX(1.05) scaleY(1.05);
                    }
                }

                /* 触角动画 */
                #logo-button .antenna {
                    transform-origin: 810px 180px;
                    animation: antennaWiggle 3s ease-in-out infinite;
                }

                @keyframes antennaWiggle {
                    0%, 100% {
                        transform: rotate(-8deg);
                    }
                    50% {
                        transform: rotate(8deg);
                    }
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

            // ✅ 添加基础样式保护层（适用于所有网站）
            const finalProtectionStyle = document.createElement("style");
            finalProtectionStyle.textContent = `
                /* 基础重置 - 适用于所有网站 */
                .plugin-container,
                .plugin-container * {
                    /* 重置line-height，防止元素高度被拉长 */
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
                    margin: 7 0 -6px 0 !important;
                    line-height: 1.4 !important;
                    height: auto !important;
                    min-height: auto !important;
                }

                .job-item * {
                    line-height: 1.4 !important;
                }

                /* 所有文本元素line-height重置 */
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
                    margin: 0 0 0px 0 !important;
                    padding: 15px !important;
                    line-height: 1.4 !important;
                }

                .privacy-card {
                    margin: 0 0 15px 0 !important;
                }

                .task-card {
                    padding: 12px !important;
                    height: 120px !important;
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
                    padding: 10px 14px !important;
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

            // ✅ 检测美团网站，应用额外的激进样式保护
            const isMeituanSite = window.location.hostname.includes('meituan.com') ||
                window.location.hostname.includes('zhaopin.meituan.com');

            if (isMeituanSite) {
                const meituanProtectionStyle = document.createElement("style");
                meituanProtectionStyle.textContent = `
                    /* ========== 美团网站专用样式保护 ========== */

                    /* 1. 超强变形属性重置 - 美团可能使用了transform/scale */
                    .plugin-container,
                    .plugin-container *,
                    .plugin-container *::before,
                    .plugin-container *::after {
                        transform: none !important;
                        translate: none !important;
                        rotate: none !important;
                        scale: none !important;
                        zoom: 1 !important;
                        -webkit-transform: none !important;
                    }

                    /* 2. 窗口容器额外定位保护 - 防止被美团的布局影响 */
                    #resume-window-container {
                        transform: none !important;
                        translate: none !important;
                        width: 420px !important;
                        height: min(600px, calc(100vh - 80px)) !important;
                        max-height: calc(100vh - 80px) !important;
                        flex: none !important;
                        flex-grow: 0 !important;
                        flex-shrink: 0 !important;
                        flex-basis: auto !important;
                    }

                    /* 3. 主容器严格定位 - 防止内容下移 */
                    .plugin-container {
                        position: relative !important;
                        top: 0 !important;
                        left: 0 !important;
                        transform: none !important;
                        overflow: hidden !important;
                        display: flex !important;
                    }

                    /* 4. 侧边栏和主区域固定 */
                    .plugin-container .sidebar {
                        position: relative !important;
                        top: 0 !important;
                        left: 0 !important;
                        width: 50px !important;
                        flex-shrink: 0 !important;
                        transform: none !important;
                    }

                    .plugin-container .main-area {
                        position: relative !important;
                        top: 0 !important;
                        left: 0 !important;
                        flex: 1 !important;
                        transform: none !important;
                        overflow: hidden !important;
                        display: flex !important;
                        flex-direction: column !important;
                    }

                    /* 5. 标题和关闭按钮绝对定位保护 - 防止下移 */
                    .plugin-container .liquid-title {
                        position: absolute !important;
                        top: 20px !important;
                        left: 65px !important;
                        transform: none !important;
                        z-index: 20 !important;
                    }

                    .plugin-container .liquid-close {
                        position: absolute !important;
                        top: 15px !important;
                        right: 15px !important;
                        transform: none !important;
                        z-index: 20 !important;
                    }

                    /* 6. 滚动内容区严格padding - 防止内容下移 */
                    .plugin-container .plugin-content {
                        position: relative !important;
                        top: 0 !important;
                        left: 0 !important;
                        padding: 75px 15px 20px 15px !important;
                        transform: none !important;
                        overflow-y: auto !important;
                        overflow-x: hidden !important;
                    }

                    /* 7. job-item额外高度控制 - 防止被拉长 */
                    .plugin-container .job-item {
                        width: 100% !important;
                        height: auto !important;
                        min-height: auto !important;
                        max-height: none !important;
                        transform: none !important;
                        box-sizing: border-box !important;
                    }

                    .plugin-container .job-item * {
                        transform: none !important;
                    }

                    /* 8. 卡片元素额外保护 */
                    .plugin-container .content-card,
                    .plugin-container .task-card,
                    .plugin-container .book-wrapper {
                        position: relative !important;
                        top: 0 !important;
                        left: 0 !important;
                        transform: none !important;
                        box-sizing: border-box !important;
                    }

                    /* 9. 按钮元素额外保护（排除 liquid-cta-btn，它需要 transform 动画） */
                    .plugin-container .btn-primary,
                    .plugin-container .btn-danger,
                    .plugin-container .view-btn {
                        transform: none !important;
                        position: relative !important;
                    }

                    /* 10. 表单元素额外保护（排除 liquid-cta-btn 按钮） */
                    .plugin-container input,
                    .plugin-container textarea,
                    .plugin-container select,
                    .plugin-container button:not(.liquid-cta-btn) {
                        transform: none !important;
                        zoom: 1 !important;
                        scale: 1 !important;
                    }

                    /* 11. 防止opacity和filter影响 */
                    .plugin-container,
                    .plugin-container * {
                        opacity: 1 !important;
                        filter: none !important;
                        backdrop-filter: none !important;
                        -webkit-filter: none !important;
                    }

                    /* 12. 防止vertical-align和float影响布局 */
                    .plugin-container * {
                        vertical-align: baseline !important;
                        float: none !important;
                        clear: none !important;
                    }

                    /* 13. 特殊元素额外保护 */
                    .plugin-container .resume-header,
                    .plugin-container .resume-meta,
                    .plugin-container .info-grid-compact,
                    .plugin-container .info-cell,
                    .plugin-container .settings-group,
                    .plugin-container .settings-item,
                    .plugin-container .profile-header,
                    .plugin-container .profile-content-wrapper {
                        transform: none !important;
                    }
                `;
                shadowRoot.appendChild(meituanProtectionStyle);
            }

            // 2. Font Awesome 已在 loadStyles() 中加载，这里不需要额外处理

            // 验证样式是否成功注入
            const styleCount = shadowRoot.querySelectorAll('style').length;

            // 调试：检查图标元素的实际状态
            setTimeout(() => {

                const iconElements = shadowRoot.querySelectorAll('.fas, .far, .fab, [class*="fa-"]');

                if (iconElements.length > 0) {
                    const firstIcon = iconElements[0];

                    // 检查<style>标签内容
                    const styles = shadowRoot.querySelectorAll('style');

                    // 直接检查 CSS 中是否有 fa-info-circle 的 content 定义
                    for (let i = 0; i < styles.length; i++) {
                        const content = styles[i].textContent;
                        if (content.includes('fa-info-circle')) {
                            // 查找包含 fa-info-circle 和 content 的规则
                            const pattern = /\.fa-info-circle[^{]*::?before[^}]*content[^}]*\}/gi;
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

                            // 提取一个示例规则
                            const match = content.match(/\.fa-magic::?before[^}]+content[^}]+/);
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
                    });
                }
            }, 1500);

            // ========== 方案1: 注入增强版内联样式 ==========

            // 生成并注入当前页面的强化内联样式
            const enhancedInlineStyle = document.createElement("style");
            enhancedInlineStyle.setAttribute('data-enhanced-inline-styles', 'true');
            enhancedInlineStyle.setAttribute('data-priority', 'highest');
            shadowRoot.appendChild(enhancedInlineStyle);


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
     * @param {string|boolean} mode - 显示模式：always/smart/hidden 或 show/auto/hidden（兼容旧版） 或 布尔值
     */
    function setButtonMode(mode) {
        const hostElement = document.getElementById("yn-ai");
        if (!hostElement) {
            console.warn('[setButtonMode] yn-ai 元素不存在，可能是在官网页面或UI未初始化');
            return;
        }

        if (typeof mode === "boolean") {
            hostElement.style.display = mode ? "block" : "none";
        } else {
            switch (mode) {
                case "always":  // 新模式名称：常驻显示
                case "show":    // 兼容旧模式名称
                    hostElement.style.display = "block";
                    break;
                case "smart":   // 新模式名称：智能显示（根据条件自动显示/隐藏）
                case "auto":    // 兼容旧模式名称
                    // 智能模式：暂时保持显示，后续可以根据页面类型等条件控制
                    hostElement.style.display = "block";
                    break;
                case "hidden":  // 隐藏按钮
                    hostElement.style.display = "none";
                    break;
                default:
                    console.warn('[setButtonMode] 未知的按钮模式:', mode);
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
                if (confirm("当前插件尚未登录，请前往网页端登录或同步数据。")) {
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
            const quotaResult = await apiRequestForGet("quota", {}, false);
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
                        // 刷新额度显示
                        loadQuota();
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
        // 注意：暂停状态不解锁，只有在切换菜单时才解锁并重置
        if (["ready", "success", "error", "quota"].includes(state)) {
            if (isResumeLocked) {
                isResumeLocked = false;
            }
            // 解锁任务背景输入框
            unlockTaskInput();
        }

        // 更新菜单锁定状态的视觉反馈
        updateMenuLockState();

        // TODO: 根据fill.html的按钮实现状态变化
        const startButton = resumeWindowContainer?.querySelector(".liquid-cta-btn");
        const statusDisplay = resumeWindowContainer?.querySelector("#status-display");
        const buttonContainer = resumeWindowContainer?.querySelector(".liquid-cta-container");

        if (!startButton) {
            console.warn("[changeState] 未找到填充按钮");
            return;
        }

        switch (state) {
            case "running":
                // 显示状态框
                if (statusDisplay) {
                    statusDisplay.classList.remove("hidden");
                    // 添加呼吸动画
                    statusDisplay.classList.add("breathing");

                    // 给图标添加脉动效果
                    const statusIcon = statusDisplay.querySelector(".status-icon");
                    if (statusIcon) {
                        statusIcon.classList.add("pulsing");
                    }
                }
                // 容器改为左对齐
                if (buttonContainer) {
                    buttonContainer.classList.add("running");
                }
                // 按钮变成图标模式（只显示暂停图标）
                startButton.innerHTML = '<i class="fas fa-pause"></i><span class="btn-text">暂停填充</span>';
                startButton.classList.add("icon-mode");
                startButton.classList.add("paused");
                startButton.style.pointerEvents = "auto";
                break;

            case "pause":
                // 显示状态框
                if (statusDisplay) {
                    statusDisplay.classList.remove("hidden");
                    // 暂停状态：移除呼吸动画
                    statusDisplay.classList.remove("breathing");

                    const statusIcon = statusDisplay.querySelector(".status-icon");
                    if (statusIcon) {
                        statusIcon.classList.remove("pulsing");
                    }
                }
                // 容器保持左对齐
                if (buttonContainer) {
                    buttonContainer.classList.add("running");
                }
                // 按钮变成图标模式（只显示继续图标）
                startButton.innerHTML = '<i class="fas fa-play"></i><span class="btn-text">继续填充</span>';
                startButton.classList.add("icon-mode");
                startButton.classList.remove("paused");
                startButton.style.pointerEvents = "auto";
                break;

            case "success":
                // 隐藏状态框（填充完成后自动隐藏）
                if (statusDisplay) {
                    statusDisplay.classList.add("hidden");
                    // 完成状态：移除呼吸动画
                    statusDisplay.classList.remove("breathing");

                    const statusIcon = statusDisplay.querySelector(".status-icon");
                    if (statusIcon) {
                        statusIcon.classList.remove("pulsing");
                    }
                }
                // 容器恢复居中对齐
                if (buttonContainer) {
                    buttonContainer.classList.remove("running");
                }
                // 按钮恢复完整模式并居中显示
                startButton.innerHTML = '<i class="fas fa-check-circle"></i><span class="btn-text">填充完成</span>';
                startButton.classList.remove("icon-mode");
                startButton.classList.remove("paused");
                startButton.style.pointerEvents = "auto";
                startButton.style.opacity = "1";
                break;

            case "error":
                // 隐藏状态框（错误发生后自动隐藏）
                if (statusDisplay) {
                    statusDisplay.classList.add("hidden");
                    // 错误状态：移除呼吸动画
                    statusDisplay.classList.remove("breathing");

                    const statusIcon = statusDisplay.querySelector(".status-icon");
                    if (statusIcon) {
                        statusIcon.classList.remove("pulsing");
                    }
                }
                // 容器恢复居中对齐
                if (buttonContainer) {
                    buttonContainer.classList.remove("running");
                }
                // 按钮恢复完整模式并居中显示
                startButton.innerHTML = '<i class="fas fa-exclamation-circle"></i><span class="btn-text">填充错误</span>';
                startButton.classList.remove("icon-mode");
                startButton.classList.remove("paused");
                startButton.style.pointerEvents = "auto";
                startButton.style.opacity = "1";
                break;

            case "quota":
                // 隐藏状态框（配额用完后自动隐藏）
                if (statusDisplay) {
                    statusDisplay.classList.add("hidden");
                    // 配额用完：移除呼吸动画
                    statusDisplay.classList.remove("breathing");

                    const statusIcon = statusDisplay.querySelector(".status-icon");
                    if (statusIcon) {
                        statusIcon.classList.remove("pulsing");
                    }
                }
                // 容器恢复居中对齐
                if (buttonContainer) {
                    buttonContainer.classList.remove("running");
                }
                // 按钮恢复完整模式并居中显示
                startButton.innerHTML = '<i class="fas fa-battery-empty"></i><span class="btn-text">配额已用完</span>';
                startButton.classList.remove("icon-mode");
                startButton.classList.remove("paused");
                startButton.style.pointerEvents = "auto";
                startButton.style.opacity = "1";
                break;

            case "learning":
                // 显示状态框
                if (statusDisplay) {
                    statusDisplay.classList.remove("hidden");
                    // 学习状态：添加呼吸动画（学习中也是运行状态）
                    statusDisplay.classList.add("breathing");

                    const statusIcon = statusDisplay.querySelector(".status-icon");
                    if (statusIcon) {
                        statusIcon.classList.add("pulsing");
                    }
                }
                // 容器改为左对齐
                if (buttonContainer) {
                    buttonContainer.classList.add("running");
                }
                // 按钮恢复完整模式
                startButton.innerHTML = '<i class="fas fa-brain"></i><span class="btn-text">学习中</span>';
                startButton.classList.remove("icon-mode");
                startButton.style.pointerEvents = "auto";
                startButton.style.opacity = "1";
                break;

            default: // ready 状态
                // 隐藏状态框
                if (statusDisplay) {
                    statusDisplay.classList.add("hidden");
                    // 移除所有动画
                    statusDisplay.classList.remove("breathing");

                    const statusIcon = statusDisplay.querySelector(".status-icon");
                    if (statusIcon) {
                        statusIcon.classList.remove("pulsing");
                    }
                }
                // 容器恢复居中
                if (buttonContainer) {
                    buttonContainer.classList.remove("running");
                }
                // 按钮恢复完整模式
                startButton.innerHTML = '<i class="fas fa-bolt"></i><span class="btn-text">智能填充</span>';
                startButton.classList.remove("icon-mode");
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
        // 更新状态展示（如果存在）
        // 直接使用 window.updateStatusPopup，因为它在 initStatusPopup 中被暴露
        if (typeof window.updateStatusPopup === 'function') {
            window.updateStatusPopup(text, statusType);
        }
        // 不存在时静默处理 - 状态更新由 changeState() 函数处理

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
    // 简历数据管理
    // ============================================================================

    let resumeList = []; // 简历列表
    let resumeProfileList = []; // 我的主页简历列表
    let currentResumeIndex = 0; // 当前选中的简历索引（用于填充页面）
    let currentProfileResumeIndex = 0; // 当前选中的简历索引（用于个人中心页面）
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
            resumeNameEl.textContent = `${resume.name || '未命名'}`;
        }

        // 更新简历名称 (resume-type)
        const resumeType = resumeWindowContainer.querySelector('.resume-type');
        if (resumeType) {
            resumeType.textContent = `简历源：${resume.resumeName || '未命名简历'}.pdf`;
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
        chrome.storage.local.get(['auth'], function (result) {
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
     * 加载并更新额度显示
     */
    async function loadQuota() {
        try {
            // 获取额度值元素和容器
            const quotaValueEl = resumeWindowContainer?.querySelector('#quota-value');
            const quotaDisplay = resumeWindowContainer?.querySelector('.quota-display');

            if (!quotaValueEl) {
                console.warn('⚠ 未找到额度显示元素 #quota-value');
                return;
            }

            // 默认隐藏容器
            if (quotaDisplay) {
                quotaDisplay.style.display = 'none';
            }

            // 先从 chrome.storage.local 读取缓存的额度
            const { myQuota } = await chrome.storage.local.get('myQuota');

            // 如果有缓存数据，先显示缓存值
            if (typeof myQuota !== 'undefined' && myQuota !== null) {
                quotaValueEl.textContent = myQuota;
                quotaValueEl.className = 'quota-value';

                // 根据缓存值添加样式类
                if (myQuota <= 0) {
                    quotaValueEl.classList.add('empty');
                } else if (myQuota <= 10) {
                    quotaValueEl.classList.add('low');
                }

                // 根据缓存值决定是否显示
                if (quotaDisplay) {
                    if (myQuota >= 3 && myQuota <= 10) {
                        quotaDisplay.style.display = 'none';
                    } else {
                        quotaDisplay.style.display = 'flex';
                    }
                }
            }

            // 调用接口获取最新额度
            const quotaResult = await apiRequestForGet("quota", {}, false);

            if (quotaResult && typeof quotaResult.quota !== 'undefined') {
                const quotaValue = quotaResult.quota;

                // 保存到 chrome.storage.local
                await chrome.storage.local.set({ myQuota: quotaResult.quota });

                // 更新显示
                quotaValueEl.textContent = quotaValue;

                // 根据额度值添加不同的样式类
                quotaValueEl.className = 'quota-value';
                if (quotaValue <= 0) {
                    quotaValueEl.classList.add('empty');
                } else if (quotaValue <= 10) {
                    quotaValueEl.classList.add('low');
                }

                // 当额度在 3-10 之间时，隐藏整个额度显示容器
                if (quotaDisplay) {
                    if (quotaValue >= 3 && quotaValue <= 10) {
                        quotaDisplay.style.display = 'none';
                    } else {
                        quotaDisplay.style.display = 'flex';
                    }
                }

                console.log(`[loadQuota] 额度加载成功: ${quotaValue}`);
            } else {
                throw new Error('额度数据格式错误');
            }
        } catch (error) {
            console.error('❌ 加载额度失败:', error);
            const quotaValueEl = resumeWindowContainer?.querySelector('#quota-value');
            const quotaDisplay = resumeWindowContainer?.querySelector('.quota-display');

            // 出错时，如果有缓存数据就保持显示，没有就隐藏
            const { myQuota } = await chrome.storage.local.get('myQuota');

            if (typeof myQuota !== 'undefined' && myQuota !== null) {
                // 有缓存，保持显示缓存值
                if (quotaValueEl) {
                    quotaValueEl.textContent = myQuota;
                    quotaValueEl.className = 'quota-value';
                }
                if (quotaDisplay && !(myQuota >= 3 && myQuota <= 10)) {
                    quotaDisplay.style.display = 'flex';
                }
            } else {
                // 没有缓存，显示错误信息
                if (quotaValueEl) {
                    quotaValueEl.textContent = '获取失败';
                    quotaValueEl.className = 'quota-value';
                }
                if (quotaDisplay) {
                    quotaDisplay.style.display = 'flex';
                }
            }
        }
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

            // 同步数据到 resumeProfileList（用于 profile.html 页面）
            resumeProfileList = [...resumeList];

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

            // 绑定简历切换事件（fill.html 页面的切换事件）
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

            // 判断当前页面，决定渲染逻辑
            const isProfilePage = currentPage === 'profile.html';

            if (isProfilePage) {
                // profile.html 页面：同步数据到 resumeProfileList
                resumeProfileList = [...resumeList]; // 使用展开运算符复制数组，避免引用同一数组

                // 初始化 profile 页面的索引（与 fill 页面独立）
                currentProfileResumeIndex = 0;

                // 更新 profile 页面的简历显示
                updateProfileResumeDisplay();

                // 绑定 profile 页面的简历切换事件
                bindResumeSwitchEventsProfile();

            } else {
                // 其他页面（如 fill.html）：使用原有逻辑
                // 渲染简历数据
                renderResumeData();

                // 绑定简历切换事件
                bindResumeSwitchEvents();
            }

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

    /**
     * 更新个人中心页面的简历显示
     */
    function updateProfileResumeDisplay() {
        if (!resumeWindowContainer) return;

        // 确保 resumeProfileList 有数据
        if (!resumeProfileList || resumeProfileList.length === 0) {
            console.warn('[updateProfileResumeDisplay] resumeProfileList 为空');
            return;
        }

        // 获取当前简历数据
        const currentResume = resumeProfileList[currentProfileResumeIndex];
        if (!currentResume) {
            console.warn('[updateProfileResumeDisplay] 无法获取当前简历数据');
            return;
        }

        // 更新简历头部信息
        const resumeNameEl = resumeWindowContainer.querySelector('#resume-nickname');
        if (resumeNameEl) {
            resumeNameEl.textContent = currentResume.name || '未命名';
        }

        const resumeTypeEl = resumeWindowContainer.querySelector('.resume-type');
        if (resumeTypeEl) {
            resumeTypeEl.textContent =  `简历源：${currentResume.resumeName || '未命名简历'}.pdf`;
        }

        // 更新简历详细信息 - 使用更精确的选择器
        const infoCells = resumeWindowContainer.querySelectorAll('.info-grid-compact .info-cell');

        // 创建一个映射来更新对应的字段
        const fieldMap = {
            '学校': currentResume.school || '-',
            '学历': currentResume.educationDegreeText || '-',
            '专业': currentResume.major || '-',
            '毕业年份': currentResume.graduationYear || '-',
            '手机': currentResume.phone || '-',
            '邮箱': currentResume.email || '-',
            '意向岗位': currentResume.jobIntention || '-',
            '期望城市': currentResume.expectedCity || '-',
            '核心技能': currentResume.coreSkills || '-'
        };

        // 遍历所有 info-cell 并更新值
        infoCells.forEach(cell => {
            const labelEl = cell.querySelector('.info-cell-label');
            const valueEl = cell.querySelector('.info-cell-value');

            if (labelEl && valueEl) {
                const label = labelEl.textContent.trim();
                if (fieldMap.hasOwnProperty(label)) {
                    valueEl.textContent = fieldMap[label];
                }
            }
        });

    }

    /**
     * 绑定简历切换事件
     */
    function bindResumeSwitchEventsProfile() {
        if (!resumeWindowContainer) return;

        // 绑定"往前切换"按钮
        const prevBtn = resumeWindowContainer.querySelector('.resume-switch-prev2');
        if (prevBtn) {

            // 移除旧的事件监听器
            const newPrevBtn = prevBtn.cloneNode(true);
            prevBtn.parentNode.replaceChild(newPrevBtn, prevBtn);

            // 绑定点击事件
            newPrevBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();

                if (resumeProfileList.length > 1) {
                    // 往前切换（索引减1，如果到头则循环到最后）
                    currentProfileResumeIndex = (currentProfileResumeIndex - 1 + resumeProfileList.length) % resumeProfileList.length;
                    updateProfileResumeDisplay();
                }
            });
        }

        // 绑定"往后切换"按钮
        const nextBtn = resumeWindowContainer.querySelector('.resume-switch-next2');
        if (nextBtn) {
            // 移除旧的事件监听器
            const newNextBtn = nextBtn.cloneNode(true);
            nextBtn.parentNode.replaceChild(newNextBtn, nextBtn);

            // 绑定点击事件
            newNextBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();

                if (resumeProfileList.length > 1) {
                    // 往后切换（索引加1，如果到尾则循环到开头）
                    currentProfileResumeIndex = (currentProfileResumeIndex + 1) % resumeProfileList.length;
                    updateProfileResumeDisplay();
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
     * 清除投递记录
     * 清空所有投递历史记录和导航历史
     */
    async function clearDeliveryRecords(confirmMessage) {
        try {
            // 确认对话框
            const confirmed = confirm(confirmMessage || '确定要清除所有数据吗？此操作不可恢复。');

            if (!confirmed) {
                return;
            }

            // 清除 chrome.storage.local 中的投递历史相关数据
            await chrome.storage.local.remove([
                'historyTabs',           // 待处理的投递记录
                'applicationRecords',    // 已保存的投递记录
                'navigationHistory'      // 导航历史
            ]);

            // 显示成功提示
            alert('投递记录已成功清除！');

            console.log('[clearDeliveryRecords] 投递记录已清除');

        } catch (error) {
            console.error('[clearDeliveryRecords] 清除投递记录失败:', error);
            alert('清除失败，请重试。错误信息：' + error.message);
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
                    <div class="empty-state">
                        <i class="fas fa-inbox"></i>
                        <div class="empty-text">暂无投递记录</div>
                        <div style="font-size: 12px; margin-top: 8px; color: var(--text-gray);">完成填充后将自动记录</div>
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
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle" style="color: #f44336;"></i>
                    <div class="empty-text">加载失败</div>
                    <div style="font-size: 12px; margin-top: 8px; color: var(--text-gray);">请刷新页面重试</div>
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
        // 监听来自 profileMini.js 的按钮模式更新消息
        if (message.type === "updateButtonMode") {

            // 先保存到 chrome.storage，确保设置被持久化
            chrome.storage.local.set({ arcButtonMode: message.mode }).then(() => {

                // 检查 yn-ai 元素是否存在，只有存在时才更新显示
                const hostElement = document.getElementById("yn-ai");
                if (hostElement) {
                    setButtonMode(message.mode);
                }

                sendResponse({ success: true });
            }).catch(error => {
                console.error('[resumeInterfaceTwo] 保存按钮模式失败:', error);
                sendResponse({ success: false, error: error.message });
            });

            return true; // 保持消息通道打开以支持异步 sendResponse
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
            const highlightedElements = document.querySelectorAll('[class*="yn-color-"]');
            for (const el of highlightedElements) {
                // 移除所有 yn-color-* 类
                const classes = Array.from(el.classList);
                classes.forEach(className => {
                    if (className.startsWith('yn-color-')) {
                        el.classList.remove(className);
                    }
                });
            }

            // 移除高亮启用标志
            document.documentElement.classList.remove('yn-highlight-enabled');

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

        // 无论是否为官网，都设置校招相关的监听器
        setupCampusClickHandler();
        setupHistoryMessageHandler();

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
                const { arcButtonMode = "always" } = await chrome.storage.local.get(["arcButtonMode"]);

                // 常驻模式或强制显示模式：直接显示，无需检测
                if (arcButtonMode === "always" || arcButtonMode === "show") {
                    clearInterval(checkInterval);
                    resolve(true);
                    return;
                }

                // 隐藏模式：也需要初始化UI（只是不显示），方便后续切换模式
                if (arcButtonMode === "hidden") {
                    clearInterval(checkInterval);
                    resolve(true);
                    return;
                }

                // 智能模式：检测简历相关关键词
                if (arcButtonMode === "smart" || arcButtonMode === "auto") {
                    const bodyText = document.body.innerText;
                    const hasResumeKeyword = /(?:^|[^\u4e00-\u9fa5])(简历|姓名)|(简历|姓名)(?:[^\u4e00-\u9fa5]|$)/.test(bodyText);

                    if (hasResumeKeyword) {
                        clearInterval(checkInterval);
                        resolve(true);
                    }
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
        // if (!navigator.userAgent.includes("Edg/")) {
        //     setTimeout(() => {
        //         checkVersion();
        //     }, 3000);
        // }
    })();
})();
