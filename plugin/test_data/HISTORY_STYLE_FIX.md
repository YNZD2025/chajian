# 使用记录页面样式修复

## 问题描述

- 使用记录页面的标题显示为白色
- 切换到使用记录页面后，再切换到其他页面，其他页面的标题也变成白色
- 关闭按钮图标也受到影响

## 根本原因

`history.html` 中有内联 `<style>` 标签覆盖了 `.liquid-title` 和 `.liquid-close` 的样式：

```css
.liquid-title {
    background: rgba(255, 255, 255, 0.95);
    z-index: 100;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
    /* 缺少 color 属性！ */
}

.liquid-close {
    background: rgba(255, 255, 255, 0.95);
    z-index: 100;
    /* 缺少 color 属性！ */
}
```

### 为什么会影响其他页面

在使用 `adoptedStyleSheets` API 加载样式表到 Shadow DOM 时：
1. 每个页面的 HTML 通过 `fetch()` 加载
2. 内联 `<style>` 标签的样式会被提取并加入到 `adoptedStyleSheets`
3. 这些样式会覆盖之前加载的 `common.css` 中的样式
4. 由于 history.html 的内联样式缺少 `color` 属性，导致标题颜色变成浏览器默认值（通常是白色或黑色）
5. 切换到其他页面时，这些覆盖的样式仍然保留在 Shadow DOM 中

## 解决方案

### 修改文件：popup/history.html

在内联样式中添加明确的颜色定义：

```css
/* 修改前 */
.liquid-title {
    background: rgba(255, 255, 255, 0.95);
    z-index: 100;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
}

.liquid-close {
    background: rgba(255, 255, 255, 0.95);
    z-index: 100;
}

/* 修改后 */
.liquid-title {
    background: rgba(255, 255, 255, 0.95);
    color: #2d3436;  /* ✅ 添加标题颜色 */
    z-index: 100;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
}

.liquid-close {
    background: rgba(255, 255, 255, 0.95);
    color: #636e72;  /* ✅ 添加图标颜色 */
    z-index: 100;
}
```

## 测试步骤

1. **重新加载扩展**
   ```
   chrome://extensions/ → 点击"重新加载"
   ```

2. **测试使用记录页面**
   - 打开扩展浮动窗口
   - 点击"记录"菜单
   - 检查标题"使用记录"是否为深色 (#2d3436) ✅
   - 检查关闭按钮图标是否为灰色 (#636e72) ✅

3. **测试页面切换影响**
   - 点击"记录"菜单
   - 再点击"填充"菜单
   - 检查"智能填充"标题是否仍为深色 ✅
   - 点击"我的"菜单
   - 检查"个人中心"标题是否为深色 ✅
   - 点击"设置"菜单
   - 检查"设置"标题是否为深色 ✅

4. **反复切换测试**
   - 在各个菜单间反复切换
   - 确认所有页面的标题都保持深色

## 预期结果

✅ 使用记录页面的标题显示为深色
✅ 切换到使用记录后，再切换到其他页面，标题仍为深色
✅ 所有页面的关闭按钮图标都显示为灰色
✅ 页面切换不会相互影响样式

## 技术说明

### adoptedStyleSheets 的样式优先级

当多个样式表通过 `adoptedStyleSheets` 应用时：
- 后加载的样式表会覆盖先加载的样式表
- 内联样式（`<style>` 标签）的优先级与外部样式表相同
- 相同选择器的样式会按照加载顺序决定优先级

### 为什么要在 history.html 中覆盖背景

history.html 需要支持滚动列表，为了防止滚动内容透过半透明的标题区域，将标题背景设置为更不透明的白色 `rgba(255, 255, 255, 0.95)`，而不是使用 common.css 中的玻璃效果背景 `rgba(255, 255, 255, 0.35)`。

## 相关文件

- `popup/history.html` - 使用记录页面（已修复）
- `popup/styles/common.css` - 共用样式
- `js2/resumeInterfaceTwo.js` - Shadow DOM 和页面切换逻辑

## 最佳实践

为了避免类似问题，内联样式覆盖时应该：
1. **明确所有相关属性** - 不要只覆盖部分属性
2. **使用 CSS 变量** - `color: var(--text-main)` 比硬编码颜色更灵活
3. **添加注释说明** - 解释为什么需要覆盖样式
4. **测试页面切换** - 确保样式覆盖不会影响其他页面
