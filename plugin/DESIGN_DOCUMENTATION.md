# 一念职达 Chrome 插件设计文档

> 版本：1.0.0
> 更新时间：2025-11-23

---

## 目录

1. [概述](#概述)
2. [设计系统](#设计系统)
3. [布局结构](#布局结构)
4. [组件库](#组件库)
5. [页面说明](#页面说明)
6. [动画系统](#动画系统)
7. [安全防护](#安全防护)
8. [文件结构](#文件结构)
9. [接口预留](#接口预留)

---

## 概述

一念职达是一款智能求职助手 Chrome 插件，帮助用户一键填写申请表单、管理简历、追踪投递记录。

### 设计理念
- **液态玻璃风格**：高通透、轻盈的视觉效果
- **流体渐变背景**：柔和的双色渐变营造舒适感
- **非线性动画**：弹性曲线带来自然流畅的交互体验

### 技术栈
- HTML5 / CSS3
- Vanilla JavaScript
- Font Awesome 6.4.0
- Chrome Extension Manifest V3

---

## 设计系统

### 色彩系统

#### 核心色板
| 变量名 | 色值 | 用途 |
|--------|------|------|
| `--primary` | `#57c5b6` | 主色调（薄荷绿） |
| `--primary-dark` | `#3a8e82` | 主色深色变体 |
| `--accent` | `#ff9a9e` | 强调色（珊瑚粉） |
| `--text-main` | `#2d3436` | 主文本色 |
| `--text-gray` | `#636e72` | 次要文本色 |

#### 背景渐变
```css
--bg-fluid:
    radial-gradient(circle at 10% 10%, rgba(87, 197, 182, 0.4) 0%, transparent 50%),
    radial-gradient(circle at 90% 90%, rgba(255, 154, 158, 0.4) 0%, transparent 50%),
    linear-gradient(135deg, #def7fa 0%, #ffecec 100%);
```

### 材质系统

#### 玻璃效果
```css
--glass-clear-bg: rgba(255, 255, 255, 0.35);
--glass-clear-blur: blur(12px);
--glass-clear-border: 1px solid rgba(255, 255, 255, 0.6);
--glass-clear-shadow: 0 8px 30px rgba(0, 0, 0, 0.05);
```

#### 卡片效果
```css
--card-white: rgba(255, 255, 255, 0.85);
--card-blur: blur(20px);
--card-shadow: 0 5px 20px rgba(0, 0, 0, 0.03);
```

### 圆角规范
| 变量名 | 值 | 应用场景 |
|--------|-----|----------|
| `--r-card` | `20px` | 内容卡片 |
| `--r-btn` | `25px` | 按钮 |
| 侧边栏 | `0 13px 13px 0` | 右侧圆角 |
| 悬浮标题 | `18px` | 玻璃标题 |
| 图标盒 | `14px` | 导航图标 |

### 字体规范
```css
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
```

| 元素 | 字号 | 字重 |
|------|------|------|
| 页面标题 | 16px | 800 |
| 卡片标题 | 12px | 700 |
| 正文 | 12-13px | 500 |
| 次要文本 | 10-11px | 500 |
| 导航标签 | 9px | 500 |

### 间距规范
- 侧边栏内边距：30px 0
- 导航项间距：18px
- 内容区内边距：75px 15px 20px（顶部为标题留空）
- 卡片内边距：15px
- 卡片间距：15px

---

## 布局结构

### 插件容器
```
尺寸：420px × 600px
边框：2px solid rgba(255, 255, 255, 0.5)
阴影：0 20px 60px rgba(0, 0, 0, 0.15)
```

### 整体布局
```
┌─────────────────────────────────┐
│ ┌──────┬──────────────────────┐ │
│ │      │ [标题]      [设置] │ │
│ │ 填充 │                      │ │
│ │      │                      │ │
│ │ 记录 │    主内容区域        │ │
│ │      │                      │ │
│ │      │                      │ │
│ │ ──── │                      │ │
│ │ 我的 │                      │ │
│ │ 设置 │                      │ │
│ └──────┴──────────────────────┘ │
└─────────────────────────────────┘
```

### 侧边栏结构
- **宽度**：70px
- **背景**：`--primary` (#57c5b6)
- **布局**：Flexbox 纵向排列
- **分区**：
  - 顶部：填充、记录
  - 间隔：flex: 1（自动撑开）
  - 底部：我的、设置

### 主内容区结构
- **宽度**：flex: 1（剩余空间）
- **悬浮元素**：
  - 标题（左上）：玻璃效果圆角矩形
  - 设置按钮（右上）：玻璃效果圆形/圆角

---

## 组件库

### 导航项 `.nav-item`
```html
<a href="page.html" class="nav-item [active]">
    <div class="nav-icon-box"><i class="fas fa-icon"></i></div>
    <div class="nav-label">标签</div>
</a>
```
**状态**：
- 默认：图标白色70%透明度，标签可见
- 激活：图标白底主色，标签隐藏，scale(1.1)
- 悬停：图标白色100%

### 悬浮标题 `.liquid-title`
```html
<div class="liquid-title">页面标题</div>
```
**样式**：玻璃效果，position: absolute，top: 20px, left: 20px

### 悬浮按钮 `.liquid-close`
```html
<a href="target.html" class="liquid-close"><i class="fas fa-cog"></i></a>
```
**尺寸**：40px × 40px
**位置**：top: 20px, right: 15px

### 内容卡片 `.content-card`
```html
<div class="content-card">
    <div class="card-title"><i class="fas fa-icon"></i> 标题</div>
    <!-- 内容 -->
</div>
```
**样式**：白色85%透明度，20px圆角，模糊背景

### 设置项组 `.settings-group`
```html
<div class="settings-group">
    <a href="page.html" class="settings-item">
        <div class="settings-item-left">
            <div class="settings-item-icon primary|accent|gray">
                <i class="fas fa-icon"></i>
            </div>
            <div>
                <div class="settings-item-label">标签</div>
                <div class="settings-item-desc">描述（可选）</div>
            </div>
        </div>
        <i class="fas fa-chevron-right arrow-icon"></i>
    </a>
</div>
```

### 开关 `.toggle-switch`
```html
<div class="toggle-switch [active]" onclick="this.classList.toggle('active')"></div>
```
**尺寸**：40px × 22px

### 按钮系统

#### 主按钮 `.btn-primary`
```html
<button class="btn-primary"><i class="fas fa-icon"></i> 按钮文字</button>
```
**样式**：主色背景，白色文字，全宽

#### 次要按钮 `.btn-secondary`
```html
<button class="btn-secondary">按钮文字</button>
```
**样式**：白色背景，主色边框和文字

#### 危险按钮 `.btn-danger`
```html
<button class="btn-danger"><i class="fas fa-icon"></i> 按钮文字</button>
```
**样式**：玻璃背景，强调色边框和文字

### 表单元素

#### 输入框 `.form-input`
```html
<div class="form-group">
    <label class="form-label">标签</label>
    <input type="text" class="form-input" placeholder="占位文字">
</div>
```

#### 文本域 `.form-textarea`
```html
<textarea class="form-textarea" placeholder="占位文字"></textarea>
```

### 帮助项 `.help-item`
```html
<div class="help-item" onclick="this.classList.toggle('expanded')">
    <div class="help-item-title">问题标题 <i class="fas fa-chevron-down"></i></div>
    <div class="help-item-content">答案内容</div>
</div>
```

### 用户卡片 `.user-card`
```html
<div class="user-card">
    <img src="avatar.jpg" class="user-avatar">
    <div class="user-info">
        <h3>用户名</h3>
        <span class="user-status">状态</span>
    </div>
</div>
```

### 信息网格 `.info-grid`
```html
<div class="info-grid">
    <div class="info-item">
        <div class="info-label">标签</div>
        <div class="info-value">值</div>
    </div>
    <div class="info-item full"><!-- 跨两列 --></div>
</div>
```

### 书本翻页组件 `.book-wrapper`
```html
<div class="book-wrapper">
    <div class="switch-tooltip">提示文字</div>
    <div class="resume-page-next"><!-- 下一页预览 --></div>
    <div class="resume-page-current"><!-- 当前页内容 --></div>
</div>
```
**交互**：悬停时当前页左移+旋转，显示下一页

### 悬浮CTA按钮 `.liquid-cta-btn`
```html
<div class="liquid-cta-container">
    <div class="liquid-cta-btn"><i class="fas fa-bolt"></i> 一键智能填充</div>
</div>
```
**位置**：底部居中，玻璃效果

---

## 页面说明

### 1. 智能填充 `fill.html`（主页）

**功能**：显示当前简历数据源，输入任务背景，一键填充

**组件**：
- 侧边栏导航（填充激活）
- 悬浮标题"智能填充"
- 悬浮设置按钮
- 书本翻页组件（简历预览）
  - 用户头像、姓名、简历类型
  - 信息网格：学校、学历、专业、毕业年份、手机、邮箱、意向岗位、期望城市、核心技能
- 任务背景卡片（文本输入框）
- 悬浮CTA按钮"一键智能填充"

**接口预留**：
- 获取用户简历数据
- 切换简历源
- 提交填充任务

---

### 2. 投递记录 `history.html`

**功能**：展示历史投递记录列表

**组件**：
- 侧边栏导航（记录激活）
- 悬浮标题"投递记录"
- 悬浮设置按钮
- 职位卡片列表 `.job-item`
  - 状态指示点（绿色=进行中，灰色=已完成）
  - 职位名称
  - 投递时间
  - 查看按钮

**接口预留**：
- 获取投递记录列表
- 查看投递详情
- 筛选/搜索记录

---

### 3. 个人中心 `profile.html`

**功能**：展示用户简历详情

**组件**：
- 侧边栏导航（我的激活）
- 悬浮设置按钮（无标题）
- 用户头像居中
- 用户名
- 状态标签"求职中"
- 书本翻页组件（详细简历）
  - 教育背景
  - 实习经历
  - 专业技能（标签形式）
  - 获奖经历
  - 编辑简历按钮

**接口预留**：
- 获取用户详细简历
- 切换中英文简历
- 更新求职状态

---

### 4. 设置 `settings.html`

**功能**：应用设置入口

**组件**：
- 侧边栏导航（设置激活）
- 悬浮标题"设置"
- 悬浮关闭按钮
- 基础设置卡片
  - 长篇任务（开关）
  - 消息通知（开关）
- 账号安全卡片
  - 修改简历信息 → edit-resume.html
  - 修改密码 → change-password.html
  - 隐私设置 → privacy-settings.html
- 其他卡片
  - 我要反馈 → feedback.html
  - 清理缓存
  - 帮助中心 → help.html
  - 关于 → about.html
- 退出登录按钮

**接口预留**：
- 获取/保存设置
- 清理缓存
- 退出登录

---

### 5. 登录 `login.html`

**功能**：微信扫码登录

**组件**：
- 简化侧边栏（仅登录图标）
- 欢迎标题
- 二维码卡槽动画
- 二维码图片
- 提示文字"微信扫一扫登录"
- 注册提示

**接口预留**：
- 获取登录二维码
- 轮询登录状态
- 获取用户信息

---

### 6. 修改简历 `edit-resume.html`

**功能**：编辑用户基本信息

**组件**：
- 侧边栏导航（我的激活）
- 悬浮标题"修改简历"
- 悬浮关闭按钮
- 用户信息预览卡片
- 编辑表单卡片
  - 姓名输入框
  - 邮箱输入框
  - 意向岗位输入框
- 保存按钮

**接口预留**：
- 获取当前信息
- 保存修改

---

### 7. 修改密码 `change-password.html`

**功能**：修改账号密码

**布局**：内容居中 `.plugin-content-centered`

**组件**：
- 侧边栏导航（设置激活）
- 悬浮标题"修改密码"
- 悬浮关闭按钮
- 密码表单卡片
  - 当前密码
  - 新密码
  - 确认新密码
- 确认按钮
- 密码要求提示

**接口预留**：
- 验证当前密码
- 更新密码

---

### 8. 隐私设置 `privacy-settings.html`

**功能**：数据隐私管理

**布局**：内容居中 `.plugin-content-centered`

**组件**：
- 侧边栏导航（设置激活）
- 悬浮标题"隐私设置"
- 悬浮关闭按钮
- 数据管理卡片
  - 数据同步（开关）
  - 使用统计（开关）
- 数据清除卡片
  - 清除填充记录
  - 删除所有数据

**接口预留**：
- 获取/保存隐私设置
- 清除数据

---

### 9. 关于 `about.html`

**功能**：应用信息展示

**组件**：
- 侧边栏导航（设置激活）
- 悬浮标题"关于"
- 悬浮关闭按钮
- 应用信息卡片
  - Logo（logo-small.png）
  - 应用名"一念职达"
  - 版本号
  - 应用描述
  - 链接：官方网站、用户协议、隐私政策
- 技术信息卡片
  - Chrome版本
  - 更新时间
  - 开发者
- 版权信息

---

### 10. 帮助中心 `help.html`

**功能**：常见问题解答

**组件**：
- 侧边栏导航（设置激活）
- 悬浮标题"帮助中心"
- 悬浮关闭按钮
- 常见问题卡片
  - 可展开的问题列表
- 更多帮助卡片
  - 提交反馈按钮

---

### 11. 意见反馈 `feedback.html`

**功能**：用户反馈提交

**组件**：
- 侧边栏导航（设置激活）
- 悬浮标题"我要反馈"
- 悬浮关闭按钮
- 反馈类型卡片
  - 类型选择按钮（问题反馈/功能建议/其他）
- 反馈内容卡片
  - 问题描述文本域
  - 联系方式输入框
- 提交按钮

**接口预留**：
- 提交反馈

---

## 动画系统

### 页面切换动画

#### 动画方向逻辑
| 场景 | 动画 | CSS类 |
|------|------|-------|
| 导航栏向下（填充→记录→我的→设置） | 从下往上滑入 | `.animate-from-bottom` |
| 导航栏向上（设置→我的→记录→填充） | 从上往下滑入 | `.animate-from-top` |
| 进入子页面（点击 > 按钮） | 从右往左滑入 | `.animate-from-right` |
| 返回上级页面（点击 X 按钮） | 从左往右滑入 | `.animate-from-left` |

#### 动画参数
```css
duration: 0.4s
timing-function: cubic-bezier(0.34, 1.56, 0.64, 1)  /* 弹性回弹 */
transform: translateX/Y(30px)
opacity: 0 → 1
```

#### 关键帧定义
```css
@keyframes slideFromBottom {
    from { opacity: 0; transform: translateY(30px); }
    to { opacity: 1; transform: translateY(0); }
}

@keyframes slideFromTop {
    from { opacity: 0; transform: translateY(-30px); }
    to { opacity: 1; transform: translateY(0); }
}

@keyframes slideFromRight {
    from { opacity: 0; transform: translateX(30px); }
    to { opacity: 1; transform: translateX(0); }
}

@keyframes slideFromLeft {
    from { opacity: 0; transform: translateX(-30px); }
    to { opacity: 1; transform: translateX(0); }
}
```

### 交互动画

#### 按钮悬停
```css
transform: translateY(-2px)
box-shadow: 增强
```

#### 卡片悬停
```css
transform: scale(1.02)
```

#### 导航图标激活
```css
transform: scale(1.1)
```

#### 书本翻页
```css
.book-wrapper:hover .resume-page-current {
    transform: translateX(-20px) rotateY(-5deg);
}
```

#### 登录二维码动画
```css
@keyframes slideOut {
    0% { transform: translateY(-100%); opacity: 0; }
    100% { transform: translateY(0); opacity: 1; }
}
```

---

## 安全防护

### 禁用交互列表

| 交互 | 状态 | 说明 |
|------|------|------|
| 右键菜单 | 禁用 | `contextmenu` 事件阻止 |
| F12 | 禁用 | 阻止打开开发者工具 |
| Ctrl+Shift+I | 禁用 | 阻止打开开发者工具 |
| Ctrl+Shift+J | 禁用 | 阻止打开控制台 |
| Ctrl+U | 禁用 | 阻止查看源代码 |
| Ctrl+S | 禁用 | 阻止保存页面 |
| Ctrl+P | 禁用 | 阻止打印 |
| 拖拽 | 禁用 | `dragstart` 事件阻止 |
| 文本选择 | 条件禁用 | 输入框内允许 |
| 复制/剪切 | 条件禁用 | 输入框内允许 |

### 允许交互列表
- 输入框内的文本操作
- 按钮点击
- 链接跳转
- 表单输入
- 开关切换

---

## 文件结构

```
plugin/
├── styles/
│   └── common.css              # 共用样式（设计系统、组件）
├── scripts/
│   ├── transitions.js          # 页面切换动画逻辑
│   └── security.js             # 安全防护（禁用交互）
├── chrome/                     # Chrome 扩展打包目录
│   ├── manifest.json           # 扩展配置
│   ├── icons/                  # 扩展图标
│   │   ├── icon16.png
│   │   ├── icon32.png
│   │   ├── icon48.png
│   │   └── icon128.png
│   └── popup/                  # 弹窗页面
│       ├── styles/common.css   # 插件专用样式
│       ├── scripts/            # 脚本（同上）
│       └── *.html              # 所有页面
├── fill.html                   # 智能填充（主页）
├── history.html                # 投递记录
├── profile.html                # 个人中心
├── settings.html               # 设置
├── login.html                  # 登录
├── edit-resume.html            # 修改简历
├── change-password.html        # 修改密码
├── privacy-settings.html       # 隐私设置
├── about.html                  # 关于
├── help.html                   # 帮助中心
└── feedback.html               # 意见反馈
```

---

## 接口预留

### 用户认证
```javascript
// 获取登录二维码
GET /api/auth/qrcode
Response: { qrcode_url, session_id }

// 检查登录状态
GET /api/auth/status?session_id={id}
Response: { status: 'pending'|'confirmed'|'expired', user_info }

// 退出登录
POST /api/auth/logout
```

### 用户信息
```javascript
// 获取用户简历
GET /api/user/resume
Response: { name, school, major, phone, email, skills, ... }

// 更新用户简历
PUT /api/user/resume
Body: { name, email, target_position, ... }

// 切换简历版本
POST /api/user/resume/switch
Body: { version: 'cn'|'en' }
```

### 智能填充
```javascript
// 提交填充任务
POST /api/fill/task
Body: { page_url, task_background, resume_version }
Response: { task_id, filled_fields }

// 获取填充历史
GET /api/fill/history
Response: [{ id, job_title, company, time, status }]
```

### 设置
```javascript
// 获取设置
GET /api/settings
Response: { long_task, notification, data_sync, analytics }

// 保存设置
PUT /api/settings
Body: { key, value }

// 修改密码
POST /api/user/password
Body: { current_password, new_password }
```

### 反馈
```javascript
// 提交反馈
POST /api/feedback
Body: { type, content, contact }
```

---

## 更新日志

### v1.0.0 (2025-11-23)
- 初始版本发布
- 完成11个页面设计
- 实现页面切换动画
- 添加安全防护措施
- 完成Chrome扩展打包

---

## 设计规范速查

### 快速复制

#### 新建页面模板
```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>页面标题 - 一念职达</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="styles/common.css">
</head>
<body>
    <div class="plugin-container">
        <div class="sidebar">
            <a href="fill.html" class="nav-item">
                <div class="nav-icon-box"><i class="fas fa-magic"></i></div>
                <div class="nav-label">填充</div>
            </a>
            <a href="history.html" class="nav-item">
                <div class="nav-icon-box"><i class="fas fa-history"></i></div>
                <div class="nav-label">记录</div>
            </a>
            <div class="sidebar-spacer"></div>
            <div class="sidebar-bottom">
                <a href="profile.html" class="nav-item">
                    <div class="nav-icon-box"><i class="fas fa-user"></i></div>
                    <div class="nav-label">我的</div>
                </a>
                <a href="settings.html" class="nav-item [active]">
                    <div class="nav-icon-box"><i class="fas fa-cog"></i></div>
                    <div class="nav-label">设置</div>
                </a>
            </div>
        </div>
        <div class="main-area">
            <div class="liquid-title">页面标题</div>
            <a href="settings.html" class="liquid-close"><i class="fas fa-times"></i></a>
            <div class="plugin-content">
                <!-- 页面内容 -->
            </div>
        </div>
    </div>
    <script src="scripts/transitions.js"></script>
    <script src="scripts/security.js"></script>
</body>
</html>
```

#### 常用图标
| 用途 | 图标类 |
|------|--------|
| 填充 | `fa-magic` |
| 记录 | `fa-history` |
| 用户 | `fa-user` |
| 设置 | `fa-cog` |
| 关闭 | `fa-times` |
| 箭头 | `fa-chevron-right` |
| 保存 | `fa-save` |
| 编辑 | `fa-edit` |
| 锁定 | `fa-lock` |
| 闪电 | `fa-bolt` |

---

*文档结束*
