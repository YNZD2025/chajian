# Content.js 逻辑操作详解文档（第二部分）

## 为什么需要这样设计？

这份文档详细解释自动填充引擎中各个关键操作的**设计原因**和**解决的问题**。

---

## 一、九阶段流水线架构

### 完整填充流程

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        runFillResume() 主函数                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   阶段1                阶段2                阶段3                        │
│ ┌──────────┐        ┌──────────┐        ┌──────────┐                   │
│ │展开表单   │ ────▶ │获取字段   │ ────▶ │美化简历   │                   │
│ │(添加按钮) │        │(异步API) │        │(可选异步) │                   │
│ └──────────┘        └──────────┘        └──────────┘                   │
│                                                                         │
│   阶段4                阶段5                阶段6                        │
│ ┌──────────┐        ┌──────────┐        ┌──────────┐                   │
│ │扫描输入框 │ ────▶ │构建结构   │ ────▶ │高亮显示   │                   │
│ │(DOM遍历) │        │(字段匹配) │        │(视觉反馈) │                   │
│ └──────────┘        └──────────┘        └──────────┘                   │
│                                                                         │
│   阶段7                阶段8                阶段9                        │
│ ┌──────────┐        ┌──────────┐        ┌──────────┐                   │
│ │生成专岗   │ ────▶ │转换数据   │ ────▶ │执行填写   │                   │
│ │简历(等待) │        │(格式适配) │        │(值写入)   │                   │
│ └──────────┘        └──────────┘        └──────────┘                   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 为什么采用流水线架构？

**问题**：自动填充涉及多个耗时操作（网络请求、DOM扫描、用户交互等待），如果串行执行会非常慢。

**解决方案**：
1. **并行执行**：阶段2（获取字段）和阶段3（美化简历）是异步的，不阻塞后续操作
2. **边扫描边等待**：阶段4扫描输入框的同时，等待API返回
3. **视觉反馈**：阶段6高亮是异步的，让用户看到进度

```javascript
// 阶段2：异步获取字段（不等待）
getNeedFields(getCleanHtml());

// 阶段3：异步美化（不等待）
if (enableBeautify) {
    beautifyResume(company, position, resumeMd);
}

// 阶段4：扫描输入框（同步执行）
await scanAllInputs();

// 等待阶段2完成
while (!serverFields.length) {
    await delay(500);
}
```

---

## 二、为什么要"展开添加按钮"？

### 问题场景

许多招聘网站的表单默认只显示一段工作经历、一段教育经历。用户可能有多段经历需要填写。

```
初始状态：
┌─────────────────┐
│ 工作经历 1      │
│ [公司名] [职位] │
└─────────────────┘
[+ 添加工作经历]     ← 需要点击展开

展开后：
┌─────────────────┐
│ 工作经历 1      │
│ [公司名] [职位] │
└─────────────────┘
┌─────────────────┐
│ 工作经历 2      │  ← 新增的表单块
│ [公司名] [职位] │
└─────────────────┘
```

### 解决方案

```javascript
async function expandAllAddButtons() {
    // 1. 找到所有"添加"按钮
    for (const el of allElements) {
        if (/^[\+ ]*[添增]加/.test(text) && !/职位/.test(text)) {
            addButtons.push(el);
        }
    }

    // 2. 依次点击
    for (const btn of filteredButtons) {
        startDomObserver();        // 开始监控DOM变化
        await simulateClick(btn);  // 点击按钮
        await delay(200);
        stopDomObserver();

        // 3. 检测新增的表单块
        const newBlocks = scanChineseElements();

        // 4. 如果是重复的空白块，删除它
        if (isDuplicateBlock(newBlocks)) {
            await deleteDuplicateBlocks(newBlocks);
        }
    }
}
```

### 为什么要检测重复块？

**问题**：有些网站点击"添加"会创建带有默认值的表单块，但这些可能与用户实际简历不匹配。

**解决方案**：检测是否为重复的空白块，如果是则删除，避免干扰后续填充。

---

## 三、为什么要使用 MutationObserver？

### 问题场景

现代招聘网站大多是 SPA（单页应用），表单元素可能是动态加载的：
- 点击输入框后弹出下拉选项
- 点击日期字段后弹出日历
- 选择省份后动态加载城市列表

### 解决方案

```javascript
function startDomObserver() {
    // 1. 缓存所有现有元素的样式
    for (const el of allElements) {
        styleCache.set(el, {
            display: style.display,
            visibility: style.visibility,
            opacity: style.opacity
        });
    }

    // 2. 监控DOM变化
    mutationObserver = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.type === "childList") {
                // 检测新增节点
                for (const node of mutation.addedNodes) {
                    newlyAddedDoms.push(node);
                }
            } else if (mutation.type === "attributes") {
                // 检测从隐藏变为可见的元素
                const oldStyle = styleCache.get(target);
                const newStyle = getComputedStyle(target);

                const wasHidden = oldStyle.display === "none";
                const isVisible = newStyle.display !== "none";

                if (wasHidden && isVisible) {
                    newlyAddedDoms.push(target);
                }
            }
        }
    });

    // 3. 监控 class 和 style 属性变化
    mutationObserver.observe(body, {
        childList: true,
        subtree: true,
        attributeFilter: ["class", "style"]
    });
}
```

