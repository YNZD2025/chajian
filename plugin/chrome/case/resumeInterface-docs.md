# ResumeInterface.js 功能描述与逻辑运行文档

## 概述

`resumeInterface.js` 是求职方舟 Chrome 扩展的**简历窗口UI模块**，负责管理用户界面、交互逻辑和填充流程控制。

代码采用 **Shadow DOM** 技术隔离样式，集成 **SimpleMDE** Markdown编辑器，约 1100 行（格式化后）。

---

## 模块架构

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       ResumeInterface.js                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   ┌──────────────────┐    ┌──────────────────┐    ┌─────────────────┐  │
│   │  DOM结构创建     │    │  Shadow DOM      │    │  样式加载       │  │
│   │  (UI初始化)      │    │  (样式隔离)      │    │  (CSS/字体)     │  │
│   └──────────────────┘    └──────────────────┘    └─────────────────┘  │
│                                                                         │
│   ┌──────────────────┐    ┌──────────────────┐    ┌─────────────────┐  │
│   │  事件绑定        │    │  窗口控制        │    │  状态管理       │  │
│   │  (用户交互)      │    │  (显示/隐藏)     │    │  (填充状态机)   │  │
│   └──────────────────┘    └──────────────────┘    └─────────────────┘  │
│                                                                         │
│   ┌──────────────────┐    ┌──────────────────┐    ┌─────────────────┐  │
│   │  SimpleMDE       │    │  API请求         │    │  评分弹窗       │  │
│   │  (Markdown编辑)  │    │  (服务器通信)    │    │  (用户反馈)     │  │
│   └──────────────────┘    └──────────────────┘    └─────────────────┘  │
│                                                                         │
│   ┌──────────────────┐    ┌──────────────────┐                         │
│   │  版本检查        │    │  全局API暴露     │                         │
│   │  (更新提示)      │    │  (供其他模块调用) │                         │
│   └──────────────────┘    └──────────────────┘                         │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 全局变量

| 变量名 | 原变量名 | 类型 | 说明 |
|--------|----------|------|------|
| `shadowRoot` | `e` | ShadowRoot | Shadow DOM根节点 |
| `logoButton` | `t` | HTMLElement | Logo按钮元素 |
| `resumeWindow` | `n` | HTMLElement | 简历窗口主容器 |
| `resumeData` | `o` | Object | 简历数据对象 |
| `simpleMDE` | `a` | SimpleMDE | Markdown编辑器实例 |
| `fillState` | `u` | String | 填充状态 |
| `editorState` | `S` | String | 编辑器状态 |
| `stateTextTimer` | `h` | Number | 状态文字定时器 |
| `typeContentTimer` | `L` | Number | 打字机效果定时器 |

---

## 模块详细说明

### 1. 初始化模块

**主要函数**：

| 函数名 | 原函数名 | 说明 |
|--------|----------|------|
| `init()` | `s()` | 主初始化函数 |
| `createDomStructure()` | - | 创建DOM结构 |
| `initButtonMode()` | - | 初始化按钮显示模式 |
| `createLogoButton()` | - | 创建Logo按钮 |
| `makeDraggable()` | - | 添加拖拽功能 |
| `createResumeWindow()` | - | 创建简历窗口 |
| `loadStyles()` | - | 加载CSS样式 |
| `loadFontAwesome()` | - | 加载字体图标 |

**初始化流程**：

```
init()
  │
  ├── createDomStructure()
  │     ├── 创建宿主元素 #ark-ai
  │     ├── attachShadow() 创建Shadow DOM
  │     ├── initButtonMode() 设置按钮显示模式
  │     ├── createLogoButton() 创建Logo按钮
  │     └── createResumeWindow() 加载HTML模板
  │
  ├── loadStyles()
  │     ├── Font Awesome 图标库
  │     ├── SimpleMDE 编辑器样式
  │     └── 自定义样式
  │
  ├── loadFontAwesome() 加载字体
  │
  ├── initHighlight() 初始化高亮设置
  │
  ├── bindEvents() 绑定事件监听
  │
  ├── initMarkdownEditor() 初始化编辑器
  │
  └── adjustWindowHeight() 调整窗口高度
```

---

### 2. Shadow DOM 隔离

**为什么使用Shadow DOM？**

招聘网站的CSS样式可能与扩展UI冲突。Shadow DOM提供完全的样式隔离。

```javascript
// 创建宿主元素
const hostElement = document.createElement("div");
hostElement.id = "ark-ai";

// 附加Shadow DOM（open模式允许外部访问）
shadowRoot = hostElement.attachShadow({ mode: "open" });

// 将宿主元素添加到页面
document.body.appendChild(hostElement);
```

**DOM结构**：

```
<body>
  <div id="ark-ai">
    #shadow-root (open)
      ├── <link> (font-awesome.css)
      ├── <link> (simplemde.css)
      ├── <link> (resumeInterface.css)
      ├── <button id="logo-button">
      │     └── <img src="icon128.png">
      └── <div id="resume-window-container">
            └── <div id="resume-window">
                  ├── .resume-header
                  ├── .resume-display
                  │     ├── #company-name
                  │     ├── #position-name
                  │     ├── #resume-version
                  │     ├── #beautify-checkbox
                  │     └── #resume-editor (SimpleMDE)
                  └── .resume-footer
</body>
```

