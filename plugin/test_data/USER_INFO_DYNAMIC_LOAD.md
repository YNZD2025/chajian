# 个人中心用户信息动态加载修复

## 问题描述

用户报告了两个问题：

1. **昵称未动态加载**：个人中心页面的"李艺伟"是硬编码的，没有从 `chrome.storage.local` 中加载
2. **头像未显示**：头像图片被注释掉了，需要取消注释并动态加载 avatar URL

## 数据结构

用户信息存储在 `chrome.storage.local` 中：

```javascript
{
    auth: {
        userInfo: {
            avatar: "https://thirdwx.qlogo.cn/mmopen/vi_32/PiajxSqBRaEKOD3sibVPXUQiafd2N7mch1pkWpKibYzwGRNRicu4x2ZEELtooEmYDY1uaXGBc4SHYmxjje5SgdLlrOvjicIE3e1GEBfvpkdOjkUyN5CVVTb1AtOw/132",
            id: 25,
            nickname: "EpiphyllumLove"
        }
    }
}
```

## 问题原因

最初的解决方案在 `profile.js` 中使用 `document.querySelector`，但由于页面是在 **Shadow DOM** 中加载的，`document.querySelector` 无法访问 Shadow DOM 中的元素，导致昵称和头像无法更新。

### Shadow DOM 的限制

```javascript
// ❌ 在 profile.js 中执行（无法访问 Shadow DOM）
document.querySelector('.profile-name')  // 返回 null

// ✅ 在 resumeInterfaceTwo.js 中执行
resumeWindowContainer.querySelector('.profile-name')  // 可以访问
```

## 解决方案

### 1. 修改 profile.html - 添加 ID 标识

**文件：popup/profile.html (第 77-78 行)**

取消注释头像并添加 ID 标识：

```html
<!-- 修改前 -->
<!-- <img src="logo-small.png" class="profile-avatar"> -->
<div class="profile-div"></div>
<div class="profile-name">李艺伟</div>

<!-- 修改后 -->
<img src="logo-small.png" class="profile-avatar" id="user-avatar">
<div class="profile-name" id="user-nickname">李艺伟</div>
```

**文件：popup/profile.html (第 94 行)**

给简历卡片中的昵称也添加 ID：

```html
<!-- 修改前 -->
<div class="resume-name">李艺伟</div>

<!-- 修改后 -->
<div class="resume-name" id="resume-nickname">李艺伟</div>
```

### 2. 创建 loadUserInfo 函数

**文件：js2/resumeInterfaceTwo.js (第 2966-3012 行)**

在 `initResumeData` 函数前添加新函数：

```javascript
/**
 * 加载用户信息（昵称和头像）
 */
function loadUserInfo() {
    chrome.storage.local.get(['auth'], function(result) {
        console.log('[loadUserInfo] 读取到的 storage 数据:', result);

        if (result.auth && result.auth.userInfo) {
            const userInfo = result.auth.userInfo;
            const nickname = userInfo.nickname || '未设置昵称';
            const avatar = userInfo.avatar || 'logo-small.png';

            console.log('[loadUserInfo] 用户信息:', { nickname, avatar });

            // 更新个人信息头像下方的昵称
            const userNickname = resumeWindowContainer.querySelector('#user-nickname');
            if (userNickname) {
                userNickname.textContent = nickname;
                console.log('✓ 已更新个人信息昵称:', nickname);
            } else {
                console.warn('⚠ 未找到 #user-nickname 元素');
            }

            // 更新简历卡片中的昵称
            const resumeNickname = resumeWindowContainer.querySelector('#resume-nickname');
            if (resumeNickname) {
                resumeNickname.textContent = nickname;
                console.log('✓ 已更新简历卡片昵称:', nickname);
            } else {
                console.warn('⚠ 未找到 #resume-nickname 元素');
            }

            // 更新头像
            const userAvatar = resumeWindowContainer.querySelector('#user-avatar');
            if (userAvatar) {
                userAvatar.src = avatar;
                userAvatar.style.display = 'block';
                console.log('✓ 已更新用户头像:', avatar);
            } else {
                console.warn('⚠ 未找到 #user-avatar 元素');
            }
        } else {
            console.warn('⚠ 未找到用户信息，使用默认值');
            console.log('auth 数据结构:', result.auth);
        }
    });
}
```

### 3. 在页面加载时调用

**文件：js2/resumeInterfaceTwo.js (第 1047-1050 行)**

在 `bindPageSpecificEvents` 函数的 `profile.html` 分支中添加调用：

