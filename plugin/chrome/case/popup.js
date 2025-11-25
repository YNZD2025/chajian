// 求职方舟 - 扩展面板逻辑（格式化与注释版）
// 作用：控制悬浮按钮模式、高亮/美化/学习开关、统计与快捷入口
// 注意：不影响原运行文件，本文件为可读维护版本

"use strict";

import { WEB_URL } from "../config.js";

document.addEventListener("DOMContentLoaded", async () => {
  // 单选：悬浮按钮模式
  const arcShow = document.querySelector("#arcButtonShow");
  const arcHidden = document.querySelector("#arcButtonHidden");
  const arcAuto = document.querySelector("#arcButtonAuto");

  // 开关：美化、学习、高亮
  const beautifyBtn = document.querySelector("#beautifyButton");
  const learningBtn = document.querySelector("#learningButton");
  const highlightBtn = document.querySelector("#highlightButton");

  // 初始化状态
  const state = await chrome.storage.local.get([
    "arcButtonMode",
    "showArc",
    "beautifyResume",
    "learningResume",
    "highlightEnabled"
  ]);

  if (state.arcButtonMode) {
    arcShow.checked = state.arcButtonMode === "show";
    arcHidden.checked = state.arcButtonMode === "hidden";
    arcAuto.checked = state.arcButtonMode === "auto";
  } else {
    arcHidden.checked = state.showArc === false;
    arcAuto.checked = state.showArc !== false;
    chrome.storage.local.set({ arcButtonMode: state.showArc === false ? "hidden" : "auto" });
  }

  beautifyBtn.checked = state.beautifyResume === true;
  learningBtn.checked = state.learningResume !== false;
  highlightBtn.checked = state.highlightEnabled !== false;

  // 悬浮按钮模式事件
  arcShow.addEventListener("change", () => {
    if (arcShow.checked) {
      chrome.storage.local.set({ arcButtonMode: "show" });
      broadcastToContent({ action: "toggleArcButtonMode", state: "show" });
    }
  });
  arcHidden.addEventListener("change", () => {
    if (arcHidden.checked) {
      chrome.storage.local.set({ arcButtonMode: "hidden" });
      broadcastToContent({ action: "toggleArcButtonMode", state: "hidden" });
    }
  });
  arcAuto.addEventListener("change", () => {
    if (arcAuto.checked) {
      chrome.storage.local.set({ arcButtonMode: "auto" });
      broadcastToContent({ action: "toggleArcButtonMode", state: "auto" });
    }
  });

  // 功能开关事件
  beautifyBtn.addEventListener("change", () => {
    chrome.storage.local.set({ beautifyResume: beautifyBtn.checked });
    broadcastToContent({ action: "toggleBeautifyResume", state: beautifyBtn.checked });
  });
  learningBtn.addEventListener("change", () => {
    chrome.storage.local.set({ learningResume: learningBtn.checked });
  });
  highlightBtn.addEventListener("change", () => {
    chrome.storage.local.set({ highlightEnabled: highlightBtn.checked });
    broadcastToContent({ action: "toggleHighlight", state: highlightBtn.checked });
  });

  // 战绩统计
  chrome.storage.local.get(["websiteCount", "fieldCount"], (stats) => {
    document.querySelector("#websiteCount").textContent = stats.websiteCount || "0";
    document.querySelector("#fieldCount").textContent = stats.fieldCount || "0";
  });

  // 快捷入口
  document.querySelector("#visitArc").addEventListener("click", () => {
    chrome.tabs.create({ url: WEB_URL });
  });
  document.querySelector("#logout").addEventListener("click", async () => {
    await chrome.storage.local.remove(["auth"]);
  });
});

// 将设置广播到所有标签页内容脚本
function broadcastToContent(message) {
  chrome.tabs.query({}, (tabs) => {
    for (const tab of tabs) {
      chrome.tabs.sendMessage(tab.id, message);
    }
  });
}

