# 图标缺失和个人中心动态加载修复

## 问题描述

用户报告了两个问题：

1. **设置页面图标缺失**：账号设置中"修改简历信息"的图标没有加载出来
2. **个人中心静态昵称**：��人中心页面中的"李艺伟"是硬编码的，需要从 `chrome.storage.local` 的 `auth.userInfo.nickname` 字段动态获取

## 问题1：设置页面图标缺失

### 根本原因

`settings.html` 使用了以下图标类名：
- `fa-user-cog` (第 81 行) - 账号设置标题图标
- `fa-id-card` (第 96 行) - 修改简历信息图标
- `fa-chevron-right` - 右箭头图标
- `fa-edit` - 编辑图标

但 `simple-icons.css` 中没有定义这些图标。

### 解决方案

**修改文件：popup/styles/simple-icons.css (第 213-216 行)**

添加了缺失的图标定义：

```css
.fa-user-cog::before {
    content: "👤⚙";
    letter-spacing: -0.1em;     /* 用户设置图标 - 人像+齿轮组合 */
}

.fa-id-card::before {
    content: "🪪";               /* 身份证/ID卡图标 */
}

.fa-edit::before {
    content: "✏";                /* 编辑图标 - 铅笔 */
}

.fa-chevron-right::before {
    content: "›";
    font-size: 1.4em;
    font-weight: bold;          /* 右箭头 */
}
```

### 图标选择说明

| 图标类名 | Unicode | 说明 |
|---------|---------|------|
| `fa-user-cog` | 👤⚙ | 用户+齿轮组合，表示用户设置 |
| `fa-id-card` | 🪪 | 身份证emoji，表示个人信息/简历 |
| `fa-edit` | ✏ | 铅笔符号，表示编辑操作 |
| `fa-chevron-right` | › | 右尖括号，表示导航箭头 |

## 问题2：个人中心动态加载用户昵称

### 根本原因

`profile.html` 中有两处硬编码的"李艺伟"：
- 第 79 行：`<div class="profile-name">李艺伟</div>` - 个人信息头像下方
- 第 95 行：`<div class="resume-name">李艺伟</div>` - 简历卡片中

需要从 Chrome 扩展的本地存储中动态获取用户昵称。

### 数据结构

用户信息存储在 `chrome.storage.local` 中：

```javascript
{
    auth: {
        userInfo: {
            nickname: "用户昵称"
            // ... 其他用户信息字段
        }
    }
}
```

### 解决方案

#### 创建文件：popup/scripts/profile.js

```javascript
(function() {
    'use strict';

    // 从 chrome.storage.local 加载用户信息
    function loadUserInfo() {
        chrome.storage.local.get(['auth'], function(result) {
            if (result.auth && result.auth.userInfo) {
                const nickname = result.auth.userInfo.nickname || '未设置昵称';

                // 更新页面中所有显示用户昵称的地方
                const profileName = document.querySelector('.profile-name');
                if (profileName) {
                    profileName.textContent = nickname;
                }

                const resumeName = document.querySelector('.resume-name');
                if (resumeName) {
                    resumeName.textContent = nickname;
                }

                console.log('✓ 用户昵称已加载:', nickname);
            } else {
                console.warn('⚠ 未找到用户信息，使用默认值');
                // 如果没有找到用户信息，保持默认的"李艺伟"
            }
        });
    }

    // 页面加载完成后执行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadUserInfo);
    } else {
        loadUserInfo();
    }

    // 监听 storage 变化，实时更新昵称
    chrome.storage.onChanged.addListener(function(changes, areaName) {
        if (areaName === 'local' && changes.auth) {
            const newNickname = changes.auth.newValue?.userInfo?.nickname;
            if (newNickname) {
                const profileName = document.querySelector('.profile-name');
                if (profileName) {
                    profileName.textContent = newNickname;
                }

                const resumeName = document.querySelector('.resume-name');
                if (resumeName) {
                    resumeName.textContent = newNickname;
                }

                console.log('✓ 用户昵称已更新:', newNickname);
            }
        }
    });
})();
```

#### 修改文件：popup/profile.html (第 146 行)

在 `</body>` 标签前添加脚本引用：

```html
<script src="scripts/transitions.js"></script>
<script src="scripts/profile.js"></script>
```

### 功能特性

1. **动态加载**：页面加载时自动从 `chrome.storage.local` 获取用户昵称
2. **实时更新**：使用 `chrome.storage.onChanged` 监听存储变化，当用户信息更新时自动刷新显示
3. **容错处理**：如果找不到用户信息，保持默认显示"李艺伟"，避免页面显示空白
4. **多处更新**：同时更新个人信息头和简历卡片中的两处昵称
5. **日志输出**：在控制台输出加载和更新日志，便于调试

## 测试步骤

### 测试图标修复

1. **重新加载扩展**
   ```
   chrome://extensions/ → 找到扩展 → 点击"重新加载"
   ```

2. **检查设置页面图标**
   - 打开扩展浮动窗口
   - 点击"设置"菜单
   - 检查"账号设置"标题是否显示 👤⚙ 图标 ✅
   - 检查"修改简历信息"是否显示 🪪 图标 ✅
   - 检查右侧箭头是否显示 ✅

### 测试个人中心动态加载

1. **准备测试数据**
   - 打开扩展的 Popup 窗口
   - 打开浏览器控制台（F12）
   - 执行以下命令设置测试数据：
   ```javascript
   chrome.storage.local.set({
       auth: {
           userInfo: {
               nickname: "张三"
           }
       }
   }, function() {
       console.log('✓ 测试数据已设置');
   });
   ```

