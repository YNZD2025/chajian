# Config.js & Popup.js 功能描述文档

## 概述

本文档描述两个辅助模块：
- `config.js` - 环境配置和 API 端点定义
- `popup.js` - 扩展弹窗设置界面交互

---

## Config.js 配置模块

### 模块架构

```
┌─────────────────────────────────────────────────────────────────┐
│                         Config.js                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌──────────────────┐    ┌──────────────────┐                  │
│   │  环境配置对象     │    │  URL构建函数     │                  │
│   │  (development/   │───▶│  buildUrl()      │                  │
│   │   production)    │    │                  │                  │
│   └──────────────────┘    └────────┬─────────┘                  │
│                                    │                             │
│                                    ▼                             │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                    导出的 URL 常量                        │   │
│   │  API_BASE_URL, API_AUTH_URL, API_HISTORY_URL            │   │
│   │  WEB_URL, LOGIN_URL, CAMPUS_URL, HISTORY_URL ...        │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 环境配置

| 环境 | WEB 服务 | API 服务 |
|------|----------|----------|
| development | `http://localhost:5173` | `http://localhost:8080` |
| production | `https://www.qiuzhifangzhou.com` | `https://api.qiuzhifangzhou.com` |

### API 端点

| 常量名 | 路径 | 用途 |
|--------|------|------|
| `API_BASE_URL` | `/api/chrome/` | 扩展核心 API |
| `API_AUTH_URL` | `/api/auth/` | 认证相关 API |
| `API_HISTORY_URL` | `/api/history/` | 历史记录 API |

**API_BASE_URL 下的接口**：

| 接口 | 方法 | 说明 |
|------|------|------|
| `getNeedField` | POST | 获取需要填写的字段 |
| `fillResumeValue` | POST | 获取字段填充值 |
| `beautifyResumeMd` | POST | 美化简历 |
| `learningField` | POST | 上传学习数据 |
| `logError` | POST | 上报错误日志 |
| `initResume` | POST | 初始化简历数据 |
| `getResumeMd` | POST | 获取简历内容 |
| `saveResumeMd` | POST | 保存简历内容 |
| `getQuota` | POST | 获取配额信息 |
| `isStarRatingUploaded` | GET | 检查评分状态 |
| `uploadStarRating` | POST | 上传评分截图 |

### 网站 URL

| 常量名 | 路径 | 用途 |
|--------|------|------|
| `WEB_DOMAIN` | 域名 | 标签页查询匹配 |
| `WEB_URL` | `/resume` | 简历管理页 |
| `LOGIN_URL` | `/resume?login=true` | 登录页 |
| `CAMPUS_URL` | `/campus` | 校招信息页 |
| `HISTORY_URL` | `/history` | 投递历史页 |
| `AUTOFILL_URL` | `/autofill` | 自动填充介绍页 |
| `VERSION_URL` | `/crx/version.txt` | 版本检查 |
| `WELCOME_URL` | `/welcome` | 欢迎页 |
| `PRICING_URL` | `/pricing` | 定价页 |

### URL 构建函数

```javascript
/**
 * 构建完整的 URL
 * @param {string} path - 路径
 * @param {string} type - "API" 或 "WEB"
 */
const buildUrl = (path, type) => {
    const { HOST, PORT } = config[type];
    // 443 端口不显示端口号
    const portSuffix = PORT === "443" ? "" : `:${PORT}`;
    return `${HOST}${portSuffix}${path}`;
};
```

### 导出的函数

| 函数名 | 返回值 | 说明 |
|--------|--------|------|
| `isDevEnv()` | boolean | 是否为开发环境 |
| `getEnv()` | string | 当前环境名称 |

---

## Popup.js 弹窗模块

### 模块架构

```
┌─────────────────────────────────────────────────────────────────┐
│                          Popup.js                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌──────────────────┐    ┌──────────────────┐                  │
│   │  设置选项读取     │    │  设置选项保存     │                  │
│   │  (从storage加载) │    │  (写入storage)   │                  │
│   └──────────────────┘    └──────────────────┘                  │
│                                                                  │
│   ┌──────────────────┐    ┌──────────────────┐                  │
│   │  用户状态显示     │    │  统计数据显示     │                  │
│   │  (登录/登出)     │    │  (网站/字段数)   │                  │
│   └──────────────────┘    └──────────────────┘                  │
│                                                                  │
│   ┌──────────────────────────────────────────────────────────┐  │
│   │                   消息广播                                │  │
│   │  sendMessageToAllTabs() → 所有标签页的 Content Script    │  │
│   └──────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 设置选项

#### 按钮显示模式

| 模式 | 值 | 说明 |
|------|-----|------|
| 始终显示 | `show` | 在所有页面显示 Logo 按钮 |
| 始终隐藏 | `hidden` | 在所有页面隐藏 Logo 按钮 |
| 自动检测 | `auto` | 检测到简历相关内容时显示 |

#### 功能开关

| 选项 | 存储键 | 默认值 | 说明 |
|------|--------|--------|------|
| 美化简历 | `beautifyResume` | `false` | 启用专岗简历生成 |
| 学习功能 | `learningResume` | `true` | 学习用户填写的内容 |
| 高亮显示 | `highlightEnabled` | `true` | 高亮显示识别的字段 |

### 数据存储

**读取的 Storage 键**：

| 键名 | 类型 | 说明 |
|------|------|------|
| `arcButtonMode` | string | 按钮显示模式 |
| `showArc` | boolean | 旧版兼容字段 |
| `beautifyResume` | boolean | 美化简历开关 |
| `learningResume` | boolean | 学习功能开关 |
| `highlightEnabled` | boolean | 高亮显示开关 |
| `websiteCount` | number | 填充网站数量 |
| `fieldCount` | number | 填充字段数量 |
| `auth` | object | 认证信息 |

### 消息广播

当用户在 Popup 中更改设置时，需要通知所有已打开的标签页：

```javascript
/**
 * 向所有标签页发送消息
 */