---

### 3. Logo按钮拖拽功能

**实现细节**：

```javascript
function makeDraggable(element) {
    let isDragging = false;
    let hasMoved = false;
    const threshold = 10; // 拖拽阈值

    element.addEventListener("mousedown", (event) => {
        isDragging = true;
        // 记录初始位置
        initialLeft = rect.left;
        initialTop = rect.top;
        startX = event.clientX;
        startY = event.clientY;
    });

    const onMouseMove = (event) => {
        // 超过阈值才算拖拽
        if (Math.abs(deltaX) > threshold || Math.abs(deltaY) > threshold) {
            hasMoved = true;
        }
        // 限制在窗口范围内
        newLeft = Math.max(0, Math.min(newLeft, windowWidth - elementWidth));
        newTop = Math.max(0, Math.min(newTop, windowHeight - elementHeight));
    };

    // 拖拽时阻止点击事件
    element.addEventListener("click", (event) => {
        if (hasMoved) {
            event.preventDefault();
            event.stopPropagation();
            return false;
        }
    }, true);
}
```

**关键点**：
- 10像素阈值区分点击和拖拽
- 限制按钮不能拖出窗口
- 拖拽后临时禁用点击事件

---

### 4. 状态管理

**填充状态机**：

```
                    ┌──────────┐
                    │  ready   │ ←─────────────────┐
                    └────┬─────┘                   │
                         │ 点击开始                 │
                         ▼                         │
                    ┌──────────┐                   │
           ┌───────▶│ running  │◀──────┐          │
           │        └────┬─────┘       │          │
           │             │             │          │
     点击继续            │ 点击暂停     │ 点击继续   │
           │             ▼             │          │
           │        ┌──────────┐       │          │
           └────────│  pause   │───────┘          │
                    └──────────┘                   │
                                                   │
                    ┌──────────┐                   │
                    │ success  │──────────────────┘
                    └──────────┘      可重新开始
                         ▲
                         │ 填充完成
                         │
                    ┌──────────┐
                    │  error   │──────────────────┐
                    └──────────┘      可重新开始   │
                         ▲                        │
                         │ 发生错误               │
                         │                        ▼
                    ┌──────────┐           ┌──────────┐
                    │  quota   │           │ learning │
                    └──────────┘           └──────────┘
                      配额用完                学习中
```

**状态按钮图标**：

| 状态 | 图标 | 说明 |
|------|------|------|
| `ready` | - | 初始状态 |
| `running` | `fa-pause` | 运行中，可暂停 |
| `pause` | `fa-play` | 已暂停，可继续 |
| `success` | `fa-calendar-check` | 完成 |
| `error` | `fa-bug` | 出错 |
| `quota` | `fa-charging-station` | 配额用完 |
| `learning` | `fa-wand-magic-sparkles` | 学习中 |

---

### 5. SimpleMDE 编辑器

**配置选项**：

```javascript
simpleMDE = new SimpleMDE({
    autosave: {
        enabled: true,       // 自动保存
        uniqueId: "resume",  // 存储键名
        delay: 1000          // 保存延迟
    },
    element: textArea,
    forceSync: true,         // 同步到textarea
    initialValue: "",
    placeholder: "请将简历粘贴到这里，建议使用Markdown格式",
    spellChecker: false,     // 禁用拼写检查
    status: ["autosave", "lines", "words"],  // 状态栏
    toolbar: false,          // 隐藏工具栏
    autoDownloadFontAwesome: false  // 不自动下载字体
});
```

**事件监听**：

```javascript
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
```

---

### 6. 打字机效果

**状态文字打字机**：

```javascript
function setStateText(text, displayMode = null) {
    let index = 0;
    stateTextEl.textContent = "";

    const typeChar = () => {
        if (index < text.length) {
            stateTextEl.textContent += text.charAt(index);
            index++;
            stateTextTimer = setTimeout(typeChar, 500 / text.length);
        }
    };

    typeChar();
}
```

**简历内容打字机**：

```javascript
function typeResumeContent(content) {
    const typeChar = () => {
        if (index < content.length) {
            // 在光标位置插入字符
            doc.replaceRange(content.charAt(index), lastChar);

            // 换行时滚动到底部
            if (content.charAt(index) === "\n") {
                sizer.scrollIntoView({ block: "end" });
            }

            index++;
            typeContentTimer = setTimeout(typeChar, 10000 / content.length);
        }
    };
}
```

---

### 7. API请求

| API端点 | 说明 |
|---------|------|
| `initResume` | 初始化简历数据 |
| `getResumeMd` | 获取简历Markdown内容 |
| `saveResumeMd` | 保存简历内容 |
| `getQuota` | 获取配额信息 |

**请求封装**：

