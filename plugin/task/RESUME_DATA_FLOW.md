# 简历数据流架构文档

## 📋 概述

本文档描述了插件中简历数据的获取、存储和使用流程。

## 🏗️ 架构设计

### 核心思想
- **智能填充页面（fill.html）**：唯一的数据源，负责调用 API 并更新缓存
- **其他页面**：数据消费者，只从缓存读取，不调用 API
- **数据同步**：每次访问智能填充页面时自动刷新数据

### 数据存储位置
```
chrome.storage.local
├── resumeList (Array)           # 简历列表数据
└── resumeListUpdateTime (Number) # 最后更新时间戳
```

## 🔄 数据流图

```
┌─────────────────────────────────────────────────────────────┐
│                      用户访问智能填充页面                      │
│                        (fill.html)                           │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │  loadResumeDataFromAPI()     │
        │  (调用后端 API)                │
        └──────────────┬───────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │  processResumeList()         │
        │  (处理数据格式)                │
        └──────────────┬───────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │  chrome.storage.local.set()  │
        │  • resumeList               │
        │  • resumeListUpdateTime     │
        └──────────────┬───────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │  renderResumeData()          │
        │  (渲染到页面)                  │
        └──────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│               用户访问其他页面                                │
│       (profile.html / profileMini.html)                     │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │  loadResumeDataFromStorage() │
        │  (从缓存读取)                  │
        └──────────────┬───────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │  chrome.storage.local.get()  │
        │  • resumeList               │
        │  • resumeListUpdateTime     │
        └──────────────┬───────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │  renderResumeData()          │
        │  (渲染到页面)                  │
        └──────────────────────────────┘
```

## 📂 文件职责

### 1. resumeInterfaceTwo.js
**位置**：`chrome/js2/resumeInterfaceTwo.js`

**职责**：
- 智能填充页面（fill.html）和其他内部页面（profile.html）的数据管理
- 提供三个关键函数：

#### loadResumeDataFromAPI()
```javascript
// 仅在 fill.html 页面调用
// 功能：
// 1. 调用后端 API 获取最新简历列表
// 2. 处理数据格式（processResumeList）
// 3. 存储到 chrome.storage.local
// 4. 渲染到页面
```

#### loadResumeDataFromStorage()
```javascript
// 在非 fill.html 页面调用（如 profile.html）
// 功能：
// 1. 从 chrome.storage.local 读取缓存数据
// 2. 直接渲染到页面
// 3. 不调用任何 API
```

#### initResumeData()
```javascript
// 智能包装函数
// 根据 currentPage 判断：
// - 如果是 fill.html → 调用 loadResumeDataFromAPI()
// - 如果是其他页面 → 调用 loadResumeDataFromStorage()
```

### 2. profileMini.js
**位置**：`chrome/popup/scripts/profileMini.js`

**职责**：
- 管理 profileMini.html（浏览器扩展弹出窗口）的数据
- 只从缓存读取数据，不调用 API

#### getResumeList()
```javascript
// 从 chrome.storage.local 读取简历列表
// 不调用 API
// 返回处理好的数据数组
```

#### initResumeData()
```javascript
// 初始化简历数据
// 调用 getResumeList() 从缓存读取
// 渲染到页面
```

## 🔍 数据格式

### API 原始数据格式
```javascript
{
  success: true,
  list: [
    {
      id: 1,
      name: "张三",
      resumeName: "前端开发简历",
      school: "XX大学",
      educationDegreeText: "本科",
      major: "计算机科学",
      graduationYear: "2020-07-01",
      phone: "13800138000",
      email: "zhangsan@example.com",
      jobIntention: "前端工程师",
      expectedCity: "北京",
      coreSkills: "[\"Vue\", \"React\", \"JavaScript\"]"
    }
  ]
}
```

### 处理后的数据格式（存储在 storage 中）
```javascript
[
  {
    id: 1,
    name: "张三",
    resumeName: "前端开发简历",
    school: "XX大学",
    educationDegreeText: "本科",
    major: "计算机科学",
    graduationYear: "2020",           // 只保留年份
    phone: "13800138000",
    email: "zhangsan@example.com",
    jobIntention: "前端工程师",
    expectedCity: "北京",
    coreSkills: "Vue, React, JavaScript"  // JSON 数组转换为逗号分隔字符串
  }
]
```

### storage 数据结构
```javascript
{
  resumeList: [...],           // 处理后的简历数组
  resumeListUpdateTime: 1234567890  // 时间戳
}
```

## 🎯 使用场景

### 场景 1：用户首次使用插件
1. 用户点击插件图标，打开 profileMini.html
2. profileMini.js 尝试从 storage 读取数据
3. storage 中没有数据，显示"请先上传简历"提示
4. 用户访问智能填充页面（fill.html）
5. fill.html 调用 API 获取数据并存储到 storage
6. 用户再次打开 profileMini.html，成功显示简历列表

