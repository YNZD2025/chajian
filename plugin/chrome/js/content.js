// 一念 - 自动填表核心引擎

"use strict";

(async () => {
  // ==================== 全局变量定义 ====================

  // 配置和API相关（使用命名空间避免污染全局对象）
  window.YinianAI = window.YinianAI || {};
  window.YinianAI.config = null;
  window.YinianAI.runFillResume = null;

  // 向后兼容：保持旧的引用方式
  Object.defineProperty(window, 'config', {
    get: () => window.YinianAI.config,
    set: (value) => { window.YinianAI.config = value; }
  });
  Object.defineProperty(window, 'runFillResume', {
    get: () => window.YinianAI.runFillResume,
    set: (value) => { window.YinianAI.runFillResume = value; }
  });

  // 服务器返回的数据
  let beautifiedResume = null;        // 美化后的简历
  let sessionId = null;               // 会话ID
  let serverGroups = [];              // 服务器识别的字段分组
  let serverFields = [];              // 服务器返回的字段列表
  let localGroups = [];               // 本地匹配的字段分组
  let fillValues = [];                // 要填写的值
  let restructuredValues = [];        // 重构后的值

  // 本地扫描的DOM元素
  let inputDomList = [];              // 输入框列表
  let inputOptionsData = [];          // 输入框的选项数据
  let selectDomList = [];             // 下拉框列表
  let selectOptionsData = [];         // 下拉框的选项数据
  let radioDomList = [];              // 单选框列表
  let radioOptionsData = [];          // 单选框的选项数据

  // 状态标志
  let deleteButtons = [];             // 删除按钮列表
  let isScanning = false;             // 是否正在扫描
  let isHighlighting = false;         // 是否正在高亮显示
  let mutationObserver = null;        // DOM变化观察器
  let scanningComplete = false;       // 是否扫描完成

  // DOM监听相关
  let newlyAddedElements = [];        // 新增的DOM元素
  let elementStylesMap = new WeakMap(); // 元素样式映射
  let cancelButtons = [];             // 取消按钮
  let confirmButtons = [];            // 确认按钮
  let deleteConfirmButtons = [];      // 删除确认按钮
  let lastPopupTitle = "";            // 最后一次弹窗的标题（用于字段识别）

  // 学习模式相关
  let learningInterval = null;        // 学习定时器
  let lastHtmlSnapshot = "";          // 上次的HTML快照
  let currentUrl = "";                // 当前URL

  // 错误处理
  let hasNetworkError = false;        // 是否有网络错误
  let errorFunctionName = "";         // 错误函数名

  // ==================== 重置函数 ====================

  /**
   * 重置所有全局变量
   */
  function resetAllVariables() {
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
    hasNetworkError = false;
    errorFunctionName = "";
    deleteButtons = [];
    isScanning = false;
    isHighlighting = false;

    // 正确清理 MutationObserver 避免内存泄漏
    if (mutationObserver) {
      mutationObserver.disconnect();
      mutationObserver = null;
    }

    newlyAddedElements = [];
    elementStylesMap = new WeakMap();
    cancelButtons = [];
    confirmButtons = [];
    deleteConfirmButtons = [];
    lastPopupTitle = "";

    // 停止学习模式
    // if (learningInterval) {
    //   // 停止学习定时器
    //   clearInterval(learningInterval);
    //   learningInterval = null;
    //   lastHtmlSnapshot = "";

    //   // 通知后台停止学习
    //   const html = generateSimplifiedHTML();
    //   chrome.runtime.sendMessage({
    //     type: "stopLearnField",
    //     url: window.location.href,
    //     html: html
    //   }, (response) => {});
    // }
  }

  // ==================== DOM监听相关 ====================

  /**
   * 获取动态弹出的元素中的文本元素
   */
  function getTextElementsFromPopup() {
    const textElements = [];

    for (const element of newlyAddedElements) {
      if (!isElementVisible(element)) continue;

      const text = element.textContent.trim();
      if (/[\u4e00-\u9fa5]/.test(text)) {  // 包含中文
        textElements.push(element);
      }
    }

    // 重置删除按钮列表
    deleteButtons = [];
    for (const element of textElements) {
      findDeleteButtons(element);
    }

    return textElements;
  }

  // ==================== 样式注入 ====================

  /**
   * 注入高亮样式到页面
   */
  function injectHighlightStyles() {
    // 检查是否已经注入
    if (document.getElementById('ark-highlight-styles')) {
      return;
    }

    const style = document.createElement('style');
    style.id = 'ark-highlight-styles';
    style.textContent = `
      .ark-color-yellow { 
        background-color: rgba(255, 255, 0, 0.3) !important; 
        transition: background-color 0.3s ease !important;
      }
      .ark-color-green { 
        background-color: rgba(0, 255, 0, 0.3) !important; 
        transition: background-color 0.3s ease !important;
      }
      .ark-color-red { 
        background-color: rgba(255, 0, 0, 0.3) !important; 
        transition: background-color 0.3s ease !important;
      }
      .ark-color-blue { 
        background-color: rgba(0, 0, 255, 0.3) !important; 
        transition: background-color 0.3s ease !important;
      }
      .ark-color-purple { 
        background-color: rgba(128, 0, 128, 0.3) !important; 
        transition: background-color 0.3s ease !important;
      }
    `;
    document.head.appendChild(style);
  }

  // ==================== 主执行函数 ====================

  /**
   * 主函数：执行简历自动填写
   * @param {string} company - 公司名称
   * @param {string} position - 职位名称
   * @param {string} resumeMd - 简历Markdown内容
   * @param {string} resumeId - 简历ID
   * @param {boolean} enableBeautify - 是否启用专岗美化
   * @param {function} callback - 回调函数
   */
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
      console.log("company===>", company);
      console.log("position===>", position);
      console.log("resumeMd===>", resumeMd);
      console.log("resumeId===>", resumeId);
      console.log("enableBeautify===>", enableBeautify);
      // 步骤0: 初始化
      window.setStateText("一念！启动！");
      resetAllVariables();
      
      // 注入高亮样式
      injectHighlightStyles();

      // 步骤1: 点击所有"添加"按钮，展开动态表单
      await clickAllAddButtons();

      // 步骤2: 获取服务器需要填写的字段
      console.log("步骤2: 获取服务器需要填写的字段");
      await getNeedFieldsFromServer(generateSimplifiedHTML(),company,position);

      
      // 步骤3: 如果启用美化，生成专岗简历
      // if (enableBeautify) {
      //   await beautifyResumeForPosition(company, position, resumeMd);
      // }

      // 步骤4: 扫描本地表单元素
      console.log("步骤4: 扫描本地表单元素");
      await scanLocalFormElements();

      // 步骤5: 等待扫描和服务器响应完成
      console.log("步骤5: 等待扫描和服务器响应完成");
      window.setStateText("正在扫描网站...", "min");

      // 使用超时机制等待扫描完成（最多等待30秒）
      await waitWithTimeout(
        () => {
          checkNetworkError();
          return scanningComplete && window.isRunning();
        },
        {
          timeout: 30000,
          interval: 500,
          errorMessage: '扫描网站超时，请刷新页面重试'
        }
      );

      window.setStateText("尝试理解网站，请稍候...", "min");

      // 使用超时机制等待服务器响应（最多等待30秒）
      await waitWithTimeout(
        () => {
          checkNetworkError();
          return serverFields.length > 0 && window.isRunning();
        },
        {
          timeout: 30000,
          interval: 500,
          errorMessage: '服务器响应超时，请刷新页面重试'
        }
      );

      // 步骤6: 匹配字段和输入框
      console.log("步骤6: 匹配字段和输入框");
      window.setStateText("正在标记简历字段...", "min");
      serverGroups = parseServerFieldsToGroups(serverFields);
      console.log("serverGroups===>", serverGroups);

      if (serverGroups.length === 0) {
        throw new Error("服务器返回错误");
      }

      // 查找字段对应的DOM元素
      console.log("步骤6.1: 查找字段对应的DOM元素");
      findFieldDomElements(serverGroups);

      // 查找每个字段下的输入框
      console.log("步骤6.2: 查找每个字段下的输入框");
      findBlankInputsForFields(serverGroups);

      // 生成用于AI理解的字段结构
      console.log("步骤6.3: 生成用于AI理解的字段结构");
      localGroups = generateFieldStructureForAI(serverGroups, serverFields);

      // 步骤7: 高亮显示识别的字段
      console.log("步骤7: 高亮显示识别的字段");
      await highlightIdentifiedFields(serverGroups);

      // 步骤8: 如果启用美化简历，等待生成完成
      // if (enableBeautify) {
      //   await waitForBeautifiedResume(company, position, resumeMd, resumeId);
      // }

      // 步骤9: 获取填写值
      console.log("步骤9: 获取填写值");
      await getFillingValues(enableBeautify, resumeMd);

      
      // 步骤10: 执行填写
      console.log("步骤10: 执行填写");
      window.setStateText("尝试为你填写简历...", "min");
      await sleep(500);

      // 重构填写值
      console.log("步骤10.1: 重构填写值");
      restructuredValues = restructureFillingValues(fillValues);

      // 处理电话号码的+86前缀
      console.log("步骤10.2: 处理电话号码的+86前缀");
      restructuredValues = removePhonePlusPrefix(restructuredValues);

      // 执行实际的填写操作
      console.log("步骤10.3: 执行实际的填写操作");
      await performFilling(serverGroups, restructuredValues);

      // 步骤11: 完成
      console.log("步骤11: 完成");
      window.setStateText("填写完成！剩下的空就交给你咯~", "show");
      callback({ status: "success" });

      // 更新统计数据
      //console.log("步骤12: 更新统计数据");
      //await updateStatistics();

      // 启动学习模式
      //console.log("步骤13: 启动学习模式");
      //await startLearningMode();

      // 添加投递历史
      //console.log("步骤14: 添加投递历史");
      //await addDeliveryHistory(company, position);

      // 关闭高亮
      console.log("步骤15: 关闭高亮");
      window.closeHighlight();
      

    } catch (error) {
      handleError(error, startTime, company, resumeId, callback);
    }

    return true;
  };

  // ==================== 子步骤函数 ====================

  /**
   * 步骤1: 点击所有"添加"按钮
   */
  async function clickAllAddButtons() {
    // setup1: 获取所有可见元素
    const allElements = getAllVisibleElements();
    // setup2: 过滤出所有"添加"按钮
    const addButtons = [];

    // 查找所有"添加"按钮
    for (const element of allElements) {
      const text = element.textContent.trim();
      if (/^[\+ ]*[添增]加/.test(text) && !/职位/.test(text)) {
        addButtons.push(element);
      }
    }

    // 去重：只保留最外层的按钮
    const uniqueButtons = removeDuplicateParentElements(addButtons);

    // 点击每个按钮
    for (const button of uniqueButtons) {
      // 确保按钮在可见区域
      button.scrollIntoView({ block: "center" });
      await sleep(100);

      // 监控DOM变化
      startMonitoringDomChanges();
      await clickElement(button);
      await sleep(200);
      // 停止监控DOM变化
      stopMonitoringDomChanges();

      // 检查是否弹出了新的表单
      const popupElements = getTextElementsFromPopup();
      if (popupElements.length === 0) continue;

      // 检查弹出的是否是重复的表单区域
      if (isRepeatedFormSection(popupElements)) {
        // 如果是重复表单，点击删除按钮关闭
        await clickDeleteButtons(popupElements);
      }
    }

    await sleep(100);
  }

  /**
   * 查找删除按钮
   */
  function findDeleteButtons(container) {
    const elements = container.querySelectorAll("*");

    // 方法1: 通过innerText查找
    for (const element of elements) {
      let isDeleteButton = false;

      if (!isDeleteButton && element.innerText) {
        const text = element.innerText.trim();
        if (/^(删\s*除|移\s*除).{0,4}$/.test(text)) {
          isDeleteButton = true;
        }
      }

      if (isDeleteButton) {
        deleteButtons.push(element);
      }
    }

    // 方法2: 通过属性查找
    for (const element of elements) {
      if (deleteButtons.includes(element)) continue;

      let isDeleteButton = false;
      const attributes = element.attributes;

      for (const attr of attributes) {
        const value = attr.value;

        // 检查小写形式
        if (/(?:^|\W+)(shanchu|(del|delete|remove|trash)(|btn|button)|删\s*除|移\s*除)(?:[^a-zA-Z]+|$)/i.test(value)) {
          isDeleteButton = true;
          break;
        }

        // 检查驼峰命名
        if (/(?:^|\W+)([Ss]hanchu|[Dd]elete|[Rr]emove|[Tt]rash)(?:[A-Z0-9]|$)/.test(value)) {
          isDeleteButton = true;
          break;
        }
      }

      if (isDeleteButton) {
        deleteButtons.push(element);
      }
    }
  }

  /**
   * 判断是否是重复的表单区域
   */
  function isRepeatedFormSection(popupElements) {
    // 收集所有元素及其子元素
    let allElements = [];
    // 收集所有元素及其子元素
    for (const element of popupElements) {
      allElements.push(element);
      const children = Array.from(element.querySelectorAll("*"));
      allElements = allElements.concat(children);
    }
    // 反转数组，从后往前匹配
    allElements = allElements.reverse();

    // 从后往前匹配，检查是否有重复结构
    const firstElement = popupElements[0];
    // 收集所有页面可见元素并反转
    const pageElements = getAllVisibleElements().reverse();

    let matchIndex = 0;
    let foundFirst = false;

    // 遍历页面元素，寻找匹配的结构
    for (let i = 0; i < pageElements.length; i++) {
      const pageElem = pageElements[i];

      if (pageElem === firstElement) {
        foundFirst = true;
        continue;
      }

      if (!foundFirst) continue;

      if (matchIndex >= allElements.length) return true;

      const targetElem = allElements[matchIndex];

      // 检查节点类型、标签名、className是否相同
      if (
        pageElem.nodeType === targetElem.nodeType &&
        pageElem.tagName === targetElem.tagName &&
        pageElem.className === targetElem.className
      ) {
        // 进一步检查属性是否相同
        const pageAttrs = Array.from(pageElem.attributes)
          .filter(attr => attr.name !== "style")
          .map(attr => attr.name)
          .sort();
        const targetAttrs = Array.from(targetElem.attributes)
          .filter(attr => attr.name !== "style")
          .map(attr => attr.name)
          .sort();

        if (JSON.stringify(pageAttrs) === JSON.stringify(targetAttrs)) {
          matchIndex++;
          continue;
        }
      }

      // 检查className的相似性
      if (
        pageElem.nodeType === targetElem.nodeType &&
        pageElem.tagName === targetElem.tagName &&
        typeof pageElem.className === "string" &&
        typeof targetElem.className === "string"
      ) {
        const isSimilarClass = areClassNamesSimilar(pageElem.className, targetElem.className);
        const sameAttributes = JSON.stringify(
          Array.from(pageElem.attributes).map(a => a.name).sort()
        ) === JSON.stringify(
          Array.from(targetElem.attributes).map(a => a.name).sort()
        );

        if (isSimilarClass && sameAttributes && pageElem.innerText !== "" && targetElem.innerText !== "") {
          if (pageElem.innerText === targetElem.innerText) {
            matchIndex++;
            continue;
          } else {
            // 检查HTML相似度
            const maxLen = Math.max(pageElem.innerHTML.length, targetElem.innerHTML.length);
            const minLen = Math.min(pageElem.innerHTML.length, targetElem.innerHTML.length);

            if (maxLen > 100 && minLen / maxLen > 0.8) {
              if (calculateHTMLSimilarity(pageElem, targetElem)) {
                matchIndex++;
                continue;
              }
            }
          }
        }
      }

      // 如果元素有文本且不是按钮，则中断匹配
      const buttonPattern = /^[\+\- ]*(添加|增加|删除|移除|收起|展开)/;
      if (pageElem.innerText && !buttonPattern.test(pageElem.innerText) && !isButtonIcon(pageElem)) {
        if (targetElem.innerText && !buttonPattern.test(targetElem.innerText) && !isButtonIcon(targetElem)) {
          break;
        }
        matchIndex++;
        i--;
      }
    }

    return false;
  }

  /**
   * 检查两个className是否相似（仅动画/状态类名不同）
   */
  function areClassNamesSimilar(class1, class2) {
    if (class1.length === class2.length) {
      // 检查非字母数字字符的位置是否相同
      const nonAlnumPattern = /[^a-zA-Z0-9]/g;
      let matches1 = [...class1.matchAll(nonAlnumPattern)];
      let matches2 = [...class2.matchAll(nonAlnumPattern)];

      const sameCount = matches1.length === matches2.length;
      const samePositions = matches1.every((match, index) => {
        const match2 = matches2[index];
        return match.index === match2.index && match[0] === match2[0];
      });

      return sameCount && samePositions;
    }

    // 找出不同的类名
    const [shorter, longer] = class1.length < class2.length ? [class1, class2] : [class2, class1];

    const shorterClasses = shorter.trim().split(/\s+/).filter(c => c);
    const longerClasses = longer.trim().split(/\s+/).filter(c => c);

    // 检查是否只是显示/隐藏相关的类名不同
    const hideShowPattern = /(?:^|\W+)(hide|show|hidden|visible|display|opacity|fade|toggle)(|d|ing|ed|able)(?:[^a-zA-Z]+|$)/i;
    const camelCasePattern = /(?:^|\W+)([Hh]ide|[Ss]how|[Hh]idden|[Vv]isible|[Dd]isplay|[Oo]pacity|[Ff]ade|[Tt]oggle)(?:[A-Z0-9]|$)/;

    const differentClasses = longerClasses.filter(c => !shorterClasses.includes(c));

    // 如果不同的类名都是显示/隐藏相关的，则认为相似
    if (!differentClasses.every(c => hideShowPattern.test(c) || camelCasePattern.test(c))) {
      return false;
    }

    const sameClasses = longerClasses.filter(c => !differentClasses.includes(c));
    if (sameClasses.length !== shorterClasses.length) return false;

    return sameClasses.every(c => shorterClasses.includes(c));
  }

  /**
   * 计算HTML相似度
   */
  function calculateHTMLSimilarity(elem1, elem2) {
    function similarity(html1, html2) {
      // 移除空格
      html1 = html1.replace(/\s+/g, "");
      html2 = html2.replace(/\s+/g, "");

      const maxLength = Math.max(html1.length, html2.length);
      const minLength = Math.min(html1.length, html2.length);

      if (minLength === 0) return 0;
      if (html1 === html2) return 100;

      // 分块比较（避免超长字符串比较）
      const chunkSize = 1000;
      const chunks1 = html1.match(new RegExp(`.{1,${chunkSize}}`, "g")) || [];
      const chunks2 = html2.match(new RegExp(`.{1,${chunkSize}}`, "g")) || [];

      let sameChars = 0;
      const maxChunks = Math.max(chunks1.length, chunks2.length);

      for (let i = 0; i < maxChunks; i++) {
        const chunk1 = chunks1[i] || "";
        const chunk2 = chunks2[i] || "";
        let matches = 0;
        const minLen = Math.min(chunk1.length, chunk2.length);

        for (let j = 0; j < minLen; j++) {
          if (chunk1[j] === chunk2[j]) matches++;
        }

        sameChars += matches;
      }

      return (2 * sameChars / (html1.length + html2.length)) * 100;
    }

    return similarity(elem1.innerHTML, elem2.innerHTML) > 80;
  }

  /**
   * 判断是否是按钮图标
   */
  function isButtonIcon(element) {
    if (!element || !element.className || typeof element.className !== "string") {
      return false;
    }

    const className = element.className;

    // 检查是否包含删除/添加等操作相关的类名
    const hasActionClass =
      /(?:^|\W+)(shanchu|delete|remove|trash|add|plus|minus|edit|modify|update|save|cancel|confirm)(|btn|button)(?:[^a-zA-Z]+|$)/i.test(className) ||
      /(?:^|\W+)([Ss]hanchu|[Dd]elete|[Rr]emove|[Tt]rash|[Aa]dd|[Pp]lus|[Mm]inus|[Ee]dit|[Mm]odify|[Uu]pdate|[Ss]ave|[Cc]ancel|[Cc]onfirm)(?:[A-Z0-9]|$)/.test(className);

    // 检查是否包含图标类名
    const hasIconClass =
      /(?:^|\W+)(ico|icon|btn|button|fa|fas|far|iconfont|symbol)(?:[^a-zA-Z]+|$)/i.test(className) ||
      /(?:^|\W+)([Ii]co|[Ii]con|[Bb]tn|[Bb]utton|[Ff]a|[Ff]as|[Ff]ar|[Ii]confont|[Ss]ymbol)(?:[A-Z0-9]|$)/.test(className);

    return hasActionClass && hasIconClass;
  }

  /**
   * 点击删除按钮
   */
  async function clickDeleteButtons(popupElements) {
    const uniqueDeleteButtons = removeDuplicateParentElements(deleteButtons);
    uniqueDeleteButtons.reverse();

    for (const button of uniqueDeleteButtons) {
      startMonitoringDomChanges();
      await clickElement(button);
      await sleep(100);
      stopMonitoringDomChanges();

      // 点击删除确认按钮
      for (const confirmBtn of newlyAddedElements) {
        findDeleteConfirmButton(confirmBtn);
        await clickDeleteConfirmButton();
      }

      await sleep(100);

      // 检查弹窗是否已关闭
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

  // ==================== HTML简化函数 ====================

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

  /**
   * 克隆DOM并记录样式
   */
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

    return { clone, stylesMap };
  }

  /**
   * 根据样式Map判断元素是否可见
   */
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

  // ==================== 表单扫描函数 ====================

  

  /**
   * 步骤4: 扫描本地表单元素
   */
  async function scanLocalFormElements() {
    scanningComplete = false;

    // 滚动到页面顶部
    await scrollToTop();
    await sleep(10);

    // 扫描所有表单元素
    const allElements = getAllVisibleElements();
    const formElements = scanFormElements(allElements);

    inputDomList = formElements.inputDoms;
    selectDomList = formElements.selectDoms;
    radioDomList = formElements.radioDoms;

    // 获取边框特征
    const borderPatterns = extractBorderPatterns(inputDomList);

    // 通过边框特征添加更多字段
    inputDomList = addFieldsByBorderPattern(
      inputDomList,
      selectDomList,
      borderPatterns,
      getAllVisibleElements()
    );

    // 去除重叠的字段
    inputDomList = deduplicateOverlappingFields(inputDomList);

    // 收集每个输入框的选项数据
    inputOptionsData = [];

    for (const input of inputDomList) {
      // 获取原始颜色
      const originalColor = getHighlightColor(input);
      // 高亮输入框
      highlightElement(input, "yellow");
      // 确保输入框在可见区域
      input.scrollIntoViewIfNeeded();

      await sleep(20);

      // 点击输入框，触发下拉选项
      startMonitoringDomChanges();
      await clickElement(input);
      await sleep(10);

      // 检查是否有日期/时间选择器
      if (newlyAddedElements.length > 0) {
        await sleep(50);
      }

      stopMonitoringDomChanges();

      // 获取弹出的选项
      const options = getOptionsFromPopup();

      // 关闭弹窗
      await closePopupWindow(input);

      highlightElement(input, originalColor);
      await blurElement(input);

      if (options.length) {
        await sleep(20);
      }

      inputOptionsData.push(options);

      // 检查是否被用户暂停
      while (!window.isRunning()) {
        await sleep(50);
      }
    }

    // 处理"请选择"占位符
    const processedInputOptions = [];
    for (const options of inputOptionsData) {
      if (options.length > 0 && /^[-\s]*请选择/.test(options[0])) {
        processedInputOptions.push(options.slice(1));
      } else {
        processedInputOptions.push(options);
      }
    }
    inputOptionsData = processedInputOptions;

    // 收集select的选项
    selectOptionsData = [];
    for (const select of selectDomList) {
      // selectDomList 现在只包含标准 SELECT 元素
      const options = getAllSelectOptions(select);

      // 处理"请选择"占位符
      if (options.length >= 2) {
        if (/^[-\s]*请选择/.test(options[0])) {
          selectOptionsData.push(options.slice(1));
        } else {
          selectOptionsData.push(options);
        }
      } else {
        selectOptionsData.push([]);
      }

      // 检查是否被用户暂停
      while (!window.isRunning()) {
        await sleep(50);
      }
    }

    // 收集radio的选项
    radioOptionsData = [];
    for (const radio of radioDomList) {
      const options = getAllRadioOptions(radio);
      if (options.length >= 2) {
        radioOptionsData.push(options);
      } else {
        radioOptionsData.push([]);
      }
    }

    scanningComplete = true;
  }

  /**
   * 扫描表单元素
   */
  function scanFormElements(elements) {
    let inputDoms = [];
    let selectDoms = [];
    let radioDoms = [];

    for (const element of elements) {
      let isInput = false;
      let isSelect = false;
      let isRadio = false;

      // 跳过页面顶部150px内的元素（通常是导航栏）
      if (element.getBoundingClientRect().bottom <= 150) {
        continue;
      }

      const placeholder = element.getAttribute("placeholder");
      const title = element.getAttribute("title");

      // ========== 判断是否是下拉框 ==========
      // 只识别标准的 SELECT 元素
      // INPUT 伪装的下拉框会在填充阶段通过 detectElementType() 动态识别
      if (element.tagName === "SELECT") {
        isSelect = true;
      }
      // ========== 判断是否是输入框 ==========
      else if (
        (placeholder &&
         element.tagName !== "TEXTAREA" &&
         !/^\s*(搜索|查找)/.test(placeholder) &&
         !/^\s*(搜索|查找)/.test(title)) ||
        element.classList.contains("ant-select")
      ) {
        isInput = true;
      } else if (
        element.tagName === "INPUT" &&
        !/^\s*(搜索|查找)/.test(placeholder) &&
        !/^\s*(搜索|查找)/.test(title) &&
        ["text", "search"].includes(element.type)
      ) {
        isInput = true;
      }
      // ========== 判断是否是单选框 ==========
      else if (isRadioGroup(element)) {
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
        } else {
          // 如果元素不可见，找到可见的父元素
          let parent = element.parentElement;
          while (parent && !isElementVisible(parent)) {
            parent = parent.parentElement;
          }

          if (parent) {
            if (isInput) {
              inputDoms.push(parent);
            } else if (!isSelect) {
              radioDoms.push(parent);
            }
          }
        }
      }
    }

    // 去重
    inputDoms = removeDuplicateParentElements(inputDoms);
    selectDoms = removeDuplicateParentElements(selectDoms);
    radioDoms = removeDuplicateRadioGroups(radioDoms);

    return { inputDoms, selectDoms, radioDoms };
  }

  /**
   * 提取边框特征
   */
  function extractBorderPatterns(inputDoms) {
    let patterns = [];

    for (const input of inputDoms) {
      let element = input;

      // 向上查找高度<40的元素
      while (element && element.offsetHeight < 40 && element !== document.body) {
        const borderBottom = getComputedStyle(element).borderBottom;

        // 检查是否有有效的底部边框
        if (
          borderBottom &&
          !borderBottom.includes("none") &&
          !borderBottom.includes("hidden") &&
          !/\b0(\s|$|\w)/.test(borderBottom) &&
          !borderBottom.includes("transparent")
        ) {
          // 记录边框特征（允许±2px的高度差异）
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

  /**
   * 通过边框特征添加字段
   */
  function addFieldsByBorderPattern(inputDoms, selectDoms, borderPatterns, allElements) {
    let result = [...inputDoms];
    let lastField = null;

    for (const element of allElements) {
      // 跳过已识别的元素
      if (result.includes(element)) {
        lastField = element;
        continue;
      }

      if (selectDoms.includes(element)) {
        lastField = element;
        continue;
      }

      // 跳过在lastField内部的元素
      if (lastField && lastField.contains(element)) {
        continue;
      }

      // 跳过容器元素
      if (element.children.length > 0) {
        continue;
      }

      // 跳过顶部100px内的元素
      if (element.getBoundingClientRect().bottom <= 100) {
        continue;
      }

      const html = element.innerHTML.trim();

      // 必须有内容且包含中文
      if (!html || !/[\u4e00-\u9fa5]/.test(html)) {
        continue;
      }

      const textOnly = html.replace(/\s/g, "");

      // 排除按钮文本
      if (/^(确定|取消|返回|关闭|提交|报名|投递|预览|保存|暂存|[上下]一步|编辑|\+?[添增]加|删除|移除|收起|展开|点击|(简历)?上传|立即)\s*/.test(textOnly)) {
        continue;
      }

      // 向上查找匹配边框特征的元素
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

    // 去重
    result = removeDuplicateParentElements(result);

    // 按DOM顺序排序
    result.sort((a, b) => {
      return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
    });

    return result;
  }

  /**
   * 去除重叠的字段
   */
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

      // 检查是否重叠
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

  /**
   * 根据输入框特征推断字段类型
   */
  function inferFieldType(element) {
    // 获取元素及其子元素的所有属性
    const allElements = [element, ...element.querySelectorAll("*")];

    // 收集所有属性值
    let allAttributes = "";
    for (const elem of allElements) {
      // name 属性
      const name = elem.getAttribute("name") || "";
      allAttributes += " " + name.toLowerCase();

      // id 属性
      const id = elem.getAttribute("id") || "";
      allAttributes += " " + id.toLowerCase();

      // class 属性
      const className = elem.getAttribute("class") || "";
      allAttributes += " " + className.toLowerCase();

      // aria-label 属性
      const ariaLabel = elem.getAttribute("aria-label") || "";
      if (ariaLabel && /[\u4e00-\u9fa5]/.test(ariaLabel)) {
        return ariaLabel.trim();
      }

      // title 属性
      const title = elem.getAttribute("title") || "";
      if (title && /[\u4e00-\u9fa5]/.test(title) && title.length < 20) {
        return title.trim();
      }

      // data-* 属性
      for (const attr of elem.attributes) {
        if (attr.name.startsWith("data-")) {
          const value = attr.value || "";
          if (/[\u4e00-\u9fa5]/.test(value) && value.length < 20) {
            return value.trim();
          }
          allAttributes += " " + value.toLowerCase();
        }
      }
    }

    // 根据属性值推断字段类型
    if (/gender|性别|sex/.test(allAttributes)) return "性别";
    if (/education|学历|edu/.test(allAttributes)) return "学历";
    if (/degree|学位/.test(allAttributes)) return "学位";
    if (/birth|birthday|生日|出生/.test(allAttributes)) return "出生日期";
    if (/nation|nationality|国籍/.test(allAttributes)) return "国籍";
    if (/ethnic|ethnicity|民族/.test(allAttributes)) return "民族";
    if (/political|politics|政治面貌/.test(allAttributes)) return "政治面貌";
    if (/marital|marriage|婚姻/.test(allAttributes)) return "婚姻状况";
    if (/职称|title|professional/.test(allAttributes)) return "职称";
    if (/skill|技能/.test(allAttributes)) return "技能";
    if (/language|语言/.test(allAttributes)) return "语言能力";
    if (/certificate|证书/.test(allAttributes)) return "证书";
    if (/hobby|爱好|兴趣/.test(allAttributes)) return "兴趣爱好";
    if (/期望|expect|expected/.test(allAttributes)) {
      if (/职位|position|job/.test(allAttributes)) return "期望职位";
      if (/薪资|salary/.test(allAttributes)) return "期望薪资";
      if (/地点|location|city/.test(allAttributes)) return "期望工作地点";
    }

    return "";
  }

  /**
   * 提取字段标签文本（优化版）
   */
  function extractFieldLabel(element) {
    function cleanLabel(text) {
      let cleaned = text.trim();
      // 移除常见的提示词
      cleaned = cleaned.replace(/^请?(选择|输入|填写|填入)\s*/g, "");
      cleaned = cleaned.replace(/^\s*(请选择|请输入|请填写)\s*/g, "");
      // 移除冒号和空格
      cleaned = cleaned.replace(/[:\s]*$/g, "");
      return cleaned;
    }

    // ========== 1. 优先获取 placeholder ==========
    const elementsToCheck = [element, ...element.querySelectorAll("*")];

    for (const elem of elementsToCheck) {
      const placeholder = elem.getAttribute("placeholder")?.trim();
      // 排除无意义的placeholder
      if (placeholder && placeholder !== "" && !/^(请选择|请输入|YYYY|MM|DD|请填写)$/.test(placeholder)) {
        return cleanLabel(placeholder);
      }
    }

    // ========== 2. 查找关联的 <label> 标签 ==========
    // 2.1 通过 for 属性关联
    const inputId = element.id || element.querySelector("input, select, textarea")?.id;
    if (inputId) {
      const label = document.querySelector(`label[for="${inputId}"]`);
      if (label) {
        const labelText = label.textContent.trim();
        if (labelText && /[\u4e00-\u9fa5]/.test(labelText)) {
          return cleanLabel(labelText);
        }
      }
    }

    // 2.2 查找父级 label
    let parent = element.parentElement;
    let depth = 0;
    while (parent && parent !== document.body && depth < 5) {
      if (parent.tagName === "LABEL") {
        // 获取label的直接文本，排除子元素的文本
        let labelText = "";
        for (const node of parent.childNodes) {
          if (node.nodeType === Node.TEXT_NODE) {
            labelText += node.nodeValue;
          }
        }
        labelText = labelText.trim();
        if (labelText && /[\u4e00-\u9fa5]/.test(labelText)) {
          return cleanLabel(labelText);
        }
      }
      parent = parent.parentElement;
      depth++;
    }

    // ========== 3. 查找前置的兄弟元素（左侧或上方的标签）==========
    try {
      const rect = element.getBoundingClientRect();
      const searchDistance = 200; // 搜索范围：200px

      let bestLabel = "";
      let bestDistance = Infinity;

      // 获取所有可能的标签候选
      const allElements = getAllVisibleElements();
      for (const candidate of allElements) {
        // 跳过输入框本身
        if (candidate === element || element.contains(candidate) || candidate.contains(element)) {
          continue;
        }

        // 跳过没有中文的元素
        const text = candidate.textContent.trim();
        if (!text || !/[\u4e00-\u9fa5]/.test(text)) continue;

        // 跳过太长的文本（可能是段落）
        if (text.length > 30) continue;

        // 跳过包含输入框的元素
        if (candidate.querySelector("input, select, textarea")) continue;

        // 必须是叶子节点或接近叶子节点
        const hasOnlyTextChildren = Array.from(candidate.children).every(child =>
          child.children.length === 0
        );
        if (candidate.children.length > 3 && !hasOnlyTextChildren) continue;

        const candidateRect = candidate.getBoundingClientRect();

        // 计算位置关系
        const isOnLeft = candidateRect.right <= rect.left + 20; // 在左侧
        const isAbove = candidateRect.bottom <= rect.top + 20;  // 在上方
        const isSameRow = Math.abs(candidateRect.top - rect.top) < 40; // 同一行
        const isSameColumn = Math.abs(candidateRect.left - rect.left) < 20; // 同一列

        // 只考虑在左侧同行 或 在上方同列的元素
        if (!((isOnLeft && isSameRow) || (isAbove && isSameColumn))) {
          continue;
        }

        // 计算距离
        let distance;
        if (isOnLeft && isSameRow) {
          // 左侧同行：计算水平距离
          distance = rect.left - candidateRect.right;
        } else {
          // 上方同列：计算垂直距离
          distance = rect.top - candidateRect.bottom;
        }

        // 距离必须在合理范围内
        if (distance < 0 || distance > searchDistance) continue;

        // 选择距离最近的标签
        if (distance < bestDistance) {
          bestDistance = distance;
          bestLabel = text;
        }
      }

      if (bestLabel) {
        return cleanLabel(bestLabel);
      }
    } catch (e) {
      // 忽略错误
    }

    // ========== 4. 查找父容器的首个文本节点 ==========
    parent = element.parentElement;
    depth = 0;
    while (parent && parent !== document.body && depth < 3) {
      for (const child of parent.childNodes) {
        if (child.nodeType === Node.TEXT_NODE) {
          const text = child.nodeValue.trim();
          if (text && /[\u4e00-\u9fa5]/.test(text) && text.length < 20) {
            return cleanLabel(text);
          }
        } else if (child.nodeType === Node.ELEMENT_NODE && child !== element && !child.contains(element)) {
          if (child.children.length === 0) {
            const text = child.textContent.trim();
            if (text && /[\u4e00-\u9fa5]/.test(text) && text.length < 20) {
              return cleanLabel(text);
            }
          }
        }
      }
      parent = parent.parentElement;
      depth++;
    }

    // ========== 5. 获取元素自身的文本内容 ==========
    for (const elem of elementsToCheck) {
      if (elem.children.length === 0) {
        const text = elem.textContent.trim();
        if (text && /[\u4e00-\u9fa5]/.test(text)) {
          return cleanLabel(text);
        }
      }
    }

    // ========== 6. 通过属性推断字段类型 ==========
    const inferredType = inferFieldType(element);
    if (inferredType) {
      return inferredType;
    }

    // ========== 7. 智能推断并排的日期/时间字段 ==========
    try {
      const rect = element.getBoundingClientRect();
      const allInputs = Array.from(document.querySelectorAll("input, select, textarea"));

      // 查找同一行的其他输入框
      const sameRowInputs = allInputs.filter(input => {
        if (input === element) return false;
        const inputRect = input.getBoundingClientRect();
        return Math.abs(inputRect.top - rect.top) < 5;
      });

      if (sameRowInputs.length > 0) {
        // 按水平位置排序
        sameRowInputs.sort((a, b) => {
          return a.getBoundingClientRect().left - b.getBoundingClientRect().left;
        });

        // 检查相邻输入框是否有标签
        for (const sibling of sameRowInputs) {
          const siblingLabel = extractFieldLabelWithoutRecursion(sibling);
          if (siblingLabel) {
            const siblingRect = sibling.getBoundingClientRect();

            // 判断当前元素的位置
            if (rect.left < siblingRect.left) {
              // 当前元素在左侧
              if (/时间|日期|年月/.test(siblingLabel)) {
                return "开始" + siblingLabel;
              } else if (siblingLabel.includes("结束")) {
                return siblingLabel.replace("结束", "开始");
              }
            } else if (rect.left > siblingRect.left) {
              // 当前元素在右侧
              if (/时间|日期|年月/.test(siblingLabel)) {
                return "结束" + siblingLabel;
              } else if (siblingLabel.includes("开始")) {
                return siblingLabel.replace("开始", "结束");
              }
            }
          }
        }

        // 如果相邻元素都没有标签，查找共同的父级标签
        const commonLabel = findCommonParentLabel(element, sameRowInputs[0]);
        if (commonLabel) {
          const myIndex = allInputs.indexOf(element);
          const siblingIndex = allInputs.indexOf(sameRowInputs[0]);
          if (myIndex < siblingIndex) {
            return "开始" + commonLabel;
          } else {
            return "结束" + commonLabel;
          }
        }
      }
    } catch (e) {
      // 忽略错误
    }

    // ========== 8. 使用最近弹窗的标题 ==========
    if (lastPopupTitle) {
      // 清理并返回弹窗标题
      const cleaned = cleanLabel(lastPopupTitle);
      if (cleaned && cleaned.length > 0) {
        return cleaned;
      }
    }

    return "";
  }

  /**
   * 提取字段标签（不递归，用于避免无限循环）
   */
  function extractFieldLabelWithoutRecursion(element) {
    function cleanLabel(text) {
      let cleaned = text.trim();
      cleaned = cleaned.replace(/^请?(选择|输入|填写|填入)\s*/g, "");
      cleaned = cleaned.replace(/^\s*(请选择|请输入|请填写)\s*/g, "");
      cleaned = cleaned.replace(/[:\s]*$/g, "");
      return cleaned;
    }

    // 只尝试简单的方法
    // 1. placeholder
    const placeholder = element.getAttribute("placeholder") ||
                       element.querySelector("input, select, textarea")?.getAttribute("placeholder");
    if (placeholder && !/^(请选择|请输入|YYYY|MM|DD|请填写)$/.test(placeholder)) {
      return cleanLabel(placeholder);
    }

    // 2. 关联的label
    const inputId = element.id || element.querySelector("input, select, textarea")?.id;
    if (inputId) {
      const label = document.querySelector(`label[for="${inputId}"]`);
      if (label) {
        const labelText = label.textContent.trim();
        if (labelText && /[\u4e00-\u9fa5]/.test(labelText)) {
          return cleanLabel(labelText);
        }
      }
    }

    return "";
  }

  /**
   * 查找两个元素的共同父级标签
   */
  function findCommonParentLabel(element1, element2) {
    let parent = element1.parentElement;
    let depth = 0;

    while (parent && parent !== document.body && depth < 5) {
      if (parent.contains(element2)) {
        // 找到共同父级，查找其中的标签文本
        for (const child of parent.children) {
          if (child.contains(element1) || child.contains(element2)) continue;
          const text = child.textContent.trim();
          if (text && /[\u4e00-\u9fa5]/.test(text) && text.length < 20) {
            if (/时间|日期|年月/.test(text)) {
              return text.replace(/^请?(选择|输入|填写|填入)\s*/g, "");
            }
          }
        }
        break;
      }
      parent = parent.parentElement;
      depth++;
    }

    return "";
  }

  /**
   * 从弹窗获取选项（优化版，增加弹窗标题识别）
   */
  function getOptionsFromPopup() {
    let options = [];
    let popupTitle = "";

    for (const element of newlyAddedElements) {
      findCancelButton(element);

      // ========== 优化：识别弹窗标题 ==========
      if (!popupTitle) {
        // 查找常见的标题元素
        const titleSelectors = [
          "h1", "h2", "h3", "h4",
          ".title", ".modal-title", ".dialog-title", ".popup-title",
          ".header", ".modal-header",
          "[class*='title']", "[class*='Title']",
          "[class*='header']", "[class*='Header']"
        ];

        for (const selector of titleSelectors) {
          const titleElement = element.querySelector(selector);
          if (titleElement) {
            const text = titleElement.textContent.trim();
            // 只保留有意义的中文标题，长度适中
            if (text && /[\u4e00-\u9fa5]/.test(text) && text.length > 1 && text.length < 15) {
              popupTitle = text;
              break;
            }
          }
        }

        // 查找第一个包含中文的文本节点
        if (!popupTitle) {
          const walker = document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT,
            {
              acceptNode: function(node) {
                const text = node.nodeValue.trim();
                if (text && /[\u4e00-\u9fa5]/.test(text) && text.length > 1 && text.length < 15) {
                  return NodeFilter.FILTER_ACCEPT;
                }
                return NodeFilter.FILTER_SKIP;
              }
            }
          );

          const firstTextNode = walker.nextNode();
          if (firstTextNode) {
            popupTitle = firstTextNode.nodeValue.trim();
          }
        }
      }

      const optionList = getAllVisibleOptions(element);

      // 检测日期选择器
      if (optionList.length >= 40) {
        const datePattern = "1;2;3;4;5;6;7;8;9;10;11;12;13;14;15;16;17;18;19;20;21;22;23;24;25;26;27;28";
        const chineseNumbers = "一;二;三;四;五;六";
        const joined = optionList.join(";");

        if (joined.includes(datePattern) && joined.includes(chineseNumbers)) {
          options = ["(请填写日期)"];
          break;
        }
      }

      // 检测年月选择器
      if (optionList.length >= 12) {
        const monthPattern = "1月;2月;3月;4月;5月;6月;7月;8月;9月;10月;11月;12月";
        if (optionList.join(";").includes(monthPattern)) {
          options = ["(请填写年月)"];
          break;
        }
      }

      // 检测省份选择器
      if (optionList.length >= 30) {
        const provinces = ["北京", "天津", "上海", "重庆", "河北", "山西", "辽宁", "吉林", "黑龙江", "江苏", "浙江", "安徽", "福建", "江西", "山东", "河南", "湖北", "湖南", "广东", "海南", "四川", "贵州", "云南", "陕西", "甘肃", "青海", "台湾", "内蒙古", "广西", "西藏", "宁夏", "新疆", "香港", "澳门"];

        let matchCount = 0;
        for (const province of provinces) {
          if (optionList.some(opt => opt.includes(province))) {
            matchCount++;
          }
        }

        if (matchCount >= 30) {
          options = ["(请填写省份)"];
          break;
        }
      }

      // 检测民族选择器
      if (optionList.length >= 30) {
        const nations = ["汉族", "蒙古族", "回族", "藏族", "维吾尔族", "苗族", "彝族", "壮族", "布依族", "朝鲜族", "满族", "侗族", "瑶族", "白族", "土家族", "哈尼族", "哈萨克族", "傣族", "黎族", "傈僳族", "佤族", "畲族", "高山族", "拉祜族", "水族", "东乡族", "纳西族", "景颇族", "柯尔克孜族", "土族", "达斡尔族", "仫佬族", "羌族", "布朗族", "撒拉族", "毛南族", "仡佬族", "锡伯族", "阿昌族", "普米族", "塔吉克族", "怒族", "乌孜别克族", "俄罗斯族", "鄂温克族", "德昂族", "保安族", "裕固族", "京族", "塔塔尔族", "独龙族", "鄂伦春族", "赫哲族", "门巴族", "珞巴族", "基诺族"];

        let matchCount = 0;
        for (const nation of nations) {
          if (optionList.some(opt => opt.includes(nation))) {
            matchCount++;
          }
        }

        if (matchCount >= 30) {
          options = ["(请填写民族)"];
          break;
        }
      }

      // 检测国家选择器
      if (optionList.length >= 30) {
        const countries = ["中国", "美国", "日本", "德国", "英国", "法国", "意大利", "加拿大", "澳大利亚", "俄罗斯", "印度", "巴西", "韩国", "西班牙", "墨西哥"];

        let matchCount = 0;
        for (const country of countries) {
          if (optionList.some(opt => opt.includes(country))) {
            matchCount++;
          }
        }

        if (matchCount >= 30) {
          options = ["(请填写国家)"];
          break;
        }
      }

      // 检测数字序列选择器
      if (optionList.length >= 10) {
        const numbers = [];
        for (const opt of optionList) {
          const num = parseInt(opt.trim());
          if (!isNaN(num)) {
            numbers.push(num);
          }
        }

        // 如果80%以上是数字
        if (numbers.length >= optionList.length * 0.8) {
          numbers.sort((a, b) => a - b);

          // 检查是否连续
          let isContinuous = true;
          for (let i = 1; i < numbers.length; i++) {
            if (numbers[i] !== numbers[i - 1] + 1) {
              isContinuous = false;
              break;
            }
          }

          if (isContinuous && numbers.length > 0) {
            const min = numbers[0];
            const max = numbers[numbers.length - 1];
            if (max - min >= 10) {
              options = [`(请填写${min}-${max}中的一个数字)`];
              break;
            }
          }
        }
      }

      // 如果不是特殊选择器，记录实际选项
      if (optionList.length >= 2) {
        options = optionList.join(";").length > 1000 ?
          optionList.slice(0, 100) :
          optionList;
      }
    }

    // 保存弹窗标题到全局变量，供字段识别使用
    if (popupTitle) {
      lastPopupTitle = popupTitle;
    }

    return options;
  }

  // ==================== 查找字段DOM ====================

  /**
   * 查找字段对应的DOM元素
   */
  function findFieldDomElements(groups) {
    try {
      console.log("🔍 开始查找字段对应的DOM元素...");
      console.log("  总共有", groups.length, "个分组");

      // 获取所有组的名称
      const groupNames = groups.map(g => g.name);
      console.log("  分组名称:", groupNames);

      const allElements = getAllVisibleElements();
      console.log("  页面可见元素总数:", allElements.length);

      // 查找包含所有分组名称的容器
      let containerElement = null;
      for (const element of allElements) {
        const childNodes = element.childNodes;
        if (childNodes.length < 5) continue;

        let matchCount = 0;
        for (const child of childNodes) {
          const text = child.textContent.trim();
          if (text && groupNames.includes(text)) {
            matchCount++;
          } else if (text.length > 10) {
            matchCount = 0;
            break;
          }
        }

        if (matchCount >= 5) {
          containerElement = element;
          console.log("  ✅ 找到容器元素，包含", matchCount, "个分组标签");
          break;
        }
      }

      if (!containerElement) {
        console.log("  ⚠️  未找到包含所有分组的容器，将在整个页面搜索");
      }

      // 为每个组和字段查找DOM元素
      let lastFoundElement = null;
      let groupsFoundCount = 0;
      let fieldsFoundCount = 0;

      for (const group of groups) {
        console.log(`\n  📦 查找分组: "${group.name}"`);
        group.dom = findElementByText(group.name, lastFoundElement, containerElement);

        if (group.dom) {
          console.log(`    ✅ 找到分组 DOM`);
          groupsFoundCount++;
          lastFoundElement = group.dom;
        } else {
          console.log(`    ❌ 未找到分组 DOM`);
        }

        for (const field of group.fields) {
          console.log(`    📝 查找字段: "${field.name}"`);
          field.field.dom = findElementByText(field.name, lastFoundElement, containerElement);

          if (field.field.dom) {
            console.log(`      ✅ 找到字段 DOM`);
            fieldsFoundCount++;
            lastFoundElement = field.field.dom;
          } else {
            console.log(`      ❌ 未找到字段 DOM`);
          }
        }
      }

      console.log(`\n📊 DOM 查找统计:`);
      console.log(`  分组: ${groupsFoundCount}/${groups.length}`);
      console.log(`  字段: ${fieldsFoundCount}/${groups.reduce((sum, g) => sum + g.fields.length, 0)}`);

    } catch (error) {
      console.error("❌ findFieldDomElements 错误:", error);
    }
  }

  /**
   * 根据文本查找元素
   */
  function findElementByText(text, startAfter, container) {
    try {
      // 如果 text 不是字符串，尝试转换
      if (typeof text !== "string") {
        console.warn("findElementByText 收到非字符串参数:", text);
        if (text && typeof text === "object") {
          // 如果是对象，尝试提取 fieldName
          text = text.fieldName || text.name || "";
        } else {
          text = String(text || "");
        }
      }

      if (!text || !text.trim()) {
        console.warn("findElementByText: 字段名为空");
        return null;
      }

      const allElements = getAllVisibleElements();
      let shouldSearch = !startAfter;

      for (const element of allElements) {
        // 跳过容器外的元素（修复：应该是 !container.contains）
        if (container && !container.contains(element)) {
          continue;
        }

        // 找到起始位置
        if (element === startAfter) {
          shouldSearch = true;
          continue;
        }

        if (!shouldSearch) continue;

        // 跳过option元素
        if (element.tagName === "OPTION") continue;

        // 构建正则表达式
        let escapedText = text.trim();
        escapedText = escapedText.replace(/[.*+?^${}()|\[\]\\]/g, "\\$&");
        const pattern = new RegExp(`^[\\s\\*]*${escapedText}[\\s\\*\\?？i]*(:|：)?[\\s\\*\\?？i]*$`);

        if (pattern.test(element.textContent)) {
          return findDeepestMatchingElement(element, pattern);
        }
      }
    } catch (error) {
      console.error("findElementByText 错误:", error);
    }

    return null;
  }

  /**
   * 查找最深层匹配的元素
   */
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

  // ==================== 查找输入框 ====================

  /**
   * 查找字段下的输入框
   */
  function findBlankInputsForFields(groups) {
    try {
      console.log("🔍 开始查找字段对应的输入框...");
      const fieldDoms = [];
      const blanksList = [];
      const isLastFieldFlags = [];

      // 收集所有字段DOM
      for (const group of groups) {
        for (const field of group.fields) {
          if (field.field.dom) {
            fieldDoms.push(field.field.dom);
            blanksList.push([]);

            const isLastField = group.fields.indexOf(field) === group.fields.length - 1;
            isLastFieldFlags.push(isLastField);
          }
        }
      }

      console.log(`  找到 ${fieldDoms.length} 个有DOM的字段需要查找输入框`);

      const allElements = getAllVisibleElements();
      let currentFieldDom = null;
      let currentFieldIndex = 0;
      let nextFieldDom = null;
      let skipContainer = null;
      let pendingElements = [];

      // 遍历所有元素，查找字段间的输入框
      for (const element of allElements) {
        // 遇到字段标签
        if (fieldDoms.includes(element)) {
          // 处理待处理的元素
          if (!blanksList[currentFieldIndex].length && pendingElements.length) {
            for (const pending of pendingElements) {
              let parent = pending.parentElement;
              while (parent && !isElementVisible(parent)) {
                parent = parent.parentElement;
              }
              if (parent) {
                blanksList[currentFieldIndex].push(parent);
              }
            }
          }

          pendingElements = [];
          currentFieldDom = element;
          currentFieldIndex = fieldDoms.indexOf(element);
          nextFieldDom = currentFieldIndex + 1 < fieldDoms.length ?
            fieldDoms[currentFieldIndex + 1] : null;
          continue;
        }

        if (!currentFieldDom) continue;

        // 跳过已处理的容器
        if (skipContainer && skipContainer.contains(element)) {
          continue;
        }

        // 跳过包含下一个字段的元素
        if (nextFieldDom && element.contains(nextFieldDom)) {
          continue;
        }

        // 检查是否是表单元素
        let isFormElement = false;

        if (
          (element.tagName === "INPUT" && ["text", "search", "number"].includes(element.type)) ||
          element.tagName === "TEXTAREA" ||
          element.tagName === "SELECT" ||
          element.isContentEditable
        ) {
          isFormElement = true;
        }

        if (inputDomList.includes(element)) {
          isFormElement = true;
        }

        if (isFormElement) {
          if (isElementVisible(element)) {
            blanksList[currentFieldIndex].push(element);
          } else {
            pendingElements.push(element);
          }
        } else {
          if (selectDomList.includes(element)) {
            isFormElement = true;
            blanksList[currentFieldIndex].push(element);
          }

          if (radioDomList.includes(element)) {
            isFormElement = true;
            blanksList[currentFieldIndex].push(element);
          }
        }
      }

      // 去重
      for (const i in blanksList) {
        blanksList[i] = removeDuplicateParentElements(blanksList[i]);
      }

      // 限制数量
      for (const i in blanksList) {
        if (blanksList[i].length > 4 || (isLastFieldFlags[i] && blanksList[i].length > 2)) {
          blanksList[i] = blanksList[i].slice(0, 1);
        }
      }

      // 过滤出最合适的输入框
      const finalBlanks = [];
      for (let i = 0; i < fieldDoms.length; i++) {
        const blanks = blanksList[i];
        finalBlanks[i] = [];

        if (blanks.length === 0) continue;

        if (blanks.length === 1) {
          finalBlanks[i].push(blanks[0]);
        } else {
          // 优先选择单选框组
          for (const blank of blanks) {
            if (isRadioGroup(blank)) {
              finalBlanks[i].push(blank);
              break;
            }
          }

          if (finalBlanks[i].length) continue;

          // 否则保留所有
          finalBlanks[i] = blanks;
        }
      }

      // 将输入框分配给字段
      let totalBlanksFound = 0;
      let fieldsWithBlanksCount = 0;

      for (let fieldIndex = 0; fieldIndex < finalBlanks.length; fieldIndex++) {
        if (finalBlanks[fieldIndex].length === 0) continue;

        for (const group of groups) {
          for (const field of group.fields) {
            if (field.field.dom === fieldDoms[fieldIndex]) {
              const fieldName = typeof field.name === 'string' ? field.name : field.name?.fieldName || '未知字段';

              if (finalBlanks[fieldIndex].length === 1) {
                const blank = finalBlanks[fieldIndex][0];
                field.blanks.push({
                  name: "",
                  dom: blank,
                  type: radioDomList.includes(blank) ? "radio" :
                        selectDomList.includes(blank) ? "select" : "input"
                });
                console.log(`  ✅ 字段 "${fieldName}" 找到 1 个输入框`);
                totalBlanksFound++;
                fieldsWithBlanksCount++;
              } else {
                for (const blank of finalBlanks[fieldIndex]) {
                  field.blanks.push({
                    name: extractFieldLabel(blank),
                    dom: blank,
                    type: radioDomList.includes(blank) ? "radio" :
                          selectDomList.includes(blank) ? "select" : "input"
                  });
                }
                console.log(`  ✅ 字段 "${fieldName}" 找到 ${finalBlanks[fieldIndex].length} 个输入框`);
                totalBlanksFound += finalBlanks[fieldIndex].length;
                fieldsWithBlanksCount++;
              }
            }
          }
        }
      }

      console.log(`\n📊 输入框查找统计:`);
      console.log(`  有输入框的字段: ${fieldsWithBlanksCount}/${fieldDoms.length}`);
      console.log(`  总输入框数量: ${totalBlanksFound}`);

    } catch (error) {
      console.error("❌ 查找输入框时出错:", error);
    }
  }

  // ==================== 生成字段结构 ====================

  /**
   * 生成用于AI理解的字段结构
   */
  function generateFieldStructureForAI(localGroups, serverFields) {
    try {
      const result = [];

      // 复制服务器字段结构
      for (const serverGroup of serverFields) {
        result.push({
          name: serverGroup.name,
          fields: []
        });
      }

      // 填充字段信息
      for (let groupIndex = 0; groupIndex < localGroups.length; groupIndex++) {
        const localGroup = localGroups[groupIndex];
        const fields = [];
        result[groupIndex].fields = fields;

        for (let fieldIndex = 0; fieldIndex < localGroup.fields.length; fieldIndex++) {
          const localField = localGroup.fields[fieldIndex];

          // 如果没有输入框，或只有一个且是时间字段
          if (
            localField.blanks.length === 0 ||
            (localField.blanks.length === 1 && /时间|日期|年月/.test(localField.name))
          ) {
            const fieldInfo = {
              name: localField.name
            };
            fields.push(fieldInfo);
          } else {
            // 智能推断子字段名称
            if (localField.blanks.length > 1) {
              let allBlanksNoName = true;
              for (const blank of localField.blanks) {
                if (blank.name !== "") {
                  allBlanksNoName = false;
                  break;
                }
              }

              if (allBlanksNoName) {
                // 根据字段名称推断子字段
                if (/(居住地|籍贯|户籍|户口|生源地|所在地|省份|城市|地点)/i.test(localField.name)) {
                  if (localField.blanks.length === 2) {
                    localField.blanks[0].name = "省/直辖市";
                    localField.blanks[1].name = "市";
                  } else if (localField.blanks.length === 3) {
                    localField.blanks[0].name = "省/直辖市";
                    localField.blanks[1].name = "市";
                    localField.blanks[2].name = "区";
                  }
                }

                if (/(手机号|电话号码|手机号码|联系电话)/i.test(localField.name)) {
                  if (localField.blanks.length === 2) {
                    localField.blanks[0].name = "国家";
                    localField.blanks[1].name = "号码";
                  }
                }

                if (/(期望薪资|期望月薪|期望年薪)/i.test(localField.name)) {
                  if (localField.blanks.length === 2) {
                    localField.blanks[0].name = "下限";
                    localField.blanks[1].name = "上限";
                  }
                }
              }
            }

            // 为每个输入框生成字段信息
            for (const blank of localField.blanks) {
              const fieldInfo = {
                name: localField.blanks.length === 1 ?
                  localField.name :
                  `${localField.name} - ${blank.name}`
              };
              fields.push(fieldInfo);

              // 添加选项数据
              let optionIndex = -1;
              optionIndex = inputDomList.indexOf(blank.dom);
              if (optionIndex !== -1 && inputOptionsData[optionIndex] && inputOptionsData[optionIndex].length > 0) {
                fieldInfo.items = inputOptionsData[optionIndex];
              } else {
                optionIndex = selectDomList.indexOf(blank.dom);
                if (optionIndex !== -1 && selectOptionsData[optionIndex] && selectOptionsData[optionIndex].length > 0) {
                  fieldInfo.items = selectOptionsData[optionIndex];
                } else {
                  optionIndex = radioDomList.indexOf(blank.dom);
                  if (optionIndex !== -1 && radioOptionsData[optionIndex] && radioOptionsData[optionIndex].length > 0) {
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

  function parseServerFieldsToGroups(fields) {
    const groups = [];

    /**
     * 提取字段名称（兼容多种数据结构）
     */
    const getFieldName = (field) => {
      if (!field) return "";

      // 如果是字符串，直接返回
      if (typeof field === "string") return field;

      // 如果有 fieldName 属性（标准格式）
      if (field.fieldName) return field.fieldName;

      // 如果有 name 属性
      if (field.name) return field.name;

      // 如果是对象但没有明确的名称字段，返回空字符串
      console.warn("无法提取字段名:", field);
      return "";
    };

    for (const fieldGroup of fields) {
      const group = {
        name: fieldGroup.sectionName || fieldGroup.name || "未命名",
        dom: null,
        fields: []
      };

      if (fieldGroup.fields) {
        for (const field of fieldGroup.fields) {
          const fieldName = getFieldName(field);

          group.fields.push({
            name: fieldName,                  // 直接存储字符串名称
            originalField: field,              // 保留原始字段对象（包含 fieldType 等信息）
            field: { dom: null },
            blanks: []
          });
        }
      }

      groups.push(group);
    }

    console.log("📊 parseServerFieldsToGroups 结果:", groups);
    return groups;
  }

  // todo
  // ==================== API调用 ====================

  /**
   * 从服务器获取需要填写的字段
   */
  async function getNeedFieldsFromServer(html,company,position) {
    // const labels = [];
    // const regex = /<label>([^<]+)<\/label>/gi;
    // let m;
    // while ((m = regex.exec(html)) !== null) {
    //   const text = (m[1] || "").trim();
    //   if (text) labels.push(text);
    // }
    // const uniqueLabels = Array.from(new Set(labels));
    // serverFields = [
    //   { name: "基本信息", fields: uniqueLabels.map((t) => ({ name: t })) }
    // ];
    // sessionId = `mock-session-${Date.now()}`;

    // console.log("serverFields", serverFields);

    
    try {
      console.log("html==>",html)
      console.log("📋 准备发送请求获取字段...");
      
      // 🔍 检查 window.config 是否已加载
      if (!window.config) {
        console.error('❌ window.config 未加载，尝试重新获取...');
        const storage = await chrome.storage.local.get(["config"]);

        // 验证从 storage 获取的配置是否有效
        if (!storage || !storage.config) {
          throw new Error('无法从 storage 获取配置，请检查扩展安装状态');
        }

        window.config = storage.config;
        console.log('✅ 配置已重新加载:', window.config);
      }

      // 验证必要的配置项
      if (!window.config.API_BASE_URL) {
        console.error('❌ API_BASE_URL 不存在:', window.config);
        throw new Error('API_BASE_URL 配置缺失，请检查扩展配置');
      }
      
      const requestUrl = `${window.config.API_BASE_URL}analyze-page`;
      const requestBody = {
        url: window.location.href,
        html: html,
        company: company,
        position: position
      };
      
      console.log('📤 发送请求到:', requestUrl);
      console.log('📦 请求参数:', {
        url: requestBody.url,
        company: requestBody.company,
        position: requestBody.position,
        htmlLength: html ? html.length : 0
      });
      
      const response = await fetchWithJwt(
        requestUrl,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody)
        }
      );
      
      console.log('📥 收到原始响应:', response);
      
      // 检查响应是否有效
      if (!response) {
        throw new Error('响应为空');
      }
      
      if (response.error) {
        throw new Error(`服务器返回错误: ${response.error}`);
      }
      
      if (!response.sections) {
        console.warn('⚠️ 响应中没有 sections 字段:', response);
      }
      
      serverFields = response.sections;
      sessionId = response.sessionId;
      
      console.log('✅ serverFields 解析成功，共', serverFields ? serverFields.length : 0, '个区域');
      console.log('🆔 sessionId:', sessionId);
      console.log('📋 详细字段:', serverFields);

    } catch (error) {
      console.error('❌ getNeedFieldsFromServer 失败');
      console.error('错误类型:', error.name);
      console.error('错误信息:', error.message);
      console.error('错误堆栈:', error.stack);
      
      hasNetworkError = true;
      errorFunctionName = "getNeedField";
      throw error;
    }
    
  }

  /**
   * 生成专岗美化简历
   */
  async function beautifyResumeForPosition(company, position, resumeMd) {
    try {
      beautifiedResume = await fetchWithJwt(
        `${window.config.API_BASE_URL}beautifyResumeMd`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: window.location.href,
            version: chrome.runtime.getManifest().version,
            company: company,
            position: position,
            resumeMd: resumeMd
          })
        }
      );

    } catch (error) {
      hasNetworkError = true;
      errorFunctionName = "beautifyResumeMd";
      throw error;
    }
  }

  /**
   * 获取填写值
   */
  async function getFillingValues(enableBeautify, resumeMd) {
    console.log("进入步骤9");
    await callFillResumeValueAPI(serverFields, "", "", resumeMd, "resume-default");
    console.log("fillValues===>", fillValues);
    let waitCounter = 0;
    while (!fillValues.length || !window.isRunning()) {
      checkNetworkError();
      await sleep(500);
      waitCounter++;
      if (waitCounter === 22) {
        window.setStateText("开始思考网站填写策略...");
      } else if (waitCounter === 60) {
        window.setStateText("思考时间稍长，请耐心等候...");
      } else if (waitCounter === 90) {
        window.setStateText("快要完成了，我在努力中...");
      }
    }
  }

  /**
   * 获取填写值的实际API调用
   */
  async function callFillResumeValueAPI(fields, company, position, resumeMd, resumeId) {
    /*try {
      const response = await fetchWithJwt(
        `${window.config.API_BASE_URL}fill-values`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: sessionId,
            url: window.location.href,
            version: chrome.runtime.getManifest().version,
            fields: fields,
            company: company,
            position: position,
            resumeMd: resumeMd,
            resumeId: resumeId
          })
        }
      );

      fillValues = response.values;

    } catch (error) {
      hasNetworkError = true;
      errorFunctionName = "fillResumeValue";
      throw error;
    }*/


    console.log("fillValues===>", fillValues);
    await sleep(300);
    const getMd = (key) => {
      try {
        const r = new RegExp(`^${key}:\\s*(.*)$`, "mi");
        const m = (resumeMd || "").match(r);
        return m && m[1] ? m[1].trim() : "";
      } catch (_) { return ""; }
    };
    const valueByType = (t) => {
      switch ((t || "").toLowerCase()) {
        case "name": return getMd("Name") || "fly";
        case "phone": return getMd("Phone") || "16673570000";
        case "email": return getMd("Email") || "2477980000@qq.com";
        case "desiredcity": return "深圳";
        case "school": return getMd("School") || "湖南软件职业技术大学";
        case "education": return "本科";
        case "major": return getMd("Major") || "软件技术";
        case "educationstartdate": return "2024-2026";
        case "company": return company || "北京人人众包科技有限公司";
        case "position": return position || "Java开发";
        case "workstartdate": return "2023.12-2024.06";
        case "workdescription": return "1. 负责项目整体架构设计与优化。\n2. 独立完成后端逻辑开发，确保代码质量与性能。\n3. 参与前端界面开发，提升用户交互体验。\n4. 与团队紧密协作，确保前后端接口的高效对接。\n5. 定期进行代码审查，维护项目代码的整洁与一致性。\n6. 针对项目需求，提出并实施技术解决方案。\n7. 主动跟踪最新技术动态，为项目引入创新思路。\n实习成果：河北工业大学资产管理平台项目、卡友新能源项目前端开发、河北工信厅-工业绿色低碳项目前后端独立开发。";
        case "projectname": return "河北工信厅 - 工业绿色低碳项目";
        case "projectrole": return "全栈工程师";
        case "projectstartdate": return "2024.04-2024.06";
        case "projectdescription": return "项目核心开发：独立负责项目的全栈开发，采用SpringBoot与Vue技术栈，确保系统的稳定性和可维护性。数据集成与分析：成功对接并处理了大量企业能源消耗数据，支持能耗趋势的分析和可视化展示。系统安全与整合：负责整合与优化用户认证流程，包括设计和实现单点登录（SSO）接口对接。业绩：技术突破：独立完成前后端全链路开发，零依赖外部支援实现核心功能上线，缩短项目开发周期20%。接口对接：成功攻克第三方系统集成难点，高效完成河北工信厅单点登录接口对接。业务价值：通过能源数据动态统计功能，助力客户单位能源管理效率提升15%。";
        case "attachment": return "";
        case "certificate": return "软件设计师证书";
        case "language": return "英语";
        case "selfevaluation": return "技术优势：熟悉掌握LangChain4J、SpringAi等大模型技术框架，熟悉JavaWeb技术，熟练使用SpringBoot、Cloud、Cloudibaba等开源框架，熟悉JUC、JVM等技术，熟练使用MySQL、Redis数据库，熟练掌握Python语言。\n\n项目优势：参与企业后台、政企对接、AI应用等多类型项目，覆盖全流程开发，曾单人独立负责一个项目的前后端开发，担任前端、全栈等角色，适应能力强，团队协作佳。\n\n学习优势：在校考取软件设计师证书，自主学习能力出色，能快速掌握新技术，适应技术环境变化。";
        default: return getMd("Skills") || "Java、SpringBoot、MyBatis、MySQL、Vue3、Redis";
      }
    };
    fillValues = (fields || []).map((sec) => {
      const secName = sec.sectionName || sec.name || "";
      const fs = (sec.fields || []).map((f) => {
        const fname = f.fieldName || f.name || String(f || "");
        const ftype = f.fieldType || f.type || "";
        return { name: fname, value: valueByType(ftype) };
      });
      return { name: secName || "未命名", fields: fs };
    });
    return null;
  }

  // ==================== 高亮显示 ====================

  /**
   * 高亮显示识别的字段
   */
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
      // 忽略错误
    }

    isHighlighting = true;
  }

  /**
   * 高亮元素
   */
  function highlightElement(element, color = "") {
    const colorClasses = [
      "ark-color-yellow",
      "ark-color-green",
      "ark-color-red",
      "ark-color-blue",
      "ark-color-purple"
    ];

    // 移除所有颜色类
    for (const colorClass of colorClasses) {
      element.classList.remove(colorClass);
    }

    // 添加新颜色类
    if (!color) return;

    const newClass = `ark-color-${color}`;
    if (colorClasses.includes(newClass)) {
      element.classList.add(newClass);
    }
  }

  /**
   * 获取元素的高亮颜色
   */
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

  // ==================== 工具函数 ====================

  /**
   * 检测元素的真实类型（增强版）
   * @param {HTMLElement} element - DOM 元素
   * @param {string} fieldType - 字段类型（如 desiredCity, education 等）
   * @returns {Object} { type: 'input' | 'select-single' | 'select-multi' | 'radio' | 'textarea', isMultiSelect: boolean }
   */
  function detectElementType(element, fieldType = '') {
    if (!element) {
      return { type: 'input', isMultiSelect: false };
    }

    const tagName = element.tagName;
    const className = element.className || '';
    const role = element.getAttribute('role') || '';
    const ariaMultiSelectable = element.getAttribute('aria-multiselectable');
    const hasMultiple = element.hasAttribute('multiple');

    // 1. 标准 SELECT 元素
    if (tagName === 'SELECT') {
      return {
        type: hasMultiple ? 'select-multi' : 'select-single',
        isMultiSelect: hasMultiple
      };
    }

    // 2. TEXTAREA 元素
    if (tagName === 'TEXTAREA') {
      return { type: 'textarea', isMultiSelect: false };
    }

    // 3. INPUT 元素需要进一步判断
    if (tagName === 'INPUT') {
      const inputType = element.type;

      // 3.1 单选按钮
      if (inputType === 'radio') {
        return { type: 'radio', isMultiSelect: false };
      }

      // 3.2 复选框
      if (inputType === 'checkbox') {
        return { type: 'checkbox', isMultiSelect: true };
      }

      // 3.3 检测伪装成 INPUT 的下拉框
      const isSelectLike =
        role === 'combobox' ||
        (element.hasAttribute('readonly') && inputType === 'search') ||
        /select.*search|search.*input|selector.*input/i.test(className);

      if (isSelectLike) {
        // 判断是单选还是多选
        let isMulti = false;

        // 通过属性判断
        if (ariaMultiSelectable === 'true' || hasMultiple) {
          isMulti = true;
        }
        // 通过 class 判断（包含 multi 关键词）
        else if (/multi/i.test(className)) {
          isMulti = true;
        }
        // 通过字段类型判断（地区字段通常是多选）
        else if (/city|region|area|location/i.test(fieldType)) {
          isMulti = true;
        }

        return {
          type: isMulti ? 'select-multi' : 'select-single',
          isMultiSelect: isMulti
        };
      }

      // 3.4 普通输入框
      return { type: 'input', isMultiSelect: false };
    }

    // 4. 其他元素默认当作输入框
    return { type: 'input', isMultiSelect: false };
  }

  /**
   * 点击元素
   */
  async function clickElement(element) {
    let targetElement = element;

    // 滚动到视野内
    if (element.scrollIntoViewIfNeeded) {
      element.scrollIntoViewIfNeeded();
    }

    // 查找实际可点击的元素
    if (
      element.offsetWidth > 0 &&
      element.offsetHeight > 0 &&
      window.getComputedStyle(element).visibility !== "hidden"
    ) {
      const rect = element.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      targetElement = document.elementFromPoint(centerX, centerY);

      if (
        !targetElement ||
        (!element.contains(targetElement) &&
         !targetElement.contains(element) &&
         element.parentNode !== targetElement.parentNode)
      ) {
        targetElement = element;
      }
    }

    // 查找具有click方法的父元素
    if (targetElement) {
      while (targetElement && typeof targetElement.click !== "function") {
        targetElement = targetElement.parentElement;
      }
    } else {
      targetElement = element;
    }

    // 触发事件
    let event = null;
    const eventOptions = {
      bubbles: true,
      cancelable: true,
      view: window
    };

    event = new MouseEvent("mousedown", eventOptions);
    targetElement.dispatchEvent(event);

    event = new FocusEvent("focus", eventOptions);
    targetElement.dispatchEvent(event);

    event = new MouseEvent("mouseup", eventOptions);
    targetElement.dispatchEvent(event);

    event = new MouseEvent("click", eventOptions);
    targetElement.dispatchEvent(event);

    await sleep(10);
  }

  /**
   * 聚焦元素
   */
  async function focusElement(element) {
    const event = new FocusEvent("focus", {
      bubbles: true,
      cancelable: true,
      view: window
    });
    element.dispatchEvent(event);
    await sleep(10);
  }

  /**
   * 失焦元素
   */
  async function blurElement(element) {
    const event = new FocusEvent("blur", {
      bubbles: true,
      cancelable: true,
      view: window
    });
    element.dispatchEvent(event);
    await sleep(10);
  }

  /**
   * 获取所有可见元素
   */
  function getAllVisibleElements() {
    let elements = document.body.querySelectorAll("*:not(#ark-ai)");
    return Array.from(elements);
  }

  /**
   * 判断元素是否可见
   */
  function isElementVisible(element) {
    // 检查元素是否在DOM中
    if (!element.ownerDocument.contains(element)) {
      return false;
    }

    // 检查样式
    let currentElement = element;
    while (currentElement) {
      const style = getComputedStyle(currentElement);

      if (
        style.display === "none" ||
        style.visibility === "hidden" ||
        style.opacity === "0" ||
        currentElement.hidden ||
        (currentElement.offsetWidth === 0 &&
         currentElement.offsetHeight === 0 &&
         style.overflow === "hidden")
      ) {
        return false;
      }

      currentElement = currentElement.parentElement;
    }

    // 检查子元素
    if (areAllChildrenHidden(element)) {
      return false;
    }

    // 检查滚动容器
    if (!isVisibleInScrollContainer(element)) {
      // 尝试滚动到可见
      element.scrollIntoView({ block: "center", behavior: "instant" });

      if (!isVisibleInScrollContainer(element)) {
        return false;
      }
    }

    return true;
  }

  /**
   * 检查所有子元素是否都隐藏
   */
  function areAllChildrenHidden(element) {
    const style = getComputedStyle(element);

    if (
      style.display === "none" ||
      style.visibility === "hidden" ||
      style.opacity === "0" ||
      element.hidden ||
      (element.offsetWidth === 0 &&
       element.offsetHeight === 0 &&
       style.overflow === "hidden")
    ) {
      return true;
    }

    if (element.offsetHeight === 0 || element.offsetWidth === 0) {
      for (const child of element.children) {
        if (!areAllChildrenHidden(child)) {
          return false;
        }
      }
      return true;
    }

    return false;
  }

  /**
   * 检查元素是否在滚动容器中可见
   */
  function isVisibleInScrollContainer(element) {
    const rect = element.getBoundingClientRect();

    if (rect.height === 0) return true;

    let parent = element.parentElement;

    while (parent && parent.tagName !== "BODY") {
      const parentStyle = getComputedStyle(parent);

      if (parentStyle.overflow === "hidden" || parentStyle.overflowY === "hidden") {
        const parentRect = parent.getBoundingClientRect();
        const elemTop = rect.top;
        const elemBottom = rect.bottom;
        const parentTop = parentRect.top;
        const parentBottom = parentRect.bottom;

        // 完全在外面
        if (elemBottom <= parentTop || elemTop >= parentBottom) {
          return false;
        }

        // 可见部分小于10%
        const visibleHeight = Math.min(elemBottom, parentBottom) - Math.max(elemTop, parentTop);
        if (visibleHeight / rect.height < 0.1) {
          return false;
        }
      }

      parent = parent.parentElement;
    }

    return true;
  }

  /**
   * 判断是否是单选框组
   */
  function isRadioGroup(element) {
    // 通过className判断
    if (
      (/(?:^|\W+)(radio)(?:[^a-zA-Z]+|$)/i.test(element.className) ||
       /(?:^|\W+)([Rr]adio)(?:[A-Z0-9]|[^a-z]+|$)/.test(element.className)) &&
      getAllVisibleOptions(element).length >= 2
    ) {
      return true;
    }

    // 检查是否包含多个同名radio
    const radios = element.querySelectorAll('input[type="radio"]');

    if (radios.length < 2) return false;

    const firstName = radios[0].name;
    if (!firstName) return false;

    for (let i = 1; i < radios.length; i++) {
      if (radios[i].name !== firstName) {
        return false;
      }
    }

    // 查找包含所有radio的最小容器
    let container = radios[0];
    while (container) {
      let containsAll = true;
      for (const radio of radios) {
        if (!container.contains(radio)) {
          containsAll = false;
          break;
        }
      }

      if (containsAll) break;
      container = container.parentElement;
    }

    return container === element;
  }

  /**
   * 移除重复的单选框组
   */
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

  /**
   * 移除重复的父元素
   */
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

  /**
   * 获取select的所有选项
   */
  function getAllSelectOptions(selectElement) {
    const options = [];
    const optionElements = selectElement.querySelectorAll("*");

    for (const element of optionElements) {
      // 只有文本节点
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

  /**
   * 获取radio的所有选项
   */
  function getAllRadioOptions(radioElement) {
    const options = [];
    const elements = radioElement.querySelectorAll("*");

    let skipContainer = null;

    for (const element of elements) {
      // 跳过已处理的容器
      if (skipContainer && skipContainer.contains(element)) {
        continue;
      }

      // 检查是否可见
      if (!isElementVisible(element)) {
        skipContainer = element;
        continue;
      }

      // 只有文本节点
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

  /**
   * 获取所有可见选项
   */
  function getAllVisibleOptions(container) {
    return getAllRadioOptions(container);
  }

  // ==================== DOM监听 ====================

  /**
   * 开始监听DOM变化
   */
  function startMonitoringDomChanges() {
    newlyAddedElements = [];
    cancelButtons = [];
    confirmButtons = [];
    deleteConfirmButtons = [];

    const body = document.body;
    const processedElements = new WeakSet();

    // 记录所有现有元素的样式
    const allElements = Array.from(body.querySelectorAll("*"));
    allElements.push(body);

    for (const element of allElements) {
      if (element.nodeType === Node.ELEMENT_NODE) {
        const style = getComputedStyle(element);
        elementStylesMap.set(element, {
          display: style.display,
          visibility: style.visibility,
          opacity: style.opacity
        });
      }
    }

    // 创建MutationObserver
    mutationObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "childList") {
          // 新增节点
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE && !processedElements.has(node)) {
              processedElements.add(node);
              newlyAddedElements.push(node);

              // 标记所有子元素
              for (const child of node.querySelectorAll("*")) {
                processedElements.add(child);
              }
            }
          }
        } else if (mutation.type === "attributes") {
          // 属性变化
          const target = mutation.target;

          if (target.nodeType !== Node.ELEMENT_NODE || processedElements.has(target)) {
            continue;
          }

          const oldStyle = elementStylesMap.get(target) || {};
          const newStyle = getComputedStyle(target);

          const wasHidden =
            oldStyle.display === "none" ||
            oldStyle.visibility === "hidden" ||
            parseFloat(oldStyle.opacity) === 0;

          const isNowVisible =
            newStyle.display !== "none" &&
            newStyle.visibility !== "hidden" &&
            parseFloat(newStyle.opacity) !== 0;

          // 更新样式记录
          elementStylesMap.set(target, {
            display: newStyle.display,
            visibility: newStyle.visibility,
            opacity: newStyle.opacity
          });

          if (!isNowVisible) continue;

          if (wasHidden) {
            processedElements.add(target);
            newlyAddedElements.push(target);

            for (const child of target.querySelectorAll("*")) {
              processedElements.add(child);
            }
            continue;
          }

          // 检查子元素
          const divAndUls = target.querySelectorAll("div, ul");

          for (const child of divAndUls) {
            if (processedElements.has(child)) continue;

            const childOldStyle = elementStylesMap.get(child) || {};
            const childNewStyle = getComputedStyle(child);

            const childWasHidden =
              childOldStyle.display === "none" ||
              childOldStyle.visibility === "hidden" ||
              parseFloat(childOldStyle.opacity) === 0;

            const childIsNowVisible =
              childNewStyle.display !== "none" &&
              childNewStyle.visibility !== "hidden" &&
              parseFloat(childNewStyle.opacity) !== 0;

            elementStylesMap.set(child, {
              display: childNewStyle.display,
              visibility: childNewStyle.visibility,
              opacity: childNewStyle.opacity
            });

            if (childWasHidden && childIsNowVisible) {
              processedElements.add(child);
              newlyAddedElements.push(child);

              for (const descendant of child.querySelectorAll("*")) {
                processedElements.add(descendant);
              }
            }
          }
        }
      }
    });

    mutationObserver.observe(body, {
      childList: true,
      subtree: true,
      attributeFilter: ["class", "style"]
    });
  }

  /**
   * 停止监听DOM变化
   */
  function stopMonitoringDomChanges() {
    if (mutationObserver) {
      mutationObserver.disconnect();
      mutationObserver = null;
      elementStylesMap = new WeakMap();
    }

    // 去重
    newlyAddedElements = removeDuplicateRadioGroups(newlyAddedElements);
  }

  // ==================== 按钮查找 ====================

  /**
   * 查找确认按钮
   */
  function findConfirmButton(container) {
    const elements = container.querySelectorAll("*");

    for (const element of elements) {
      const html = element.innerHTML.replace(/\s+/g, "");
      if (html === "确定" && isElementVisible(element)) {
        confirmButtons.push(element);
        break;
      }
    }
  }

  /**
   * 查找取消按钮
   */
  function findCancelButton(container) {
    const elements = container.querySelectorAll("*");

    // 查找"取消"文本
    for (const element of elements) {
      const html = element.innerHTML.replace(/\s+/g, "");
      if (html === "取消" && isElementVisible(element)) {
        cancelButtons.push(element);
        break;
      }
    }

    // 查找关闭按钮
    for (const element of elements) {
      let isCloseButton = false;
      const attributes = element.attributes;

      for (const attr of attributes) {
        const value = attr.value;

        if (/(?:^|\W+)(guanbi|(close|shut|exit|quit)(|btn|button)|关闭|退出|取消)(?:[^a-zA-Z]+|$)/i.test(value)) {
          isCloseButton = true;
          break;
        }

        if (/(?:^|\W+)([Gg]uanbi|[Cc]lose|[Ss]hut|[Ee]xit|[Qq]uit)(?:[A-Z0-9]|[^a-z]+|$)/.test(value)) {
          isCloseButton = true;
          break;
        }
      }

      if (isCloseButton && isElementVisible(element)) {
        cancelButtons.push(element);
      }
    }

    // 查找全屏遮罩层
    for (const element of elements) {
      const rect = element.getBoundingClientRect();

      if (rect.width === window.innerWidth && rect.height === window.innerHeight) {
        if (isElementVisible(element)) {
          cancelButtons.push(element);
        }
      } else if (cancelButtons.length > 0) {
        break;
      }
    }
  }

  /**
   * 查找删除确认按钮
   */
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

  /**
   * 点击确认按钮
   */
  async function clickConfirmButtons() {
    if (confirmButtons.length > 0) {
      for (const button of confirmButtons) {
        if (isElementVisible(button)) {
          await clickElement(button);
        }
      }
    }
  }

  /**
   * 关闭弹窗
   */
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

    // 检查弹窗是否已关闭
    let allClosed = true;
    for (const element of newlyAddedElements) {
      if (isElementVisible(element)) {
        allClosed = false;
        break;
      }
    }

    if (!allClosed) {
      // 点击body关闭
      const event = new Event("mousedown", { bubbles: true });
      document.body.dispatchEvent(event);
    }
  }

  /**
   * 点击删除确认按钮
   */
  async function clickDeleteConfirmButton() {
    if (deleteConfirmButtons.length > 0) {
      for (const button of deleteConfirmButtons) {
        if (isElementVisible(button)) {
          await clickElement(button);
        }
      }
    }
  }

  // ==================== 填写执行 ====================

  /**
   * 重构填写值
   */
  function restructureFillingValues(values) {
    const result = [];

    for (const group of values) {
      const newGroup = {
        name: group.name,
        fields: []
      };

      for (const field of group.fields) {
        if (field.name.includes(" - ")) {
          // 拆分子字段
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

  /**
   * 移除电话号码的+86前缀
   */
  function removePhonePlusPrefix(values) {
    for (const group of values) {
      for (const field of group.fields) {
        if (/(手机号|电话号码|手机号码|联系电话)/i.test(field.name)) {
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

  /**
   * 执行填写
   */
  async function performFilling(localGroups, fillValues) {
    try {
      console.log("==================== 开始执行填充 ====================");
      console.log("📊 localGroups:", localGroups);
      fillValues = [
          {
              "name": "简历",
              "fields": [
                  {
                      "name": "简历文件",
                      "blanks": []
                  }
              ]
          },
          {
              "name": "基本信息",
              "fields": [
                  {
                      "name": "姓名",
                      "blanks": [
                          {
                              "value": "fly"
                          }
                      ]
                  },
                  {
                      "name": "手机号码",
                      "blanks": [
                          {
                              "value": "+86"
                          },
                          {
                              "value": "16673570000"
                          }
                      ]
                  },
                  {
                      "name": "邮箱",
                      "blanks": [
                          {
                              "value": "2477980000@qq.com"
                          }
                      ]
                  },
                  {
                      "name": "期望工作地点",
                      "blanks": [
                          {
                              "value": "深圳"
                          },
                          {
                              "value": "广州"
                          }
                      ]
                  }
              ]
          },
          {
              "name": "工作经历",
              "fields": []
          },
          {
              "name": "教育经历",
              "fields": [
                  {
                      "name": "学校名称",
                      "blanks": [
                          {
                              "value": "湖南软件职业技术大学"
                          }
                      ]
                  },
                  {
                      "name": "学历",
                      "blanks": [
                          {
                              "value": "本科"
                          }
                      ]
                  },
                  {
                      "name": "专业",
                      "blanks": [
                          {
                              "value": "软件技术"
                          }
                      ]
                  },
                  {
                      "name": "起止时间",
                      "blanks": [
                          {
                              "value": "2024-06"
                          },
                          {
                              "value": "2026-09"
                          }
                      ]
                  }
              ]
          },
          {
              "name": "实习经历",
              "fields": [
                  {
                      "name": "公司名称",
                      "blanks": [
                          {
                              "value": "北京人人众包科技有限公司"
                          }
                      ]
                  },
                  {
                      "name": "职位名称",
                      "blanks": [
                          {
                              "value": "Java开发"
                          }
                      ]
                  },
                  {
                      "name": "起止时间",
                      "blanks": [
                          {
                              "value": "2023-12"
                          },
                          {
                              "value": "2024-06"
                          }
                      ]
                  },
                  {
                      "name": "描述",
                      "blanks": [
                          {
                              "value": "1. 负责项目整体架构设计与优化。\n2. 独立完成后端逻辑开发，确保代码质量与性能。\n3. 参与前端界面开发，提升用户交互体验。\n4. 与团队紧密协作，确保前后端接口的高效对接。\n5. 定期进行代码审查，维护项目代码的整洁与一致性。\n6. 针对项目需求，提出并实施技术解决方案。\n7. 主动跟踪最新技术动态，为项目引入创新思路。\n实习成果：河北工业大学资产管理平台项目、卡友新能源项目前端开发、河北工信厅-工业绿色低碳项目前后端独立开发。"
                          }
                      ]
                  }
              ]
          },
          {
              "name": "项目经历",
              "fields": [
                  {
                      "name": "项目名称",
                      "blanks": [
                          {
                              "value": "河北工信厅 - 工业绿色低碳项目"
                          }
                      ]
                  },
                  {
                      "name": "项目角色",
                      "blanks": [
                          {
                              "value": "全栈工程师"
                          }
                      ]
                  },
                  {
                      "name": "起止时间",
                      "blanks": [
                          {
                              "value": "2024-04"
                          },
                          {
                              "value": "2024-06"
                          }
                      ]
                  },
                  {
                      "name": "项目链接",
                      "blanks": [
                          {
                              "value": ""
                          }
                      ]
                  },
                  {
                      "name": "描述",
                      "blanks": [
                          {
                              "value": "项目核心开发：独立负责项目的全栈开发，采用SpringBoot与Vue技术栈，确保系统的稳定性和可维护性。数据集成与分析：成功对接并处理了大量企业能源消耗数据，支持能耗趋势的分析和可视化展示。系统安全与整合：负责整合与优化用户认证流程，包括设计和实现单点登录（SSO）接口对接。业绩：技术突破：独立完成前后端全链路开发，零依赖外部支援实现核心功能上线，缩短项目开发周期20%。接口对接：成功攻克第三方系统集成难点，高效完成河北工信厅单点登录接口对接。业务价值：通过能源数据动态统计功能，助力客户单位能源管理效率提升15%。"
                          }
                      ]
                  }
              ]
          },
          {
              "name": "作品",
              "fields": [
                  {
                      "name": "作品链接",
                      "blanks": [
                          {
                              "value": ""
                          }
                      ]
                  },
                  {
                      "name": "作品附件",
                      "blanks": []
                  },
                  {
                      "name": "描述",
                      "blanks": [
                          {
                              "value": ""
                          }
                      ]
                  }
              ]
          },
          {
              "name": "获奖",
              "fields": [
                  {
                      "name": "获奖名称",
                      "blanks": [
                          {
                              "value": "软件设计师证书"
                          }
                      ]
                  },
                  {
                      "name": "获奖时间",
                      "blanks": [
                          {
                              "value": "2022"
                          }
                      ]
                  },
                  {
                      "name": "描述",
                      "blanks": [
                          {
                              "value": "在校考取软件设计师证书，自主学习能力出色，能快速掌握新技术，适应技术环境变化。"
                          }
                      ]
                  }
              ]
          },
          {
              "name": "语言能力",
              "fields": [
                  {
                      "name": "语言",
                      "blanks": [
                          {
                              "value": "英语"
                          }
                      ]
                  },
                  {
                      "name": "精通程度",
                      "blanks": [
                          {
                              "value": "良好"
                          }
                      ]
                  }
              ]
          },
          {
              "name": "自我评价",
              "fields": [
                  {
                      "name": "自我评价",
                      "blanks": [
                          {
                              "value": "技术优势：熟悉掌握LangChain4J、SpringAi等大模型技术框架，熟悉JavaWeb技术，熟练使用SpringBoot、Cloud、Cloudibaba等开源框架，熟悉JUC、JVM等技术，熟练使用MySQL、Redis数据库，熟练掌握Python语言。\n\n项目优势：参与企业后台、政企对接、AI应用等多类型项目，覆盖全流程开发，曾单人独立负责一个项目的前后端开发，担任前端、全栈等角色，适应能力强，团队协作佳。\n\n学习优势：在校考取软件设计师证书，自主学习能力出色，能快速掌握新技术，适应技术环境变化。"
                          }
                      ]
                  }
              ]
          },
          {
              "name": "社交账号",
              "fields": [
                  {
                      "name": "社交平台",
                      "blanks": [
                          {
                              "value": ""
                          }
                      ]
                  },
                  {
                      "name": "URL / ID",
                      "blanks": [
                          {
                              "value": ""
                          }
                      ]
                  }
              ]
          }
      ];

      console.log("📊 fillValues:", fillValues);

      // ========== 工具函数 ==========

      /**
       * 提取字段显示名称（支持多种数据结构）
       */
      const getFieldDisplayName = (fieldObj) => {
        if (!fieldObj) return "";

        // 处理字符串
        if (typeof fieldObj === "string") return fieldObj.trim();

        // 处理 { name: "xxx" } 结构
        if (fieldObj.name) {
          // name 是字符串
          if (typeof fieldObj.name === "string") {
            return fieldObj.name.trim();
          }
          // name 是对象：{ fieldName: "xxx", fieldType: "xxx" }
          if (typeof fieldObj.name === "object" && fieldObj.name.fieldName) {
            return fieldObj.name.fieldName.trim();
          }
        }

        // 处理直接包含 fieldName
        if (typeof fieldObj.fieldName === "string") {
          return fieldObj.fieldName.trim();
        }

        return "";
      };

      /**
       * 匹配本地分组
       */
      const pickLocalGroup = (groups, fillGroup) => {
        const targetName = (fillGroup?.name || "").trim();

        // 1. 尝试精确匹配 group.name
        const exact = (groups || []).find((g) => {
          const gName = (g.name || "").trim();
          return gName && gName === targetName;
        });

        if (exact) {
          console.log(`  ✅ 精确匹配分组: "${targetName}"`);
          return exact;
        }

        // 2. 模糊匹配：计算字段名重合度
        let best = null;
        let bestScore = 0;

        for (let i = 0; i < (groups || []).length; i++) {
          const g = groups[i];
          const localFieldNames = (g.fields || []).map((f) => getFieldDisplayName(f));
          let score = 0;

          // 计算有多少字段匹配
          for (const fillField of (fillGroup.fields || [])) {
            const fillFieldName = (fillField?.name || "").trim();
            if (fillFieldName && localFieldNames.includes(fillFieldName)) {
              score++;
            }
          }

          if (score > bestScore) {
            best = g;
            bestScore = score;
          }
        }

        if (best) {
          console.log(`  ✅ 模糊匹配分组: "${targetName}" (匹配 ${bestScore} 个字段)`);
        } else {
          console.log(`  ⚠️  未找到匹配分组: "${targetName}"`);
        }

        return best;
      };

      /**
       * 规范化字符串（用于模糊匹配）
       */
      const normalize = (s) => {
        return (s || "").toString().replace(/\s+/g, "").toLowerCase();
      };

      /**
       * 检查元素是否可见
       */
      const isVisible = (el) => {
        if (!el) return false;
        const style = window.getComputedStyle(el);
        return (
          el.offsetWidth > 0 &&
          el.offsetHeight > 0 &&
          style.visibility !== "hidden" &&
          style.display !== "none"
        );
      };

      /**
       * 自动查找候选的表单元素
       */
      const collectCandidates = (fieldName) => {
        const name = (fieldName || "").trim();
        const normalizedName = normalize(name);
        const candidates = []; // { element, score, matchType }
        const seenElements = new WeakSet(); // 去重

        console.log(`    🔍 自动查找字段: "${name}"`);

        const addCandidate = (el, score, matchType) => {
          if (!el || seenElements.has(el)) return;
          if (!isVisible(el)) return;
          if (!["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)) return;

          seenElements.add(el);
          candidates.push({ element: el, score, matchType });
        };

        // 1. 通过 label 查找（最高优先级）
        document.querySelectorAll("label").forEach((label) => {
          const text = (label.textContent || "").trim();
          if (!text) return;

          const normalizedText = normalize(text);

          // 精确匹配（分数最高）
          if (normalizedText === normalizedName) {
            const forId = label.getAttribute("for");
            if (forId) {
              const el = document.getElementById(forId);
              addCandidate(el, 100, "label-exact");
            } else {
              let input = label.querySelector("input, textarea, select");
              if (!input) {
                input = label.nextElementSibling;
                if (input && !["INPUT", "TEXTAREA", "SELECT"].includes(input.tagName)) {
                  input = null;
                }
              }
              addCandidate(input, 100, "label-exact");
            }
          }
          // 包含匹配（分数次之）
          else if (normalizedText.includes(normalizedName)) {
            const forId = label.getAttribute("for");
            if (forId) {
              const el = document.getElementById(forId);
              addCandidate(el, 80, "label-contains");
            } else {
              let input = label.querySelector("input, textarea, select");
              if (!input) {
                input = label.nextElementSibling;
                if (input && !["INPUT", "TEXTAREA", "SELECT"].includes(input.tagName)) {
                  input = null;
                }
              }
              addCandidate(input, 80, "label-contains");
            }
          }
          // 反向包含（分数更低）
          else if (normalizedName.includes(normalizedText) && normalizedText.length >= 2) {
            const forId = label.getAttribute("for");
            if (forId) {
              const el = document.getElementById(forId);
              addCandidate(el, 60, "label-partial");
            }
          }
        });

        // 2. 通过元素属性查找
        document.querySelectorAll("input, textarea, select").forEach((el) => {
          if (seenElements.has(el)) return; // 已经通过 label 找到

          const placeholder = normalize(el.getAttribute("placeholder") || "");
          const ariaLabel = normalize(el.getAttribute("aria-label") || "");
          const elName = normalize(el.getAttribute("name") || "");
          const elId = normalize(el.getAttribute("id") || "");
          const title = normalize(el.getAttribute("title") || "");

          // 精确匹配
          if (placeholder === normalizedName) {
            addCandidate(el, 90, "placeholder-exact");
          } else if (ariaLabel === normalizedName) {
            addCandidate(el, 90, "aria-exact");
          } else if (elName === normalizedName) {
            addCandidate(el, 85, "name-exact");
          } else if (elId === normalizedName) {
            addCandidate(el, 85, "id-exact");
          }
          // 包含匹配
          else if (placeholder.includes(normalizedName)) {
            addCandidate(el, 70, "placeholder-contains");
          } else if (ariaLabel.includes(normalizedName)) {
            addCandidate(el, 70, "aria-contains");
          } else if (elName.includes(normalizedName)) {
            addCandidate(el, 65, "name-contains");
          } else if (elId.includes(normalizedName)) {
            addCandidate(el, 65, "id-contains");
          } else if (title.includes(normalizedName)) {
            addCandidate(el, 50, "title-contains");
          }
        });

        // 3. 特殊处理：单选框（radio）
        const radioGroups = new Map();
        document.querySelectorAll('input[type="radio"]').forEach((radio) => {
          if (seenElements.has(radio)) return;

          const radioName = radio.name;
          if (!radioName) return;

          const label = findRadioLabel(radio);
          const normalizedLabel = normalize(label);

          if (normalizedLabel === normalizedName) {
            if (!radioGroups.has(radioName)) {
              radioGroups.set(radioName, { radio, score: 95, matchType: "radio-exact" });
            }
          } else if (normalizedLabel.includes(normalizedName)) {
            if (!radioGroups.has(radioName)) {
              radioGroups.set(radioName, { radio, score: 75, matchType: "radio-contains" });
            }
          }
        });

        radioGroups.forEach((data) => {
          addCandidate(data.radio, data.score, data.matchType);
        });

        // 按分数排序，取前3个
        candidates.sort((a, b) => b.score - a.score);
        const topCandidates = candidates.slice(0, 3);

        console.log(`    ✅ 找到 ${candidates.length} 个候选，筛选后保留 ${topCandidates.length} 个`);
        if (topCandidates.length > 0) {
          topCandidates.forEach((c, i) => {
            console.log(`      ${i + 1}. [${c.score}分] ${c.matchType} - ${c.element.tagName}`);
          });
        }

        // 转换为 blanks 格式
        return topCandidates.map(c => ({
          name: "",
          dom: c.element,
          type: c.element.tagName === "SELECT" ? "select" :
                c.element.tagName === "INPUT" && c.element.type === "radio" ? "radio" :
                "input"
        }));
      };

      /**
       * 查找新弹出的选项元素（匹配值）- 增强版
       * @param {string} value - 要匹配的值
       * @param {boolean} isRegionField - 是否是地区字段
       * @param {boolean} selectLastInTree - 是否选择树形结构中最后一个（用于地区多级选择）
       * @returns {Element|null} 匹配的选项元素
       */
      /**
       * 向上查找树节点或选项的父容器
       * @param {Element} element - 起始元素
       * @returns {Element} 树节点父元素
       */
      const findTreeNodeParent = (element) => {
        if (!element) return null;

        // 如果已经是树节点或选项，直接返回
        if (element.classList.contains('ud__tree__node') ||
            element.getAttribute('role') === 'option' ||
            element.classList.contains('select-item') ||
            element.classList.contains('option-item') ||
            element.tagName === 'LI') {
          return element;
        }

        // 向上查找父元素
        let parent = element.parentElement;
        let maxDepth = 5; // 最多向上查找5层
        while (parent && parent !== document.body && maxDepth > 0) {
          if (parent.classList.contains('ud__tree__node') ||
              parent.getAttribute('role') === 'option' ||
              parent.classList.contains('select-item') ||
              parent.classList.contains('option-item') ||
              parent.tagName === 'LI') {
            return parent;
          }
          parent = parent.parentElement;
          maxDepth--;
        }

        // 没找到父节点，返回原元素
        return element;
      };

      const findMatchingOption = (value, isRegionField = false, selectLastInTree = false) => {
        const normalizedValue = normalize(value);
        let bestMatch = null;
        let bestScore = 0;
        let allOptions = [];
        let allMatches = []; // 记录所有匹配的选项，用于树形结构选择

        // 查找所有可见的树节点或选项（不依赖 newlyAddedElements）
        let containers = [];

        // 优先查找树节点和选项元素
        const treeNodes = document.querySelectorAll('.ud__tree__node, li[role="option"], div[role="option"], .select-item, .option-item, .ant-select-item, .el-select-dropdown__item');
        if (treeNodes.length > 0) {
          containers = Array.from(treeNodes);
        } else {
          // 降级：查找下拉框容器
          const dropdowns = document.querySelectorAll('.ud__select__dropdown, .ant-select-dropdown, .el-select-dropdown, [class*="dropdown"], [class*="menu"], [class*="popup"]');
          containers = Array.from(dropdowns);
        }

        // 遍历所有可能的容器
        for (const container of containers) {
          if (!isElementVisible(container)) continue;

          // 如果容器本身就是选项，直接处理
          const isOptionItself = container.classList.contains('ud__tree__node') ||
                                container.getAttribute('role') === 'option' ||
                                container.tagName === 'LI';

          const elementsToCheck = isOptionItself ? [container] : Array.from(container.querySelectorAll('*'));

          for (const option of elementsToCheck) {
            // 跳过有很多子元素的容器（保留少量子元素的，可能是带图标的选项）
            if (option.children.length > 5) continue;

            const text = option.textContent.trim();
            if (!text || text.length > 100) continue; // 跳过空文本或超长文本（可能是容器）

            const normalizedText = normalize(text);

            // 保存所有选项用于调试
            if (option.children.length === 0 && text.length < 50) {
              allOptions.push(text);
            }

            // 精确匹配（最高优先级）
            if (normalizedText === normalizedValue) {
              console.log(`        🎯 精确匹配: "${text}"`);
              return findTreeNodeParent(option);
            }

            // 地区字段的特殊匹配逻辑
            if (isRegionField) {
              // 支持多地区匹配，如 "北京/上海" 或 "北京"
              const regions = value.split(/[\/、,，]/);
              for (const region of regions) {
                const normalizedRegion = normalize(region.trim());
                if (normalizedText.includes(normalizedRegion) || normalizedRegion.includes(normalizedText)) {
                  // 计算路径深度（通过 / 分隔符数量）
                  const pathDepth = (text.match(/[\/]/g) || []).length;

                  // 评分：相似度 * (路径深度 + 1)，优先选择更深的路径
                  const similarity = Math.min(normalizedRegion.length, normalizedText.length) /
                                   Math.max(normalizedRegion.length, normalizedText.length);
                  const score = selectLastInTree ? similarity * (pathDepth + 1) : similarity;

                  if (score > bestScore) {
                    bestScore = score;
                    bestMatch = option;
                  }

                  // 记录所有匹配项（用于树形选择）
                  if (selectLastInTree && similarity > 0.5) {
                    allMatches.push({ option, score, pathDepth, text });
                  }
                }
              }
            }

            // 模糊匹配（选项包含值）
            if (normalizedText.includes(normalizedValue)) {
              const score = normalizedValue.length / normalizedText.length;
              if (score > bestScore) {
                bestScore = score;
                bestMatch = option;
              }
            }
            // 反向模糊匹配（值包含选项）
            else if (normalizedValue.includes(normalizedText) && normalizedText.length >= 2) {
              const score = normalizedText.length / normalizedValue.length * 0.8;
              if (score > bestScore) {
                bestScore = score;
                bestMatch = option;
              }
            }
          }
        }

        // 树形结构选择：选择路径最深的选项（最精确的匹配）
        if (selectLastInTree && allMatches.length > 0) {
          // 按路径深度降序排序，选择最深的
          allMatches.sort((a, b) => b.pathDepth - a.pathDepth);
          const deepestMatch = allMatches[0];
          console.log(`        🌲 树形选择 (深度: ${deepestMatch.pathDepth}): "${deepestMatch.text}"`);
          return findTreeNodeParent(deepestMatch.option);
        }

        if (bestMatch) {
          console.log(`        🎯 模糊匹配 (得分: ${bestScore.toFixed(2)}): "${bestMatch.textContent.trim()}"`);
        } else if (allOptions.length > 0) {
          console.log(`        ⚠️  未找到匹配，可用选项前10个:`, allOptions.slice(0, 10));
        }

        return bestScore > 0.3 ? findTreeNodeParent(bestMatch) : null;
      };

      /**
       * 检测是否弹出了日期选择器
       */
      const hasDatePicker = () => {
        // 直接搜索文档中的日期选择器（不依赖 newlyAddedElements）
        const datePickers = document.querySelectorAll(
          '.ant-picker-dropdown, ' +
          '.el-date-picker, ' +
          '.ud__date-picker, ' +
          '[class*="date-picker"], ' +
          '[class*="calendar"], ' +
          '[class*="datepicker"]'
        );

        for (const element of datePickers) {
          if (!isElementVisible(element)) continue;

          // 检测日期选择器的特征
          const text = element.textContent || "";

          // 包含日期特征：年月日、周一到周日、1-31的数字网格
          const hasDateGrid = /[一二三四五六日]/.test(text) &&
                             /\b([1-9]|[12]\d|3[01])\b/.test(text);

          if (hasDateGrid) return true;
        }

        return false;
      };

      /**
       * 在日期选择器中选择日期（增强版）
       */
      const selectDateInPicker = async (dateStr) => {
        // 解析日期字符串 (支持 YYYY-MM-DD, YYYY/MM/DD, YYYY-MM 等格式)
        const dateMatch = dateStr.match(/(\d{4})[-/](\d{1,2})(?:[-/](\d{1,2}))?/);
        if (!dateMatch) {
          console.log(`        ⚠️  无法解析日期: "${dateStr}"`);
          return false;
        }

        const year = dateMatch[1];
        const month = dateMatch[2];
        const day = dateMatch[3]; // 可能为 undefined（年月选择器）

        console.log(`        📅 尝试选择日期: ${year}-${month}${day ? '-' + day : ''}`);

        // 辅助函数：查找并点击元素
        const findAndClick = async (container, patterns, name) => {
          const elements = Array.from(container.querySelectorAll('*'))
            .filter(el => {
              if (el.children.length > 3) return false; // 跳过容器元素
              const text = el.textContent.trim();
              return patterns.some(pattern => {
                if (typeof pattern === 'string') {
                  return text === pattern;
                } else if (pattern instanceof RegExp) {
                  return pattern.test(text);
                }
                return false;
              });
            });

          if (elements.length > 0) {
            console.log(`        ✓ 找到${name}: "${elements[0].textContent.trim()}"`);
            await clickElement(elements[0]);
            await sleep(400);
            return true;
          }
          return false;
        };

        try {
          // 第一步：尝试查找年份选择器
          for (const container of newlyAddedElements) {
            if (!isElementVisible(container)) continue;

            // 查找年份头部按钮（可能需要点击才能显示年份列表）
            const yearHeaderPatterns = [
              new RegExp(`${year}年`),
              new RegExp(`^${year}$`),
              new RegExp(`${year}\\s*年`)
            ];

            // 先尝试直接选择年份
            let yearSelected = await findAndClick(container, yearHeaderPatterns, '年份');

            // 如果没有找到，尝试查找年份选择按钮（通常在日期选择器头部）
            if (!yearSelected) {
              const headerElements = Array.from(container.querySelectorAll('*'))
                .filter(el => {
                  const text = el.textContent.trim();
                  // 匹配类似 "2024年" 或 "2024" 的头部元素
                  return /\d{4}\s*年?/.test(text) && text.length < 15;
                });

              if (headerElements.length > 0) {
                console.log(`        ✓ 找到年份头部，点击展开年份列表`);
                await clickElement(headerElements[0]);
                await sleep(500);

                // 重新监控 DOM 变化，查找弹出的年份列表
                startMonitoringDomChanges();
                await sleep(300);
                stopMonitoringDomChanges();

                // 在新弹出的元素中查找目标年份
                for (const newContainer of newlyAddedElements) {
                  if (!isElementVisible(newContainer)) continue;
                  yearSelected = await findAndClick(newContainer, yearHeaderPatterns, '年份');
                  if (yearSelected) break;
                }
              }
            }

            // 第二步：选择月份
            await sleep(300);
            const monthPatterns = [
              `${parseInt(month)}月`,
              `${month}月`,
              month
            ];

            // 重新获取可见容器（可能年份选择后界面已变化）
            startMonitoringDomChanges();
            await sleep(200);
            stopMonitoringDomChanges();

            const visibleContainers = newlyAddedElements.length > 0 ?
                                     newlyAddedElements : [container];

            let monthSelected = false;
            for (const c of visibleContainers) {
              if (!isElementVisible(c)) continue;
              monthSelected = await findAndClick(c, monthPatterns, '月份');
              if (monthSelected) break;
            }

            // 第三步：如果有日期，选择日期
            if (day && monthSelected) {
              await sleep(300);
              const dayPatterns = [
                day,
                parseInt(day).toString()
              ];

              // 重新获取容器
              startMonitoringDomChanges();
              await sleep(200);
              stopMonitoringDomChanges();

              const dayContainers = newlyAddedElements.length > 0 ?
                                   newlyAddedElements : visibleContainers;

              for (const c of dayContainers) {
                if (!isElementVisible(c)) continue;

                // 查找日期元素（通常在一个网格中）
                const dayElements = Array.from(c.querySelectorAll('*'))
                  .filter(el => {
                    if (el.children.length > 0) return false; // 叶子节点
                    const text = el.textContent.trim();
                    return dayPatterns.includes(text);
                  });

                if (dayElements.length > 0) {
                  // 选择最后一个匹配的（避免选到前后月份的日期）
                  const targetDay = dayElements[dayElements.length - 1];
                  console.log(`        ✓ 找到日期: "${targetDay.textContent.trim()}"`);
                  await clickElement(targetDay);
                  await sleep(300);
                  return true;
                }
              }
            } else if (!day) {
              // 年月选择器，月份选择后可能需要确认
              console.log(`        ✅ 年月选择完成`);
              await sleep(200);
              return true;
            }

            if (yearSelected || monthSelected) {
              return true; // 至少选择了年份或月份
            }
          }

          return false;
        } catch (error) {
          console.log(`        ⚠️  日期选择异常: ${error.message}`);
          return false;
        }
      };

      /**
       * 填充输入框（增强版）
       */
      const fillInput = async (element, value, fieldName = "") => {
        const isDateField = /时间|日期|年月/.test(fieldName);

        if (element.tagName === "INPUT" || element.tagName === "TEXTAREA") {
          element.focus();

          // 先点击元素，触发可能的下拉列表或日期选择器
          await clickElement(element);
          await sleep(isDateField ? 300 : 100);

          // 检查是否弹出了日期选择器
          if (isDateField && hasDatePicker()) {
            console.log(`        📅 检测到日期选择器`);
            const success = await selectDateInPicker(value);

            if (success) {
              console.log(`        ✅ 日期选择成功: "${value}"`);
              await closePopupWindow(element);
              return true;
            } else {
              console.log(`        ⚠️  日期选择失败，尝试直接输入`);
              await closePopupWindow(element);
            }
          }

          // 设置值
          if (element.type === "number") {
            const numValue = parseFloat(value);
            if (!isNaN(numValue)) {
              element.value = numValue;
            }
          } else {
            element.value = value;
          }

          // 触发事件
          element.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
          element.dispatchEvent(new Event("change", { bubbles: true, cancelable: true }));
          element.dispatchEvent(new InputEvent("input", { bubbles: true, data: value }));

          // 等待可能的下拉列表渲染
          await sleep(650); // 等待下拉框完全渲染

          // 检查是否弹出了选项列表（某些自动完成输入框）
          const matchingOption = findMatchingOption(value);

          if (matchingOption) {
            console.log(`        🔍 检测到弹出的下拉选项`);
            console.log(`        🎯 找到匹配选项，点击: "${matchingOption.textContent.trim()}"`);
            await clickElement(matchingOption);
            await sleep(300); // 等待选项被选中
            console.log(`        ✅ INPUT 填充成功（通过选项）: "${value}"`);
            return true;
          } else {
            // 没有弹出选项或未找到匹配，直接失焦保留输入值
            console.log(`        ⚠️  未找到匹配选项，保留输入值`);
            element.blur();
            await sleep(100);
          }

          console.log(`        ✅ INPUT 填充成功: "${value}"`);

        } else if (element.isContentEditable) {
          element.focus();
          element.textContent = value;
          element.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
          console.log(`        ✅ ContentEditable 填充成功: "${value}"`);
        }

        return true;
      };

      /**
       * 填充下拉框（增强版）
       */
      const fillSelect = async (element, value) => {
        if (element.tagName !== "SELECT") {
          console.log(`        ⚠️  不是 SELECT 元素，尝试作为自定义下拉框处理`);

          // 可能是自定义下拉框（如 Ant Design、Element UI 等）
          // 点击打开下拉框
          await clickElement(element);
          await sleep(600); // 等待下拉选项完全渲染

          // 查找弹出的选项（不依赖 DOM 监控）
          const matchingOption = findMatchingOption(value);

          if (matchingOption) {
            console.log(`        🎯 找到自定义下拉选项，点击: "${matchingOption.textContent.trim()}"`);
            await clickElement(matchingOption);
            await sleep(400); // 等待选项被完全选中

            // 验证选择是否成功
            await sleep(200);
            const currentValue = element.value || element.textContent.trim();
            console.log(`        🔍 验证选择结果，当前值: "${currentValue}"`);

            console.log(`        ✅ 自定义下拉框填充成功: "${value}"`);
            return true;
          } else {
            console.log(`        ⚠️  未找到匹配的选项: "${value}"`);

            // 尝试关闭弹窗
            await sleep(100);
            const event = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
            document.body.dispatchEvent(event);
            await sleep(100);
            return false;
          }
        }

        // 原生 SELECT 元素 - 辅助函数：触发完整的事件序列
        const triggerSelectEvents = (selectElement, optionValue) => {
          selectElement.value = optionValue;
          selectElement.focus();

          // 触发所有必要的事件，确保各种框架都能捕获
          selectElement.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
          selectElement.dispatchEvent(new Event("change", { bubbles: true, cancelable: true }));
          selectElement.dispatchEvent(new Event("blur", { bubbles: true, cancelable: true }));

          // 某些框架可能需要这些事件
          const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
          selectElement.dispatchEvent(clickEvent);
        };

        const normalizedValue = normalize(value);

        // 1. 精确匹配 value 属性
        for (const option of element.options) {
          if (normalize(option.value) === normalizedValue) {
            triggerSelectEvents(element, option.value);
            console.log(`        ✅ SELECT 精确匹配(value): "${value}"`);
            return true;
          }
        }

        // 2. 精确匹配文本
        for (const option of element.options) {
          if (normalize(option.textContent.trim()) === normalizedValue) {
            triggerSelectEvents(element, option.value);
            console.log(`        ✅ SELECT 精确匹配(text): "${value}"`);
            return true;
          }
        }

        // 3. 模糊匹配：选项包含值
        for (const option of element.options) {
          const optText = normalize(option.textContent.trim());
          if (optText.includes(normalizedValue) && normalizedValue.length >= 2) {
            triggerSelectEvents(element, option.value);
            console.log(`        ✅ SELECT 模糊匹配(contains): "${value}" ≈ "${option.textContent.trim()}"`);
            return true;
          }
        }

        // 4. 反向模糊匹配：值包含选项
        for (const option of element.options) {
          const optText = normalize(option.textContent.trim());
          if (normalizedValue.includes(optText) && optText.length >= 2) {
            triggerSelectEvents(element, option.value);
            console.log(`        ✅ SELECT 反向匹配: "${value}" ⊃ "${option.textContent.trim()}"`);
            return true;
          }
        }

        // 5. 特殊处理：数字匹配（如月份、年份）
        const numValue = value.match(/\d+/);
        if (numValue) {
          for (const option of element.options) {
            const optNum = option.textContent.match(/\d+/);
            if (optNum && optNum[0] === numValue[0]) {
              triggerSelectEvents(element, option.value);
              console.log(`        ✅ SELECT 数字匹配: "${value}" = "${option.textContent.trim()}"`);
              return true;
            }
          }
        }

        console.log(`        ⚠️  SELECT 匹配失败: "${value}"`);
        console.log(`        可选项: `, Array.from(element.options).map(o => o.textContent.trim()));
        return false;
      };

      /**
       * 填充单选下拉框（自定义下拉框）
       * @param {HTMLElement} element - 下拉框元素
       * @param {string} value - 要填充的值
       * @returns {boolean} 是否填充成功
       */
      const fillSelectSingle = async (element, value) => {
        try {
          console.log(`        🔽 单选下拉框填充: "${value}"`);

          // 1. 点击打开下拉框
          await clickElement(element);
          await sleep(600); // 等待下拉选项完全渲染

          // 2. 查找内部输入框（用于筛选选项）
          // 先在元素内部查找
          let internalInput = element.querySelector('input[type="search"], input[type="text"], input.search-input, input[class*="search"]');

          // 如果元素内部没有，在弹出的下拉菜单中查找
          if (!internalInput) {
            const dropdowns = document.querySelectorAll('.ud__select__dropdown, .ant-select-dropdown, .el-select-dropdown, [class*="dropdown"][class*="visible"], [class*="dropdown"][class*="open"]');
            for (const dropdown of dropdowns) {
              if (isElementVisible(dropdown)) {
                internalInput = dropdown.querySelector('input[type="search"], input[type="text"], input.search-input, input[class*="search"]');
                if (internalInput) {
                  console.log(`        🔍 在下拉菜单中找到内部输入框`);
                  break;
                }
              }
            }
          }

          if (internalInput) {
            // 2.1 在内部输入框输入值进行筛选
            console.log(`        ⌨️  找到内部输入框，输入 "${value}" 进行筛选`);
            internalInput.focus();
            internalInput.value = '';

            for (const char of value) {
              internalInput.value += char;
              internalInput.dispatchEvent(new Event('input', { bubbles: true }));
              await sleep(10);
            }

            await sleep(600); // 等待筛选完成
          } else {
            console.log(`        ℹ️  未找到内部输入框，直接搜索选项`);
          }

          // 3. 查找匹配的选项
          const matchingOption = findMatchingOption(value, false, false);

          if (matchingOption) {
            console.log(`        ✓ 找到匹配选项: "${matchingOption.textContent.trim()}"`);

            // 4. 点击选项（单选会自动关闭下拉框）
            await clickElement(matchingOption);
            await sleep(400);

            // 5. 验证选择结果
            const currentValue = element.value || element.textContent.trim();
            console.log(`        ✅ 单选下拉框填充成功: "${value}"，当前值: "${currentValue}"`);
            return true;
          } else {
            console.log(`        ⚠️  未找到匹配选项: "${value}"`);

            // 关闭下拉框
            await clickElement(document.body);
            await sleep(200);
            return false;
          }
        } catch (error) {
          console.error(`        ❌ 单选下拉框填充失败:`, error);
          return false;
        }
      };

      /**
       * 填充多选下拉框（支持多个值，需要勾选 checkbox）
       * @param {HTMLElement} element - 下拉框元素
       * @param {string} value - 要填充的值（多个值用 / 分隔）
       * @returns {boolean} 是否填充成功
       */
      const fillSelectMulti = async (element, value) => {
        try {
          console.log(`        🔽 多选下拉框填充: "${value}"`);

          // 1. 解析多个值（用 / 分隔，如 "深圳/广州"）
          const values = value.split('/').map(v => v.trim()).filter(v => v);
          console.log(`        📋 需要选择 ${values.length} 个选项:`, values);

          // 2. 点击打开下拉框
          await clickElement(element);
          await sleep(600);

          // 2.5 查找内部输入框（用于筛选）
          // 先在元素内部查找
          let internalInput = element.querySelector('input[type="search"], input[type="text"], input.search-input, input[class*="search"]');

          // 如果元素内部没有，在弹出的下拉菜单中查找
          if (!internalInput) {
            const dropdowns = document.querySelectorAll('.ud__select__dropdown, .ant-select-dropdown, .el-select-dropdown, [class*="dropdown"][class*="visible"], [class*="dropdown"][class*="open"]');
            for (const dropdown of dropdowns) {
              if (isElementVisible(dropdown)) {
                internalInput = dropdown.querySelector('input[type="search"], input[type="text"], input.search-input, input[class*="search"]');
                if (internalInput) {
                  console.log(`        🔍 在下拉菜单中找到内部输入框`);
                  break;
                }
              }
            }
          }

          let successCount = 0;

          // 3. 遍历每个值，查找并勾选
          for (let i = 0; i < values.length; i++) {
            const val = values[i];
            console.log(`        🔍 [${i + 1}/${values.length}] 查找选项: "${val}"`);

            if (internalInput) {
              // 3.2 输入值进行筛选
              console.log(`        ⌨️  在内部输入框输入: "${val}"`);
              internalInput.focus();
              internalInput.value = '';

              for (const char of val) {
                internalInput.value += char;
                internalInput.dispatchEvent(new Event('input', { bubbles: true }));
                await sleep(10);
              }

              await sleep(600); // 等待筛选完成
            }

            // 3.3 查找匹配的选项（地区字段需要选择树形结构中最深的节点）
            const matchingOption = findMatchingOption(val, true, true);

            if (matchingOption) {
              console.log(`        ✓ 找到匹配选项: "${matchingOption.textContent.trim()}"`);

              // 3.4 查找并勾选 checkbox
              let checkbox = matchingOption.querySelector('input[type="checkbox"], .ant-checkbox-input, .el-checkbox__input, [role="checkbox"]');

              if (!checkbox) {
                checkbox = matchingOption.querySelector('[class*="checkbox"]');
              }

              if (!checkbox && matchingOption.getAttribute('role') === 'option') {
                // 选项本身可点击
                console.log(`        📌 选项本身可点击，直接点击`);
                await clickElement(matchingOption);
                successCount++;
              } else if (checkbox) {
                // 检查是否已选中
                const isChecked = checkbox.checked ||
                                checkbox.getAttribute('aria-checked') === 'true' ||
                                checkbox.classList.contains('checked');

                console.log(`        🔍 找到checkbox: ${checkbox.tagName}.${checkbox.className}, 已选中: ${isChecked}`);

                if (!isChecked) {
                  console.log(`        ✓ 勾选 checkbox`);
                  await clickElement(checkbox);
                  await sleep(300);
                  successCount++;
                } else {
                  console.log(`        ⏭️  已经选中，跳过`);
                  successCount++;
                }
              } else {
                console.log(`        ⚠️  未找到checkbox，尝试直接点击选项`);
                await clickElement(matchingOption);
                successCount++;
              }

              // 清空筛选输入框（为下一个值做准备）
              if (internalInput && i < values.length - 1) {
                internalInput.value = '';
                internalInput.dispatchEvent(new Event('input', { bubbles: true }));
                await sleep(300);
              }
            } else {
              console.log(`        ⚠️  未找到匹配选项: "${val}"`);
            }
          }

          // 4. 关闭下拉框（点击外部区域或按 ESC）
          console.log(`        ✅ 多选完成，成功 ${successCount}/${values.length} 个选项`);

          // 失焦关闭下拉框
          await blurElement(element);
          await sleep(200);

          // 或者点击外部区域
          await clickElement(document.body);
          await sleep(200);

          return successCount > 0;
        } catch (error) {
          console.error(`        ❌ 多选下拉框填充失败:`, error);
          return false;
        }
      };

      /**
       * 填充单选框
       */
      const fillRadio = async (element, value) => {
        let matched = false;

        if (element.tagName === "INPUT" && element.type === "radio") {
          // 单个 radio
          const label = findRadioLabel(element);
          if (label === value || label.includes(value) || value.includes(label)) {
            element.checked = true;
            element.dispatchEvent(new Event("change", { bubbles: true, cancelable: true }));
            element.dispatchEvent(new Event("click", { bubbles: true, cancelable: true }));
            console.log(`        ✅ RADIO 填充成功: "${value}"`);
            matched = true;
          }
        } else {
          // radio 组
          const radios = element.querySelectorAll('input[type="radio"]');
          for (const radio of radios) {
            const label = findRadioLabel(radio);
            if (label === value || label.includes(value) || value.includes(label)) {
              radio.checked = true;
              radio.dispatchEvent(new Event("change", { bubbles: true, cancelable: true }));
              radio.dispatchEvent(new Event("click", { bubbles: true, cancelable: true }));
              console.log(`        ✅ RADIO 填充成功: "${value}"`);
              matched = true;
              break;
            }
          }
        }

        if (!matched) {
          console.log(`        ⚠️  RADIO 匹配失败: "${value}"`);
        }

        return matched;
      };

      // ========== 主填充逻辑 ==========

      // 全局已填充元素集合（避免重复填充）
      const filledElements = new WeakSet();

      for (const fillGroup of fillValues) {
        const groupName = fillGroup?.name || "未命名分组";
        console.log(`\n📦 处理分组: "${groupName}"`);

        // 匹配本地分组
        const localGroup = pickLocalGroup(localGroups, fillGroup);
        if (!localGroup) {
          console.log(`  ❌ 未找到本地分组，跳过`);
          continue;
        }

        console.log(`  📋 本地分组包含 ${localGroup.fields.length} 个字段`);

        // 遍历填充字段
        for (const fillField of fillGroup.fields) {
          const fillFieldName = (fillField?.name || "").trim();
          console.log(`\n  📝 处理字段: "${fillFieldName}"`);

          // 查找匹配的本地字段
          let localField = (localGroup.fields || []).find((f) => {
            const localName = getFieldDisplayName(f);
            return localName === fillFieldName;
          });

          // 获取或查找输入框
          let blanks = [];
          if (localField && localField.blanks && localField.blanks.length > 0) {
            blanks = localField.blanks;
            console.log(`    ✅ 使用已有的 ${blanks.length} 个输入框`);
          } else {
            console.log(`    ⚠️  没有预定义的输入框，尝试自动查找`);
            const allCandidates = collectCandidates(fillFieldName);

            // 过滤掉已经填充过的元素
            blanks = allCandidates.filter(b => !filledElements.has(b.dom));

            if (blanks.length < allCandidates.length) {
              console.log(`    🔄 过滤掉 ${allCandidates.length - blanks.length} 个已填充元素`);
            }
          }

          if (blanks.length === 0) {
            console.log(`    ❌ 未找到输入框，跳过字段: "${fillFieldName}"`);
            continue;
          }

          // 特殊处理：手机号字段（可能有多个输入框）
          const isPhoneField = /(手机号|电话号码|手机号码|联系电话)/i.test(fillFieldName);

          // 特殊处理：日期范围字段（起始时间和结束时间）
          const isDateRangeField = /(时间|日期|入学|毕业|开始|结束|起止|至今)/i.test(fillFieldName);

          // 特殊处理：地区选择字段（可能是多选或输入框）
          const isRegionField = /(地区|城市|省份|意向城市|期望城市|工作地点|地点)/i.test(fillFieldName);

          if (isPhoneField && fillField.blanks.length > 0) {
            console.log(`    📱 检测到手机号字段，特殊处理`);

            let countryCode = "+86";
            let phoneNumber = "";

            // 根据 blanks 数量决定处理方式
            if (fillField.blanks.length >= 2) {
              // 有两个 blanks：第一个是国家代码，第二个是号码
              countryCode = (fillField.blanks[0]?.value || "+86").toString().trim();
              phoneNumber = (fillField.blanks[1]?.value || "").toString().trim();
              console.log(`      数据格式：分离的国家代码和号码`);
            } else {
              // 只有一个 blank：可能包含国家代码+号码
              let phoneValue = (fillField.blanks[0]?.value || "").toString().trim();

              // 分离国家代码和号码
              if (phoneValue.startsWith("+86") || phoneValue.startsWith("+")) {
                const match = phoneValue.match(/^\+(\d+)\s*(.*)$/);
                if (match) {
                  countryCode = `+${match[1]}`;
                  phoneNumber = match[2].trim();
                }
              } else if (phoneValue.startsWith("86") && phoneValue.length > 11) {
                countryCode = "+86";
                phoneNumber = phoneValue.substring(2).trim();
              } else {
                // 纯号码，没有国家代码
                phoneNumber = phoneValue;
              }
              console.log(`      数据格式：合并的号码`);
            }

            console.log(`      国家代码: ${countryCode}, 号码: ${phoneNumber}`);

            // 如果有多个输入框，第一个可能是地区选择，第二个是号码
            if (blanks.length >= 2) {
              console.log(`      检测到 ${blanks.length} 个输入框，可能是地区+号码组合`);

              // 填充第一个输入框（地区选择）
              if (!filledElements.has(blanks[0].dom)) {
                console.log(`      📌 填充地区选择: "${countryCode}"`);
                blanks[0].dom.scrollIntoView({ block: "center", behavior: "smooth" });
                await sleep(100);

                if (blanks[0].type === "select") {
                  await fillSelect(blanks[0].dom, countryCode);
                } else {
                  await fillInput(blanks[0].dom, countryCode, fillFieldName);
                }

                filledElements.add(blanks[0].dom);
                await sleep(200);
              }

              // 填充第二个输入框（号码）
              if (!filledElements.has(blanks[1].dom)) {
                console.log(`      📌 填充手机号码: "${phoneNumber}"`);
                blanks[1].dom.scrollIntoView({ block: "center", behavior: "smooth" });
                await sleep(100);

                await fillInput(blanks[1].dom, phoneNumber, fillFieldName);
                filledElements.add(blanks[1].dom);
                await blurElement(blanks[1].dom);
                await sleep(150);
              }
            } else if (blanks.length === 1) {
              // 只有一个输入框，直接填充号码（不带国家代码）
              if (!filledElements.has(blanks[0].dom)) {
                console.log(`      📌 填充手机号码: "${phoneNumber}"`);
                blanks[0].dom.scrollIntoView({ block: "center", behavior: "smooth" });
                await sleep(100);

                await fillInput(blanks[0].dom, phoneNumber, fillFieldName);
                filledElements.add(blanks[0].dom);
                await blurElement(blanks[0].dom);
                await sleep(150);
              }
            }
          } else if (isDateRangeField && fillField.blanks.length >= 2 && blanks.length >= 2) {
            // 日期范围字段：起始时间和结束时间
            console.log(`    📅 检测到日期范围字段，特殊处理`);

            const startDate = (fillField.blanks[0]?.value || "").toString().trim();
            const endDate = (fillField.blanks[1]?.value || "").toString().trim();

            console.log(`      起始时间: ${startDate}, 结束时间: ${endDate}`);

            // 填充起始日期（第一个输入框）
            if (startDate && !filledElements.has(blanks[0].dom)) {
              console.log(`      📌 填充起始日期: "${startDate}"`);
              blanks[0].dom.scrollIntoView({ block: "center", behavior: "smooth" });
              await sleep(100);

              await clickElement(blanks[0].dom);
              await sleep(100);

              await fillInput(blanks[0].dom, startDate, fillFieldName);
              filledElements.add(blanks[0].dom);
              await blurElement(blanks[0].dom);
              await sleep(300); // 增加等待时间，确保日期选择器关闭
            }

            // 填充结束日期（第二个输入框）
            if (endDate && !filledElements.has(blanks[1].dom)) {
              console.log(`      📌 填充结束日期: "${endDate}"`);
              blanks[1].dom.scrollIntoView({ block: "center", behavior: "smooth" });
              await sleep(100);

              await clickElement(blanks[1].dom);
              await sleep(100);

              await fillInput(blanks[1].dom, endDate, fillFieldName);
              filledElements.add(blanks[1].dom);
              await blurElement(blanks[1].dom);
              await sleep(300);
            }

            // 如果还有更多输入框和值，继续填充
            for (let i = 2; i < blanks.length && i < fillField.blanks.length; i++) {
              const blank = blanks[i];
              const fillBlank = fillField.blanks[i];
              const value = (fillBlank?.value || "").toString().trim();

              if (!blank.dom || !value || filledElements.has(blank.dom)) {
                continue;
              }

              try {
                console.log(`      📌 填充额外日期字段 ${i}: "${value}"`);
                blank.dom.scrollIntoView({ block: "center", behavior: "smooth" });
                await sleep(100);

                await clickElement(blank.dom);
                await sleep(100);

                await fillInput(blank.dom, value, fillFieldName);
                filledElements.add(blank.dom);
                await blurElement(blank.dom);
                await sleep(300);
              } catch (error) {
                console.error(`      ❌ 填充失败:`, error);
              }
            }
          } else if (isRegionField && fillField.blanks.length > 0) {
            // 地区选择字段：使用新的类型检测和填充函数
            console.log(`    🌍 检测到地区选择字段，使用增强的填充逻辑`);

            // 合并所有 blanks 的值（支持多个城市）
            const regionValue = fillField.blanks
              .map(b => (b.value || "").toString().trim())
              .filter(v => v)
              .join('/');
            console.log(`      地区值: "${regionValue}"`);

            for (let i = 0; i < blanks.length; i++) {
              const blank = blanks[i];

              if (!blank.dom || filledElements.has(blank.dom)) {
                continue;
              }

              try {
                console.log(`      📌 处理地区输入框 ${i}`);
                blank.dom.scrollIntoView({ block: "center", behavior: "smooth" });
                await sleep(100);

                // 使用增强的类型检测（地区字段通常是多选）
                const fieldType = fillField.originalField?.fieldType || 'desiredCity';
                const detectedType = detectElementType(blank.dom, fieldType);

                console.log(`      🔍 类型检测: ${detectedType.type}${detectedType.isMultiSelect ? ' (多选)' : ''}`);

                // 根据检测到的类型填充
                if (detectedType.type === 'select-multi') {
                  // 多选下拉框
                  await fillSelectMulti(blank.dom, regionValue);
                } else if (detectedType.type === 'select-single') {
                  // 单选下拉框（少见，但支持）
                  await fillSelectSingle(blank.dom, regionValue);
                } else {
                  // 普通输入框（直接输入地区名称）
                  await fillInput(blank.dom, regionValue, fillFieldName);
                }

                filledElements.add(blank.dom);
                await blurElement(blank.dom);
                await sleep(200);

                // 通常地区字段只有一个输入框，填充后退出
                break;

              } catch (error) {
                console.error(`      ❌ 地区填充失败:`, error);
              }
            }
          } else {
            // 普通字段：遍历填充每个输入框
            for (let i = 0; i < blanks.length && i < fillField.blanks.length; i++) {
              const blank = blanks[i];
              const fillBlank = fillField.blanks[i];
              const value = (fillBlank?.value || "").toString().trim();

              if (!blank.dom || !value) {
                console.log(`      ⏭️  跳过输入框 ${i}: 无 DOM 或无值`);
                continue;
              }

              // 检查是否已经填充过
              if (filledElements.has(blank.dom)) {
                console.log(`      ⏭️  跳过输入框 ${i}: 已经填充过`);
                continue;
              }

              try {
                console.log(`      📌 填充输入框 ${i}: "${value}"`);

                // 滚动到可见区域
                blank.dom.scrollIntoView({ block: "center", behavior: "smooth" });
                await sleep(100);

                // 点击激活
                await clickElement(blank.dom);
                await sleep(100);

                // 使用增强的类型检测函数（获取字段类型用于判断）
                const fieldType = fillField.originalField?.fieldType || fillFieldName || '';
                const detectedType = detectElementType(blank.dom, fieldType);

                console.log(`      🔍 类型检测结果: ${detectedType.type}${detectedType.isMultiSelect ? ' (多选)' : ''}, 字段类型: ${fieldType}`);

                // 根据检测到的类型填充
                if (detectedType.type === 'select-single') {
                  // 单选下拉框
                  await fillSelectSingle(blank.dom, value);
                } else if (detectedType.type === 'select-multi') {
                  // 多选下拉框
                  await fillSelectMulti(blank.dom, value);
                } else if (detectedType.type === 'input' || detectedType.type === 'textarea') {
                  // 普通输入框或文本域
                  await fillInput(blank.dom, value, fillFieldName);
                } else if (detectedType.type === 'radio') {
                  // 单选按钮
                  await fillRadio(blank.dom, value);
                } else {
                  // 未知类型，尝试使用旧逻辑
                  console.log(`      ⚠️  未知类型，使用默认填充逻辑`);
                  const actualType = blank.type;
                  if (actualType === "input") {
                    await fillInput(blank.dom, value, fillFieldName);
                  } else if (actualType === "select") {
                    await fillSelect(blank.dom, value);
                  } else if (actualType === "radio") {
                    await fillRadio(blank.dom, value);
                  }
                }

                // 标记为已填充
                filledElements.add(blank.dom);

                // 失焦触发验证
                await blurElement(blank.dom);
                await sleep(150);

              } catch (error) {
                console.error(`      ❌ 填充失败:`, error);
              }
            }
          }
        }
      }

      console.log("\n==================== 填充完成 ====================");

    } catch (error) {
      console.error("❌ performFilling 执行出错:", error);
      throw error;
    }
  }

  /**
   * 查找单选框的标签文本
   */
  function findRadioLabel(radio) {
    // 尝试通过for属性查找label
    if (radio.id) {
      const label = document.querySelector(`label[for="${radio.id}"]`);
      if (label) return label.textContent.trim();
    }

    // 尝试查找父级label
    let parent = radio.parentElement;
    while (parent && parent.tagName !== "BODY") {
      if (parent.tagName === "LABEL") {
        return parent.textContent.trim();
      }
      parent = parent.parentElement;
    }

    // 尝试查找相邻的文本节点
    if (radio.nextSibling && radio.nextSibling.nodeType === Node.TEXT_NODE) {
      return radio.nextSibling.textContent.trim();
    }

    // 查找相邻的元素
    let sibling = radio.nextElementSibling;
    if (sibling && sibling.textContent) {
      return sibling.textContent.trim();
    }

    return "";
  }

  // ==================== 统计和历史 ====================

  /**
   * 更新统计数据
   */
  async function updateStatistics() {
    const storage = await chrome.storage.local.get(["websiteCount", "fieldCount"]);
    const websiteCount = Number(storage.websiteCount) || 0;
    const fieldCount = Number(storage.fieldCount) || 0;

    let filledCount = 0;
    for (const group of fillValues) {
      for (const field of group.fields) {
        if (field.value) {
          filledCount++;
        }
      }
    }

    await chrome.storage.local.set({
      websiteCount: websiteCount + 1,
      fieldCount: fieldCount + filledCount
    });
  }

  /**
   * 启动学习模式
   */
  async function startLearningMode() {
    currentUrl = window.location.href;

    // 检查是否启用学习
    const isLearningEnabled = await async function() {
      const storage = await chrome.storage.local.get(["learningResume"]);
      return storage.learningResume !== false;
    }();

    if (!isLearningEnabled) return;

    // 定时检查页面变化
    if (!learningInterval) {
      learningInterval = setInterval(() => {
        if (window.location.href !== currentUrl) {
          clearInterval(learningInterval);
          learningInterval = null;
          currentUrl = window.location.href;
        } else {
          checkAndLearnFieldChanges();
        }
      }, 5000);
    }
  }

  /**
   * 检查并学习字段变化
   */
  function checkAndLearnFieldChanges() {
    const currentHtml = generateSimplifiedHTML();

    if (currentHtml === lastHtmlSnapshot) return;

    if (lastHtmlSnapshot === "") {
      lastHtmlSnapshot = currentHtml;
      return;
    }

    lastHtmlSnapshot = currentHtml;

    chrome.runtime.sendMessage({
      type: "learnField",
      url: window.location.href,
      html: currentHtml
    }, (response) => {});

    window.setStateText("正在智能学习你新填写的内容~");
    window.changeStartButtonState("learning");
  }

  /**
   * 添加投递历史
   */
  async function addDeliveryHistory(company, position) {
    if (window.campusSource) {
      addHistoryRecord("campus", {
        campusId: window.campusSource.campusId
      });
    } else {
      addHistoryRecord("user", {
        url: await findJobPostingUrl(),
        company: company || "未知公司",
        position: position || "未知职位"
      });
    }
  }

  /**
   * 查找职位发布URL
   */
  async function findJobPostingUrl() {
    try {
      const currentUrl = window.location.href;
      const historyUrls = (await chrome.runtime.sendMessage({
        type: "getHistoryUrls"
      })).filter(url => url !== currentUrl);

      const positionKeywords = ["position"];
      const excludeKeywords = ["login", "signin", "register", "resume"];

      // 优先查找包含"position"的URL
      const positionUrl = historyUrls.find(url => {
        const lowerUrl = url.toLowerCase();
        return positionKeywords.some(kw => lowerUrl.includes(kw)) &&
               !excludeKeywords.some(kw => lowerUrl.includes(kw));
      });

      if (positionUrl) return positionUrl;

      // 其次查找不包含排除关键词的URL
      const cleanUrl = historyUrls.find(url => {
        const lowerUrl = url.toLowerCase();
        return !excludeKeywords.some(kw => lowerUrl.includes(kw));
      });

      return cleanUrl || currentUrl;

    } catch (error) {
      return window.location.href;
    }
  }

  /**
   * 添加历史记录
   */
  function addHistoryRecord(source, data) {
    chrome.runtime.sendMessage({
      type: "addHistory",
      source: source,
      data: data
    }, (response) => {});
  }

  // ==================== 错误处理 ====================

  /**
   * 检查网络错误
   */
  function checkNetworkError() {
    if (hasNetworkError) {
      throw new Error("网络响应不正常");
    }
  }

  /**
   * 处理错误
   */
  function handleError(error, startTime, company, resumeId, callback) {
    const errorStack = error.stack || "";
    let functionName = "未知函数";

    if (hasNetworkError) {
      functionName = errorFunctionName;
    } else {
      // 解析错误堆栈
      const lines = errorStack.split("\n");

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();

        if (line.includes("at new Error") || line.includes("at catch")) {
          continue;
        }

        const match = line.match(/at\s+([^\s(]+)|at\s+[^(]*\(([^)]*)\)/);
        if (match) {
          functionName = match[1] || match[2] || "未知函数";
          functionName = functionName.split("/").pop().split(":")[0];

          if (functionName.length <= 3) continue;

          break;
        }
      }
    }

    let errorMessage = "填写出错！我不行了，靠你咯...";

    if (
      hasNetworkError &&
      typeof error.message === "string" &&
      error.message &&
      error.message.length < 100
    ) {
      errorMessage = `填写出错：${error.message}`;
    }

    window.setStateText(errorMessage, "show");
    callback({ status: "error", error: error });

    // 上报错误
    try {
      logError(functionName, String(errorStack), startTime, company, resumeId);
    } catch (err) {
      // 忽略日志错误
    }
  }

  /**
   * 记录错误日志
   */
  function logError(functionName, errorStack, startTime, company, resumeId) {
    const endTime = new Date();
    const duration = Math.floor((endTime - startTime) / 1000);

    let browser = "Unknown";
    if (navigator.userAgent.indexOf("Edg") !== -1) {
      browser = "Edge";
    } else if (navigator.userAgent.indexOf("Chrome") !== -1) {
      browser = "Chrome";
    }

    let version = "Unknown";
    try {
      version = chrome.runtime.getManifest().version;
    } catch (err) {
      // 忽略
    }

    chrome.runtime.sendMessage({
      type: "logError",
      functionName: functionName,
      errorStack: errorStack,
      duration: duration,
      browser: browser,
      version: version,
      resumeId: resumeId,
      company: company || ""
    }, (response) => {});
  }

  // ==================== 工具函数 ====================

  /**
   * 滚动到页面顶部
   */
  async function scrollToTop() {
    try {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      await sleep(50);

      // 滚动所有滚动容器到顶部
      const selectors = [
        "body", "html", "main", '[role="main"]',
        ".main-content", ".content", ".container",
        "section", "article", "div"
      ];

      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);

        for (const element of elements) {
          const style = getComputedStyle(element);

          if (
            element.scrollHeight > element.clientHeight ||
            style.overflowY === "scroll" ||
            style.overflowY === "auto" ||
            style.overflow === "scroll" ||
            style.overflow === "auto"
          ) {
            if (element.scrollTop > 0) {
              element.scrollTop = 0;
              await sleep(10);
            }
          }
        }
      }

      // 滚动高度超过窗口的元素
      const allElements = document.querySelectorAll("*");

      for (const element of allElements) {
        if (element.offsetHeight > window.innerHeight * 1.2 && element.scrollTop > 0) {
          const style = getComputedStyle(element);

          if (style.position !== "fixed" && style.position !== "absolute") {
            element.scrollTop = 0;
            await sleep(10);
          }
        }
      }

      window.scrollTo({ top: 0, left: 0, behavior: "instant" });

    } catch (error) {
      try {
        window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      } catch (err) {
        // 忽略
      }
    }
  }

  // todo
  /**
   * 使用JWT发起请求
   */
  async function fetchWithJwt(url, options = {}) {
    try {
      console.log('🔐 fetchWithJwt 开始请求:', url);
      console.log('📋 请求选项:', options);
      
      const message = {
        type: "fetchWithJwt",
        url: url,
        options: options
      };
      
      console.log('📨 发送消息给 background:', message);
      
      const response = await chrome.runtime.sendMessage(message);
      
      console.log('📬 收到 background 响应:', response);

      if (response.error) {
        console.error('❌ Background 返回错误:', response.error);
        throw new Error(response.error);
      }

      console.log('✅ fetchWithJwt 请求成功');
      return response;

    } catch (error) {
      console.error('❌ fetchWithJwt 失败:', error);
      console.error('错误详情:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      
      hasNetworkError = true;
      errorFunctionName = "fetchWithJwt";
      throw error;
    }
  }

  /**
   * 延迟函数
   */
  function sleep(milliseconds = 1000) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, milliseconds);
    });
  }

  /**
   * 带超时机制的条件等待函数
   * @param {Function} condition - 条件检查函数，返回 true 时停止等待
   * @param {Object} options - 配置选项
   * @param {number} options.timeout - 超时时间（毫秒），默认 30000ms（30秒）
   * @param {number} options.interval - 检查间隔（毫秒），默认 500ms
   * @param {string} options.errorMessage - 超时错误消息
   * @returns {Promise<void>}
   * @throws {Error} 超时时抛出错误
   */
  function waitWithTimeout(condition, options = {}) {
    const {
      timeout = 30000,
      interval = 500,
      errorMessage = '等待超时'
    } = options;

    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      const check = () => {
        try {
          if (condition()) {
            resolve();
            return;
          }

          const elapsed = Date.now() - startTime;
          if (elapsed > timeout) {
            reject(new Error(`${errorMessage}（已等待 ${Math.round(elapsed / 1000)}秒）`));
            return;
          }

          setTimeout(check, interval);
        } catch (error) {
          reject(error);
        }
      };

      check();
    });
  }

  // ==================== 初始化 ====================

  (async () => {
    // 加载配置
    await async function() {
      const storage = await chrome.storage.local.get(["config"]);
      window.config = storage.config;
    }();
  })();

})();

// ==================== 监听网站的 postMessage（用于登录通信） ====================

/**
 * 生成允许的来源白名单（postMessage 安全检查）
 * 使用 config.js 中的 ENV_CONFIG（通过 window.ENV_CONFIG 访问）
 */
const getAllowedOriginsForMessage = () => {
  const origins = [];

  // 从 config.js 加载的环境配置
  const ENV_CONFIG = window.ENV_CONFIG || {};
  console.log('📋 加载的环境配置:', ENV_CONFIG);
  // 添加所有环境的 WEB 和 API 地址
  for (const key in ENV_CONFIG) {
    const env = ENV_CONFIG[key];

    // WEB 地址
    if (env.WEB) {
      const webPort = env.WEB.PORT === "443" ? "" : `:${env.WEB.PORT}`;
      origins.push(`${env.WEB.HOST}${webPort}`);
    }

    // API 地址
    if (env.API) {
      const apiPort = env.API.PORT === "443" || env.API.PORT === "80" ? "" : `:${env.API.PORT}`;
      origins.push(`${env.API.HOST}${apiPort}`);
    }
  }

  // 添加常用的本地开发地址
  origins.push('http://localhost:5173');
  origins.push('http://localhost:3000');
  origins.push('http://localhost:8080');

  // 去重并返回
  return [...new Set(origins)];
};

// 提前生成允许的来源列表（性能优化）
const ALLOWED_MESSAGE_ORIGINS = getAllowedOriginsForMessage();

console.log('🔒 postMessage 安全白名单已加载:', ALLOWED_MESSAGE_ORIGINS);
console.log('📋 配置来源: window.ENV_CONFIG');

window.addEventListener('message', (event) => {
  // 安全检查：验证消息来源
  const isAllowedOrigin = ALLOWED_MESSAGE_ORIGINS.some(origin => event.origin.startsWith(origin));
  
  if (!isAllowedOrigin) {
    return; // 忽略不信任的来源
  }
  
  // 检查消息格式
  if (event.data && event.data.source === 'YINIAN_WEB') {
    console.log('📨 Content Script 收到网站消息:', event.data);
    
    // 处理登录成功消息
    if (event.data.type === 'PLUGIN_LOGIN_SUCCESS' && event.data.auth) {
      console.log('🔐 转发登录消息给 background.js');
      
      // 转发给 background.js（使用内部消息机制）
      chrome.runtime.sendMessage({
        type: 'externalLogin',
        auth: event.data.auth
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('❌ 转发登录消息失败:', chrome.runtime.lastError);
        } else {
          console.log('✅ Background 响应:', response);
          // 可选：通知网站登录成功
          window.postMessage({
            source: 'YINIAN_PLUGIN',
            type: 'LOGIN_ACK',
            success: true
          }, '*');
        }
      });
    }
    
    // 处理退出登录消息
    if (event.data.type === 'PLUGIN_LOGOUT') {
      console.log('🚪 转发退出登录消息给 background.js');
      
      // 转发给 background.js
      chrome.runtime.sendMessage({
        type: 'externalLogout'
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('❌ 转发退出登录消息失败:', chrome.runtime.lastError);
        } else {
          console.log('✅ 退出登录成功:', response);
          // 可选：通知网站退出成功
          window.postMessage({
            source: 'YINIAN_PLUGIN',
            type: 'LOGOUT_ACK',
            success: true
          }, '*');
        }
      });
    }
  }
});
