# 页面切换时样式累积问题修复

## 问题描述

- 点击"记录"菜单
- 再点击"填充"或"设置"菜单
- 这些页面的标题颜色变成了和"记录"页面一样的颜色

## 根本原因

### 样式累积机制

在页面切换时（`navigateToPage()` 函数）：

1. 加载新页面的 HTML
2. 提取页面中的内联 `<style>` 标签
3. 创建新的 `<style>` 元素并添加到 Shadow DOM
4. **问题**：旧页面的 `<style>` 元素没有被移除

### 导致的后果

```
初始状态：
  Shadow DOM
  └─ style (CSS 变量)
  └─ style (common.css)
  └─ style (fill.css)

切换到 history.html：
  Shadow DOM
  └─ style (CSS 变量)
  └─ style (common.css)
  └─ style (fill.css)
  └─ style (history.html 内联样式) ← 新增

切换回 fill.html：
  Shadow DOM
  └─ style (CSS 变量)
  └─ style (common.css)
  └─ style (fill.css)
  └─ style (history.html 内联样式) ← ❌ 仍然存在！
  └─ style (fill.html 内联样式) ← 新增
```

由于 CSS 的层叠规则，后加载的样式会覆盖先加载的样式。history.html 的内联样式定义了：

```css
.liquid-title {
    background: rgba(255, 255, 255, 0.95);
    color: #2d3436;
    z-index: 100;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
}
```

这个样式比 common.css 中的样式优先级更高（因为后加载），导致所有页面的标题都使用这个样式。

## 解决方案

### 修改文件：js2/resumeInterfaceTwo.js (第563-582行)

在切换页面时，先移除旧的内联样式，再添加新的：

```javascript
// 清空当前容器并注入新内容
resumeWindowContainer.innerHTML = bodyContent;

// 移除之前页面的内联样式（避免样式累积）
const oldPageStyles = shadowRoot.querySelectorAll('style[data-page-style]');
oldPageStyles.forEach(style => style.remove());
if (oldPageStyles.length > 0) {
    console.log(`✓ 已移除 ${oldPageStyles.length} 个旧页面的内联样式`);
}

// 如果有内联样式，注入到Shadow DOM
if (styleContents) {
    const pageStyle = document.createElement("style");
    pageStyle.setAttribute('data-page-style', pageHtml); // 标记样式来源
    pageStyle.textContent = styleContents;
    shadowRoot.appendChild(pageStyle);
    console.log(`✓ 页面内联样式已注入: ${pageHtml}`);
}
```

### 关键改进

1. **添加标记属性**：`data-page-style` 属性标记页面特定的内联样式
2. **切换前清理**：每次切换页面前，移除所有带 `data-page-style` 属性的旧样式
3. **避免累积**：确保 Shadow DOM 中只有当前页面的内联样式

### 为什么这样能解决问题

```
切换到 history.html：
  Shadow DOM
  └─ style (CSS 变量)
  └─ style (common.css)
  └─ style (fill.css)
  └─ style[data-page-style="history.html"] ← 添加标记

切换回 fill.html：
  1. 移除 style[data-page-style] ← ✅ history.html 样式被移除
  Shadow DOM
  └─ style (CSS 变量)
  └─ style (common.css)
  └─ style (fill.css)

  2. 添加新样式（如果 fill.html 有内联样式）
  Shadow DOM
  └─ style (CSS 变量)
  └─ style (common.css)
  └─ style (fill.css)
  └─ style[data-page-style="fill.html"] ← 只保留当前页面样式
```

## 测试步骤

1. **重新加载扩展**
   ```
   chrome://extensions/ → 点击"重新加载"
   ```

2. **基础功能测试**
   - 打开扩展 → 默认显示"智能填充"
   - 标题应该是深色 (#2d3436) ✅

3. **样式隔离测试**
   - 点击"记录" → 标题是深色 ✅
   - 点击"填充" → 标题仍是深色 ✅
   - 点击"设置" → 标题是深色 ✅
   - 点击"我的" → 标题是深色 ✅

4. **反复切换测试**
   - 记录 → 填充 → 记录 → 填充 → ...
   - 每次切换后检查标题颜色 ✅
   - 所有页面标题应该始终保持深色

5. **控制台日志验证**
   - 打开浏览器控制台（F12）
   - 切换页面时应该看到：
   ```
   ✓ 已移除 1 个旧页面的内联样式
   ✓ 页面内联样式已注入: history.html
   ```

## 预期结果

✅ 每个页面的标题都显示正确的深色
✅ 页面切换不会互相影响样式
✅ 内联样式不会累积
✅ Shadow DOM 保持整洁（只有必要的样式元素）

## 技术说明

### Shadow DOM 样式作用域

Shadow DOM 提供样式隔离，但是：
- Shadow DOM 内部的样式会影响所有内部元素
- 样式按照添加顺序层叠
- 后添加的样式会覆盖先添加的样式

### 样式管理最佳实践

1. **使用标记属性** - 区分不同来源的样式
2. **定期清理** - 移除不再需要的样式元素
3. **避免累积** - 每次只保留当前需要的样式
4. **明确优先级** - 理解 CSS 层叠规则

### 为什么不使用 adoptedStyleSheets

`adoptedStyleSheets` API 更适合共享的、不变的样式表（如 common.css）。对于页面特定的内联样式：
- 内容可能频繁变化
- 需要在页面切换时替换
- 使用 `<style>` 元素更灵活

## 相关文件

- `js2/resumeInterfaceTwo.js` - 页面导航逻辑（已修复）
- `popup/history.html` - 包含内联样式的页面
- `popup/styles/common.css` - 共用样式

## 调试技巧

如果怀疑样式累积问题：

1. **检查 Shadow DOM**
   ```javascript
   // 在控制台执行
   const shadowRoot = document.querySelector('#resume-window-container').shadowRoot;
   const styles = shadowRoot.querySelectorAll('style');
   console.log('样式数量:', styles.length);
   styles.forEach((s, i) => {
       console.log(`Style ${i}:`, s.getAttribute('data-page-style') || '基础样式');
   });
   ```

2. **查看样式内容**
   ```javascript
   styles.forEach((s, i) => {
       if (s.textContent.includes('.liquid-title')) {
           console.log(`Style ${i} 定义了 .liquid-title:`, s.textContent.substring(0, 200));
       }
   });
   ```

3. **监控样式变化**
   - 打开控制台
   - 切换页面时观察日志
   - 确认旧样式被移除，新样式被添加