```javascript
// profile.html - 个人页面
if (pageHtml === 'profile.html') {
    // 加载用户信息（昵称和头像）
    loadUserInfo();  // ← 新增

    // 初始化简历数据（会自动调用bindResumeSwitchEvents）
    initResumeData().then(() => {
        // ... 编辑按钮事件绑定
    });
}
```

### 4. 补充缺失图标

**文件：popup/styles/simple-icons.css (第 213-216 行)**

添加设置页面使用的图标：

```css
.fa-user-cog::before { content: "👤⚙"; letter-spacing: -0.1em; }  /* 用户设置图标 */
.fa-id-card::before { content: "🪪"; }  /* 身份证/ID卡图标 */
.fa-edit::before { content: "✏"; }  /* 编辑图标 */
.fa-chevron-right::before { content: "›"; font-size: 1.4em; font-weight: bold; }  /* 右箭头 */
```

## 功能特性

### 1. 动态加载

- ✅ 页面加载时自动从 `chrome.storage.local` 获取用户信息
- ✅ 在 Shadow DOM 上下文中正确访问 DOM 元素
- ✅ 同时更新两处昵称显示（个人信息头 + 简历卡片）
- ✅ 动态加载并显示用户头像

### 2. 容错处理

- ✅ 如果找不到用户信息，保持默认显示"李艺伟"
- ✅ 如果找不到头像，使用默认图片 `logo-small.png`
- ✅ 详细的日志输出，便于调试

### 3. 调试友好

- ✅ 输出 storage 数据结构
- ✅ 输出每一步的执行结果
- ✅ 如果元素未找到，输出警告信息

## 测试步骤

### 1. 重新加载扩展

```
chrome://extensions/ → 找到扩展 → 点击"重新加载"
```

### 2. 设置测试数据

打开扩展的控制台（F12），执行：

```javascript
chrome.storage.local.set({
    auth: {
        userInfo: {
            avatar: "https://thirdwx.qlogo.cn/mmopen/vi_32/PiajxSqBRaEKOD3sibVPXUQiafd2N7mch1pkWpKibYzwGRNRicu4x2ZEELtooEmYDY1uaXGBc4SHYmxjje5SgdLlrOvjicIE3e1GEBfvpkdOjkUyN5CVVTb1AtOw/132",
            id: 25,
            nickname: "EpiphyllumLove"
        }
    }
}, function() {
    console.log('✓ 测试数据已设置');
});
```

### 3. 测试昵称显示

- 点击"我的"菜单
- **检查点 1**：个人信息头像下方是否显示 "EpiphyllumLove" ✅
- **检查点 2**：简历卡片中的名字是否显示 "EpiphyllumLove" ✅

### 4. 测试头像显示

- **检查点 3**：头像是否显示为微信头像（而不是 logo-small.png）✅
- **检查点 4**：头像图片是否加载成功 ✅

### 5. 查看控制台日志

应该看到以下日志输出：

```
[loadUserInfo] 读取到的 storage 数据: {auth: {…}}
[loadUserInfo] 用户信息: {nickname: "EpiphyllumLove", avatar: "https://thirdwx.qlogo.cn/..."}
✓ 已更新个人信息昵称: EpiphyllumLove
✓ 已更新简历卡片昵称: EpiphyllumLove
✓ 已更新用户头像: https://thirdwx.qlogo.cn/...
```

### 6. 测试容错处理

清除 auth 数据：

```javascript
chrome.storage.local.remove('auth', function() {
    console.log('✓ auth 数据已清除');
});
```

刷新页面：
- **检查点 5**：昵称应显示默认的 "李艺伟" ✅
- **检查点 6**：头像应显示默认的 logo-small.png ✅
- **检查点 7**：控制台应显示警告：`⚠ 未找到用户信息，使用默认值` ✅

## 预期结果

✅ 个人中心页面从 storage 动态加载用户昵称
✅ 头像正确显示并动态加载
✅ 同时更新两处昵称显示
✅ 找不到用户信息时显示默认值
✅ 设置页面的图标正确显示
✅ 控制台输出详细的调试日志

## 技术说明

### Shadow DOM 中的元素访问

在 Chrome 扩展中使用 Shadow DOM 时：

```javascript
// ❌ 错误：在普通 document 上下文中无法访问
document.querySelector('.profile-name')

// ✅ 正确：通过 Shadow Host 访问
const shadowRoot = document.querySelector('#resume-window-container').shadowRoot;
const element = shadowRoot.querySelector('.profile-name');

// ✅ 更好：在 resumeInterfaceTwo.js 中直接使用容器
const element = resumeWindowContainer.querySelector('.profile-name');
```

