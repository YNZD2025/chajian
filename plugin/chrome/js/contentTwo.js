/**
 * 简历自动填充引擎 - 测试版
 * 基于 arkContent.decompiled.js，使用写死的示例数据
 */

"use strict"; // 使用严格模式

(async () => { // 立即执行异步函数，启动引擎
  // ==================== 全局变量 ====================

  // 配置与运行入口
  window.config = null; // 全局配置占位
  window.runFillResume = null; // 自动填充入口函数

  // 服务器返回数据
  let beautifiedResume = null; // 美化后的简历占位
  let sessionId = null; // 会话ID占位
  let serverGroups = []; // 字段分组
  let serverFields = []; // 字段列表
  let localGroups = []; // 本地分组
  let fillValues = []; // 待填充值
  let restructuredValues = []; // 重构后的值

  // 本地扫描的 DOM 元素
  let inputDomList = []; // 输入控件列表
  let inputOptionsData = []; // 输入控件的选项数据
  let selectDomList = []; // 下拉控件列表
  let selectOptionsData = []; // 下拉控件的选项数据
  let radioDomList = []; // 单选控件列表
  let radioOptionsData = []; // 单选控件的选项数据

  // 状态标记
  let deleteButtons = []; // 删除按钮集合
  let isScanning = false; // 是否正在扫描
  let isHighlighting = false; // 是否正在高亮
  let mutationObserver = null; // DOM 变化观察器

  // DOM 监听相关
  let newlyAddedElements = []; // 新增的元素集合
  let elementStylesMap = new WeakMap(); // 元素样式映射
  let cancelButtons = []; // 取消按钮集合
  let confirmButtons = []; // 确认按钮集合
  let deleteConfirmButtons = []; // 删除确认按钮集合
  let lastPopupTitle = ""; // 最后弹窗标题

  // ==================== 界面注入 ====================

  let shadowRoot = null; // Shadow 根节点
  let logoButton = null; // 角标按钮
  let resumeWindow = null; // 主界面容器
  let startState = "ready"; // 启动状态

  // 初始化界面
  try {
    await injectUI(); // 注入悬浮界面
    loadStyles(); // 加载样式
  } catch (_) {} // 忽略初始化错误

  async function injectUI() { // 注入界面
    try {
      // Shadow 主机
      const host = document.createElement("div"); // 创建宿主节点
      host.id = "ark-ai-test"; // 设置宿主ID
      shadowRoot = host.attachShadow({ mode: "open" }); // 创建开放模式 ShadowRoot
      document.body.appendChild(host); // 挂载宿主到页面

      // 角标按钮（仅保留“填充”入口）
      logoButton = document.createElement("button"); // 创建按钮
      logoButton.id = "logo-button"; // 设置按钮ID
      logoButton.innerHTML = "Fill"; // 设置按钮文案
      logoButton.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: #4CAF50;
        color: white;
        border: none;
        cursor: pointer;
        font-size: 14px;
        font-weight: bold;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 999999;
        transition: all 0.3s ease;
      `;
      shadowRoot.appendChild(logoButton); // 挂载角标按钮到 ShadowRoot

      // 主窗口容器
      resumeWindow = document.createElement("div"); // 创建主窗口容器
      resumeWindow.id = "resume-window"; // 设置容器ID
      resumeWindow.style.cssText = `
        position: fixed;
        bottom: 90px;
        right: 20px;
        width: 300px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.2);
        z-index: 999998;
        display: none;
        flex-direction: column;
        padding: 16px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      `;

      // 窗口内容（仅保留填充按钮，无其他控件）
      resumeWindow.innerHTML = `
        <div style="margin-bottom: 12px; font-size: 16px; font-weight: bold; color: #333;">
          Resume Auto-Fill Test
        </div>
        <div id="state-text" style="margin-bottom: 12px; font-size: 13px; color: #666; min-height: 20px;">
          Ready to start
        </div>
        <button id="start-button" style="
          width: 100%;
          padding: 12px;
          background: #4CAF50;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: bold;
          transition: all 0.3s ease;
        ">
          Start Fill
        </button>
        <button id="close-button" style="
          width: 100%;
          padding: 8px;
          margin-top: 8px;
          background: #f5f5f5;
          color: #666;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 12px;
        ">
          Close
        </button>
      `;
      shadowRoot.appendChild(resumeWindow); // 挂载主窗口到 ShadowRoot

      // 事件绑定
      logoButton.addEventListener("click", () => { // 点击角标显示/隐藏窗口
        if (resumeWindow.style.display === "none") {
          resumeWindow.style.display = "flex";
        } else {
          resumeWindow.style.display = "none";
        }
      });

      resumeWindow.querySelector("#close-button").addEventListener("click", () => { // 关闭按钮事件
        resumeWindow.style.display = "none"; // 隐藏窗口
      });

      resumeWindow.querySelector("#start-button").addEventListener("click", () => { // 填充入口按钮事件
        onStart(); // 触发填充流程
      });

    } catch (_) {}
  }

  function loadStyles() { // 加载高亮样式
    const style = document.createElement("style"); // 创建样式节点
    style.textContent = `
      .ark-color-yellow { background-color: rgba(255, 255, 0, 0.3) !important; }
      .ark-color-green { background-color: rgba(0, 255, 0, 0.3) !important; }
      .ark-color-red { background-color: rgba(255, 0, 0, 0.3) !important; }
      .ark-color-blue { background-color: rgba(0, 0, 255, 0.3) !important; }
      .ark-color-purple { background-color: rgba(128, 0, 128, 0.3) !important; }
    `;
    document.head.appendChild(style);
  }

  // ==================== 重置函数 ====================

  function resetAllVariables() { // 重置所有全局变量
    beautifiedResume = null;
    sessionId = null;
    serverGroups = [];
    serverFields = [];
    localGroups = [];
    fillValues = [];
    restructuredValues = [];
    inputDomList = [];
    inputOptionsData = [];
    selectDomList = [];
    selectOptionsData = [];
    radioDomList = [];
    radioOptionsData = [];
    deleteButtons = [];
    isScanning = false;
    isHighlighting = false;
    mutationObserver = null;
    newlyAddedElements = [];
    elementStylesMap = new WeakMap();
    cancelButtons = [];
    confirmButtons = [];
    deleteConfirmButtons = [];
    lastPopupTitle = "";
  }

  // ==================== 主函数 ====================

  async function onStart() { // 启动填充入口（测试值）
    // TODO：写死的测试值，后续可替换为实际输入
    const company = "Test Company"; // 公司名
    const position = "Software Engineer"; // 职位名称
    const resumeMd = "# Test Resume\n\nName: John Doe\nEmail: john@example.com\nPhone: 13800138000"; // 简历MD
    const resumeId = "test-resume-001"; // 简历ID
    const enableBeautify = false; // 是否启用美化

    setStartButtonState("running"); // 设置按钮状态为运行

    await window.runFillResume(
      company, // 公司
      position, // 职位
      resumeMd, // 简历MD
      resumeId, // 简历ID
      enableBeautify, // 美化开关
      (result) => { // 回调
        setStartButtonState(result.status === "success" ? "success" : "error"); // 设置完成状态
      }
    );
  }

  window.runFillResume = async (
    company,
    position,
    resumeMd,
    resumeId,
    enableBeautify,
    callback = (result) => {}
  ) => {
    const startTime = new Date();

    try {
      // 步骤0：初始化
      window.setStateText("Ark! Starting!"); // 设置状态文本
      resetAllVariables(); // 重置全局变量

      // 步骤1：点击所有“添加”按钮，展开动态表单
      await clickAllAddButtons(); // 展开表单

      // 步骤2：获取需要填写的字段（写死示例）
      await getNeedFieldsFromServer(generateSimplifiedHTML()); // 用快照传给占位函数

      // 步骤3：扫描本地表单元素
      await scanLocalFormElements(); // 扫描控件

      // 步骤4：等待扫描与字段返回
      window.setStateText("Scanning website..."); // 设置状态：扫描中
      while (!isScanning) { // 等待扫描启动
        await sleep(500);
      }

      window.setStateText("Understanding website, please wait..."); // 设置状态：理解中
      while (!serverFields.length) { // 等待字段返回
        await sleep(500);
      }

      // 步骤5：匹配字段与输入框
      window.setStateText("Marking resume fields..."); // 状态：标记字段
      serverGroups = parseServerFieldsToGroups(serverFields); // 解析分组

      if (serverGroups.length === 0) { // 分组为空则报错
        throw new Error("Server returned error");
      }

      // 查找字段对应的 DOM 元素
      findFieldDomElements(serverGroups); // 定位控件

      // 查找每个字段的空白输入
      findBlankInputsForFields(serverGroups); // 查找空位

      // 生成供 AI 理解的字段结构
      localGroups = generateFieldStructureForAI(serverGroups, serverFields); // 结构化

      console.log("localGroups====>>>",localGroups);

      // 步骤6：高亮已识别字段
      await highlightIdentifiedFields(serverGroups); // 高亮

      // 步骤7：获取填充值（写死示例）
      await getFillingValues(enableBeautify, resumeMd); // 获取示例值

      // 步骤8：执行填充
      window.setStateText("Attempting to fill resume..."); // 状态：尝试填充
      await sleep(500); // 等待片刻

      // 重构填充值结构
      restructuredValues = restructureFillingValues(fillValues); // 重构

      // 处理手机号 +86 前缀
      restructuredValues = removePhonePlusPrefix(restructuredValues); // 去前缀

      // 执行实际填写
      await performFilling(serverGroups, restructuredValues); // 写入页面

      // 步骤9：完成
      window.setStateText("Fill complete! The rest is up to you~"); // 设置完成状态
      callback({ status: "success" }); // 回调成功

      // 关闭高亮
      window.closeHighlight(); // 清理高亮

    } catch (error) {
      handleError(error, startTime, company, resumeId, callback);
    }

    return true;
  };

  // ==================== Sub-step Functions ====================

  async function clickAllAddButtons() {
    const allElements = getAllVisibleElements();
    const addButtons = [];

    for (const element of allElements) {
      const text = element.textContent.trim();
      // Match Chinese "Add" buttons
      if (/^[\+ ]*[添增]加/.test(text) && !/职位/.test(text)) {
        addButtons.push(element);
      }
    }

    const uniqueButtons = removeDuplicateParentElements(addButtons);

    for (const button of uniqueButtons) {
      button.scrollIntoView({ block: "center" });
      await sleep(100);

      startMonitoringDomChanges();
      await clickElement(button);
      await sleep(200);
      stopMonitoringDomChanges();

      const popupElements = getTextElementsFromPopup();
      if (popupElements.length === 0) continue;

      if (isRepeatedFormSection(popupElements)) {
        await clickDeleteButtons(popupElements);
      }
    }

    await sleep(100);
  }

  function getTextElementsFromPopup() {
    const textElements = [];

    for (const element of newlyAddedElements) {
      if (!isElementVisible(element)) continue;

      const text = element.textContent.trim();
      if (/[\u4e00-\u9fa5]/.test(text)) {
        textElements.push(element);
      }
    }

    deleteButtons = [];
    for (const element of textElements) {
      findDeleteButtons(element);
    }

    return textElements;
  }

  function findDeleteButtons(container) {
    const elements = container.querySelectorAll("*");

    for (const element of elements) {
      let isDeleteButton = false;

      if (element.innerText) {
        const text = element.innerText.trim();
        if (/^(删\s*除|移\s*除).{0,4}$/.test(text)) {
          isDeleteButton = true;
        }
      }

      if (isDeleteButton) {
        deleteButtons.push(element);
      }
    }

    for (const element of elements) {
      if (deleteButtons.includes(element)) continue;

      let isDeleteButton = false;
      const attributes = element.attributes;

      for (const attr of attributes) {
        const value = attr.value;

        if (/(?:^|\W+)(shanchu|(del|delete|remove|trash)(|btn|button))(?:[^a-zA-Z]+|$)/i.test(value)) {
          isDeleteButton = true;
          break;
        }
      }

      if (isDeleteButton) {
        deleteButtons.push(element);
      }
    }
  }

  function isRepeatedFormSection(popupElements) {
    let allElements = [];
    for (const element of popupElements) {
      allElements.push(element);
      const children = Array.from(element.querySelectorAll("*"));
      allElements = allElements.concat(children);
    }
    allElements = allElements.reverse();

    const firstElement = popupElements[0];
    const pageElements = getAllVisibleElements().reverse();

    let matchIndex = 0;
    let foundFirst = false;

    for (let i = 0; i < pageElements.length; i++) {
      const pageElem = pageElements[i];

      if (pageElem === firstElement) {
        foundFirst = true;
        continue;
      }

      if (!foundFirst) continue;
      if (matchIndex >= allElements.length) return true;

      const targetElem = allElements[matchIndex];

      if (
        pageElem.nodeType === targetElem.nodeType &&
        pageElem.tagName === targetElem.tagName &&
        pageElem.className === targetElem.className
      ) {
        matchIndex++;
      }
    }

    return false;
  }

  async function clickDeleteButtons(popupElements) {
    const uniqueDeleteButtons = removeDuplicateParentElements(deleteButtons);
    uniqueDeleteButtons.reverse();

    for (const button of uniqueDeleteButtons) {
      startMonitoringDomChanges();
      await clickElement(button);
      await sleep(100);
      stopMonitoringDomChanges();

      for (const confirmBtn of newlyAddedElements) {
        findDeleteConfirmButton(confirmBtn);
        await clickDeleteConfirmButton();
      }

      await sleep(100);

      let allClosed = true;
      for (const element of popupElements) {
        if (isElementVisible(element)) {
          allClosed = false;
          break;
        }
      }

      if (allClosed) return;
    }
  }

  // ==================== HTML Simplification ====================

  /**
   * 生成简化的HTML快照
   */
  function generateSimplifiedHTML() {
    // 1. 克隆DOM并记录样式
    const { clone, stylesMap } = cloneDomWithStyles(document.body);
    const clonedBody = clone;

    // 2. 移除插件自身元素
    const excludeIds = ["ark-ai"];
    for (const id of excludeIds) {
      const element = clonedBody.querySelector(`#${id}`);
      if (element && element.parentNode) {
        element.remove();
      }
    }

    // 3. 移除不可见元素
    let elements = clonedBody.querySelectorAll("*");
    for (const element of elements) {
      if (!isVisibleByStyle(element, stylesMap)) {
        element.remove();
      }
    }

    // 4. 递归移除空白节点和注释
    const removeEmptyTextNodes = (node) => {
      const childNodes = node.childNodes;
      for (let i = childNodes.length - 1; i >= 0; i--) {
        const child = childNodes[i];
        if (child.nodeType === Node.COMMENT_NODE) {
          child.remove();
        } else if (child.nodeType === Node.TEXT_NODE && child.nodeValue.trim() === "") {
          child.remove();
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          removeEmptyTextNodes(child);
        }
      }
    };
    removeEmptyTextNodes(clonedBody);

    // 5. 移除脚本、样式、图片等
    elements = clonedBody.querySelectorAll("noscript, script, link, style, img, canvas, svg");
    for (const element of elements) {
      element.remove();
    }

    // 6. 清理文本节点中的多余换行
    const textParents = clonedBody.querySelectorAll("*");
    // 遍历所有元素，清理文本节点中的多余换行
    for (const parent of textParents) {
      if (parent.childNodes.length > 0) {
        for (const child of parent.childNodes) {
          if (child.nodeType === Node.TEXT_NODE) {
            child.nodeValue = child.nodeValue.replace(/\n\s*\n+/g, " ").trim();
          }
        }
      }
    }

    // 7. 将input/textarea转换为span
    elements = clonedBody.querySelectorAll("input, textarea");
    for (const input of elements) {
      if (input.value) {
        const span = document.createElement("span");
        span.textContent = input.value;
        input.parentNode.replaceChild(span, input);
      }
    }

    // 8. 将select转换为span
    elements = clonedBody.querySelectorAll("select");
    for (const select of elements) {
      const span = document.createElement("span");
      const selectedOption = select.querySelector(`option[value="${select.value}"]`);
      span.textContent = selectedOption ? selectedOption.textContent : select.value;
      select.parentNode.replaceChild(span, select);
    }

    // 9. 循环删除空元素
    let hasEmpty = true;
    while (hasEmpty) {
      hasEmpty = false;
      elements = clonedBody.querySelectorAll("*");
      for (const element of elements) {
        if (element.innerText.trim() === "") {
          element.remove();
          hasEmpty = true;
        }
      }
    }

    // 10. 移除所有属性
    elements = clonedBody.querySelectorAll("*");
    for (const element of elements) {
      for (const attr of Array.from(element.attributes)) {
        element.removeAttribute(attr.name);
      }
    }

    return clonedBody.innerHTML.trim();
  }

  function cloneDomWithStyles(bodyElement) {
    const clone = bodyElement.cloneNode(true);
    const originalElements = bodyElement.querySelectorAll("*");
    const clonedElements = clone.querySelectorAll("*");
    const stylesMap = new Map();

    let index = 0;
    for (const originalElem of originalElements) {
      const computedStyle = getComputedStyle(originalElem);
      const styleInfo = {
        display: computedStyle.display,
        visibility: computedStyle.visibility,
        opacity: computedStyle.opacity
      };
      stylesMap.set(clonedElements[index], styleInfo);
      index++;
    }

    console.log("clone====>>>",clone);
    console.log("stylesMap====>>>",stylesMap);

    return { clone, stylesMap };
  }

  function isVisibleByStyle(element, stylesMap) {
    const style = stylesMap.get(element);
    if (!style) return true;

    return (
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      style.opacity !== "0" &&
      !element.hidden
    );
  }

  // ==================== Form Scanning ====================

  async function scanLocalFormElements() {
    await scrollToTop();
    await sleep(10);

    const allElements = getAllVisibleElements();
    const formElements = scanFormElements(allElements);

    inputDomList = formElements.inputDoms;
    selectDomList = formElements.selectDoms;
    radioDomList = formElements.radioDoms;

    const borderPatterns = extractBorderPatterns(inputDomList);

    inputDomList = addFieldsByBorderPattern(
      inputDomList,
      selectDomList,
      borderPatterns,
      getAllVisibleElements()
    );

    inputDomList = deduplicateOverlappingFields(inputDomList);

    inputOptionsData = [];

    for (const input of inputDomList) {
      const originalColor = getHighlightColor(input);
      highlightElement(input, "yellow");
      if (input.scrollIntoViewIfNeeded) input.scrollIntoViewIfNeeded();

      await sleep(200);

      startMonitoringDomChanges();
      await clickElement(input);
      await sleep(100);

      if (newlyAddedElements.length > 0) {
        await sleep(500);
      }

      stopMonitoringDomChanges();

      const options = getOptionsFromPopup();

      await closePopupWindow(input);

      highlightElement(input, originalColor);
      await blurElement(input);

      if (options.length) {
        await sleep(200);
      }

      inputOptionsData.push(options);
    }

    const processedInputOptions = [];
    for (const options of inputOptionsData) {
      if (options.length > 0 && /^[-\s]*请选择/.test(options[0])) {
        processedInputOptions.push(options.slice(1));
      } else {
        processedInputOptions.push(options);
      }
    }
    inputOptionsData = processedInputOptions;

    selectOptionsData = [];
    for (const select of selectDomList) {
      const options = getAllSelectOptions(select);
      if (options.length >= 2) {
        if (/^[-\s]*请选择/.test(options[0])) {
          selectOptionsData.push(options.slice(1));
        } else {
          selectOptionsData.push(options);
        }
      } else {
        selectOptionsData.push([]);
      }
    }

    radioOptionsData = [];
    for (const radio of radioDomList) {
      const options = getAllRadioOptions(radio);
      if (options.length >= 2) {
        radioOptionsData.push(options);
      } else {
        radioOptionsData.push([]);
      }
    }

    isScanning = true;
  }

  function scanFormElements(elements) {
    let inputDoms = [];
    let selectDoms = [];
    let radioDoms = [];

    for (const element of elements) {
      let isInput = false;
      let isSelect = false;
      let isRadio = false;

      if (element.getBoundingClientRect().bottom <= 150) {
        continue;
      }

      const placeholder = element.getAttribute("placeholder");

      if (
        placeholder &&
        element.tagName !== "TEXTAREA" &&
        !/^\s*(搜索|查找)/.test(placeholder)
      ) {
        isInput = true;
      } else if (
        element.tagName === "INPUT" &&
        ["text", "search"].includes(element.type)
      ) {
        isInput = true;
      } else if (element.tagName === "SELECT") {
        isSelect = true;
      } else if (isRadioGroup(element)) {
        isRadio = true;
      }

      if (isInput || isSelect || isRadio) {
        if (isElementVisible(element)) {
          if (isInput) {
            inputDoms.push(element);
          } else if (isSelect) {
            selectDoms.push(element);
          } else {
            radioDoms.push(element);
          }
        }
      }
    }

    inputDoms = removeDuplicateParentElements(inputDoms);
    selectDoms = removeDuplicateParentElements(selectDoms);
    radioDoms = removeDuplicateRadioGroups(radioDoms);

    return { inputDoms, selectDoms, radioDoms };
  }

  function extractBorderPatterns(inputDoms) {
    let patterns = [];

    for (const input of inputDoms) {
      let element = input;

      while (element && element.offsetHeight < 40 && element !== document.body) {
        const borderBottom = getComputedStyle(element).borderBottom;

        if (
          borderBottom &&
          !borderBottom.includes("none") &&
          !borderBottom.includes("hidden")
        ) {
          for (let offset = -2; offset <= 2; offset++) {
            const pattern = `${borderBottom}_${element.offsetHeight + offset}`;
            if (!patterns.includes(pattern)) {
              patterns.push(pattern);
            }
          }
          break;
        }

        element = element.parentElement;
      }
    }

    return patterns;
  }

  function addFieldsByBorderPattern(inputDoms, selectDoms, borderPatterns, allElements) {
    let result = [...inputDoms];
    let lastField = null;

    for (const element of allElements) {
      if (result.includes(element)) {
        lastField = element;
        continue;
      }

      if (selectDoms.includes(element)) {
        lastField = element;
        continue;
      }

      if (lastField && lastField.contains(element)) {
        continue;
      }

      if (element.children.length > 0) {
        continue;
      }

      if (element.getBoundingClientRect().bottom <= 100) {
        continue;
      }

      const html = element.innerHTML.trim();

      if (!html || !/[\u4e00-\u9fa5]/.test(html)) {
        continue;
      }

      let parent = element;
      while (parent && parent.offsetHeight <= 50 && parent !== document.body) {
        const pattern = `${getComputedStyle(parent).borderBottom}_${parent.offsetHeight}`;

        if (borderPatterns.includes(pattern) && isElementVisible(parent)) {
          result.push(parent);
          lastField = parent;
          break;
        }

        parent = parent.parentElement;
      }
    }

    result = removeDuplicateParentElements(result);

    result.sort((a, b) => {
      return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
    });

    return result;
  }

  function deduplicateOverlappingFields(fields) {
    let result = [];
    let lastField = null;

    for (const field of fields) {
      if (!lastField) {
        lastField = field;
        result.push(field);
        continue;
      }

      const rect = field.getBoundingClientRect();
      const lastRect = lastField.getBoundingClientRect();

      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const lastCenterX = lastRect.left + lastRect.width / 2;
      const lastCenterY = lastRect.top + lastRect.height / 2;

      const isOverlapping = (
        (centerX >= lastRect.left && centerX <= lastRect.right &&
         centerY >= lastRect.top && centerY <= lastRect.bottom) ||
        (lastCenterX >= rect.left && lastCenterX <= rect.right &&
         lastCenterY >= rect.top && lastCenterY <= rect.bottom)
      );

      if (isOverlapping) {
        const fieldLabel = extractFieldLabel(field);

        if (extractFieldLabel(lastField).length === 0 || fieldLabel.length > 0) {
          result.pop();
          result.push(field);
          lastField = field;
        }
      } else {
        result.push(field);
        lastField = field;
      }
    }

    return result;
  }

  function extractFieldLabel(element) {
    function cleanLabel(text) {
      let cleaned = text.trim();
      cleaned = cleaned.replace(/^请?(选择|输入|填写|填入)\s*/g, "");
      cleaned = cleaned.replace(/[:\s]*$/g, "");
      return cleaned;
    }

    const elementsToCheck = [element, ...element.querySelectorAll("*")];

    for (const elem of elementsToCheck) {
      const placeholder = elem.getAttribute("placeholder")?.trim();
      if (placeholder && placeholder !== "") {
        return cleanLabel(placeholder);
      }
    }

    return "";
  }

  function getOptionsFromPopup() {
    let options = [];

    for (const element of newlyAddedElements) {
      findCancelButton(element);

      const optionList = getAllVisibleOptions(element);

      if (optionList.length >= 2) {
        options = optionList.join(";").length > 1000 ?
          optionList.slice(0, 100) :
          optionList;
      }
    }

    return options;
  }

  // ==================== Find Field DOM ====================

  function findFieldDomElements(groups) {
    try {
      const groupNames = groups.map(g => g.name);
      const allElements = getAllVisibleElements();

      let containerElement = null;
      for (const element of allElements) {
        const childNodes = element.childNodes;
        if (childNodes.length < 5) continue;

        let matchCount = 0;
        for (const child of childNodes) {
          const text = child.textContent.trim();
          if (text && groupNames.includes(text)) {
            matchCount++;
          }
        }

        if (matchCount >= 5) {
          containerElement = element;
          break;
        }
      }

      let lastFoundElement = null;

      for (const group of groups) {
        group.dom = findElementByText(group.name, lastFoundElement, containerElement);
        lastFoundElement = group.dom;

        for (const field of group.fields) {
          field.field.dom = findElementByText(field.name, lastFoundElement, containerElement);
          lastFoundElement = field.field.dom;
        }
      }

    } catch (error) {
      // Ignore error
    }
  }

  function findElementByText(text, startAfter, container) {
    try {
      const allElements = getAllVisibleElements();
      let shouldSearch = !startAfter;

      for (const element of allElements) {
        if (container && container.contains(element)) {
          continue;
        }

        if (element === startAfter) {
          shouldSearch = true;
          continue;
        }

        if (!shouldSearch) continue;
        if (element.tagName === "OPTION") continue;

        let escapedText = text.trim();
        escapedText = escapedText.replace(/[.*+?^${}()|\[\]\\]/g, "\\$&");
        const pattern = new RegExp(`^[\\s\\*]*${escapedText}[\\s\\*\\?？i]*(:|：)?[\\s\\*\\?？i]*$`);

        if (pattern.test(element.textContent)) {
          return findDeepestMatchingElement(element, pattern);
        }
      }
    } catch (error) {
      // Ignore error
    }

    return null;
  }

  function findDeepestMatchingElement(element, pattern) {
    let deepest = element;
    const descendants = Array.from(element.querySelectorAll("*")).reverse();

    for (const desc of descendants) {
      if (pattern.test(desc.textContent)) {
        deepest = desc;
        break;
      }
    }

    return deepest;
  }

  // ==================== Find Inputs ====================

  function findBlankInputsForFields(groups) {
    try {
      const fieldDoms = [];
      const blanksList = [];

      for (const group of groups) {
        for (const field of group.fields) {
          if (field.field.dom) {
            fieldDoms.push(field.field.dom);
            blanksList.push([]);
          }
        }
      }

      const allElements = getAllVisibleElements();
      let currentFieldDom = null;
      let currentFieldIndex = 0;
      let nextFieldDom = null;

      for (const element of allElements) {
        if (fieldDoms.includes(element)) {
          currentFieldDom = element;
          currentFieldIndex = fieldDoms.indexOf(element);
          nextFieldDom = currentFieldIndex + 1 < fieldDoms.length ?
            fieldDoms[currentFieldIndex + 1] : null;
          continue;
        }

        if (!currentFieldDom) continue;

        if (nextFieldDom && element.contains(nextFieldDom)) {
          continue;
        }

        let isFormElement = false;

        if (
          (element.tagName === "INPUT" && ["text", "search", "number"].includes(element.type)) ||
          element.tagName === "TEXTAREA" ||
          element.tagName === "SELECT"
        ) {
          isFormElement = true;
        }

        if (inputDomList.includes(element)) {
          isFormElement = true;
        }

        if (isFormElement) {
          if (isElementVisible(element)) {
            blanksList[currentFieldIndex].push(element);
          }
        } else {
          if (selectDomList.includes(element)) {
            blanksList[currentFieldIndex].push(element);
          }

          if (radioDomList.includes(element)) {
            blanksList[currentFieldIndex].push(element);
          }
        }
      }

      for (const i in blanksList) {
        blanksList[i] = removeDuplicateParentElements(blanksList[i]);
      }

      for (const i in blanksList) {
        if (blanksList[i].length > 4) {
          blanksList[i] = blanksList[i].slice(0, 1);
        }
      }

      const finalBlanks = [];
      for (let i = 0; i < fieldDoms.length; i++) {
        const blanks = blanksList[i];
        finalBlanks[i] = blanks.length > 0 ? blanks : [];
      }

      for (let fieldIndex = 0; fieldIndex < finalBlanks.length; fieldIndex++) {
        if (finalBlanks[fieldIndex].length === 0) continue;

        for (const group of groups) {
          for (const field of group.fields) {
            if (field.field.dom === fieldDoms[fieldIndex]) {
              for (const blank of finalBlanks[fieldIndex]) {
                field.blanks.push({
                  name: extractFieldLabel(blank),
                  dom: blank,
                  type: radioDomList.includes(blank) ? "radio" :
                        selectDomList.includes(blank) ? "select" : "input"
                });
              }
            }
          }
        }
      }

    } catch (error) {
      // Ignore error
    }
  }

  // ==================== Generate Field Structure ====================

  function generateFieldStructureForAI(localGroups, serverFields) {
    try {
      const result = [];

      for (const serverGroup of serverFields) {
        result.push({
          name: serverGroup.name,
          fields: []
        });
      }

      for (let groupIndex = 0; groupIndex < localGroups.length; groupIndex++) {
        const localGroup = localGroups[groupIndex];
        const fields = [];
        result[groupIndex].fields = fields;

        for (const localField of localGroup.fields) {
          if (localField.blanks.length === 0) {
            fields.push({ name: localField.name });
          } else {
            for (const blank of localField.blanks) {
              const fieldInfo = {
                name: localField.blanks.length === 1 ?
                  localField.name :
                  `${localField.name} - ${blank.name}`
              };
              fields.push(fieldInfo);

              let optionIndex = inputDomList.indexOf(blank.dom);
              if (optionIndex !== -1 && inputOptionsData[optionIndex]?.length > 0) {
                fieldInfo.items = inputOptionsData[optionIndex];
              } else {
                optionIndex = selectDomList.indexOf(blank.dom);
                if (optionIndex !== -1 && selectOptionsData[optionIndex]?.length > 0) {
                  fieldInfo.items = selectOptionsData[optionIndex];
                } else {
                  optionIndex = radioDomList.indexOf(blank.dom);
                  if (optionIndex !== -1 && radioOptionsData[optionIndex]?.length > 0) {
                    fieldInfo.items = radioOptionsData[optionIndex];
                  }
                }
              }
            }
          }
        }
      }

      return result;

    } catch (error) {
      return null;
    }
  }

  // ==================== API Calls (HARDCODED) ====================

  function parseServerFieldsToGroups(fields) {
    const groups = [];

    for (const fieldGroup of fields) {
      const group = {
        name: fieldGroup.name,
        dom: null,
        fields: []
      };

      if (fieldGroup.fields) {
        for (const field of fieldGroup.fields) {
          group.fields.push({
            name: field.name || field,
            field: { dom: null },
            blanks: []
          });
        }
      }

      groups.push(group);
    }

    return groups;
  }

  async function getNeedFieldsFromServer(html) { // 获取需要填写的字段（本地写死示例）
    // TODO：写死的占位；后续替换为实际接口
    // 原 API：${window.config.API_BASE_URL}getNeedField

    await sleep(500); // 模拟网络延迟

    // TODO：写死的服务端字段响应
    serverFields = [ // 字段分组列表
      {
        name: "Basic Information", // 分组：基础信息
        fields: [
          { name: "Name" }, // 姓名
          { name: "Gender" }, // 性别
          { name: "Phone" }, // 电话
          { name: "Email" }, // 邮箱
          { name: "Birth Date" } // 生日
        ]
      },
      {
        name: "Education", // 分组：教育
        fields: [
          { name: "School" }, // 学校
          { name: "Major" }, // 专业
          { name: "Degree" }, // 学历
          { name: "Start Date" }, // 开始时间
          { name: "End Date" } // 结束时间
        ]
      },
      {
        name: "Work Experience", // 分组：工作经历
        fields: [
          { name: "Company" }, // 公司
          { name: "Position" }, // 职位
          { name: "Start Date" }, // 开始时间
          { name: "End Date" }, // 结束时间
          { name: "Description" } // 描述
        ]
      }
    ];

    // TODO：写死会话 ID
    sessionId = "test-session-" + Date.now(); // 生成测试会话ID
  }

  async function getFillingValues(enableBeautify, resumeMd) {
    // TODO: HARDCODED - Replace with actual API call
    // Original API: ${window.config.API_BASE_URL}fillResumeValue

    await sleep(1000); // Simulate network delay

    // TODO: HARDCODED TEST DATA - Fill values response
    fillValues = [
      {
        name: "Basic Information",
        fields: [
          { name: "Name", value: "John Doe" },
          { name: "Gender", value: "Male" },
          { name: "Phone", value: "13800138000" },
          { name: "Email", value: "john.doe@example.com" },
          { name: "Birth Date", value: "1995-01-15" }
        ]
      },
      {
        name: "Education",
        fields: [
          { name: "School", value: "Test University" },
          { name: "Major", value: "Computer Science" },
          { name: "Degree", value: "Bachelor" },
          { name: "Start Date", value: "2013-09" },
          { name: "End Date", value: "2017-06" }
        ]
      },
      {
        name: "Work Experience",
        fields: [
          { name: "Company", value: "Tech Corp" },
          { name: "Position", value: "Software Engineer" },
          { name: "Start Date", value: "2017-07" },
          { name: "End Date", value: "2023-12" },
          { name: "Description", value: "Developed web applications using React and Node.js" }
        ]
      }
    ];
  }

  // ==================== Highlight Display ====================

  async function highlightIdentifiedFields(groups) {
    isHighlighting = false;

    try {
      await scrollToTop();

      for (const group of groups) {
        if (group.dom != null) {
          group.dom.scrollIntoView({ block: "center" });
          highlightElement(group.dom, "purple");
          await sleep(100);

          for (const field of group.fields) {
            if (field.field.dom != null) {
              field.field.dom.scrollIntoView({ block: "center" });
              highlightElement(field.field.dom, "yellow");

              for (const blank of field.blanks) {
                highlightElement(blank.dom, "green");
                await sleep(100);
              }
            }
          }
        }
      }

      await scrollToTop();

    } catch (error) {
      // Ignore error
    }

    isHighlighting = true;
  }

  function highlightElement(element, color = "") {
    const colorClasses = [
      "ark-color-yellow",
      "ark-color-green",
      "ark-color-red",
      "ark-color-blue",
      "ark-color-purple"
    ];

    for (const colorClass of colorClasses) {
      element.classList.remove(colorClass);
    }

    if (!color) return;

    const newClass = `ark-color-${color}`;
    if (colorClasses.includes(newClass)) {
      element.classList.add(newClass);
    }
  }

  function getHighlightColor(element) {
    const colorClasses = [
      "ark-color-yellow",
      "ark-color-green",
      "ark-color-red",
      "ark-color-blue",
      "ark-color-purple"
    ];

    for (const colorClass of colorClasses) {
      if (element.classList.contains(colorClass)) {
        return colorClass.replace("ark-color-", "");
      }
    }

    return null;
  }

  // ==================== Utility Functions ====================

  async function clickElement(element) {
    let targetElement = element;

    if (element.scrollIntoViewIfNeeded) {
      element.scrollIntoViewIfNeeded();
    }

    if (
      element.offsetWidth > 0 &&
      element.offsetHeight > 0 &&
      window.getComputedStyle(element).visibility !== "hidden"
    ) {
      const rect = element.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      targetElement = document.elementFromPoint(centerX, centerY) || element;
    }

    if (targetElement) {
      while (targetElement && typeof targetElement.click !== "function") {
        targetElement = targetElement.parentElement;
      }
    } else {
      targetElement = element;
    }

    const eventOptions = {
      bubbles: true,
      cancelable: true,
      view: window
    };

    targetElement.dispatchEvent(new MouseEvent("mousedown", eventOptions));
    targetElement.dispatchEvent(new FocusEvent("focus", eventOptions));
    targetElement.dispatchEvent(new MouseEvent("mouseup", eventOptions));
    targetElement.dispatchEvent(new MouseEvent("click", eventOptions));

    await sleep(10);
  }

  async function blurElement(element) {
    const event = new FocusEvent("blur", {
      bubbles: true,
      cancelable: true,
      view: window
    });
    element.dispatchEvent(event);
    await sleep(10);
  }

  function getAllVisibleElements() {
    let elements = document.body.querySelectorAll("*:not(#ark-ai):not(#ark-ai-test)");
    return Array.from(elements);
  }

  function isElementVisible(element) {
    if (!element.ownerDocument.contains(element)) {
      return false;
    }

    let currentElement = element;
    while (currentElement) {
      const style = getComputedStyle(currentElement);

      if (
        style.display === "none" ||
        style.visibility === "hidden" ||
        style.opacity === "0" ||
        currentElement.hidden
      ) {
        return false;
      }

      currentElement = currentElement.parentElement;
    }

    return true;
  }

  function isRadioGroup(element) {
    const radios = element.querySelectorAll('input[type="radio"]');

    if (radios.length < 2) return false;

    const firstName = radios[0].name;
    if (!firstName) return false;

    for (let i = 1; i < radios.length; i++) {
      if (radios[i].name !== firstName) {
        return false;
      }
    }

    return true;
  }

  function removeDuplicateRadioGroups(radioGroups) {
    const result = [];

    for (const group of radioGroups) {
      let isDuplicate = true;

      for (const other of radioGroups) {
        if (other !== group && other.contains(group)) {
          isDuplicate = false;
          break;
        }
      }

      if (isDuplicate) {
        result.push(group);
      }
    }

    return result;
  }

  function removeDuplicateParentElements(elements) {
    const result = [];

    for (const element of elements) {
      let isChild = true;

      for (const other of elements) {
        if (other !== element && element.contains(other)) {
          isChild = false;
          break;
        }
      }

      if (isChild) {
        result.push(element);
      }
    }

    return result;
  }

  function getAllSelectOptions(selectElement) {
    const options = [];
    const optionElements = selectElement.querySelectorAll("*");

    for (const element of optionElements) {
      let onlyText = true;
      for (const child of element.childNodes) {
        if (child.nodeType !== Node.TEXT_NODE) {
          onlyText = false;
          break;
        }
      }

      if (onlyText && element.childNodes.length > 0) {
        const text = element.textContent.trim();
        if (text !== "") {
          options.push(text);
        }
      }
    }

    return options;
  }

  function getAllRadioOptions(radioElement) {
    const options = [];
    const elements = radioElement.querySelectorAll("*");

    for (const element of elements) {
      if (!isElementVisible(element)) continue;

      let onlyText = true;
      for (const child of element.childNodes) {
        if (child.nodeType !== Node.TEXT_NODE) {
          onlyText = false;
          break;
        }
      }

      if (onlyText && element.childNodes.length > 0) {
        const text = element.textContent.trim();
        if (text !== "") {
          options.push(text);
        }
      }
    }

    return options;
  }

  function getAllVisibleOptions(container) {
    return getAllRadioOptions(container);
  }

  // ==================== DOM Monitoring ====================

  function startMonitoringDomChanges() {
    newlyAddedElements = [];
    cancelButtons = [];
    confirmButtons = [];
    deleteConfirmButtons = [];

    const body = document.body;
    const processedElements = new WeakSet();

    mutationObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "childList") {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE && !processedElements.has(node)) {
              processedElements.add(node);
              newlyAddedElements.push(node);

              for (const child of node.querySelectorAll("*")) {
                processedElements.add(child);
              }
            }
          }
        }
      }
    });

    mutationObserver.observe(body, {
      childList: true,
      subtree: true
    });
  }

  function stopMonitoringDomChanges() {
    if (mutationObserver) {
      mutationObserver.disconnect();
      mutationObserver = null;
    }

    newlyAddedElements = removeDuplicateRadioGroups(newlyAddedElements);
  }

  // ==================== Button Finding ====================

  function findCancelButton(container) {
    const elements = container.querySelectorAll("*");

    for (const element of elements) {
      let isCloseButton = false;
      const attributes = element.attributes;

      for (const attr of attributes) {
        const value = attr.value;

        if (/(?:^|\W+)(close|shut|exit|quit)(?:[^a-zA-Z]+|$)/i.test(value)) {
          isCloseButton = true;
          break;
        }
      }

      if (isCloseButton && isElementVisible(element)) {
        cancelButtons.push(element);
      }
    }
  }

  function findDeleteConfirmButton(container) {
    const elements = container.querySelectorAll("*");

    for (const element of elements) {
      const html = element.innerHTML.replace(/\s+/g, "");
      if (/^(确定)?删除$/.test(html) && isElementVisible(element)) {
        deleteConfirmButtons.push(element);
        break;
      }
    }
  }

  async function closePopupWindow(inputElement) {
    if (cancelButtons.length > 0) {
      for (const button of cancelButtons) {
        if (isElementVisible(button)) {
          await clickElement(button);
        }
      }
    } else {
      await clickElement(inputElement);
    }

    await sleep(10);
    await blurElement(inputElement);

    let allClosed = true;
    for (const element of newlyAddedElements) {
      if (isElementVisible(element)) {
        allClosed = false;
        break;
      }
    }

    if (!allClosed) {
      const event = new Event("mousedown", { bubbles: true });
      document.body.dispatchEvent(event);
    }
  }

  async function clickDeleteConfirmButton() {
    if (deleteConfirmButtons.length > 0) {
      for (const button of deleteConfirmButtons) {
        if (isElementVisible(button)) {
          await clickElement(button);
        }
      }
    }
  }

  // ==================== Filling Execution ====================

  function restructureFillingValues(values) {
    const result = [];

    for (const group of values) {
      const newGroup = {
        name: group.name,
        fields: []
      };

      for (const field of group.fields) {
        if (field.name.includes(" - ")) {
          const [fieldName, blankName] = field.name.split(" - ");

          let targetField = newGroup.fields.find(f => f.name === fieldName);
          if (!targetField) {
            targetField = {
              name: fieldName,
              blanks: []
            };
            newGroup.fields.push(targetField);
          }

          targetField.blanks.push({
            name: blankName,
            value: field.value
          });
        } else {
          newGroup.fields.push({
            name: field.name,
            blanks: [{
              name: "",
              value: field.value
            }]
          });
        }
      }

      result.push(newGroup);
    }

    return result;
  }

  function removePhonePlusPrefix(values) {
    for (const group of values) {
      for (const field of group.fields) {
        if (/(Phone)/i.test(field.name)) {
          if (field.blanks) {
            for (const blank of field.blanks) {
              if (
                blank.value &&
                typeof blank.value === "string" &&
                blank.value.startsWith("+86")
              ) {
                blank.value = blank.value.substring(3);
              }
            }
          }
        }
      }
    }

    return values;
  }

  async function performFilling(localGroups, fillValues) {
    // Execute filling logic
    for (const fillGroup of fillValues) {
      const localGroup = localGroups.find(g => g.name === fillGroup.name);
      if (!localGroup) continue;

      for (const fillField of fillGroup.fields) {
        const localField = localGroup.fields.find(f => f.name === fillField.name);
        if (!localField || !localField.blanks || localField.blanks.length === 0) continue;

        for (let i = 0; i < localField.blanks.length; i++) {
          const blank = localField.blanks[i];
          const fillBlank = fillField.blanks[i];

          if (!blank.dom || !fillBlank || !fillBlank.value) continue;

          try {
            await clickElement(blank.dom);
            await sleep(100);

            // Set value based on element type
            if (blank.dom.tagName === "INPUT" || blank.dom.tagName === "TEXTAREA") {
              blank.dom.value = fillBlank.value;
              blank.dom.dispatchEvent(new Event("input", { bubbles: true }));
              blank.dom.dispatchEvent(new Event("change", { bubbles: true }));
            } else if (blank.dom.tagName === "SELECT") {
              blank.dom.value = fillBlank.value;
              blank.dom.dispatchEvent(new Event("change", { bubbles: true }));
            }

            await blurElement(blank.dom);
            await sleep(100);
          } catch (e) {
            // Continue with next field
          }
        }
      }
    }
  }

  // ==================== Error Handling ====================

  function handleError(error, startTime, company, resumeId, callback) {
    let errorMessage = "Fill error! Something went wrong...";

    window.setStateText(errorMessage);
    callback({ status: "error", error: error });
  }

  // ==================== Utility Functions ====================

  async function scrollToTop() {
    try {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      await sleep(50);
    } catch (error) {
      // Ignore
    }
  }

  function sleep(milliseconds = 1000) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, milliseconds);
    });
  }

  // ==================== Exposed Interface ====================

  function setStateText(text) {
    const el = resumeWindow.querySelector("#state-text");
    if (el) {
      el.textContent = text;
    }
  }

  function setStartButtonState(state) {
    startState = state;
    const btn = resumeWindow.querySelector("#start-button");
    if (!btn) return;

    if (state === "running") {
      btn.textContent = "Running...";
      btn.style.background = "#ff9800";
    } else if (state === "success") {
      btn.textContent = "Complete!";
      btn.style.background = "#4CAF50";
    } else if (state === "error") {
      btn.textContent = "Error";
      btn.style.background = "#f44336";
    } else {
      btn.textContent = "Start Fill";
      btn.style.background = "#4CAF50";
    }
  }

  window.setStateText = setStateText;
  window.isRunning = function () {
    return startState === "running";
  };
  window.changeStartButtonState = setStartButtonState;
  window.closeHighlight = async function () {
    await sleep(1000);
  };

})();
