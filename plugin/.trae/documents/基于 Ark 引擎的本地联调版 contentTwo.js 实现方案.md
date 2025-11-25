## 目标

* 复制 arkContent.decompiled.js 的核心自动填表引擎至 `contentTwo.js`

* 不调用后端接口，改用 `manifest.json` 的 `sampleData` 进行本地联调（写死示例数据）

* 整合 `resumeInterface.js` 的悬浮界面，仅保留“填充字段”按钮为入口

## 变更范围

* `chrome/contentTwo.js`：新增/覆盖为本地联调版内容脚本

* `chrome/manifest.json`：确认已注入 `contentTwo.js`（无需改动，如需并行注入则添加 `content.js`）

* 不修改 `resumeInterface.js`，仅在 `contentTwo.js` 内部绑定其 Shadow DOM 的控件

## 实现步骤

### 1. 拷贝与裁剪引擎

* 从 `arkContent.decompiled.js` 复制核心模块到 `contentTwo.js`：

  * 状态管理：`isRunning`、`MutationObserver` 监听

  * 展开流程：点击所有“添加/增加”按钮（scrollIntoView + mousedown/click/mouseup）

  * 基础工具：`sleep`、可见性判断、全量可见元素扫描

* 删除/跳过：网络接口（fetchWithJwt）、统计上报、学习模式、历史记录等非联调必须模块

### 2. 接口替换为本地示例

* 在 `contentTwo.js` 内定义：

  * `mockServerFields`：需要填写的字段列表（name/phone/email/school/major/degree/position/cities/edu\_range）

  * `mockFillValues`：从 `chrome.runtime.getManifest().sampleData.resume` 读取示例值，缺失时用默认占位

* 将 `getNeedFieldsFromServer` 与 `getFillValuesFromServer` 替换/内联为读取 `sampleData` 的逻辑（不发请求）

* 使用 TODO 标记清晰标注后续接入真实接口的位置

### 3. 填充逻辑实现

* 直配填充：

  * 使用 `data-form-field-name` 与 `data-form-field-i18n-name` 快速命中（name/phone/email/school/major/degree/position）

  * 通过原生 setter 设置 `value` 并派发 `input/change` 事件，兼容受控表单

* 城市多选：

  * 打开 `.ud__select__selector.ud__select__selector-multiple` 或 `[role="combobox"]`

  * 查找 `[role="option"]` 或 `.ud__select__option` 按文本包含逐项点击；完成后点击页面关闭下拉

* 学历日期范围：

  * 按学位与毕业年份推算起止（本科4/硕2/专3/博4，入学09/毕业06）

  * 优先匹配 `.throne-biz-date-range-picker-wrapper` 的两输入，其次匹配通用 `date-range/picker` 容器

* 细节保护：

  * 避免误填手机区号（+86）；仅在电话上下文且 `type="tel"` 的字段写入

  * 仅覆盖空值或明确目标位置；必要字段强制设置时仍派发事件

### 4. 整合 UI，仅保留填充入口

* 探测 `resumeInterface.js` 注入的 Shadow Host：`#ark-ai` → `shadowRoot`

* 绑定 `#start-button`：

  * 将文案改为“填充字段”，点击触发 `runFlow()`

  * 隐藏与填充无关元素：`#close-window`, `#resume-version`, `#beautify-checkbox`, `#state-text` 以及快捷入口按钮

* 备选入口：若悬浮 UI 不存在，注入页面右下角按钮（“填充字段”）同样触发 `runFlow()`

### 5. 测试与验证

* 重新加载扩展并刷新页面

* 有悬浮界面：点击“填充字段”，验证直配字段、城市多选与日期范围填充

* 无悬浮界面：使用右下角按钮触发同样流程

* 验证不误填手机区号 `+86`，城市选择不丢失

## 交付物

* `chrome/contentTwo.js`：完整本地联调版内容脚本（含 TODO 标记：接口接入位置）

* `chrome/manifest.json`：确认 `content_scripts` 已包含 `contentTwo.js`

## 风险与回退

* UI Shadow DOM 未注入：使用备用按钮降级

* 站点 DOM 差异：直配选择器命中失败时仍可扩展匹配字典或增加站点适配

* 一旦需要真实接口：替换 `mockServerFields/mockFillValues` 为后端返回结构并拉通字段映射

## 后续可选增强

* 增加上下文判定以限定城市容器范围，进一步避免误匹

* 将填充过程高亮目标字段，便于人眼确认

* 支持 iframe 场景与站点白名单收敛注入范围

