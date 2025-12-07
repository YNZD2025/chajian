# profileMini.html 调试指南

## 问题描述
profileMini.js 初始化脚本没有执行

## 调试步骤

### 1. 重新加载扩展
1. 打开 Chrome 浏览器
2. 访问 `chrome://extensions/`
3. 找到你的扩展"一念职达"
4. 点击刷新按钮（循环图标）重新加载扩展

### 2. 打开开发者工具
1. 点击浏览器工具栏上的扩展图标（这会打开 profileMini.html）
2. 在弹出的窗口中右键点击，选择"检查"（Inspect）
3. 这会打开一个新的开发者工具窗口

### 3. 查看控制台日志
在开发者工具的 Console 标签中，你应该看到以下日志：

```
=== [DEBUG] profileMini.html 页面开始加载 ===
[DEBUG] 当前 URL: chrome-extension://...
[DEBUG] document.readyState: loading 或 interactive 或 complete

[profileMini] 脚本已加载，准备初始化...
[profileMini] document.readyState: loading 或 interactive 或 complete

=== [DEBUG] 所有外部脚本已加载 ===
[DEBUG] 检查 chrome.storage 是否可用: true
[DEBUG] 检查 chrome.runtime 是否可用: true

[profileMini] DOM 已就绪 (readyState: complete)，立即执行初始化
[profileMini] 页面加载完成，开始初始化...
[profileMini] Chrome API 可用性检查: {storage: true, runtime: true, tabs: true}
[profileMini] 初始化关闭按钮...
[profileMini] 初始化设置按钮...
[profileMini] 初始化退出登录按钮...
[profileMini] 根据登录状态更新UI...
[profileMini] 用户未登录，禁用退出登录按钮 (或 用户已登录)
[profileMini] 加载用户信息...
[profileMini] 获取到的 auth 数据: {...}
[profileMini] 初始化简历数据...
[profileMini] ✓ 初始化完成
```

### 4. 常见问题排查

#### 问题 A: 完全没有任何日志输出
**可能原因：**
- 扩展没有正确加载
- manifest.json 配置错误
- 脚本文件路径错误

**解决方案：**
1. 检查扩展是否已启用
2. 检查是否有错误提示（红色感叹号）
3. 重新加载扩展

#### 问题 B: 只有 [DEBUG] 日志，没有 [profileMini] 日志
**可能原因：**
- profileMini.js 文件未加载
- 脚本路径错误
- 脚本有语法错误

**解决方案：**
1. 检查 Console 中是否有错误信息
2. 检查 Network 标签，看 profileMini.js 是否成功加载
3. 查看错误详情

#### 问题 C: 有 [profileMini] 初始化日志，但出现错误
**可能原因：**
- Chrome API 不可用
- DOM 元素未找到
- 异步操作失败

**解决方案：**
1. 查看具体的错误信息
2. 检查 Chrome API 可用性检查的结果
3. 确认 HTML 元素是否存在

#### 问题 D: auth 检查失败
**可能原因：**
- 用户未登录
- auth 数据未正确存储
- storage API 不可用

**解决方案：**
1. 在 Console 中运行：`chrome.storage.local.get(['auth'], console.log)`
2. 检查输出的 auth 数据
3. 如果没有 auth 数据，需要先登录

### 5. 手动测试脚本

在 Console 中运行以下命令，手动测试各个功能：

```javascript
// 检查 auth 状态
chrome.storage.local.get(['auth'], (result) => {
    console.log('Auth 数据:', result.auth);
    console.log('是否有 token:', result.auth?.token ? '是' : '否');
});

// 检查 DOM 元素
console.log('关闭按钮:', document.querySelector('.liquid-close'));
console.log('设置按钮:', document.querySelector('.btn-settings'));
console.log('退出按钮:', document.querySelector('.btn-logout'));
console.log('用户昵称元素:', document.querySelector('#user-nickname'));
console.log('简历昵称元素:', document.querySelector('#resume-nickname'));
```

### 6. 查看网络请求

如果初始化成功但接口调用失败：
1. 打开 Network 标签
2. 刷新页面或重新打开 popup
3. 查看是否有失败的请求
4. 检查请求的 Headers 和 Response

## 修改内容总结

### profileMini.js 的主要修改：

1. **添加 auth 检查**（第303-310行）：
   - 在 `initResumeData()` 中先检查 auth 是否存在
   - 如果没有 auth，显示"请先登录"提示

2. **添加 `showNoAuthMessage()` 函数**（第289-312行）：
   - 显示未登录状态的提示信息

3. **优化初始化逻辑**（第580-596行）：
   - 检查 `document.readyState`
   - 根据状态决定是等待事件还是立即执行

4. **增强错误处理**（第532-573行）：
   - 用 try-catch 包裹初始化代码
   - 详细的日志输出
   - 错误时显示提示

5. **设置按钮优化**（第430-437行）：
   - 未登录时跳转到登录页面
   - 已登录时跳转到官网

### profileMini.html 的修改：

1. **添加调试脚本**（第403-417行）：
   - 在脚本加载前后添加日志
   - 检查 Chrome API 可用性

## 预期行为

### 已登录状态：
- 显示用户昵称和头像
- 加载并显示简历列表
- 退出登录按钮可用
- 设置按钮跳转到官网

### 未登录状态：
- 显示"未登录"文本
- 简历类型显示"请先登录"
- 退出登录按钮禁用（半透明）
- 设置按钮跳转到登录页面

## 需要帮助？

如果按照以上步骤仍然无法解决问题，请提供：
1. Console 中的完整日志输出
2. 是否有红色错误信息
3. Chrome 版本号
4. 扩展是否正常加载