```javascript
async function apiRequest(endpoint, data) {
    return await fetchWithJwt(
        `${window.config.API_BASE_URL}${endpoint}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        }
    );
}
```

---

### 8. 评分弹窗

**三步流程**：

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│    Step 1        │     │    Step 2        │     │    Step 3        │
│  显示统计数据    │ ──▶ │  上传评分截图    │ ──▶ │  感谢页面        │
│  [不感兴趣]      │     │  [取消] [提交]   │     │  [确定]          │
│  [前往商店]      │     │                  │     │                  │
└──────────────────┘     └──────────────────┘     └──────────────────┘
```

**截图上传支持**：
- 点击选择文件
- 粘贴剪贴板图片
- 自动转换为PNG格式

---

### 9. 版本检查

**检查逻辑**：

```javascript
async function checkVersion() {
    // 1. 获取当前版本
    const currentVersion = chrome.runtime.getManifest().version;

    // 2. 检查缓存（1小时有效）
    if (now - lastVersionCheck < 3600000) {
        serverVersion = latestVersion;
    } else {
        // 3. 从服务器获取最新版本
        serverVersion = await fetch(VERSION_URL);
    }

    // 4. 比较版本
    if (isNewerVersion(serverVersion, currentVersion)) {
        showVersionNotification();
    }
}
```

---

### 10. 消息监听

| 消息类型 | 处理 |
|----------|------|
| `toggleArcButtonMode` | 切换按钮显示模式 |
| `toggleHighlight` | 切换高亮开关 |
| `toggleBeautifyResume` | 切换美化选项 |

---

## 全局API暴露

供 `content.js` 调用的接口：

| API | 说明 |
|-----|------|
| `window.setStateText(text, mode)` | 设置状态文字 |
| `window.isRunning()` | 检查是否运行中 |
| `window.bindBeautifyResume(data)` | 绑定美化后的简历 |
| `window.stopTypeResumeContent(content)` | 停止打字机效果 |
| `window.breatheJobInfo()` | 公司/职位呼吸效果 |
| `window.breatheResume(action)` | 简历编辑器呼吸效果 |
| `window.changeStartButtonState(state)` | 改变按钮状态 |
| `window.closeHighlight()` | 关闭高亮 |
| `window.showStarRatingModal(stats)` | 显示评分弹窗 |
| `window.campusSource` | 校招来源数据 |
| `window.testStarRatingModal(options)` | 测试评分弹窗 |

---

## 呼吸效果

用于视觉反馈，表示正在处理中：

```javascript
// 公司和职位输入框呼吸
window.breatheJobInfo = async function () {
    companyInput.classList.add("breathing-bg");
    positionInput.classList.add("breathing-bg");
    await delay(5000);
    companyInput.classList.remove("breathing-bg");
    positionInput.classList.remove("breathing-bg");
};

// 简历编辑器呼吸
window.breatheResume = async function (action) {
    if (action === "begin") {
        codeMirror.classList.add("breathing-bg");
    } else if (action === "end") {
        codeMirror.classList.remove("breathing-bg");
    }
};
```

---

## 页面检测逻辑

**是否显示填充UI**：

```javascript
// 白名单URL直接显示
const whitelistUrls = [
    "https://xyz.51job.com/External/MyResume/FillInResume.aspx",
    "https://xiaoyuan.zhaopin.com/scrd/resume2"
];

// 检测页面关键词
const hasResumeKeyword = /(?:^|[^\u4e00-\u9fa5])(简历|姓名)/.test(bodyText);

// 按钮显示模式
// - "show": 强制显示
// - "auto": 检测到关键词才显示
// - "hidden": 强制隐藏
```

---

## 存储数据

| 键名 | 说明 |
|------|------|
| `auth` | 认证信息 |
| `arcButtonMode` | 按钮显示模式 |
| `highlightEnabled` | 高亮开关 |
| `beautifyResume` | 美化简历开关 |
| `lastVersionCheck` | 上次版本检查时间 |
| `latestVersion` | 最新版本号 |
| `websiteCount` | 填充网站数量 |
| `fieldCount` | 填充字段数量 |
| `starRatingCancelCount` | 评分取消次数 |
| `starRatingUploaded` | 是否已上传评分 |

---

## 与其他模块的关系

```
┌─────────────────┐
│ background.js   │
│ (后台服务)      │
└────────┬────────┘
         │ fetchWithJwt
         │ getSource
         │ uploadStarRating
         ▼
┌─────────────────┐
│resumeInterface.js│ ◀────── popup.js (设置面板)
│ (UI界面)        │         toggleArcButtonMode
└────────┬────────┘         toggleHighlight
         │ runFillResume()
         │ setStateText()
         │ isRunning()
         ▼
┌─────────────────┐
│ content.js      │
│ (填充引擎)      │
└─────────────────┘
```

---

## 修改指南

### 添加新的状态

1. 在 `fillState` 变量中定义新状态
2. 在 `changeState()` 函数中添加对应的图标和样式
3. 在 `startFilling()` 中添加状态转换逻辑

### 添加新的UI元素

1. 在 `html/resumeWindow.html` 中添加HTML结构
2. 在 `css/resumeInterface.css` 中添加样式
3. 在 `bindEvents()` 中绑定事件监听

### 添加新的API

1. 使用 `apiRequest(endpoint, data)` 函数
2. 在 Background.js 中处理对应的消息类型