### 为什么要缓存样式？

**问题**：有些弹窗不是通过添加DOM节点实现的，而是通过改变 `display: none` → `display: block`。

**解决方案**：缓存每个元素的初始样式，当属性变化时对比新旧样式，检测"从隐藏变为可见"的元素。

---

## 四、为什么要模拟完整的事件链？

### 问题场景

直接设置 `element.value = "xxx"` 可能不会触发网站的数据绑定：
- React/Vue 等框架通过事件监听更新状态
- 有些网站监听 `input` 事件做实时验证
- 有些网站监听 `blur` 事件保存数据

### 解决方案

```javascript
async function simulateClick(element) {
    // 1. 滚动到可见区域
    element.scrollIntoViewIfNeeded();

    // 2. 获取元素中心点的实际元素（处理遮挡）
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    targetElement = document.elementFromPoint(centerX, centerY);

    // 3. 触发完整事件链
    targetElement.dispatchEvent(new MouseEvent("mousedown", eventOptions));
    targetElement.dispatchEvent(new FocusEvent("focus", eventOptions));
    targetElement.dispatchEvent(new MouseEvent("mouseup", eventOptions));
    targetElement.dispatchEvent(new MouseEvent("click", eventOptions));
}
```

### 为什么要用 `elementFromPoint`？

**问题**：有些元素可能被其他透明元素遮挡，直接点击可能无效。

**解决方案**：获取元素中心点在屏幕上实际显示的元素，确保点击有效。

---

## 五、为什么需要多种输入框识别方式？

### 问题场景

招聘网站的输入框实现方式多种多样：
1. 标准 `<input type="text">`
2. `<div contenteditable="true">`
3. Ant Design 的 `<div class="ant-select">`
4. 自定义组件（通过 placeholder 识别）

### 解决方案

```javascript
function scanFormElements(elements) {
    for (const el of elements) {
        let isInput = false;

        // 方式1：有 placeholder 属性
        if (placeholder && !/^\\s*(搜索|查找)/.test(placeholder)) {
            isInput = true;
        }

        // 方式2：标准 input 标签
        if (el.tagName === "INPUT" && ["text", "search"].includes(el.type)) {
            isInput = true;
        }

        // 方式3：Ant Design 组件
        if (el.classList.contains("ant-select")) {
            isInput = true;
        }

        // 方式4：原生 select
        if (el.tagName === "SELECT") {
            isSelect = true;
        }

        // 方式5：radio 组
        if (isRadioGroup(el)) {
            isRadio = true;
        }
    }
}
```

---

## 六、为什么要用边框样式特征扩展输入框列表？

### 问题场景

有些输入框没有 placeholder，但有标签文字：
```html
<div class="form-item">
    <label>姓名</label>
    <input type="text">  <!-- 没有 placeholder -->
</div>
```

### 解决方案

**思路**：已知的输入框有共同的边框样式特征，可以用这个特征找到其他输入框。

```javascript
function getInputBorderStyles(inputs) {
    let styles = [];
    for (const input of inputs) {
        // 获取边框样式和高度的组合作为特征
        const borderBottom = getComputedStyle(el).borderBottom;
        const key = `${borderBottom}_${el.offsetHeight}`;
        styles.push(key);
    }
    return styles;
}

function expandInputList(inputs, selects, borderStyles, allElements) {
    for (const el of allElements) {
        // 跳过按钮文本
        if (/^(确定|取消|提交|保存)/.test(text)) continue;

        // 检查边框样式是否匹配
        const borderKey = `${getComputedStyle(current).borderBottom}_${current.offsetHeight}`;
        if (borderStyles.includes(borderKey) && isElementVisible(current)) {
            result.push(current);
        }
    }
}
```

---

## 七、为什么要处理"重叠输入框"？

### 问题场景

有些网站的输入框实现是多层嵌套的：
```html
<div class="input-wrapper" placeholder="请输入姓名">
    <div class="input-inner">
        <input type="text">
    </div>
</div>
```

扫描后可能同时检测到 wrapper 和 input，需要去重。

### 解决方案