### 场景 2：用户刷新简历数据
1. 用户在官网上传了新简历
2. 用户访问智能填充页面（fill.html）
3. fill.html 重新调用 API 获取最新数据
4. 新数据覆盖 storage 中的旧数据
5. 其他页面（profile、profileMini）自动显示最新数据

### 场景 3：用户在不同页面间切换
1. 用户在 fill.html 查看简历 A
2. 用户切换到 profile.html
3. profile.html 从 storage 读取数据，无需重新请求
4. 显示相同的简历列表，保持一致性

## ⚠️ 注意事项

### 1. 数据一致性
- **单一数据源**：只有 fill.html 可以更新数据
- **时间戳**：使用 `resumeListUpdateTime` 追踪更新时间
- **缓存失效**：不实现自动失效，只在访问 fill.html 时刷新

### 2. 错误处理
- **API 调用失败**：显示错误提示，保留旧缓存
- **storage 读取失败**：显示"请先上传简历"提示
- **数据格式错误**：使用默认值或空字符串

### 3. 性能优化
- **减少 API 调用**：其他页面不调用 API
- **快速加载**：从 storage 读取比 API 请求快得多
- **数据预处理**：在 fill.html 统一处理，其他页面直接使用

### 4. 用户体验
- **加载提示**：显示"加载中..."或"从缓存加载"
- **错误提示**：明确告知用户问题和解决方案
- **数据新鲜度**：显示最后更新时间

## 🚀 优势

1. **减少服务器压力**：大幅减少 API 调用次数
2. **提升响应速度**：从 storage 读取数据更快
3. **统一数据源**：避免多个页面数据不一致
4. **简化维护**：数据处理逻辑集中在一处
5. **离线可用**：即使网络断开，其他页面仍可显示缓存数据

## 📊 数据流时序图

```
用户操作             fill.html              storage              其他页面
   │                   │                      │                     │
   ├─ 访问 fill.html ─→│                      │                     │
   │                   ├─ 调用 API 获取数据    │                     │
   │                   ├─ 处理数据格式         │                     │
   │                   ├─ 存储数据 ───────────→│                     │
   │                   ├─ 渲染页面             │                     │
   │                   │                      │                     │
   ├─ 切换到 profile ─────────────────────────┼────────────────────→│
   │                   │                      │←─── 读取缓存 ────────┤
   │                   │                      │                     ├─ 渲染页面
   │                   │                      │                     │
   ├─ 点击扩展图标 ─────────────────────────────┼─────────────────────┤
   │                   │                      │                     │
   │           打开 profileMini.html          │                     │
   │                   │                      │←─── 读取缓存 ────────┤
   │                   │                      │                     ├─ 渲染弹窗
   │                   │                      │                     │
```

## 🔧 调试技巧

### 查看 storage 数据
在 Console 中运行：
```javascript
chrome.storage.local.get(['resumeList', 'resumeListUpdateTime'], (result) => {
    console.log('简历列表:', result.resumeList);
    console.log('更新时间:', new Date(result.resumeListUpdateTime).toLocaleString());
});
```

### 清空 storage 缓存
```javascript
chrome.storage.local.remove(['resumeList', 'resumeListUpdateTime'], () => {
    console.log('缓存已清空');
});
```

### 手动设置测试数据
```javascript
chrome.storage.local.set({
    resumeList: [
        {
            id: 1,
            name: "测试用户",
            resumeName: "测试简历",
            school: "测试大学",
            // ... 其他字段
        }
    ],
    resumeListUpdateTime: Date.now()
}, () => {
    console.log('测试数据已设置');
});
```

## 📝 未来优化方向

1. **缓存过期机制**：添加 TTL（生存时间），超过一定时间自动刷新
2. **后台同步**：使用 chrome.alarms 定期在后台更新数据
3. **增量更新**：只更新变化的简历，而非整个列表
4. **压缩存储**：对大数据进行压缩，节省 storage 空间
5. **版本控制**：添加数据版本号，处理数据格式升级

## 🆘 常见问题

### Q1: profileMini 显示"请先上传简历"
**原因**：storage 中没有缓存数据
**解决**：访问一次智能填充页面（fill.html）

### Q2: 简历数据不是最新的
**原因**：缓存未刷新
**解决**：重新访问智能填充页面（fill.html）

### Q3: 不同页面显示的简历不一致
**原因**：某个页面可能在读取旧缓存
**解决**：检查 `resumeListUpdateTime`，刷新 fill.html

### Q4: storage 数据丢失
**原因**：用户清理浏览器数据、卸载扩展等
**解决**：重新访问 fill.html 加载数据

## 📚 相关文件

- `chrome/js2/resumeInterfaceTwo.js` - Shadow DOM 中的数据管理
- `chrome/popup/scripts/profileMini.js` - 弹出窗口的数据管理
- `chrome/popup/fill.html` - 智能填充页面
- `chrome/popup/profile.html` - 个人中心页面（Shadow DOM）
- `chrome/popup/profileMini.html` - 个人中心弹窗

---

**最后更新**：2025-12-04
**作者**：一念职达团队
