# Background.js 功能描述与逻辑运行文档

## 概述

`background.js` 是求职方舟 Chrome 扩展的 **Service Worker 后台服务**，基于 Manifest V3 规范开发。它负责处理扩展的核心后台逻辑，包括认证管理、消息路由、状态追踪和 API 请求代理。

---

## 模块架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        Background.js                             │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │ ConfigModule │  │  AuthModule  │  │ ErrorModule  │           │
│  │   配置管理    │  │   认证管理   │  │  错误上报    │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐                     │
│  │LearningFieldModule│  │  HistoryModule   │                     │
│  │   字段学习收集    │  │   投递历史管理   │                     │
│  └──────────────────┘  └──────────────────┘                     │
│                                                                  │
│  ┌──────────────────┐  ┌───────────────────────┐                │
│  │  TabSourceModule │  │NavigationHistoryModule│                │
│  │  标签页来源追踪  │  │     导航历史记录      │                │
│  └──────────────────┘  └───────────────────────┘                │
│                                                                  │
│  ┌──────────────────┐                                           │
│  │ StarRatingModule │                                           │
│  │    评分管理      │                                           │
│  └──────────────────┘                                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## 模块详细说明

### 1. ConfigModule（配置模块）

**职责**：管理扩展配置信息

**主要功能**：
- 在扩展安装/启动时初始化配置
- 将 API 端点和 URL 配置存储到 `chrome.storage.local`

**存储结构**：
```javascript
{
  config: {
    API_BASE_URL,      // 基础 API
    API_AUTH_URL,      // 认证 API
    API_HISTORY_URL,   // 历史记录 API
    WEB_URL,           // 官网 URL
    LOGIN_URL,         // 登录页
    // ... 其他 URL
  }
}
```

---

### 2. AuthModule（认证模块）

**职责**：JWT Token 管理与认证

**核心功能**：

| 方法 | 说明 |
|------|------|
| `fetchWithJwt()` | 带 JWT 的 API 请求，自动处理 Token 过期 |
| `refreshToken()` | 刷新 Access Token |
| `handleExternalLogin()` | 处理来自官网的登录同步 |
| `handleExternalLogout()` | 处理来自官网的登出同步 |

**Token 刷新流程**：

```
┌─────────────┐     401      ┌──────────────┐     成功     ┌─────────────┐
│  发送请求   │ ────────────▶ │  刷新 Token  │ ────────────▶ │  重试请求   │
└─────────────┘              └──────────────┘              └─────────────┘
                                   │
                                   │ 失败
                                   ▼
                             ┌──────────────┐
                             │  抛出错误    │
                             └──────────────┘
```

**并发请求 Token 刷新处理**：
- 使用 `isRefreshing` 标志防止重复刷新
- 使用 `refreshSubscribers` 队列让后续请求等待刷新完成

**存储结构**：
```javascript
{
  auth: {
    token: "accessToken",      // JWT Access Token
    refreshToken: "...",       // Refresh Token
    userInfo: { ... }          // 用户信息
  }
}
```

---

### 3. LearningFieldModule（学习字段模块）

**职责**：收集用户填写的表单字段数据，用于改进自动填充算法

**工作流程**：

```
用户开始填写表单
        │
        ▼
┌───────────────────┐
│  learnField 消息   │ ──▶ 保存到 learningTabs
└───────────────────┘
        │
        ▼ (用户离开页面或手动停止)
┌───────────────────┐
│ 触发数据上传      │ ──▶ POST /api/chrome/learningField
└───────────────────┘
```

**防抖机制**：
- 10 秒内不重复发送数据
- 通过 `lastSendTime` 时间戳控制

**触发上传的时机**：
1. 用户发送 `stopLearnField` 消息
2. 页面导航（`onCompleted` / `onHistoryStateUpdated`）
3. 标签页关闭

---

### 4. HistoryModule（投递历史模块）

**职责**：管理用户的职位投递记录

**工作流程**：

```
Content Script 检测到投递
        │
        ▼
┌───────────────────┐
│  addHistory 消息   │ ──▶ 保存到 historyTabs
└───────────────────┘
        │
        ▼ (页面导航时)
┌───────────────────┐
│ 上传到服务器      │ ──▶ POST /api/history/addHistoryByChrome
└───────────────────┘
        │
        ▼ (如果是校招来源)
┌───────────────────┐
│ 通知官网更新      │ ──▶ 发送 addHistoryCampusId 消息
└───────────────────┘
```

**数据结构**：
```javascript
{
  historyTabs: {
    [tabId]: {
      source: "campus",    // 来源标识
      data: {
        campusId: "...",   // 校招 ID
        // 其他投递数据
      }
    }
  }
}
```

---

### 5. TabSourceModule（标签页来源追踪模块）

**职责**：追踪用户从哪个页面跳转到目标页面

**工作流程**：

```
用户点击链接
     │
     ▼
┌─────────────────┐
│ clickSource 消息 │ ──▶ 设置 pendingSource
└─────────────────┘
     │
     ▼ (新标签页创建)
┌─────────────────┐
│  onCreated 事件  │ ──▶ 将 pendingSource 分配给新标签页
└─────────────────┘
```

**来源继承机制**：
- 如果有 `pendingSource`，使用它
- 否则继承父标签页的来源

---

### 6. NavigationHistoryModule（导航历史模块）

**职责**：记录每个标签页的浏览历史

**特点**：
- 每个标签页保留最近 **5 条** URL 记录
- 避免记录重复的连续 URL
- 返回时按时间倒序（最新在前）

