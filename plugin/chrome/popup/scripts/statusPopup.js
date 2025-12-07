/**
 * 状态弹窗交互逻辑
 * 功能：控制悬浮按钮和状态弹窗的显示/隐藏，接收并展示状态文本
 */

(function() {
  'use strict';

  // 获取DOM元素
  const fillButton = document.getElementById('fill-action-btn');
  const statusPopup = document.getElementById('status-popup');
  const closeButton = statusPopup ? statusPopup.querySelector('.status-popup-close') : null;
  const statusMessage = document.getElementById('status-message');
  const btnIcon = fillButton ? fillButton.querySelector('i') : null;
  const btnText = fillButton ? fillButton.querySelector('.btn-text') : null;

  // 弹窗状态
  let isPopupOpen = false;
  let currentStatus = 'idle'; // idle, processing, success, error

  /**
   * 切换弹窗显示状态
   */
  function togglePopup() {
    if (!statusPopup) return;

    isPopupOpen = !isPopupOpen;

    if (isPopupOpen) {
      statusPopup.classList.add('show');
    } else {
      statusPopup.classList.remove('show');
    }
  }

  /**
   * 关闭弹窗
   */
  function closePopup() {
    if (!statusPopup) return;

    isPopupOpen = false;
    statusPopup.classList.remove('show');
  }

  /**
   * 更新状态消息
   * @param {string} text - 要显示的状态文本
   * @param {string} type - 状态类型: 'processing'(进行中), 'success'(成功), 'error'(错误), 'idle'(空闲)
   */
  function updateStatusText(text, type = 'processing') {
    if (!statusMessage) return;

    currentStatus = type;

    // 更新消息内容
    statusMessage.textContent = text || '准备就绪';

    // 根据状态类型更新样式
    statusMessage.className = 'status-message';
    if (type === 'error') {
      statusMessage.classList.add('status-error');
    } else if (type === 'success') {
      statusMessage.classList.add('status-success');
    } else if (type === 'processing') {
      statusMessage.classList.add('status-processing');
    }

    // 更新填充按钮状态
    updateFillButton(type, text);

    // 添加动画效果
    statusMessage.style.animation = 'none';
    setTimeout(() => {
      statusMessage.style.animation = 'messageSlideIn 0.4s ease';
    }, 10);

    // 如果弹窗未打开，自动打开并显示新消息
    if (!isPopupOpen) {
      togglePopup();

      // 根据状态类型决定自动关闭时间
      const autoCloseDelay = type === 'error' ? 10000 : 5000; // 错误消息显示更长时间
      setTimeout(() => {
        if (isPopupOpen && !statusPopup.matches(':hover')) {
          closePopup();
        }
      }, autoCloseDelay);
    }
  }

  /**
   * 更新填充按钮状态
   * @param {string} type - 状态类型
   * @param {string} text - 状态文本
   */
  function updateFillButton(type, text) {
    if (!btnIcon || !fillButton || !btnText) return;

    // 移除所有状态类
    fillButton.classList.remove('btn-processing', 'btn-success', 'btn-error', 'btn-idle');

    // 根据状态设置图标和样式
    switch(type) {
      case 'processing':
        btnIcon.className = 'fas fa-pause-circle';
        // 格式化为："暂停填充：状态文本"
        const statusText = text || '处理中...';
        btnText.textContent = `暂停填充：${statusText}`;
        fillButton.classList.add('btn-processing');
        // 处理中状态仍然允许点击（用于暂停）
        fillButton.style.pointerEvents = 'auto';
        break;
      case 'success':
        btnIcon.className = 'fas fa-check-circle';
        btnText.textContent = '填充完成';
        fillButton.classList.add('btn-success');
        fillButton.style.pointerEvents = 'auto';
        // 3秒后恢复初始状态
        setTimeout(() => {
          if (currentStatus === 'success') {
            resetButton();
          }
        }, 3000);
        break;
      case 'error':
        btnIcon.className = 'fas fa-exclamation-triangle';
        btnText.textContent = text || '出错了';
        fillButton.classList.add('btn-error');
        fillButton.style.pointerEvents = 'auto';
        // 5秒后恢复初始状态
        setTimeout(() => {
          if (currentStatus === 'error') {
            resetButton();
          }
        }, 5000);
        break;
      default: // idle
        resetButton();
    }
  }

  /**
   * 重置按钮到初始状态
   */
  function resetButton() {
    if (!btnIcon || !fillButton || !btnText) return;

    btnIcon.className = 'fas fa-bolt';
    btnText.textContent = '一键智能填充';
    fillButton.classList.remove('btn-processing', 'btn-success', 'btn-error', 'btn-idle');
    fillButton.style.pointerEvents = 'auto';
    currentStatus = 'idle';
  }

  // 绑定填充按钮点击事件（查看状态）
  if (fillButton) {
    // 右键点击查看详细状态
    fillButton.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      togglePopup();
    });

    // 添加悬停提示
    fillButton.addEventListener('mouseenter', () => {
      fillButton.title = '右键查看详细状态';
    });
  }

  // 绑定关闭按钮点击事件
  if (closeButton) {
    closeButton.addEventListener('click', (e) => {
      e.stopPropagation();
      closePopup();
    });
  }

  // 点击弹窗外部关闭
  document.addEventListener('click', (e) => {
    if (isPopupOpen && statusPopup && !statusPopup.contains(e.target) && fillButton && !fillButton.contains(e.target)) {
      closePopup();
    }
  });

  // 阻止弹窗内部点击事件冒泡
  if (statusPopup) {
    statusPopup.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }

  // 暴露全局接口，供外部调用
  window.updateStatusPopup = updateStatusText;

  // 监听来自content script的消息
  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'updateStatus') {
      updateStatusText(event.data.text, event.data.status || 'processing');
    }
  });

  // 监听来自background script的消息（通过chrome.runtime）
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.type === 'updateStatus') {
        updateStatusText(request.text, request.status || 'processing');
        sendResponse({ success: true });
      }
      return true;
    });
  }

})();
