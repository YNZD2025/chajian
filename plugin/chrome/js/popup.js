// 一念 - 智能填充面板逻辑（格式化和注释版本）
// 用途：控制简历切换、任务背景输入和一键智能填充功能

"use strict";

import { WEB_URL } from "./config.js";

document.addEventListener("DOMContentLoaded", async () => {
  // 简历切换相关元素
  const bookWrapper = document.querySelector(".book-wrapper");
  const resumePageCurrent = document.querySelector(".resume-page-current");
  const resumePageNext = document.querySelector(".resume-page-next");

  // 简历信息显示元素
  const resumeAvatar = document.querySelector(".resume-avatar");
  const resumeName = document.querySelector(".resume-name");
  const resumeType = document.querySelector(".resume-type");
  const infoGridCompact = document.querySelector(".info-grid-compact");

  // 功能按钮
  const fillBtn = document.querySelector(".liquid-cta-btn");
  const taskInput = document.querySelector(".task-input");

  // 从存储中初始化状态
  const state = await chrome.storage.local.get([
    "currentResume",
    "resumeList",
    "taskBackground",
    "fillHistory"
  ]);

  // 初始化简历数据
  if (state.resumeList && state.resumeList.length > 0) {
    const currentResumeIndex = state.currentResume || 0;
    renderCurrentResume(state.resumeList[currentResumeIndex]);

    // 如果有下一份简历，渲染预览
    const nextResumeIndex = (currentResumeIndex + 1) % state.resumeList.length;
    renderNextResume(state.resumeList[nextResumeIndex]);
  } else {
    // TODO: 如果没有简历数据，显示默认提示或引导用户添加简历
    console.log("没有可用的简历数据");
  }

  // 恢复上次的任务背景输入
  if (state.taskBackground) {
    taskInput.value = state.taskBackground;
  }

  // === 事件监听器 ===

  // 简历切换事件（点击卡片切换到下一份简历）
  bookWrapper.addEventListener("click", () => {
    // TODO: 实现简历切换逻辑
    // 1. 获取当前简历索引
    // 2. 切换到下一份简历
    // 3. 保存新的当前简历索引到存储
    // 4. 重新渲染页面
    console.log("切换简历");
  });

  // 一键智能填充按钮事件
  fillBtn.addEventListener("click", async () => {
    // TODO: 实现一键智能填充逻辑
    // 1. 获取当前标签页信息
    // 2. 检查是否在招聘网站上
    // 3. 获取简历数据和任务背景
    // 4. 调用内容脚本执行填充
    // 5. 记录填充历史
    // 6. 显示填充结果反馈
    console.log("执行一键填充");
  });

  // 任务背景输入事件（自动保存）
  taskInput.addEventListener("input", debounce(() => {
    chrome.storage.local.set({ taskBackground: taskInput.value });
  }, 500));

  // 任务背景失焦事件（失焦时保存）
  taskInput.addEventListener("blur", () => {
    chrome.storage.local.set({ taskBackground: taskInput.value });
  });

  // === 简历渲染函数 ===

  /**
   * 渲染当前简历信息
   * @param {Object} resume - 简历数据对象
   */
  function renderCurrentResume(resume) {
    if (!resume) return;

    // TODO: 根据实际简历数据结构调整字段映射
    resumeAvatar.src = resume.avatar || "https://i.pravatar.cc/150?img=47";
    resumeName.textContent = resume.name || "Unnamed";
    resumeType.textContent = resume.type || "Chinese Resume (Default)";

    // 清空并重新填充信息网格
    infoGridCompact.innerHTML = "";

    // TODO: 根据实际简历数据结构调整字段
    const fields = [
      { label: "School", value: resume.school || "-" },
      { label: "Education", value: resume.education || "-" },
      { label: "Major", value: resume.major || "-" },
      { label: "Graduation", value: resume.graduationYear || "-" },
      { label: "Phone", value: maskPhone(resume.phone) || "-" },
      { label: "Email", value: maskEmail(resume.email) || "-" },
      { label: "Position", value: resume.targetPosition || "-" },
      { label: "City", value: resume.expectedCity || "-" }
    ];

    fields.forEach(field => {
      const cell = createInfoCell(field.label, field.value);
      infoGridCompact.appendChild(cell);
    });

    // 核心技能（跨2列）
    if (resume.skills) {
      const skillsCell = createInfoCell("Core Skills", resume.skills, true);
      infoGridCompact.appendChild(skillsCell);
    }
  }

  /**
   * 渲染下一份简历预览
   * @param {Object} resume - 简历数据对象
   */
  function renderNextResume(resume) {
    if (!resume) return;

    // TODO: 根据实际简历数据结构调整预览显示
    const previewContent = `
      <div style="text-align:right; font-size:8px; color:var(--primary); font-weight:bold; margin-bottom:6px;">
        ${resume.type || "Resume B"}
      </div>
      <div style="font-size:10px; font-weight:bold; color:#ccc;">
        ${resume.name || "Unnamed"}
      </div>
      <div class="skeleton-text"></div>
      <div class="skeleton-block"></div>
    `;

    resumePageNext.innerHTML = previewContent;
  }

  /**
   * 创建信息单元格元素
   * @param {string} label - 标签文本
   * @param {string} value - 值文本
   * @param {boolean} fullWidth - 是否跨2列
   * @returns {HTMLElement}
   */
  function createInfoCell(label, value, fullWidth = false) {
    const cell = document.createElement("div");
    cell.className = "info-cell";
    if (fullWidth) {
      cell.style.gridColumn = "span 2";
    }

    cell.innerHTML = `
      <div class="info-cell-label">${label}</div>
      <div class="info-cell-value">${value}</div>
    `;

    return cell;
  }

  /**
   * 掩码电话号码
   * @param {string} phone - 电话号码
   * @returns {string}
   */
  function maskPhone(phone) {
    if (!phone) return "";
    return phone.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2");
  }

  /**
   * 掩码电子邮件地址
   * @param {string} email - 电子邮件地址
   * @returns {string}
   */
  function maskEmail(email) {
    if (!email) return "";
    return email.replace(/(.{2}).*(@.*)/, "$1***$2");
  }
});

/**
 * 防抖函数
 * @param {Function} func - 要防抖的函数
 * @param {number} wait - 等待时间（毫秒）
 * @returns {Function}
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * 向所有标签页内容脚本广播消息
 * @param {Object} message - 要发送的消息对象
 */
function broadcastToContent(message) {
  chrome.tabs.query({}, (tabs) => {
    for (const tab of tabs) {
      chrome.tabs.sendMessage(tab.id, message).catch(() => {
        // 忽略无法接收消息的标签页（例如 chrome:// 页面）
      });
    }
  });
}