```javascript
function filterOverlappingInputs(inputs) {
    for (const input of inputs) {
        const rect = input.getBoundingClientRect();
        const prevRect = prevInput.getBoundingClientRect();

        // 检查中心点是否在对方矩形内
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const isOverlapping = (
            centerX >= prevRect.left && centerX <= prevRect.right &&
            centerY >= prevRect.top && centerY <= prevRect.bottom
        );

        if (isOverlapping) {
            // 保留有 placeholder 的那个
            const inputLabel = getInputPlaceholder(input);
            if (inputLabel.length > 0) {
                result.pop();
                result.push(input);
            }
        }
    }
}
```

---

## 八、日期选择器的复杂处理

### 问题场景

日期选择器是最复杂的表单元素之一，有多种实现方式：

1. **标准日历**：年份选择 → 月份选择 → 日期选择
2. **年月选择器**：只选年和月
3. **年份范围选择器**：先选择年份范围，再选具体年份
4. **My97DatePicker**：老式第三方控件，需要直接写入值

### 解决方案

```javascript
async function selectDateInCalendar(calendar, value) {
    // 1. 解析日期值
    const match = value.match(/^(\d{4})(-|\.|\年)(\d{1,2})(?:月)?/);
    year = match[1];
    month = match[3];

    // 2. 获取当前日历选项
    let options = getRadioOptions(calendar);
    let optionsStr = options.join(";");

    // 3. 根据选项特征判断日历类型
    if (/(^|;)(19|20)\d{2}(年)?-(19|20)\d{2}(年)?/.test(optionsStr)) {
        // 年份范围选择器
        await handleYearRangeCalendar(calendar, year, month);
    } else if (/1;2;3;...;28/.test(optionsStr)) {
        // 标准日历（有日期选择）
        await handleStandardCalendar(calendar, year, month, day);
    } else if (/1月;2月;...;12月/.test(optionsStr)) {
        // 年月选择器
        await handleYearMonthCalendar(calendar, year, month);
    }
}
```

### 年份导航的处理

**问题**：目标年份可能不在当前显示的年份范围内，需要点击"上一页"或"下一页"。

```javascript
// 查找导航按钮
const [prevBtn, nextBtn] = findCalendarNavButtons(calendar, yearElement);

// 判断应该点击哪个按钮
const targetBtn = parseInt(year) < currentYear ? prevBtn : nextBtn;
await simulateClick(targetBtn);
```

### 中文月份转换

```javascript
function normalizeCalendarOptions(options) {
    // 转换中文月份
    normalized = normalized
        .replace(/十一月/, "11月")
        .replace(/十二月/, "12月")
        .replace(/一月/, "1月")
        // ...
        .replace(/十月/, "10月");
}
```

---

## 九、字段定位的两阶段策略

### 阶段1：定位字段标签

```javascript
function locateFieldLabels(structures) {
    let lastDom = null;
    for (const section of structures) {
        // 从上一个找到的元素之后开始搜索
        section.dom = findFieldLabel(section.name, lastDom, container);
        lastDom = section.dom;

        for (const field of section.fields) {
            field.field.dom = findFieldLabel(field.name, lastDom, container);
            lastDom = field.field.dom;
        }
    }
}
```

**为什么要从上一个元素之后开始搜索？**

避免匹配到页面上其他位置的同名文本，确保按照表单的顺序依次匹配。

### 阶段2：为字段定位输入框

```javascript
function locateFieldInputs(structures) {
    // 收集所有字段标签DOM
    const fieldDoms = [];
    for (const section of structures) {
        for (const field of section.fields) {
            fieldDoms.push(field.field.dom);
        }
    }

    // 遍历页面元素，为每个字段收集输入框
    let currentFieldDom = null;
    for (const el of allElements) {
        if (fieldDoms.includes(el)) {
            currentFieldDom = el;
            continue;
        }

        // 检查是否为输入元素
        if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
            fieldInputs[currentIndex].push(el);
        }
    }
}
```

**为什么要限制输入框数量？**

```javascript
// 限制输入框数量
if (fieldInputs[i].length > 4) {
    fieldInputs[i] = fieldInputs[i].slice(0, 1);
}
```

避免将无关的输入框错误地关联到字段上。

---

## 十、多段经历的处理

### 问题场景

用户可能有多段工作经历，需要：
1. 点击"添加更多"创建新的表单块
2. 在新表单块中找到对应的输入框
3. 填充每一段经历

### 解决方案

```javascript
async function executeFilling(structures, fillData) {
    while (sectionIndex < structures.length) {
        // 找到所有匹配的填充数据（如3段工作经历）
        for (const data of fillData) {
            if (data.name === section.name) {
                matchingFillData.push(data.fields);
            }
        }

        // 为每段额外经历创建新的表单块
        for (let i = 1; i < matchingFillData.length; i++) {
            // 找到"添加更多"按钮
            const addButton = findAddMoreButton(section.dom, nextSectionDom);
            await simulateClick(addButton);

            // 扫描新增的表单块
            const newBlocks = scanChineseElements();

            // 在新块中匹配字段（使用模板匹配）
            const newFields = matchFieldsInNewBlock(newBlocks, section.fields);
            fieldGroups.push(newFields);
        }

        // 为每组字段填充对应的值
        for (let groupIndex = 0; groupIndex < fieldGroups.length; groupIndex++) {
            const fields = fieldGroups[groupIndex];
            const values = matchingFillData[groupIndex];
            // 填充...
        }
    }
}
```

