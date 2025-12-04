# Content.js 功能描述文档（第一部分）

## 概述

`content.js` 是求职方舟 Chrome 扩展的**自动填充核心引擎**，负责扫描招聘网站的表单、识别字段、与服务器通信获取填充值、并执行自动填充操作。

代码采用**九阶段流水线架构**，约 3930 行，包含 18 个功能模块。

---

## 核心架构

```
┌────────────────────────────────────────────────────────────────────────┐
│                          Content.js 核心引擎                            │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐               │
│   │  全局变量    │    │  重置函数    │    │ 基础工具函数 │               │
│   │  (状态管理)  │    │  (状态清理)  │    │  (通用能力)  │               │
│   └─────────────┘    └─────────────┘    └─────────────┘               │
│                                                                        │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐               │
│   │  DOM操作    │    │  表单扫描    │    │  字段匹配    │               │
│   │  (事件模拟)  │    │  (元素识别)  │    │  (标签定位)  │               │
│   └─────────────┘    └─────────────┘    └─────────────┘               │
│                                                                        │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐               │
│   │ Observer    │    │  日期处理    │    │ 数据结构转换 │               │
│   │ (DOM监控)   │    │  (日历选择)  │    │  (格式适配)  │               │
│   └─────────────┘    └─────────────┘    └─────────────┘               │
│                                                                        │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐               │
│   │ 重复检测    │    │  字段定位    │    │  API调用     │               │
│   │ (去重删除)  │    │  (输入框匹配) │    │  (服务通信)  │               │
│   └─────────────┘    └─────────────┘    └─────────────┘               │
│                                                                        │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐               │
│   │  填充执行   │    │  学习统计    │    │  主函数      │               │
│   │  (值写入)   │    │  (数据收集)  │    │  (流程控制)  │               │
│   └─────────────┘    └─────────────┘    └─────────────┘               │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 模块详细说明

### 1. 全局变量模块（第 1-36 行）

管理整个填充过程的状态。

| 变量名 | 原变量名 | 类型 | 说明 |
|--------|----------|------|------|
| `beautifiedResume` | `t` | Object | 美化后的简历数据 |
| `sessionId` | `e` | String | 会话ID（与服务器通信） |
| `fieldStructures` | `n` | Array | 字段结构数组（核心数据结构） |
| `serverFields` | `o` | Array | 服务器返回的字段列表 |
| `fillValues` | `i` | Array | 中间处理的字段 |
| `convertedFillData` | `s` | Array | 服务器返回的填充值 |
| `transformedFillData` | `r` | Array | 转换后的填充数据 |
| `inputDomList` | `l` | Array | 输入框DOM列表 |
| `selectInputOptions` | `a` | Array | 输入框弹窗选项 |
| `selectDomList` | `c` | Array | 下拉框DOM列表 |
| `selectOptions` | `f` | Array | 下拉框选项 |
| `radioDomList` | `u` | Array | 单选框DOM列表 |
| `radioOptions` | `d` | Array | 单选框选项 |
| `isNetworkError` | `Tt` | Boolean | 网络错误标志 |
| `errorFunctionName` | `St` | String | 出错函数名 |
| `deleteButtons` | `g` | Array | 删除按钮列表 |
| `isDomScanComplete` | `T` | Boolean | DOM扫描完成标志 |
| `isHighlightComplete` | `O` | Boolean | 高亮完成标志 |
| `mutationObserver` | `I` | Observer | MutationObserver实例 |
| `newlyAddedDoms` | `ct` | Array | 新增DOM元素列表 |
| `styleCache` | `ft` | WeakMap | 样式缓存 |
| `cancelButtons` | `pt` | Array | 取消按钮列表 |
| `confirmButtons` | `gt` | Array | 确定按钮列表 |
| `deleteConfirmButtons` | `bt` | Array | 删除确认按钮列表 |
| `learningInterval` | `Ct` | Number | 学习间隔定时器 |
| `lastHtml` | `Mt` | String | 上次HTML内容 |
| `lastUrl` | `$t` | String | 上次URL |

---

### 2. 基础工具函数模块（第 78-454 行）

提供通用的工具函数。

| 函数名 | 说明 |
|--------|------|
| `delay(ms)` | 延迟指定毫秒数 |
| `checkNetworkError()` | 检查网络错误状态 |
| `fetchWithJwt(url, options)` | 带JWT认证的API请求 |
| `addHistory(source, data)` | 添加投递历史记录 |
| `getAllElements()` | 获取所有DOM元素（排除扩展UI） |
| `isElementVisible(element)` | 检查元素是否可见 |
| `isAllChildrenHidden(element)` | 检查所有子元素是否隐藏 |
| `scrollToTop()` | 滚动到页面顶部 |
| `getCleanHtml()` | 获取清理后的HTML（用于学习） |
| `cloneWithStyles(element)` | 克隆DOM并保存样式 |
| `isElementVisibleInClone(element, stylesMap)` | 检查克隆元素是否可见 |
| `getElementColor(element)` | 获取元素高亮颜色 |
| `setElementColor(element, color)` | 设置元素高亮颜色 |

**可见性检测算法**：
```
isElementVisible(element)
    │
    ├── 检查 display: none / visibility: hidden / opacity: 0
    │
    ├── 检查 element.hidden 属性
    │
    ├── 检查 offsetWidth/offsetHeight 是否为 0
    │
    ├── 递归检查所有父元素
    │
    ├── 检查所有子元素是否都隐藏
    │
    └── 检查是否在可视区域内（处理 overflow: hidden）