### 为什么不使用独立的 profile.js

1. **作用域限制**：独立脚本运行在普通 document 上下文，无法访问 Shadow DOM
2. **执行时机**：页面通过 `fetch()` 动态加载，脚本执行时机难以控制
3. **代码重复**：需要在多个地方访问 `shadowRoot`，代码冗余

### 集成到 resumeInterfaceTwo.js 的优势

1. **直接访问**：通过 `resumeWindowContainer` 直接访问 Shadow DOM 元素
2. **执行时机**：在 `bindPageSpecificEvents` 中调用，确保 DOM 已加载
3. **统一管理**：所有页面特定逻辑集中在一个地方
4. **便于维护**：减少文件数量，逻辑更清晰

## 相关文件

- `popup/profile.html` - 个人中心页面（已修改，添加 ID 标识）
- `js2/resumeInterfaceTwo.js` - 页面逻辑（已添加 loadUserInfo 函数）
- `popup/styles/simple-icons.css` - 图标定义（已添加缺失图标）
- `popup/scripts/profile.js` - 已删除（功能已集成到 resumeInterfaceTwo.js）

## 调试技巧

### 1. 检查 Shadow DOM 结构

```javascript
// 在控制台执行
const container = document.querySelector('#resume-window-container');
const shadowRoot = container.shadowRoot;
console.log('Shadow Root:', shadowRoot);
console.log('昵称元素:', shadowRoot.querySelector('#user-nickname'));
console.log('头像元素:', shadowRoot.querySelector('#user-avatar'));
```

### 2. 检查 Storage 数据

```javascript
// 查看完整的 auth 数据
chrome.storage.local.get(['auth'], function(result) {
    console.log('完整 auth 数据:', JSON.stringify(result.auth, null, 2));
});

// 查看所有 storage 数据
chrome.storage.local.get(null, function(items) {
    console.log('所有存储数据:', items);
});
```

### 3. 手动触发更新

```javascript
// 在控制台执行（需要在扩展的上下文中）
// 假设已经有 resumeWindowContainer 引用
const userNickname = resumeWindowContainer.querySelector('#user-nickname');
if (userNickname) {
    userNickname.textContent = "测试昵称";
    console.log('✓ 手动更新昵称成功');
}

const userAvatar = resumeWindowContainer.querySelector('#user-avatar');
if (userAvatar) {
    userAvatar.src = "https://example.com/avatar.jpg";
    console.log('✓ 手动更新头像成功');
}
```

## 扩展功能建议

### 监听 Storage 变化

如果需要实时响应用户信息的变化，可以添加 storage 监听器：

```javascript
// 在 resumeInterfaceTwo.js 的初始化部分添加
chrome.storage.onChanged.addListener(function(changes, areaName) {
    if (areaName === 'local' && changes.auth) {
        const newUserInfo = changes.auth.newValue?.userInfo;
        if (newUserInfo && currentPage === 'profile.html') {
            // 用户信息变化时自动更新页面
            loadUserInfo();
            console.log('✓ 用户信息已自动更新');
        }
    }
});
```

### 加载更多用户信息

可以扩展 `loadUserInfo` 函数加载更多字段：

```javascript
function loadUserInfo() {
    chrome.storage.local.get(['auth'], function(result) {
        if (result.auth && result.auth.userInfo) {
            const userInfo = result.auth.userInfo;

            // 加载昵称
            updateElement('#user-nickname', userInfo.nickname, '未设置昵称');
            updateElement('#resume-nickname', userInfo.nickname, '未设置昵称');

            // 加载头像
            updateImage('#user-avatar', userInfo.avatar, 'logo-small.png');

            // 加载状态
            updateElement('.profile-status', userInfo.status, '求职中');

            // 加载其他信息...
        }
    });
}

function updateElement(selector, value, defaultValue) {
    const element = resumeWindowContainer.querySelector(selector);
    if (element) {
        element.textContent = value || defaultValue;
    }
}

function updateImage(selector, src, defaultSrc) {
    const img = resumeWindowContainer.querySelector(selector);
    if (img) {
        img.src = src || defaultSrc;
    }
}
```

## 总结

通过将用户信息加载逻辑集成到 `resumeInterfaceTwo.js` 中，成功解决了 Shadow DOM 访问限制的问题。现在个人中心页面可以正确显示从 `chrome.storage.local` 加载的用户昵称和头像。
