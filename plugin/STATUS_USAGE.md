# 状态提示系统使用说明

## 功能概述

状态提示系统为用户提供实时的任务进度反馈，包括：
- 一键智能填充按钮（集成状态显示）
- 状态弹窗（显示详细信息）
- 不同状态类型的视觉区分（进行中、成功、错误）

## 组件说明

### 1. 一键智能填充按钮 (Fill Button)
- 位置：页面中央下方
- 功能：
  - **左键点击**: 执行填充操作（由业务逻辑绑定）
  - **右键点击**: 查看详细状态信息
- 状态显示：
  - **进行中**:
    - 图标：旋转的圆圈
    - 颜色：蓝紫色渐变
    - 动画：呼吸效果（缩放+阴影变化）
    - 文字："处理中..."
    - 按钮禁用（防止重复点击）
  - **成功**:
    - 图标：对勾
    - 颜色：绿色渐变
    - 文字："填充完成"
    - 3秒后自动恢复初始状态
  - **错误**:
    - 图标：警告三角形
    - 颜色：红色渐变
    - 动画：抖动效果
    - 文字："出错了"
    - 5秒后自动恢复初始状态
  - **空闲**:
    - 图标：闪电
    - 颜色：默认粉色
    - 文字："一键智能填充"

### 2. 状态弹窗 (Status Popup)
- 位置：按钮上方居中显示
- 功能：显示详细的状态文本信息
- 打开方式：右键点击填充按钮
- 自动行为：
  - 有新消息时自动弹出
  - 正常消息5秒后自动关闭
  - 错误消息10秒后自动关闭
  - 鼠标悬停时不会自动关闭

## 使用方法

### 在 JavaScript 中调用

#### 方式一：使用全局函数（推荐）
```javascript
// 调用 window.setStateText 自动判断状态类型
window.setStateText("正在扫描网站...");  // 自动识别为 processing
window.setStateText("填写完成！");       // 自动识别为 success
window.setStateText("填写出错！");       // 自动识别为 error
```

#### 方式二：直接调用 updateStatusPopup
```javascript
// 手动指定状态类型
window.updateStatusPopup("正在处理数据...", "processing");
window.updateStatusPopup("操作成功！", "success");
window.updateStatusPopup("网络错误，请重试", "error");
window.updateStatusPopup("等待用户操作", "idle");
```

### 状态类型自动识别规则

`setStateText` 函数会根据文本内容自动判断状态类型：

| 关键词 | 识别为状态 |
|--------|-----------|
| 错误、失败、糟糕、不行了、用完、刷新 | error |
| 完成、成功、已就位、已保存 | success |
| 等待、准备中 | idle |
| 其他 | processing |

### 通过消息传递更新状态

#### 从 Content Script
```javascript
window.postMessage({
  type: 'updateStatus',
  text: '正在扫描网站...',
  status: 'processing'
}, '*');
```

#### 从 Background Script
```javascript
chrome.runtime.sendMessage({
  type: 'updateStatus',
  text: '正在扫描网站...',
  status: 'processing'
});
```

## 样式定制

状态消息支持以下CSS类：
- `.status-message.status-processing` - 蓝色主题（处理中）
- `.status-message.status-success` - 绿色主题（成功）
- `.status-message.status-error` - 红色主题（错误）

## 代码示例

### 完整的任务流程示例
```javascript
async function performTask() {
  try {
    // 开始任务
    window.setStateText("正在扫描网站...");
    await scanWebsite();

    // 处理中
    window.setStateText("正在理解简历...");
    await processResume();

    // 完成
    window.setStateText("填写完成！剩下的空就交给你咯~");
  } catch (error) {
    // 错误处理
    window.setStateText(`填写出错：${error.message}`);
  }
}
```

## 文件结构

```
popup/
├── fill.html                    # 主页面（包含悬浮按钮和弹窗结构）
├── scripts/
│   └── statusPopup.js          # 状态弹窗逻辑
└── styles/
    └── fill.css                # 状态提示样式

js2/
├── content.js                  # 主要填充逻辑（调用 setStateText）
└── resumeInterfaceTwo.js      # setStateText 函数定义
```

## 注意事项

1. **自动关闭时间**：
   - 普通消息：5秒
   - 错误消息：10秒
   - 鼠标悬停时不关闭

2. **状态持久化**：
   - 状态仅在当前会话有效
   - 页面刷新后状态重置

3. **性能考虑**：
   - 避免频繁更新（建议间隔至少100ms）
   - 文本长度建议不超过50个字符

4. **兼容性**：
   - 需要 Chrome 扩展环境
   - 依赖 Font Awesome 图标库

## 测试功能

为了方便测试，项目包含了测试脚本 `statusTest.js`。

### 使用测试脚本

1. 在 fill.html 中引入测试脚本：
```html
<script src="scripts/statusTest.js"></script>
```

2. 打开浏览器控制台，执行测试函数：

```javascript
// 测试完整填充流程
statusTest.fullProcess()

// 测试错误状态
statusTest.error()

// 测试处理中状态
statusTest.processing()

// 测试成功状态
statusTest.success()

// 循环测试所有状态
statusTest.allStates()

// 自定义测试
window.updateStatusPopup('自定义消息', 'processing')
```

### 测试检查清单

- [ ] 按钮在处理中状态显示呼吸动画
- [ ] 按钮在处理中状态禁用点击
- [ ] 按钮成功状态显示绿色，3秒后恢复
- [ ] 按钮错误状态显示红色并抖动，5秒后恢复
- [ ] 右键点击按钮能打开状态弹窗
- [ ] 状态弹窗能自动关闭
- [ ] 点击弹窗外部能关闭弹窗
- [ ] 鼠标悬停在弹窗上不会自动关闭

## 呼吸动画效果

处理中状态的呼吸动画效果包括：
- **缩放**: 按钮在1.0到1.05之间缩放
- **阴影**: 阴影在30px到50px之间变化，透明度在0.3到0.6之间变化
- **周期**: 2秒一个完整周期
- **缓动**: ease-in-out，使动画更自然

CSS代码：
```css
@keyframes breathe {
  0%, 100% {
    transform: scale(1);
    box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3);
  }
  50% {
    transform: scale(1.05);
    box-shadow: 0 15px 50px rgba(102, 126, 234, 0.6);
  }
}
```