```

---

### 3. DOM操作函数模块（第 455-524 行）

模拟用户交互操作。

| 函数名 | 说明 |
|--------|------|
| `simulateClick(element)` | 模拟点击（触发完整事件链） |
| `triggerFocus(element)` | 触发焦点事件 |
| `triggerBlur(element)` | 触发失焦事件 |

**点击模拟事件链**：
```
mousedown → focus → mouseup → click
```

---

### 4. 表单扫描函数模块（第 526-822 行）

识别页面中的表单元素。

| 函数名 | 说明 |
|--------|------|
| `scanFormElements(elements)` | 扫描表单元素（输入框/下拉框/单选框） |
| `isRadioGroup(element)` | 检查是否为单选框组 |
| `filterChildElements(elements)` | 过滤父元素（保留子元素） |
| `filterParentElements(elements)` | 过滤子元素（保留父元素） |
| `getInputBorderStyles(inputs)` | 获取输入框边框样式特征 |
| `expandInputList(...)` | 扩展输入框列表 |
| `filterOverlappingInputs(inputs)` | 过滤重叠的输入框 |
| `getInputPlaceholder(element)` | 获取输入框的placeholder |

**扫描策略**：
1. 跳过页面顶部 150px 以内的元素（通常是导航栏）
2. 识别 INPUT、TEXTAREA、SELECT 标签
3. 识别带 placeholder 属性的元素
4. 识别 ant-select 等组件类
5. 识别 radio 类型的分组

---

### 5. 字段匹配函数模块（第 824-1020 行）

在DOM中查找和匹配字段。

| 函数名 | 说明 |
|--------|------|
| `findFieldLabel(name, afterElement, container)` | 查找字段标签元素 |
| `findDeepestMatchingElement(element, regex)` | 找到匹配正则的最深层元素 |
| `findMatchingElement(container, text, findFirst, checkVisible)` | 在容器中查找匹配文本的元素 |
| `getSelectOptions(element)` | 获取下拉框选项 |
| `getRadioOptions(element)` | 获取单选框选项 |

**匹配优先级**：
```
精确匹配 > 数字匹配 > 前缀匹配 > 省/市后缀匹配
```

---

### 6. MutationObserver 模块（第 1022-1279 行）

监控DOM变化，检测弹窗和动态加载的元素。

| 函数名 | 说明 |
|--------|------|
| `startDomObserver()` | 启动DOM变化监听 |
| `stopDomObserver()` | 停止DOM变化监听 |
| `collectConfirmButtons(container)` | 收集确定按钮 |
| `collectCancelButtons(container)` | 收集取消/关闭按钮 |
| `collectDeleteConfirmButtons(container)` | 收集删除确认按钮 |
| `clickConfirmButtons()` | 点击确定按钮 |
| `closePopups(element)` | 关闭弹窗 |
| `clickDeleteConfirmButtons()` | 点击删除确认按钮 |

**监听的DOM变化类型**：
- `childList`: 新增/删除子节点
- `attributes`: class/style 属性变化

---

### 7. 日期处理函数模块（第 1281-1801 行）

处理各种日期选择器。

| 函数名 | 说明 |
|--------|------|
| `hasPopup()` | 检查是否有弹窗 |
| `hasVisibleContent(element)` | 检查元素是否有可见内容 |
| `getCalendarPopup()` | 获取日历弹窗 |
| `isCalendarPopup(element)` | 检查是否为日历弹窗 |
| `getMy97DatePicker()` | 检查是否为My97日期选择器 |
| `fillMy97Date(element, value, separator)` | 使用My97填充日期 |
| `selectDateInCalendar(calendar, value)` | 在日历弹窗中选择日期 |
| `normalizeCalendarOptions(options)` | 标准化日历选项 |
| `isElementClickable(element)` | 检查元素是否可点击 |
| `findCalendarNavButtons(calendar, referenceElement)` | 查找日历导航按钮 |

**支持的日期格式**：
- `YYYY年MM月`
- `YYYY-MM-DD`
- `YYYY.MM.DD`
- `至今`

**支持的日期选择器类型**：
- 标准日历（年月日选择）
- 年月选择器
- 年份范围选择器
- My97DatePicker（特殊处理）

---

### 8. 数据结构转换模块（第 1803-1978 行）

转换数据格式以适配不同阶段需求。

| 函数名 | 说明 |
|--------|------|
| `buildFieldStructures(serverFields)` | 构建字段结构 |
| `convertToApiFormat(structures, serverFields)` | 转换为API请求格式 |
| `convertFillValues(values)` | 转换API返回的填充值 |
| `processPhoneNumbers(data)` | 处理手机号格式（去掉+86） |

**核心数据结构 `fieldStructures`**：
```javascript
[
  {
    name: "基本信息",           // section名称
    dom: HTMLElement,          // section标签DOM
    fields: [
      {
        name: "姓名",          // 字段名称
        field: { dom: HTMLElement },  // 字段标签DOM
        blanks: [
          {
            name: "",          // 子字段名（如"省"、"市"）
            dom: HTMLElement,  // 输入框DOM
            type: "input"      // 类型: input/select/radio
          }
        ]
      }
    ]
  }
]
```

---

### 9. 特殊选项检测模块（第 1980-2252 行）

识别和处理特殊类型的下拉选项。

| 函数名 | 说明 |
|--------|------|
| `getPopupOptions()` | 获取弹窗中的选项 |
| `waitForValueMatch(element, value)` | 等待输入值匹配 |
| `findValueInPopup(value)` | 在弹窗中查找值 |
| `trySelectPopupOption(value)` | 尝试选择弹窗选项 |

**特殊选项识别**：
| 类型 | 识别条件 | 返回值 |
|------|----------|--------|
| 日期选择器 | 包含1-28天+周一至周六 | `(请填写日期)` |
| 月份选择器 | 包含1月-12月 | `(请填写年月)` |
| 省份选择器 | 匹配≥30个省份 | `(请填写省份)` |
| 民族选择器 | 匹配≥30个民族 | `(请填写民族)` |
| 国家选择器 | 匹配≥30个国家 | `(请填写国家)` |
| 数字范围 | ≥10个连续数字 | `(请填写X-Y中的一个数字)` |

---

### 10. 删除按钮模块（第 2254-2316 行）

识别和处理删除按钮。

| 函数名 | 说明 |
|--------|------|
| `scanDeleteButtons(container)` | 扫描删除按钮 |
| `isActionButton(element)` | 检查是否为操作按钮 |

**识别方式**：
- 文本内容包含"删除"、"移除"
- className 包含 delete、remove、trash 等

---

### 11. 重复条目检测模块（第 2318-2549 行）

检测和删除重复的表单块。

| 函数名 | 说明 |
|--------|------|
| `scanChineseElements()` | 扫描包含中文的可见元素 |
| `isDuplicateBlock(blocks)` | 检查是否为重复的表单块 |
| `compareClassNames(class1, class2)` | 比较className是否相似 |
| `compareInnerHTML(el1, el2)` | 比较innerHTML相似度 |
| `calculateSimilarity(str1, str2)` | 计算字符串相似度 |
| `deleteDuplicateBlocks(blocks)` | 删除重复的表单块 |

---

### 12. 字段定位模块（第 2551-2914 行）

定位字段标签和对应的输入框。

| 函数名 | 说明 |
|--------|------|
| `locateFieldLabels(structures)` | 定位字段标签 |
| `locateFieldInputs(structures)` | 为字段定位输入框 |
| `findAddMoreButton(afterDom, beforeDom)` | 查找"添加更多"按钮 |
| `matchFieldsInNewBlock(blocks, templateFields)` | 在新表单块中匹配字段 |
| `findMatchingDom(elements, targetDom)` | 在元素列表中查找匹配的DOM |

---

### 13. API调用模块（第 2916-2998 行）

与服务器通信。

| 函数名 | API端点 | 说明 |
|--------|---------|------|
| `getNeedFields(html)` | `/api/chrome/getNeedField` | 获取需要填写的字段 |
| `beautifyResume(...)` | `/api/chrome/beautifyResumeMd` | 美化简历 |
| `fillResumeValues(...)` | `/api/chrome/fillResumeValue` | 获取字段填充值 |

---

### 14. 填充执行模块（第 3001-3337 行）

执行实际的填充操作。

| 函数名 | 说明 |
|--------|------|
| `executeFilling(structures, fillData)` | 执行填充操作（核心） |
| `highlightAllFields(structures)` | 高亮所有字段 |

---

### 15. 学习统计模块（第 3339-3561 行）

收集用户行为数据。

| 函数名 | 说明 |
|--------|------|
| `updateStatistics()` | 更新填充统计 |
| `isLearningEnabled()` | 检查是否启用学习 |
| `startLearningMode()` | 启动学习模式 |
| `learnFields()` | 学习字段内容 |
| `logError(...)` | 记录错误日志 |
| `checkShowRating(...)` | 检查是否显示评分 |
| `shouldShowRating(...)` | 判断是否应显示评分 |
| `checkEnoughData(...)` | 检查数据是否足够 |
| `hasUploadedRating()` | 检查是否已上传评分 |
| `getRecentUrl()` | 获取最近访问的URL |

---

### 16. 主函数模块（第 3563-3916 行）

控制整个填充流程。

| 函数名 | 说明 |
|--------|------|
| `runFillResume(...)` | 主填充函数（入口） |
| `expandAllAddButtons()` | 展开所有"添加更多"按钮 |
| `scanAllInputs()` | 扫描所有输入框 |

---

## 高亮颜色含义

| 颜色 | 类名 | 含义 |
|------|------|------|
| 紫色 | `ark-color-purple` | Section 标签 |
| 黄色 | `ark-color-yellow` | 字段标签 |
| 绿色 | `ark-color-green` | 输入框 |
| 红色 | `ark-color-red` | 当前正在填充的字段 |
| 蓝色 | `ark-color-blue` | 保留 |

---

## 与 Background.js 的通信

| 消息类型 | 方向 | 说明 |
|----------|------|------|
| `fetchWithJwt` | Content → Background | 带JWT的API请求 |
| `learnField` | Content → Background | 发送学习数据 |
| `stopLearnField` | Content → Background | 停止学习并上传 |
| `addHistory` | Content → Background | 添加投递记录 |
| `logError` | Content → Background | 上报错误日志 |
| `checkStarRating` | Content → Background | 检查评分状态 |
| `getHistoryUrls` | Content → Background | 获取导航历史 |

---

## 错误处理机制

```javascript
try {
    // 执行操作
} catch (error) {
    // 1. 设置 isNetworkError 标志
    // 2. 记录 errorFunctionName
    // 3. 调用 logError() 上报到服务器
    // 4. 显示错误信息给用户
}
```

**错误上报的数据**：
- `functionName`: 出错函数名
- `errorStack`: 错误堆栈
- `duration`: 持续时间
- `browser`: 浏览器类型
- `version`: 扩展版本
- `resumeId`: 简历ID
- `company`: 公司名称