**存储结构**：
```javascript
{
  navigationHistory: {
    [tabId]: [
      "https://example.com/page1",
      "https://example.com/page2",
      // 最多 5 条
    ]
  }
}
```

---

### 7. ErrorModule（错误日志模块）

**职责**：收集并上报扩展运行时的错误信息

**上报的数据字段**：
| 字段 | 说明 |
|------|------|
| functionName | 出错的函数名 |
| errorStack | 错误堆栈 |
| duration | 持续时间 |
| browser | 浏览器信息 |
| version | 扩展版本 |
| resumeId | 简历 ID |
| company | 公司名称 |
| url | 页面 URL |

---

### 8. StarRatingModule（评分模块）

**职责**：处理用户评分截图的上传

**主要功能**：

| 方法 | 说明 |
|------|------|
| `handleCheckMessage()` | 检查用户是否已上传评分截图 |
| `handleUploadMessage()` | 上传评分截图（Base64 转 Blob） |

**图片上传流程**：
```
Base64 图片数据
      │
      ▼
┌─────────────────┐
│ atob() 解码     │
└─────────────────┘
      │
      ▼
┌─────────────────┐
│ 转换为 Uint8Array│
└─────────────────┘
      │
      ▼
┌─────────────────┐
│ 创建 Blob       │
└─────────────────┘
      │
      ▼
┌─────────────────┐
│ FormData 上传   │ ──▶ POST /api/chrome/uploadStarRating
└─────────────────┘
```

---

## 消息通信机制

### 内部消息（Content Script → Background）

通过 `chrome.runtime.sendMessage` 发送：

| 消息类型 | 处理模块 | 说明 |
|---------|----------|------|
| `fetchWithJwt` | AuthModule | 带 JWT 的 API 请求 |
| `learnField` | LearningFieldModule | 开始学习字段 |
| `stopLearnField` | LearningFieldModule | 停止学习并上传 |
| `addHistory` | HistoryModule | 添加投递记录 |
| `clickSource` | TabSourceModule | 记录点击来源 |
| `getSource` | TabSourceModule | 获取当前来源 |
| `getHistoryUrls` | NavigationHistoryModule | 获取导航历史 |
| `logError` | ErrorModule | 上报错误 |
| `checkStarRating` | StarRatingModule | 检查评分状态 |
| `uploadStarRating` | StarRatingModule | 上传评分截图 |

### 外部消息（官网 → 扩展）

通过 `chrome.runtime.onMessageExternal` 接收：

| 消息类型 | 说明 |
|---------|------|
| `login` | 官网登录状态同步 |
| `logout` | 官网登出状态同步 |
| `ping` | 扩展存活检测 |

---

## 事件监听

### Chrome 扩展生命周期

| 事件 | 处理逻辑 |
|------|----------|
| `onInstalled` | 初始化配置，首次安装打开欢迎页 |
| `onStartup` | 重新初始化配置 |

### 标签页事件

| 事件 | 处理逻辑 |
|------|----------|
| `tabs.onCreated` | 分配来源给新标签页 |
| `tabs.onRemoved` | 清理各模块中的标签页数据 |

### 导航事件

| 事件 | 处理逻辑 |
|------|----------|
| `webNavigation.onCompleted` | 触发学习数据/历史记录上传 |
| `webNavigation.onHistoryStateUpdated` | 处理 SPA 路由变化 |

---

## 数据存储结构总览

```javascript
chrome.storage.local = {
  // 配置信息
  config: { API_BASE_URL, ... },

  // 认证信息
  auth: {
    token: "...",
    refreshToken: "...",
    userInfo: { ... }
  },

  // 学习中的标签页
  learningTabs: {
    [tabId]: { url, version, html }
  },

  // 待上传的历史记录
  historyTabs: {
    [tabId]: { source, data }
  },

  // 标签页来源映射
  tabSourceMap: {
    [tabId]: "source"
  },

  // 导航历史
  navigationHistory: {
    [tabId]: ["url1", "url2", ...]
  },

  // 评分上传状态
  starRatingUploaded: true/false
}
```

---

## API 端点汇总

| 端点 | 方法 | 模块 | 说明 |
|------|------|------|------|
| `/api/auth/refreshToken` | POST | AuthModule | 刷新 Token |
| `/api/chrome/learningField` | POST | LearningFieldModule | 上传学习数据 |
| `/api/history/addHistoryByChrome` | POST | HistoryModule | 添加投递记录 |
| `/api/chrome/logError` | POST | ErrorModule | 上报错误日志 |
| `/api/chrome/isStarRatingUploaded` | GET | StarRatingModule | 检查评分状态 |
| `/api/chrome/uploadStarRating` | POST | StarRatingModule | 上传评分截图 |

---

## 修改指南

### 添加新的消息类型

1. 在 `chrome.runtime.onMessage` 的 `messageHandlers` 对象中添加新类型
2. 创建对应的处理函数或模块

```javascript
const messageHandlers = {
    // 添加新类型
    newMessageType: () => NewModule.handleMessage(message, sender, sendResponse),
    // ...
};
```

### 添加新的存储数据

1. 定义获取/设置/删除方法
2. 在 `handleTabRemove` 中添加清理逻辑

### 添加新的 API 调用

使用 `AuthModule.fetchWithJwt()` 方法，自动处理认证：

```javascript
const response = await AuthModule.fetchWithJwt(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
});
```
