# 图标替换说明

## 替换原因
Font Awesome 在 Shadow DOM 中存在兼容性问题，无法正常显示图标。

## 新的图标系统
使用 `simple-icons.css` 替代 Font Awesome，采用 Unicode 字符和纯 CSS 实现。

## 图标对照表

| 原 Font Awesome 类名 | 新图标 | 显示效果 |
|---------------------|--------|---------|
| `fa-bolt` | ⚡ | 闪电 |
| `fa-spinner fa-spin` | 旋转圆圈 | 加载中 |
| `fa-check-circle` | ✓ | 成功（带圆圈）|
| `fa-exclamation-triangle` | ⚠ | 警告 |
| `fa-pause` | ❚❚ | 暂停 |
| `fa-play` | ▶ | 播放 |
| `fa-calendar-check` | 📅 | 日历 |
| `fa-bug` | 🐛 | Bug |
| `fa-charging-station` | 🔋 | 充电/配额 |
| `fa-wand-magic-sparkles` | ✨ | 魔法/智能 |
| `fa-camera` | 📷 | 相机 |
| `fa-sync` | ↻ | 刷新 |
| `fa-times` | × | 关闭 |
| `fa-history` | 🕐 | 历史 |
| `fa-user` | 👤 | 用户 |
| `fa-cog` | ⚙ | 设置 |
| `fa-info-circle` | ℹ | 信息（带圆圈）|
| `fa-inbox` | 📥 | 收件箱 |

## 使用方式

### HTML 中使用
```html
<!-- 原来 -->
<i class="fas fa-bolt"></i>

<!-- 现在（保持不变，CSS会自动处理）-->
<i class="fas fa-bolt"></i>
```

### JavaScript 中使用
```javascript
// 原来
element.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

// 现在（保持不变）
element.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
```

## 优点

1. **无需外部字体文件** - 使用 Unicode 字符，无需加载 woff2/ttf 文件
2. **跨域兼容** - 在任何网站都能正常显示
3. **Shadow DOM 兼容** - 完美支持 Shadow DOM 环境
4. **体积小** - CSS 文件仅 ~5KB，比 Font Awesome 小很多
5. **加载快** - 无需等待字体文件下载
6. **兼容性好** - 保持原有的类名，无需修改现有代码

## 已修改的文件

1. **新增文件**:
   - `popup/styles/simple-icons.css` - 新的图标样式文件

2. **修改的文件**:
   - `manifest.json` - 移除 Font Awesome 字体文件，添加 simple-icons.css
   - `js2/resumeInterfaceTwo.js` - 更新 CSS 加载逻辑
   - `popup/*.html` (12个文件) - 更新 CSS 引用

3. **可以删除的文件**:
   - `popup/styles/font-awesome.all.min.css`
   - `popup/styles/webfonts/*` (所有字体文件)

## 测试步骤

1. 重新加载扩展
2. 访问任意网站（包括外部网站）
3. 打开扩展浮动窗口
4. 确认所有图标正常显示

## 注意事项

- 某些 emoji 图标在不同操作系统上可能显示略有不同
- 旋转动画（fa-spin）已通过 CSS 动画实现
- 保持了所有原有的 Font Awesome 类名，代码无需修改
