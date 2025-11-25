// 求职方舟 - 页面悬浮简历界面（格式化与注释版）
// 作用：注入 Shadow DOM 界面、初始化编辑器、管理登录态与状态机、触发自动填表
// 注意：本文件为可读维护版本，不参与 manifest 运行入口

(async () => {
  let shadowRoot = null; // Shadow 根节点
  let logoButton = null; // 角标按钮（显示/打开界面）
  let resumeWindow = null; // 主界面容器（#resume-window）
  let editor = null; // SimpleMDE 实例

  // 主初始化：注入 DOM、加载资源、绑定事件、初始化状态
  try {
    await injectUI();
    loadStyles();
    loadFaFont();
    initHighlightFlag();
    await bindEvents(logoButton, resumeWindow);
    initEditor();
    layoutResize();
    window.addEventListener("resize", debounce(layoutResize, 200));
  } catch (_) {}

  // 设置悬浮按钮显示模式（show/auto/hidden 或布尔）
  function setArcButtonMode(mode) {
    const host = document.getElementById("ark-ai");
    if (!host) return;
    if (typeof mode !== "boolean") {
      switch (mode) {
        case "show":
          host.style.display = "block";
          break;
        case "auto":
          // 智能显示：由内容脚本逻辑判断
          break;
        case "hidden":
          host.style.display = "none";
          break;
      }
    } else {
      host.style.display = mode ? "block" : "none";
    }
  }

  async function injectUI() { // 注入悬浮界面
    try {
      // Shadow 主机
      const host = document.createElement("div"); // 创建宿主元素
      host.id = "ark-ai"; // 设置宿主ID
      shadowRoot = host.attachShadow({ mode: "open" }); // 创建开放模式的 ShadowRoot，便于外部访问
      document.body.appendChild(host); // 将宿主挂载到页面

      // 初始显示模式
      const { arcButtonMode = "auto" } = await chrome.storage.local.get(["arcButtonMode"]); // 从本地存储获取显示模式
      setArcButtonMode(arcButtonMode); // 应用显示模式（显示/自动/隐藏）

      // 角标按钮
      logoButton = (() => { // 立即执行创建角标按钮
        const btn = document.createElement("button"); // 创建按钮
        btn.id = "logo-button"; // 设置按钮ID
        const img = document.createElement("img"); // 创建图像元素
        img.src = chrome.runtime.getURL("image/icon128.png"); // 指向扩展内的图标资源
        btn.appendChild(img); // 将图标添加到按钮
        shadowRoot.appendChild(btn); // 挂载按钮到 ShadowRoot
        return btn; // 返回按钮引用
      })();
      if (!logoButton) return; // 若创建失败则返回

      // 主界面注入（来自 html/resumeWindow.html）
      resumeWindow = await (async function () { // 异步加载主界面模板
        const container = document.createElement("div"); // 容器
        container.id = "resume-window-container"; // 容器ID
        try {
          const res = await fetch(chrome.runtime.getURL("html/resumeWindow.html")); // 获取模板文件
          const html = await res.text(); // 读取为字符串
          container.innerHTML = html; // 插入模板HTML
        } catch (_) {
          return null; // 失败返回空
        }
        shadowRoot.appendChild(container); // 将容器挂载到 ShadowRoot
        const node = container.querySelector("#resume-window"); // 查找主界面节点
        if (!node) return null; // 未找到则返回空
        container.querySelector("#header-logo").src = chrome.runtime.getURL("image/icon128.png"); // 设置页眉Logo
        return node; // 返回主界面节点
      })();
      if (!resumeWindow) return; // 模板注入失败则返回
    } catch (_) {} // 忽略异常，避免阻塞
  }

  function loadStyles() { // 加载界面样式
    const styles = [ // 样式文件列表
      "css/lib/font-awesome.all.min.css", // 图标库样式
      "css/lib/simplemde.min.css", // Markdown 编辑器样式
      "css/resumeInterface.css" // 悬浮界面样式
    ];
    styles.forEach((href) => { // 遍历样式列表
      const link = document.createElement("link"); // 创建link节点
      link.rel = "stylesheet"; // 设置为样式表
      link.href = chrome.runtime.getURL(href); // 指向扩展内资源
      shadowRoot.appendChild(link); // 挂载到 ShadowRoot 以作用于界面
    });
  }

  function loadFaFont() { // 加载 Font Awesome 字体到文档
    const url = chrome.runtime.getURL("webfonts/fa-solid-900.woff2"); // 获取扩展内字体资源绝对路径
    new FontFace("Font Awesome 6 Free", `url(${url})`, { weight: "900" }) // 创建 FontFace 对象，指定字体族与资源URL
      .load() // 异步加载字体文件
      .then((font) => { // 加载成功后回调
        document.fonts.add(font); // 将字体注册到当前文档的 FontFaceSet，使 CSS 能使用该字体
      })
      .catch(() => {}); // 捕获加载失败并忽略，不影响基础功能
  }

  async function initHighlightFlag() { // 初始化高亮开关
    try { // 尝试从本地存储读取开关值
      const enabled = (await chrome.storage.local.get(["highlightEnabled"])).highlightEnabled !== false; // 读取开关，默认视为开启
      document.documentElement.style.setProperty("--highlight-enabled", enabled ? "1" : "0"); // 写入CSS变量供样式控制
    } catch (_) { // 读取失败时回退
      document.documentElement.style.setProperty("--highlight-enabled", "1"); // 默认开启高亮
    }
  }

  async function bindEvents(logoBtn, windowNode) { // 绑定界面交互事件
    if (!windowNode) return; // 若主界面未注入则直接退出

    // 角标点击：显示主界面；未登录则引导登录
    logoButton.addEventListener("click", async () => { // 角标点击事件
      const { auth } = await chrome.storage.local.get(["auth"]); // 读取本地登录态
      if (auth) { // 已登录
        toggleWindow(true); // 打开主界面
      } else { // 未登录
        const go = confirm("尚未登录到求职方舟，是否立即前往登录？"); // 询问是否跳转登录
        if (go) window.open(`${window.config.LOGIN_URL}`, "_blank"); // 打开登录页面
      }
    });

    // 主按钮与收起
    windowNode.querySelector("#close-window").addEventListener("click", () => toggleWindow(false));
    windowNode.querySelector("#start-button").addEventListener("click", () => onStart());
    windowNode.querySelector(".resume-header").addEventListener("click", () => toggleDisplay());
    windowNode.querySelector("#state-text").addEventListener("click", () => toggleDisplay());

    // 简历版本选择与“美化简历”开关
    const versionSelect = windowNode.querySelector("#resume-version");
    versionSelect.addEventListener("change", (ev) => onChangeResumeVersion(ev));
    const beautifyCheckbox = windowNode.querySelector("#beautify-checkbox");
    const saved = await chrome.storage.local.get(["beautifyResume"]);
    beautifyCheckbox.checked = saved.beautifyResume === true;
    beautifyCheckbox.addEventListener("change", (ev) => {
      onToggleBeautify(ev.target.checked);
      chrome.storage.local.set({ beautifyResume: ev.target.checked });
    });

    // 快捷入口
    bindQuickLinks(windowNode);
  }

  function initEditor() {
    // 初始化 SimpleMDE：禁用 toolbar，启用 autosave；保持与原配置一致
    try {
      if (typeof SimpleMDE === "undefined") return;
      const el = shadowRoot.querySelector("#resume-editor");
      if (!el) return;
      editor = new SimpleMDE({
        autosave: { enabled: true, uniqueId: "resume", delay: 1000 },
        element: el,
        forceSync: true,
        initialValue: "",
        placeholder: "请将简历粘贴到这里，建议使用Markdown格式",
        spellChecker: false,
        status: ["autosave", "lines", "words"],
        toolbar: false,
        autoDownloadFontAwesome: false
      });
      shadowRoot.querySelector(".CodeMirror").classList.add("normal-bg");

      // 保存时提示与同步到服务器（节选示意）
      let before = "";
      editor.codemirror.on("focus", () => {
        before = editor.value();
      });
      editor.codemirror.on("blur", async () => {
        if (before !== editor.value()) {
          // 提示“简历已保存”并回退状态文本
          const prev = resumeWindow.querySelector("#state-text").textContent;
          setStateText("简历已保存");
          setTimeout(() => setStateText(prev), 3000);
          // 保存到后端（接口：saveResumeMd）——此处结构化示意
        }
      });
    } catch (_) {}
  }

  // 界面开关
  async function toggleWindow(show) {
    if (!resumeWindow) return;
    if (show) {
      resumeWindow.classList.add("min");
      resumeWindow.style.display = "flex";
      resumeWindow.style.opacity = "0";
      await sleep(10);
      resumeWindow.style.opacity = "1";
      await sleep(200);
      if (logoButton) logoButton.style.display = "none";

      // 初始化或加载简历数据（接口：initResume），并更新 UI
      setStateText("方舟已就位，等待启动", "show");
    } else {
      if (logoButton) logoButton.style.display = "block";
      await sleep(10);
      resumeWindow.style.opacity = "0";
      await sleep(200);
      resumeWindow.style.display = "none";
      resumeWindow.classList.add("min");
    }
  }

  function toggleDisplay(target = null) {
    const display = resumeWindow.querySelector(".resume-display");
    if (target === null) target = resumeWindow.classList.contains("min") ? "show" : "min";
    if (target === "show" && resumeWindow.classList.contains("min")) {
      resumeWindow.classList.remove("min");
      display.style.display = "block";
      sleep(100).then(() => (display.style.opacity = "1"));
    } else if (target === "min" && !resumeWindow.classList.contains("min")) {
      display.style.opacity = "0";
      sleep(200).then(() => {
        display.style.display = "none";
        resumeWindow.classList.add("min");
      });
    }
  }

  // 启动自动填表：状态机与配额校验，最后调用 window.runFillResume
  let startState = "ready"; // ready/running/pause/success/error/quota
  async function onStart() {
    // 示例：校验公司/职位与配额后，调用引擎
    const company = resumeWindow.querySelector("#company-name").value;
    const position = resumeWindow.querySelector("#position-name").value;
    const resumeMd = resumeWindow.querySelector("#resume-editor").value;
    const resumeId = null; // 实际应从 initResume 返回的信息同步
    const enableBeautify = isBeautifyEnabled();

    if (!company || !position) {
      alert("要先填写公司和职位，才能生成专岗美化简历哦！");
      setStateText("方舟准备中，请先填写公司和职位", "show");
      resumeWindow.querySelector("#company-name").focus();
      return;
    }

    setStartButtonState("running");
    window.runFillResume(company, position, resumeMd, resumeId, enableBeautify, (result) => {
      setStartButtonState(result.status === "success" ? "success" : "error");
    });
  }

  function onChangeResumeVersion(ev) {
    const value = ev.target.value;
    // 根据选择的简历版本，加载对应的 resumeMd 到编辑器；必要时请求接口 getResumeMd
    setStateText("获取简历中...");
  }

  function onToggleBeautify(checked) {
    if (checked) {
      setStateText("方舟已就位，等待启动", "show");
    } else {
      setStateText("方舟准备中，请先填写公司和职位", "show");
      resumeWindow.querySelector("#company-name").focus();
    }
  }

  function bindQuickLinks(win) {
    win.querySelector("#history-table-btn")?.addEventListener("click", () => {
      window.open(window.config.HISTORY_URL, "_blank");
    });
    win.querySelector("#campus-table-btn")?.addEventListener("click", () => {
      window.open(window.config.CAMPUS_URL, "_blank");
    });
    win.querySelector("#my-resume-btn")?.addEventListener("click", () => {
      window.open(window.config.WEB_URL, "_blank");
    });
  }

  // 状态文本与按钮状态
  let typeTimer = null;
  function setStateText(text, next = null) {
    const el = resumeWindow.querySelector("#state-text");
    if (el.textContent !== text) {
      if (typeTimer) clearTimeout(typeTimer);
      let i = 0;
      el.textContent = "";
      const type = () => {
        if (i < text.length) {
          el.textContent += text.charAt(i);
          i++;
          typeTimer = setTimeout(type, 500 / text.length);
        } else {
          typeTimer = null;
        }
      };
      type();
    }
    next && toggleDisplay(next);
  }

  function setStartButtonState(state) {
    startState = state;
    const btn = resumeWindow.querySelector("#start-button");
    if (state === "running") {
      btn.innerHTML = '<i class="fas fa-pause"></i>';
      btn.classList.add("paused");
    } else if (state === "pause") {
      btn.innerHTML = '<i class="fas fa-play"></i>';
      btn.classList.remove("paused");
    } else if (state === "success") {
      btn.innerHTML = '<i class="fas fa-calendar-check"></i>';
      btn.classList.remove("paused");
    } else if (state === "error") {
      btn.innerHTML = '<i class="fas fa-bug"></i>';
      btn.classList.remove("paused");
    } else if (state === "quota") {
      btn.innerHTML = '<i class="fas fa-charging-station"></i>';
      btn.classList.remove("paused");
    }
  }

  function isBeautifyEnabled() {
    return resumeWindow.querySelector("#beautify-checkbox").checked;
  }

  // 辅助：布局高度自适应编辑区
  function layoutResize() {
    if (!resumeWindow) return;
    const h = window.innerHeight - 80;
    let editorHeight = 700;
    if (editorHeight > h) editorHeight = Math.max(h, 600);
    const cm = shadowRoot.querySelector(".CodeMirror");
    const header = cm.classList.contains("showNewVersion") ? 350 : 310;
    cm.style.setProperty("height", editorHeight - header + "px", "important");
  }

  // 通用工具
  function debounce(fn, wait) {
    let timer;
    return (...args) => {
      const later = () => {
        clearTimeout(timer);
        fn(...args);
      };
      clearTimeout(timer);
      timer = setTimeout(later, wait);
    };
  }

  function sleep(ms = 1000) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // 对外暴露的界面交互（示意）：内容脚本可调用这些方法
  window.setStateText = setStateText;
  window.isRunning = function () {
    return startState === "running";
  };
  window.changeStartButtonState = setStartButtonState;
  window.closeHighlight = async function () {
    await sleep(1000);
    document.documentElement.style.setProperty("--highlight-enabled", "0");
  };
})();

