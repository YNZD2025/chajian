// 一念职达 - 页面悬浮智能填充界面（格式化与注释版）
// 作用：注入 Shadow DOM 界面、管理简历切换、任务背景输入、触发一键智能填充
// 注意：主要功能用 TODO 标记暂未实现

(async () => {
  // ===== 全局变量声明 =====
  let shadowRoot = null; // Shadow DOM 根节点，用于隔离样式和结构
  let floatButton = null; // 右下角悬浮按钮（触发显示主界面的入口）
  let mainPanel = null; // 主界面容器（包含简历展示和填充功能）
  let currentResumeIndex = 0; // 当前显示的简历索引
  let config = null; // 全局配置（从 background.js 加载）

  let resumeList = [
    {
      id: "resume-cn-001",
      name: "李艺伟",
      type: "中文简历 (默认)",
      avatar: "https://i.pravatar.cc/150?img=47",
      school: "清华大学",
      education: "硕士",
      major: "计算机科学",
      graduationYear: "2026",
      phone: "13800001111",
      email: "liyiwei@example.com",
      targetPosition: "数据分析",
      expectedCity: "北京/上海",
      skills: "Python, SQL, Tableau, Hadoop"
    },
    {
      id: "resume-en-001",
      name: "Li Yiwei",
      type: "简历 B (英文版)",
      avatar: "https://i.pravatar.cc/150?img=47",
      school: "Tsinghua University",
      education: "Master",
      major: "Computer Science",
      graduationYear: "2026",
      phone: "13800001111",
      email: "liyiwei@example.com",
      targetPosition: "Data Analyst",
      expectedCity: "Beijing/Shanghai",
      skills: "Python, SQL, Tableau, Hadoop"
    }
  ];
  let taskBackground = ""; // 任务背景内容

  // ===== 主初始化流程 =====
  try {
    await injectUI(); // 注入悬浮界面DOM结构
    loadStyles(); // 加载CSS样式文件
    loadFontAwesome(); // 加载Font Awesome字体（安全兜底）
    await loadPopupStyles();
    await initializeData(); // 从存储中初始化简历和任务数据
    await bindEvents(); // 绑定所有交互事件
    setupResponsiveLayout(); // 设置响应式布局
    window.addEventListener("resize", debounce(setupResponsiveLayout, 200)); // 窗口大小变化时重新计算布局
  } catch (error) {
    console.error("界面初始化失败:", error); // 捕获初始化错误并输出到控制台
  }

  // ===== 悬浮按钮显示模式设置 =====
  function setFloatButtonMode(mode) {
    const host = document.getElementById("yinian-zhida-ai"); // 获取宿主元素
    if (!host) return; // 如果宿主元素不存在则退出
    
    // 根据不同的模式设置显示状态
    if (typeof mode !== "boolean") {
      switch (mode) {
        case "show": // 始终显示
          host.style.display = "block";
          break;
        case "auto": // 自动模式（由内容脚本逻辑判断）
          // TODO: 实现智能显示逻辑
          break;
        case "hidden": // 始终隐藏
          host.style.display = "none";
          break;
      }
    } else {
      // 布尔值模式：true显示，false隐藏
      host.style.display = mode ? "block" : "none";
    }
  }

  // ===== UI 注入相关函数 =====
  async function injectUI() {
    try {
      // 创建 Shadow DOM 宿主元素
      const host = document.createElement("div"); // 创建宿主容器元素
      host.id = "yinian-zhida-ai"; // 设置唯一ID，避免与页面其他元素冲突
      shadowRoot = host.attachShadow({ mode: "open" }); // 创建开放模式的 Shadow DOM，允许外部访问
      document.body.appendChild(host); // 将宿主元素挂载到页面body

      // 从本地存储获取悬浮按钮显示模式配置
      const { buttonDisplayMode = "show" } = await chrome.storage.local.get(["buttonDisplayMode"]); // 默认为显示模式
      setFloatButtonMode(buttonDisplayMode); // 应用显示模式设置

      // 创建右下角悬浮触发按钮
      floatButton = createFloatButton(); // 调用函数创建悬浮按钮
      if (!floatButton) return; // 如果创建失败则终止后续流程

      // 创建主界面（弹窗）
      mainPanel = await createMainPanel(); // 异步创建主界面容器
      if (!mainPanel) return; // 如果创建失败则终止后续流程

      // 初始化界面显示状态（默认隐藏）
      mainPanel.style.display = "none"; // 初始状态设为隐藏
    } catch (error) {
      console.error("UI注入失败:", error); // 捕获并记录错误
    }
  }

  // 创建右下角悬浮触发按钮
  function createFloatButton() {
    const button = document.createElement("button"); // 创建button元素
    button.id = "float-trigger-button"; // 设置按钮ID
    
    // 设置按钮样式（固定在右下角）
    button.style.cssText = `
      position: fixed;
      bottom: 30px;
      right: 30px;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: linear-gradient(135deg, #ff9a9e, #ff6b95);
      border: none;
      box-shadow: 0 4px 15px rgba(255, 107, 149, 0.3);
      cursor: pointer;
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
    `;

    // 创建按钮图标
    const icon = document.createElement("img"); // 创建img元素作为图标
    icon.src = chrome.runtime.getURL("icons/icon48.png"); // 获取扩展内图标资源的绝对路径
    icon.alt = "一念职达"; // 设置图标alt文本
    icon.style.cssText = `
      width: 30px;
      height: 30px;
      filter: brightness(0) invert(1);
    `; // 设置图标样式，使其变为白色

    button.appendChild(icon); // 将图标添加到按钮中
    shadowRoot.appendChild(button); // 将按钮挂载到Shadow DOM

    // 添加悬停效果
    button.addEventListener("mouseenter", () => {
      button.style.transform = "scale(1.1)"; // 鼠标悬停时放大
      button.style.boxShadow = "0 6px 20px rgba(255, 107, 149, 0.4)"; // 增强阴影
    });

    button.addEventListener("mouseleave", () => {
      button.style.transform = "scale(1)"; // 鼠标离开时恢复
      button.style.boxShadow = "0 4px 15px rgba(255, 107, 149, 0.3)"; // 恢复阴影
    });

    return button; // 返回创建的按钮元素引用
  }

  // 创建主界面面板（异步加载外部HTML模板）
  async function createMainPanel() {
    // 异步加载主界面模板，参考resumeInterface.js的方式
    return await (async function () {
      const container = document.createElement("div"); // 创建容器元素
      container.id = "main-panel-container"; // 设置容器ID
      
      try {
        // 从扩展内获取fill.html模板文件
        const res = await fetch(chrome.runtime.getURL("popup/fill.html")); // 获取模板文件
        const html = await res.text(); // 读取为字符串
        
        // 创建一个临时DOM来解析HTML
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = html;
        
        // 提取body中的内容
        const pluginContainer = tempDiv.querySelector(".plugin-container");
        if (!pluginContainer) {
          console.error("未找到.plugin-container元素");
          return null;
        }
        
        // 创建主面板包装器
        const mainPanel = document.createElement("div");
        mainPanel.id = "main-panel";
        mainPanel.style.cssText = `
          position: fixed;
          bottom: 100px;
          right: 30px;
          width: 440px;
          height: 600px;
          background: white;
          border-radius: 16px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          z-index: 10000;
        `;
        
        // 将pluginContainer添加到mainPanel中
        mainPanel.appendChild(pluginContainer);

        const mainArea = pluginContainer.querySelector(".main-area");
        if (mainArea && !mainArea.querySelector("#state-text")) {
          const stateEl = document.createElement("div");
          stateEl.id = "state-text";
          stateEl.style.cssText = "position:absolute;top:60px;left:20px;font-size:12px;color:#666;z-index:30;min-height:20px";
          mainArea.insertBefore(stateEl, mainArea.querySelector(".plugin-content"));
        }
        
        // 修改关闭按钮：将原本链接到settings.html的改为关闭面板功能
        const liquidClose = pluginContainer.querySelector(".liquid-close");
        if (liquidClose) {
          liquidClose.href = "#"; // 改为锚点链接
          liquidClose.id = "close-panel-btn"; // 添加ID以便绑定事件
          liquidClose.innerHTML = '<i class="fas fa-times"></i>'; // 改为关闭图标
        }
        
        // 添加ID到需要交互的元素
        const liquidCtaBtn = pluginContainer.querySelector(".liquid-cta-btn");
        if (liquidCtaBtn) liquidCtaBtn.id = "smart-fill-btn";
        
        const bookWrapper = pluginContainer.querySelector(".book-wrapper");
        if (bookWrapper) bookWrapper.id = "resume-book";
        
        const resumePageNext = pluginContainer.querySelector(".resume-page-next");
        if (resumePageNext) resumePageNext.id = "resume-page-next";
        
        const resumePageCurrent = pluginContainer.querySelector(".resume-page-current");
        if (resumePageCurrent) resumePageCurrent.id = "resume-page-current";
        
        const taskInput = pluginContainer.querySelector(".task-input");
        if (taskInput) taskInput.id = "task-input";
        
        // 添加ID到导航项
        const navItems = pluginContainer.querySelectorAll(".nav-item");
        navItems.forEach(item => {
          const label = item.querySelector(".nav-label");
          if (label) {
            const text = label.textContent.trim();
            switch (text) {
              case "填充":
                item.id = "nav-fill";
                break;
              case "记录":
                item.id = "nav-history";
                break;
              case "我的":
                item.id = "nav-profile";
                break;
              case "设置":
                item.id = "nav-settings";
                break;
            }
          }
        });
        
        // 将主面板添加到容器
        container.appendChild(mainPanel);
        
      } catch (error) {
        console.error("加载fill.html失败:", error);
        return null; // 失败返回空
      }
      
      shadowRoot.appendChild(container); // 将容器挂载到Shadow DOM
      const panel = container.querySelector("#main-panel"); // 查找主界面节点
      return panel; // 返回主界面节点
    })();
  }

  // ===== 样式加载相关函数 =====
  function loadStyles() {
    // 创建内联样式
    const style = document.createElement("style"); // 创建style元素
    style.textContent = `
      /* CSS变量定义 */
      :host {
        --primary: #ff6b95;
        --accent: #ff9a9e;
        --text-main: #2c3e50;
        --light-bg: #fafafa;
        --glass-clear-bg: rgba(255, 255, 255, 0.8);
        --glass-clear-blur: blur(10px);
      }

      /* 滚动条样式 */
      ::-webkit-scrollbar {
        width: 6px;
      }

      ::-webkit-scrollbar-track {
        background: transparent;
      }

      ::-webkit-scrollbar-thumb {
        background: rgba(0, 0, 0, 0.1);
        border-radius: 3px;
      }

      /* 动画定义 */
      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      /* 悬停效果 */
      #resume-book:hover .resume-page-current {
        transform: translateX(-20px) rotateY(-5deg);
      }

      #resume-book:hover .resume-page-next {
        transform: rotate(1deg) translateZ(0);
        filter: blur(0);
        opacity: 1;
      }

      #resume-book:hover .switch-tooltip {
        opacity: 1;
        right: 0px;
      }

      /* 一键填充按钮悬停效果 */
      #smart-fill-btn:hover {
        transform: translateY(-2px);
        background: rgba(255, 255, 255, 0.9);
      }

      /* 输入框焦点效果 */
      #task-input:focus {
        outline: none;
        border-color: var(--primary);
        background: white;
      }

      /* 关闭按钮悬停效果 */
      #close-panel-btn:hover {
        background: rgba(0, 0, 0, 0.1);
      }

      /* Font Awesome 图标基础样式 */
      .fas {
        font-family: "Font Awesome 6 Free";
        font-weight: 900;
        font-style: normal;
      }
    `;
    shadowRoot.appendChild(style); // 将样式添加到Shadow DOM

    // 加载 Font Awesome 样式（从CDN）
    const faLink = document.createElement("link"); // 创建link元素
    faLink.rel = "stylesheet"; // 设置为样式表
    faLink.href = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"; // CDN地址
    shadowRoot.appendChild(faLink); // 添加到Shadow DOM
  }

  // 加载Font Awesome字体
  function loadFontAwesome() {
    try {
      if (document.fonts && document.fonts.check('12px "Font Awesome 6 Free"')) return; // 已可用直接返回
    } catch (_) {}
    // 兜底：依赖 loadStyles 注入的 CDN 样式，不再主动加载字体文件，避免网络错误
  }

  async function loadPopupStyles() {
    try {
      const files = [
        { id: "style-common", path: "popup/styles/common.css" },
        { id: "style-fill", path: "popup/styles/fill.css" }
      ];
      for (const f of files) {
        if (shadowRoot.querySelector(`#${f.id}`)) continue;
        const url = chrome.runtime.getURL(f.path);
        const res = await fetch(url);
        if (!res.ok) continue;
        const css = await res.text();
        const styleEl = document.createElement("style");
        styleEl.id = f.id;
        styleEl.textContent = css;
        shadowRoot.appendChild(styleEl);
      }
    } catch (_) {}
  }

  // ===== 数据初始化相关函数 =====
  async function initializeData() {
    try {
      // 从Chrome存储中获取数据
      const data = await chrome.storage.local.get([
        "config", // 全局配置（由 background.js 初始化）
        "resumeList", // 简历列表
        "currentResumeIndex", // 当前简历索引
        "taskBackground" // 任务背景
      ]);

      // 加载配置到全局变量
      if (data.config) {
        config = data.config;
        // 同时设置到 window.config 以兼容其他模块
        if (!window.config) {
          window.config = data.config;
        }
        console.log("配置加载成功:", config);
      } else {
        console.warn("未找到配置信息，background.js 可能未初始化");
      }

      // 设置简历列表数据
      if (data.resumeList && data.resumeList.length > 0) {
        resumeList = data.resumeList; // 更新全局简历列表
        currentResumeIndex = data.currentResumeIndex || 0; // 更新当前索引

        // TODO: 渲染当前简历数据到界面
        // renderCurrentResume(resumeList[currentResumeIndex]);
        // renderNextResume(resumeList[(currentResumeIndex + 1) % resumeList.length]);
      } else {
        // 如果没有简历数据，使用默认数据
        resumeList = getDefaultResumeData(); // 获取默认简历数据
        currentResumeIndex = 0; // 设置索引为0

        // TODO: 保存默认数据到存储
        // chrome.storage.local.set({ resumeList, currentResumeIndex: 0 });
      }

      // 恢复任务背景
      if (data.taskBackground) {
        taskBackground = data.taskBackground; // 更新全局变量
        // TODO: 将任务背景设置到输入框
        // const taskInput = shadowRoot.querySelector("#task-input");
        // if (taskInput) taskInput.value = taskBackground;
      }
    } catch (error) {
      console.error("数据初始化失败:", error); // 记录错误
    }
  }

  // 获取默认简历数据
  function getDefaultResumeData() {
    return [
      {
        id: "resume-1",
        name: "李艺伟",
        type: "中文简历 (默认)",
        avatar: "https://i.pravatar.cc/150?img=47",
        school: "清华大学",
        education: "硕士",
        major: "计算机科学",
        graduationYear: "2026",
        phone: "13812349876",
        email: "liyiwei@thu.edu.cn",
        targetPosition: "数据分析",
        expectedCity: "北京/上海",
        skills: "Python, SQL, Tableau, Hadoop"
      },
      {
        id: "resume-2",
        name: "Li Yiwei",
        type: "简历 B (英文版)",
        avatar: "https://i.pravatar.cc/150?img=47",
        school: "Tsinghua University",
        education: "Master",
        major: "Computer Science",
        graduationYear: "2026",
        phone: "13812349876",
        email: "liyiwei@thu.edu.cn",
        targetPosition: "Data Analyst",
        expectedCity: "Beijing/Shanghai",
        skills: "Python, SQL, Tableau, Hadoop"
      }
    ];
  }

  // ===== 事件绑定相关函数 =====
  async function bindEvents() {
    floatButton.addEventListener("click", async () => {
      try {
        const { auth } = await chrome.storage.local.get(["auth"]);
        console.log('🔐 检查登录状态:', auth ? '已登录' : '未登录');
        
        if (auth) {
          console.log('✅ 已登录，打开主面板');
          toggleMainPanel(true);
        } else {
          const go = confirm("尚未登录到一念职达，是否立即前往登录？");
          if (go) {
            // 确保配置已加载
            if (!config) {
              const { config: loadedConfig } = await chrome.storage.local.get(["config"]);
              config = loadedConfig;
            }
            
            if (config && config.LOGIN_URL) {
              console.log('🔗 打开登录页面:', config.LOGIN_URL);
              window.open(config.LOGIN_URL, "_blank");
            } else {
              console.error('❌ 配置未加载或 LOGIN_URL 不存在');
              alert('配置加载失败，请刷新页面重试');
            }
          }
        }
      } catch (error) {
        console.error('❌ 点击事件处理失败:', error);
        toggleMainPanel(true); // 降级：直接打开面板
      }
    });

    // 绑定关闭按钮点击事件
    const closeBtn = shadowRoot.querySelector("#close-panel-btn"); // 获取关闭按钮
    if (closeBtn) {
      closeBtn.addEventListener("click", (e) => {
        e.preventDefault(); // 阻止默认行为
        toggleMainPanel(false); // 关闭主界面
      });
    }

    // 绑定简历卡片切换事件
    const resumeBook = shadowRoot.querySelector("#resume-book"); // 获取简历卡片容器
    if (resumeBook) {
      resumeBook.addEventListener("click", () => {
        // TODO: 实现简历切换逻辑
        console.log("切换简历"); // 临时日志
        // switchResume();
      });
    }

    // 绑定一键智能填充按钮事件
    const fillBtn = shadowRoot.querySelector("#smart-fill-btn"); // 获取填充按钮
    if (fillBtn) {
      fillBtn.addEventListener("click", () => {
        executeSmartFill();
      });
    }

    // 绑定任务背景输入框事件
    const taskInput = shadowRoot.querySelector("#task-input"); // 获取任务输入框
    if (taskInput) {
      // 输入事件（防抖保存）
      taskInput.addEventListener("input", debounce(() => {
        taskBackground = taskInput.value; // 更新全局变量
        // TODO: 保存到Chrome存储
        // chrome.storage.local.set({ taskBackground });
      }, 500));

      // 失焦事件（立即保存）
      taskInput.addEventListener("blur", () => {
        taskBackground = taskInput.value; // 更新全局变量
        // TODO: 保存到Chrome存储
        // chrome.storage.local.set({ taskBackground });
      });
    }

    // 绑定导航项点击事件
    bindNavigationEvents(); // 调用导航事件绑定函数
  }

  // 绑定导航项事件
  function bindNavigationEvents() {
    // 导航项配置
    const navItems = [
      { id: "nav-fill", handler: () => console.log("填充页面") },
      { id: "nav-history", handler: () => console.log("历史记录") },
      { id: "nav-profile", handler: () => console.log("个人中心") },
      { id: "nav-settings", handler: () => console.log("设置页面") }
    ];

    // 遍历绑定每个导航项
    navItems.forEach(({ id, handler }) => {
      const navElement = shadowRoot.querySelector(`#${id}`); // 获取导航元素
      if (navElement) {
        navElement.addEventListener("click", (e) => {
          e.preventDefault(); // 阻止默认行为
          // TODO: 实现导航切换逻辑
          handler(); // 调用处理函数
        });
      }
    });
  }

  // ===== UI 交互相关函数 =====
  
  // 切换主界面显示状态
  function toggleMainPanel(show = null) {
    if (!mainPanel) return; // 面板不存在时直接返回
    if (show === null) {
      // 如果未指定状态，则切换当前状态
      show = mainPanel.style.display === "none"; // 判断当前是否隐藏
    }

    if (show) {
      mainPanel.style.display = "flex"; // 显示界面
      mainPanel.style.animation = "fadeIn 0.3s ease"; // 添加淡入动画
      
      // TODO: 触发界面显示后的初始化逻辑
      // loadResumeData();
      // checkLoginStatus();
    } else {
      mainPanel.style.opacity = "0"; // 先透明
      setTimeout(() => {
        mainPanel.style.display = "none"; // 延迟隐藏
        mainPanel.style.opacity = "1"; // 恢复透明度
      }, 300);
    }
  }

  // 切换简历
  function switchResume() {
    // 更新当前简历索引
    currentResumeIndex = (currentResumeIndex + 1) % resumeList.length; // 循环切换
    
    // TODO: 更新界面显示
    // renderCurrentResume(resumeList[currentResumeIndex]);
    // renderNextResume(resumeList[(currentResumeIndex + 1) % resumeList.length]);
    
    // TODO: 保存当前索引到存储
    // chrome.storage.local.set({ currentResumeIndex });
  }

  // 执行智能填充
  async function executeSmartFill() {
    console.log("填充执行。。。。")
    try {
      const currentResume = resumeList[currentResumeIndex] || {};
      const company = "java开发";
      const position = currentResume.targetPosition || "";
      const resumeMd = `# Resume\nName: ${currentResume.name || ""}\nEmail: ${currentResume.email || ""}\nPhone: ${currentResume.phone || ""}\nSchool: ${currentResume.school || ""}\nMajor: ${currentResume.major || ""}\nGraduation: ${currentResume.graduationYear || currentResume.graduationYear || ""}\nSkills: ${currentResume.skills || ""}`;
      const resumeId = currentResume.id || "resume-default";
      const saved = await chrome.storage.local.get(["beautifyResume"]);
      const enableBeautify = saved.beautifyResume === true;
      if (typeof window.runFillResume === "function") {
        window.runFillResume(
          company,
          position,
          resumeMd,
          resumeId,
          enableBeautify,
          function(result) {}
        );
      } else {
        console.error("runFillResume 未加载");
      }
    } catch (_) {}
  }

  // ===== 响应式布局相关函数 =====
  function setupResponsiveLayout() {
    // 获取视口尺寸
    const viewportHeight = window.innerHeight; // 视口高度
    const viewportWidth = window.innerWidth; // 视口宽度

    // 调整主界面位置和大小
    if (mainPanel) {
      // 如果视口较小，调整界面大小
      if (viewportHeight < 700) {
        mainPanel.style.height = `${viewportHeight - 150}px`; // 减小高度
        mainPanel.style.bottom = "80px"; // 调整底部距离
      } else {
        mainPanel.style.height = "600px"; // 恢复默认高度
        mainPanel.style.bottom = "100px"; // 恢复默认底部距离
      }

      // 如果视口宽度较小，调整右边距
      if (viewportWidth < 500) {
        mainPanel.style.right = "10px"; // 减小右边距
        mainPanel.style.width = `${viewportWidth - 20}px`; // 调整宽度
      } else {
        mainPanel.style.right = "30px"; // 恢复默认右边距
        mainPanel.style.width = "440px"; // 恢复默认宽度
      }
    }
  }

  // ===== 工具函数 =====
  
  // 防抖函数
  function debounce(func, wait) {
    let timeout; // 定时器变量
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout); // 清除定时器
        func(...args); // 执行函数
      };
      clearTimeout(timeout); // 清除之前的定时器
      timeout = setTimeout(later, wait); // 设置新的定时器
    };
  }

  // 延迟函数
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms)); // 返回延迟Promise
  }

  // ===== 对外暴露的接口 =====
  
  // 暴露切换界面函数
  window.toggleYinianPanel = toggleMainPanel;
  
  // 暴露执行填充函数
  window.executeYinianFill = executeSmartFill;
  window.setStateText = function (text) {
    try {
      // 更新原有的状态文本元素
      const el = shadowRoot && shadowRoot.querySelector("#state-text");
      if (el) el.textContent = text || "";
      
      // 更新状态弹窗
      const statusMessage = shadowRoot && shadowRoot.querySelector("#status-message");
      if (statusMessage) {
        statusMessage.textContent = text || "准备就绪";
        
        // 添加动画效果
        statusMessage.style.animation = 'none';
        setTimeout(() => {
          statusMessage.style.animation = 'messageSlideIn 0.4s ease';
        }, 10);
        
        // 自动打开弹窗显示状态
        const statusPopup = shadowRoot.querySelector("#status-popup");
        const floatButton = shadowRoot.querySelector("#float-status-button");
        
        if (statusPopup && !statusPopup.classList.contains('show')) {
          statusPopup.classList.add('show');
          
          if (floatButton) {
            floatButton.style.transform = 'scale(1.1) rotate(10deg)';
          }
          
          // 5秒后自动关闭
          setTimeout(() => {
            if (statusPopup.classList.contains('show') && !statusPopup.matches(':hover')) {
              statusPopup.classList.remove('show');
              if (floatButton) {
                floatButton.style.transform = '';
              }
            }
          }, 5000);
        }
      }
    } catch (_) {}
  };
  window.isRunning = function () { return true; };
  window.changeStartButtonState = function () {};
  window.closeHighlight = async function () {
    try {
      const classes = [
        "ark-color-yellow",
        "ark-color-green",
        "ark-color-red",
        "ark-color-blue",
        "ark-color-purple"
      ];
      for (const cls of classes) {
        const nodes = document.querySelectorAll(`.${cls}`);
        nodes.forEach((el) => el.classList.remove(cls));
      }
      document.documentElement.style.setProperty("--highlight-enabled", "0");
    } catch (_) {}
  };
  
  // 暴露更新简历数据函数
  window.updateYinianResumeData = (data) => {
    resumeList = data; // 更新简历列表
    // TODO: 重新渲染界面
    // renderCurrentResume(resumeList[currentResumeIndex]);
  };
})();