2. **测试初始加载**
   - 点击"我的"菜单
   - 检查个人信息头像下方是否显示"张三" ✅
   - 检查简历卡片中的名字是否显示"张三" ✅
   - 打开控制台，应该看到：`✓ 用户昵称已加载: 张三`

3. **测试实时更新**
   - 在控制台执行：
   ```javascript
   chrome.storage.local.set({
       auth: {
           userInfo: {
               nickname: "李四"
           }
       }
   }, function() {
       console.log('✓ 昵称已更新');
   });
   ```
   - 不需要刷新页面，昵称应该自动更新为"李四" ✅
   - 控制台应该显示：`✓ 用户昵称已更新: 李四`

4. **测试容错处理**
   - 在控制台执行：
   ```javascript
   chrome.storage.local.remove('auth', function() {
       console.log('✓ auth 数据已清除');
   });
   ```
   - 刷新页面
   - 页面应该显示默认的"李艺伟" ✅
   - 控制台应该显示：`⚠ 未找到用户信息，使用默认值`

## 预期结果

✅ 设置页面的所有图标都正确显示
✅ 个人中心页面从 storage 动态加载用户昵称
✅ 用户昵称更新时页面自动刷新显示
✅ 找不到用户信息时显示默认昵称
✅ 控制台输出调试日志

## 技术说明

### Chrome Storage API

Chrome 扩展提供了三种存储区域：
- `chrome.storage.local` - 本地存储，不随账号同步
- `chrome.storage.sync` - 同步存储，随 Chrome 账号同步
- `chrome.storage.session` - 会话存储，浏览器关闭后清除

本次使用 `chrome.storage.local` 因为：
1. 数据量可能较大（用户信息、简历数据等）
2. 不需要跨设备同步
3. 性能更好

### Storage 监听器

使用 `chrome.storage.onChanged` 监听存储变化：

```javascript
chrome.storage.onChanged.addListener(function(changes, areaName) {
    // changes: { key: { oldValue, newValue } }
    // areaName: 'local' | 'sync' | 'session'
});
```

好处：
- 实时响应数据变化
- 无需手动刷新页面
- 支持多窗口同步

### 立即执行函数表达式（IIFE）

使用 IIFE 包装代码：

```javascript
(function() {
    'use strict';
    // 代码...
})();
```

好处：
- 避免全局变量污染
- 创建独立作用域
- 防止变量名冲突

## 相关文件

- `popup/styles/simple-icons.css` - 图标定义（已修改）
- `popup/scripts/profile.js` - 个人中心页面逻辑（新建）
- `popup/profile.html` - 个人中心页面（已修改）
- `popup/settings.html` - 设置页面（使用新图标）

## 调试技巧

### 查看 Chrome Storage 数据

```javascript
// 查看所有 local storage 数据
chrome.storage.local.get(null, function(items) {
    console.log('所有存储数据:', items);
});

// 查看特定键
chrome.storage.local.get(['auth'], function(result) {
    console.log('auth 数据:', result.auth);
});
```

### 监控 Storage 变化

```javascript
// 在 background script 或 content script 中监听
chrome.storage.onChanged.addListener(function(changes, areaName) {
    console.log('存储区域:', areaName);
    for (let key in changes) {
        console.log(`${key} 变化:`, {
            旧值: changes[key].oldValue,
            新值: changes[key].newValue
        });
    }
});
```

### 检查元素选择器

```javascript
// 在控制台中检查元素是否存在
console.log('profile-name 元素:', document.querySelector('.profile-name'));
console.log('resume-name 元素:', document.querySelector('.resume-name'));
```

## 最佳实践

### 图标系统维护

1. **保持一致性**：同类功能使用相似图标
2. **添加注释**：说明图标含义和使用场景
3. **fallback 处理**：考虑不支持 emoji 的情况
4. **尺寸调整**：使用 `font-size` 和 `letter-spacing` 调整显示效果

### Storage 使用规范

1. **数据结构**：使用层级结构组织数据（如 `auth.userInfo.nickname`）
2. **错误处理**：始终检查数据是否存在
3. **默认值**：提供合理的默认值
4. **性能优化**：只获取需要的键，避免 `get(null)`
5. **日志输出**：在开发模式输出详细日志，便于调试

## 扩展功能建议

### 其他可动态加载的用户信息

除了昵称，还可以动态加载：

```javascript
{
    auth: {
        userInfo: {
            nickname: "用户昵称",
            avatar: "头像URL",
            email: "邮箱",
            phone: "手机号",
            status: "求职状态"
        }
    }
}
```

可以在 `profile.js` 中扩展：

```javascript
function loadUserInfo() {
    chrome.storage.local.get(['auth'], function(result) {
        if (result.auth && result.auth.userInfo) {
            const userInfo = result.auth.userInfo;

            // 更新昵称
            updateElement('.profile-name', userInfo.nickname, '未设置昵称');
            updateElement('.resume-name', userInfo.nickname, '未设置昵称');

            // 更新头像
            updateImage('.profile-avatar', userInfo.avatar, 'logo-small.png');

            // 更新状态
            updateElement('.profile-status', userInfo.status, '求职中');

            // ... 其他字段
        }
    });
}

function updateElement(selector, value, defaultValue) {
    const element = document.querySelector(selector);
    if (element) {
        element.textContent = value || defaultValue;
    }
}

function updateImage(selector, src, defaultSrc) {
    const img = document.querySelector(selector);
    if (img) {
        img.src = src || defaultSrc;
    }
}
```