### 模板匹配算法

**问题**：新增的表单块DOM结构可能与第一个相同，但具体的元素是新的，需要重新定位。

```javascript
function matchFieldsInNewBlock(blocks, templateFields) {
    // 对于模板中的每个字段
    for (const template of templateFields) {
        // 在新块中找到对应的元素
        fieldMatch = findMatchingDom(allElements, template.field.dom);

        // 匹配条件：
        // 1. className 相同
        // 2. textContent 相同
        // 3. 父元素路径相同
    }
}
```

---

## 十一、学习机制

### 为什么需要学习用户填写的内容？

**问题**：AI 生成的填充值可能不准确，用户会手动修正。这些修正是宝贵的训练数据。

### 解决方案

```javascript
function startLearningMode() {
    learningInterval = setInterval(() => {
        const html = getCleanHtml();
        if (html !== lastHtml) {
            // 发送学习数据到服务器
            chrome.runtime.sendMessage({
                type: "learnField",
                url: window.location.href,
                html: html
            });
        }
    }, 5000);  // 每5秒检测一次
}
```

### getCleanHtml 的处理

为了减少传输数据量和提高学习质量：

```javascript
function getCleanHtml() {
    // 1. 克隆DOM并保存样式
    const { clone, stylesMap } = cloneWithStyles(document.body);

    // 2. 移除扩展UI元素
    clone.querySelector("#ark-ai").remove();

    // 3. 移除不可见元素
    for (const el of elements) {
        if (!isElementVisibleInClone(el, stylesMap)) {
            el.remove();
        }
    }

    // 4. 移除脚本、样式、图片
    clone.querySelectorAll("script, style, img, svg").forEach(el => el.remove());

    // 5. 替换输入框为span（显示当前值）
    for (const input of clone.querySelectorAll("input, textarea")) {
        const span = document.createElement("span");
        span.textContent = input.value;
        input.parentNode.replaceChild(span, input);
    }

    // 6. 移除所有属性（只保留结构和文本）
    for (const el of clone.querySelectorAll("*")) {
        for (const attr of Array.from(el.attributes)) {
            el.removeAttribute(attr.name);
        }
    }

    return clone.innerHTML;
}
```

---

## 十二、防抖和等待机制

### 为什么需要多处 delay？

```javascript
// 点击后等待弹窗出现
await simulateClick(input);
await delay(100);

// 弹窗可能需要动画时间
if (newlyAddedDoms.length > 0) {
    await delay(500);
}

// 填充后等待表单验证
await delay(300);
```

**原因**：
1. DOM 变化需要时间渲染
2. 动画效果需要时间完成
3. 框架的状态更新可能是异步的
4. 某些网站有防刷机制

### 暂停机制

```javascript
while (!window.isRunning()) {
    await delay(500);
}
```

用户可以暂停填充过程，代码会等待用户恢复。

---

## 十三、错误处理策略

### 网络错误标记

```javascript
async function fetchWithJwt(url, options = {}) {
    try {
        const response = await chrome.runtime.sendMessage({...});
        if (response.error) {
            throw new Error(response.error);
        }
        return response;
    } catch (error) {
        isNetworkError = true;           // 标记网络错误
        errorFunctionName = "fetchWithJwt";  // 记录出错函数
        throw error;
    }
}
```

### 网络错误检查

```javascript
function checkNetworkError() {
    if (isNetworkError) {
        throw new Error("网络响应不正常");
    }
}

// 在等待循环中检查
while (!serverFields.length) {
    checkNetworkError();  // 如果网络错误，立即退出
    await delay(500);
}
```

### 错误日志上报

```javascript
function logError(functionName, errorStack, startTime, company, resumeId) {
    const duration = Math.floor((now - startTime) / 1000);

    chrome.runtime.sendMessage({
        type: "logError",
        functionName: functionName,
        errorStack: errorStack,
        duration: duration,
        browser: "Chrome" | "Edge",
        version: chrome.runtime.getManifest().version,
        resumeId: resumeId,
        company: company
    });
}
```

---

## 总结

Content.js 的设计遵循以下原则：

1. **兼容性优先**：支持多种表单实现方式
2. **鲁棒性**：大量的边界情况处理
3. **用户体验**：视觉反馈、暂停机制
4. **可学习**：收集用户修正以改进AI
5. **错误追踪**：详细的错误上报机制
6. **性能优化**：并行执行、防抖机制