const sendMessageToAllTabs = async (action, state) => {
    const tabs = await chrome.tabs.query({});

    const promises = tabs.map((tab) => {
        return chrome.tabs.sendMessage(tab.id, {
            action: action,
            tabId: tab.id,
            state: state
        }).catch(() => {
            // 静默处理（标签页可能没有 Content Script）
        });
    });

    await Promise.allSettled(promises);
};
```

**广播的消息类型**：

| action | 触发条件 | Content Script 处理 |
|--------|----------|---------------------|
| `toggleArcButtonMode` | 切换显示模式 | 显示/隐藏 Logo 按钮 |
| `toggleHighlight` | 切换高亮开关 | 更新 CSS 变量 |
| `toggleBeautifyResume` | 切换美化开关 | 更新复选框状态 |

### 用户状态管理

```
┌─────────────────┐
│  检查 auth 数据  │
└────────┬────────┘
         │
         ▼
    ┌────────────┐
    │ 已登录？   │
    └─────┬──────┘
          │
    ┌─────┴─────┐
    │           │
    ▼           ▼
┌────────┐  ┌────────┐
│ 显示   │  │ 显示   │
│ 用户名 │  │点击登录│
│ [登出] │  │        │
└────────┘  └────────┘
```

### 页面跳转

| 按钮 | 目标 URL | 说明 |
|------|----------|------|
| 访问求职方舟 | `WEB_URL` | 打开简历管理页 |
| 头像区域（已登录） | `WEB_URL` | 打开简历管理页 |
| 头像区域（未登录） | `LOGIN_URL` | 打开登录页 |

---

## 模块间通信流程

```
┌─────────────┐          ┌─────────────┐          ┌─────────────┐
│  Popup.js   │          │ Background  │          │  Content    │
│  (设置界面)  │          │   .js       │          │   .js       │
└──────┬──────┘          └──────┬──────┘          └──────┬──────┘
       │                        │                        │
       │  1. 用户更改设置       │                        │
       │──────────────────────▶│                        │
       │                        │                        │
       │  2. storage.set()      │                        │
       │  ─────────────────────▶│                        │
       │                        │                        │
       │  3. tabs.sendMessage() │                        │
       │  ────────────────────────────────────────────▶ │
       │                        │                        │
       │                        │                        │  4. 更新UI
       │                        │                        │  ────────▶
       │                        │                        │
```

---

## 旧版兼容处理

```javascript
// 旧版使用 showArc (boolean)
// 新版使用 arcButtonMode (string)

if (storage.arcButtonMode) {
    // 使用新版设置
} else {
    // 兼容旧版，并迁移
    chrome.storage.local.set({
        arcButtonMode: storage.showArc === false ? "hidden" : "auto"
    });
}
```

---

## 修改指南

### 添加新的设置选项

1. 在 `popup.html` 中添加 UI 元素
2. 在 `popup.js` 中：
   - 获取 DOM 元素
   - 从 storage 读取初始值
   - 添加 change 事件监听
   - 保存到 storage
   - 如需实时生效，添加广播函数

### 添加新的 API 端点

1. 在 `config.js` 中添加导出：
   ```javascript
   export const NEW_API_URL = buildUrl("/api/new/", "API");
   ```
2. 在需要使用的模块中导入

### 添加新的页面 URL

1. 在 `config.js` 中添加：
   ```javascript
   export const NEW_PAGE_URL = buildUrl("/new-page", "WEB");
   ```

---

## 总结

| 文件 | 行数 | 主要功能 |
|------|------|----------|
| `config.js` | ~110 | 环境配置、URL 构建 |
| `popup.js` | ~180 | 设置界面、消息广播 |

**config.js** 是纯配置模块，不包含业务逻辑，仅导出 URL 常量和环境检测函数。

**popup.js** 是扩展弹窗的交互脚本，主要处理用户设置和状态显示，通过消息广播实现设置的实时生效。
