/**
 * 状态弹窗交互逻辑
 * 功能：控制悬浮按钮和状态弹窗的显示/隐藏，接收并展示状态文本
 */

(function() {
  'use strict';

  // 获取DOM元素
  const floatButton = document.getElementById('float-status-button');
  const statusPopup = document.getElementById('status-popup');
  const closeButton = statusPopup ? statusPopup.querySelector('.status-popup-close') : null;
  const statusMessage = document.getElementById('status-message');

  // 弹窗状态
  let isPopupOpen = false;

  /**
   * 切换弹窗显示状态
   */
  function togglePopup() {
    if (!statusPopup) return;

    isPopupOpen = !isPopupOpen;

    if (isPopupOpen) {
      statusPopup.classList.add('show');
      // 添加按钮激活状态
      if (floatButton) {
        floatButton.style.transform = 'scale(1.1) rotate(10deg)';
      }
    } else {
      statusPopup.classList.remove('show');
      // 恢复按钮状态
      if (floatButton) {
        floatButton.style.transform = '';
      }
    }
  }

  /**
   * 关闭弹窗
   */
  function closePopup() {
    if (!statusPopup) return;

    isPopupOpen = false;
    statusPopup.classList.remove('show');

    // 恢复按钮状态
    if (floatButton) {
      floatButton.style.transform = '';
    }
  }

  /**
   * 更新状态消息
   * @param {string} text - 要显示的状态文本
   */
  function updateStatusText(text) {
    if (!statusMessage) return;

    // 更新消息内容
    statusMessage.textContent = text || '准备就绪';

    // 添加动画效果
    statusMessage.style.animation = 'none';
    setTimeout(() => {
      statusMessage.style.animation = 'messageSlideIn 0.4s ease';
    }, 10);

    // 如果弹窗未打开，自动打开并显示新消息
    if (!isPopupOpen) {
      togglePopup();

      // 5秒后自动关闭（如果用户没有交互）
      setTimeout(() => {
        if (isPopupOpen && !statusPopup.matches(':hover')) {
          closePopup();
        }
      }, 5000);
    }
  }

  // 绑定悬浮按钮点击事件
  if (floatButton) {
    floatButton.addEventListener('click', (e) => {
      e.stopPropagation();
      togglePopup();
    });

    // 添加悬停提示效果
    floatButton.addEventListener('mouseenter', () => {
      if (!isPopupOpen) {
        floatButton.title = '点击查看任务状态';
      }
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
    if (isPopupOpen && statusPopup && !statusPopup.contains(e.target) && !floatButton.contains(e.target)) {
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
      updateStatusText(event.data.text);
    }
  });

  console.log('状态弹窗脚本已加载');
})();
