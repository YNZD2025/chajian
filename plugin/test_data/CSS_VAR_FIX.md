# CSS 变量在 Shadow DOM 中的修复

## 问题描述
- 默认打开智能填充页面时，标题是黑色（正确）
- 切换到其他菜单后再切换回来，标题变成白色（看不清）
- 所有菜单页面都有同样的问题

## 根本原因
在 Shadow DOM 中，`:root` 选择器不起作用，导致 CSS 变量无法正确传递到样式规则中。

### 技术细节
1. **common.css** 通过 `adoptedStyleSheets` API 加载到 Shadow DOM
2. common.css 中定义了 `:root { --text-main: #2d3436; }`
3. `.liquid-title` 使用了 `color: var(--text-main);`
4. 在 Shadow DOM 中，`:root` 不生效，导致 `var(--text-main)` 解析失败
5. 回退到浏览器默认颜色（通常是白色或黑色）

## 解决方案

### 修改文件：popup/styles/common.css

在 CSS 文件开头同时定义 `:root` 和 `:host` 选择器：

```css
/* CSS 变量定义 - 支持普通页面和 Shadow DOM */
:root {
    --primary: #57c5b6;
    --primary-dark: #3a8e82;
    --accent: #ff9a9e;
    --text-main: #2d3436;
    --text-gray: #636e72;
    /* ... 其他变量 ... */
}

/* Shadow DOM 支持 */
:host {
    --primary: #57c5b6;
    --primary-dark: #3a8e82;
    --accent: #ff9a9e;
    --text-main: #2d3436;
    --text-gray: #636e72;
    /* ... 其他变量 ... */
}
```

### 为什么这样能解决问题

- `:root` - 在普通 DOM 中使用（直接打开 HTML 文件）
- `:host` - 在 Shadow DOM 中使用（通过扩展注入）
- 同时定义两者，确保 CSS 变量在所有环境下都能正常工作

## 测试步骤

1. **重新加载扩展**
   ```
   chrome://extensions/ → 点击"重新加载"
   ```

2. **测试页面切换**
   - 打开扩展浮动窗口（默认显示智能填充页面）
   - 检查标题颜色是否为深色（#2d3436）
   - 点击"记录"菜单
   - 检查标题颜色是否为深色
   - 点击"我的"菜单
   - 检查标题颜色是否为深色
   - 点击"设置"菜单
   - 检查标题颜色是否为深色
   - **再次点击"填充"菜单**
   - 检查标题颜色是否仍为深色（这是关键测试）

3. **多次切换测试**
   - 在各个菜单间反复切换
   - 确认标题颜色始终保持深色

## 预期结果

✅ 所有页面的标题都显示为深色 (#2d3436)
✅ 页面切换后标题颜色不会改变
✅ 关闭按钮图标颜色为灰色 (#636e72)
✅ 所有使用 CSS 变量的元素都能正确显示

## 技术说明

### Shadow DOM 中的 CSS 变量作用域

在 Shadow DOM 中：
- `:root` 指向文档根元素（document.documentElement），Shadow DOM 无法访问
- `:host` 指向 Shadow Host（shadowRoot.host），是 Shadow DOM 的根元素
- CSS 变量会沿着 DOM 树向下继承，但不会跨越 Shadow 边界
- 因此必须在 Shadow DOM 内部重新定义 CSS 变量

### adoptedStyleSheets API

`shadowRoot.adoptedStyleSheets` 是一种高效的方式来应用样式表到 Shadow DOM：
- 样式表可以被多个 Shadow DOM 共享
- 不需要克隆 DOM 节点
- 但是 CSS 变量需要在 Shadow DOM 的上下文中定义

## 相关文件

- `popup/styles/common.css` - 共用样式（已修复）
- `popup/styles/fill.css` - 填充页面样式
- `js2/resumeInterfaceTwo.js` - Shadow DOM 初始化逻辑

## 如果问题仍然存在

如果修改后问题仍未解决，可能需要：

1. **检查浏览器控制台** - 查看是否有 CSS 解析错误
2. **使用硬编码颜色** - 将 `color: var(--text-main);` 改为 `color: #2d3436;`
3. **增加样式优先级** - 使用 `!important` 标记
