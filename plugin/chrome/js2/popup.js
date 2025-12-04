"use strict";

/**
 * ============================================================================
 * 一念职达 (Job Ark) - Popup 弹窗脚本
 * ============================================================================
 *
 * 此文件是 Chrome 扩展弹窗页面的交互脚本
 * 负责处理以下功能：
 * - 设置选项的读取和保存
 * - 用户登录状态显示
 * - 统计数据展示
 * - 向 Content Script 广播设置变更
 *
 * @author 一念职达团队
 * @version 基于 Manifest V3 规范
 */

import { WEB_URL, LOGIN_URL } from "./config.js";

// ============================================================================
// DOM 加载完成后初始化
// ============================================================================

document.addEventListener("DOMContentLoaded", async () => {
    // ========================================================================
    // 获取 DOM 元素
    // ========================================================================

    // 按钮显示模式单选框
    const arcButtonShow = document.querySelector("#arcButtonShow");      // 始终显示
    const arcButtonHidden = document.querySelector("#arcButtonHidden");  // 始终隐藏
    const arcButtonAuto = document.querySelector("#arcButtonAuto");      // 自动检测

    // 功能开关复选框
    const beautifyButton = document.querySelector("#beautifyButton");    // 美化简历
    const learningButton = document.querySelector("#learningButton");    // 学习功能
    const highlightButton = document.querySelector("#highlightButton");  // 高亮显示

    // ========================================================================
    // 加载保存的设置
    // ========================================================================

    const storage = await chrome.storage.local.get([
        "arcButtonMode",
        "showArc",           // 旧版兼容
        "beautifyResume",
        "learningResume",
        "highlightEnabled"
    ]);

    // 初始化按钮显示模式
    if (storage.arcButtonMode) {
        // 使用新版设置
        if (storage.arcButtonMode === "show") {
            arcButtonShow.checked = true;
        } else if (storage.arcButtonMode === "hidden") {
            arcButtonHidden.checked = true;
        } else {
            arcButtonAuto.checked = true;
        }
    } else {
        // 兼容旧版设置，并迁移到新格式
        if (storage.showArc === false) {
            arcButtonHidden.checked = true;
        } else {
            arcButtonAuto.checked = true;
        }
        // 迁移到新的存储格式
        chrome.storage.local.set({
            arcButtonMode: storage.showArc === false ? "hidden" : "auto"
        });
    }

    // 初始化功能开关
    beautifyButton.checked = storage.beautifyResume === true;
    learningButton.checked = storage.learningResume !== false;  // 默认开启
    highlightButton.checked = storage.highlightEnabled !== false;  // 默认开启

    // ========================================================================
    // 按钮显示模式事件监听
    // ========================================================================

    /**
     * 始终显示模式
     */
    arcButtonShow.addEventListener("change", () => {
        if (arcButtonShow.checked) {
            chrome.storage.local.set({ arcButtonMode: "show" });
            broadcastArcButtonMode("show");
        }
    });

    /**
     * 始终隐藏模式
     */
    arcButtonHidden.addEventListener("change", () => {
        if (arcButtonHidden.checked) {
            chrome.storage.local.set({ arcButtonMode: "hidden" });
            broadcastArcButtonMode("hidden");
        }
    });

    /**
     * 自动检测模式
     */
    arcButtonAuto.addEventListener("change", () => {
        if (arcButtonAuto.checked) {
            chrome.storage.local.set({ arcButtonMode: "auto" });
            broadcastArcButtonMode("auto");
        }
    });

    // ========================================================================
    // 功能开关事件监听
    // ========================================================================

    /**
     * 美化简历开关
     */
    beautifyButton.addEventListener("change", () => {
        chrome.storage.local.set({ beautifyResume: beautifyButton.checked });
        broadcastBeautifyResume(beautifyButton.checked);
    });

    /**
     * 学习功能开关
     */
    learningButton.addEventListener("change", () => {
        chrome.storage.local.set({ learningResume: learningButton.checked });
    });

    /**
     * 高亮显示开关
     */
    highlightButton.addEventListener("change", () => {
        chrome.storage.local.set({ highlightEnabled: highlightButton.checked });
        broadcastHighlight(highlightButton.checked);
    });

    // ========================================================================
    // 统计数据显示
    // ========================================================================

    chrome.storage.local.get(["websiteCount", "fieldCount"], function (data) {
        document.querySelector("#websiteCount").textContent = data.websiteCount || "0";
        document.querySelector("#fieldCount").textContent = data.fieldCount || "0";
    });

    // ========================================================================
    // 底部链接
    // ========================================================================

    /**
     * 访问一念职达按钮
     */
    const visitArcButton = document.querySelector("#visitArc");
    visitArcButton.addEventListener("click", () => {
        chrome.tabs.create({ url: WEB_URL });
    });

    // ========================================================================
    // 用户登录状态
    // ========================================================================

    /**
     * 登出按钮
     */
    const logoutButton = document.querySelector("#logout");
    logoutButton.addEventListener("click", async () => {
        await chrome.storage.local.remove(["auth"]);
        authData = null;
        showLoggedOutState();
    });

    // 获取认证信息
    let { auth: authData } = await chrome.storage.local.get(["auth"]);

    const profileElement = document.querySelector(".profile");

    /**
     * 显示未登录状态
     */
    const showLoggedOutState = () => {
        document.querySelector(".profile-name").textContent = "点击登录";
        document.querySelector("#logout").style.display = "none";
    };

    // 根据登录状态显示不同内容
    if (authData?.userInfo) {
        // 已登录
        document.querySelector(".profile-name").textContent =
            "一念职达 · " + authData.userInfo.nickname;
        document.querySelector("#logout").style.display = "block";
    } else {
        // 未登录
        showLoggedOutState();
    }

    /**
     * 点击头像区域
     * 已登录：跳转到简历页
     * 未登录：跳转到登录页
     */
    profileElement.addEventListener("click", async () => {
        if (authData?.userInfo) {
            chrome.tabs.create({ url: WEB_URL });
        } else {
            chrome.tabs.create({ url: LOGIN_URL });
        }
    });
});

// ============================================================================
// 广播消息到所有标签页
// ============================================================================

/**
 * 广播按钮显示模式变更
 * @param {string} mode - 显示模式：show/hidden/auto
 */
const broadcastArcButtonMode = async (mode) => {
    sendMessageToAllTabs("toggleArcButtonMode", mode);
};

/**
 * 广播高亮开关变更
 * @param {boolean} enabled - 是否启用
 */
const broadcastHighlight = async (enabled) => {
    sendMessageToAllTabs("toggleHighlight", enabled);
};

/**
 * 广播美化简历开关变更
 * @param {boolean} enabled - 是否启用
 */
const broadcastBeautifyResume = async (enabled) => {
    sendMessageToAllTabs("toggleBeautifyResume", enabled);
};

/**
 * 向所有标签页发送消息
 *
 * @param {string} action - 动作类型
 * @param {*} state - 状态值
 *
 * 注意：
 * - 使用 Promise.allSettled 确保即使某些标签页发送失败也不影响其他标签页
 * - 捕获错误但不抛出，因为某些标签页可能没有注入 Content Script
 */
const sendMessageToAllTabs = async (action, state) => {
    try {
        // 获取所有标签页
        const tabs = await chrome.tabs.query({});

        // 向每个标签页发送消息
        const promises = tabs.map((tab) => {
            return chrome.tabs.sendMessage(tab.id, {
                action: action,
                tabId: tab.id,
                state: state
            }).catch((error) => {
                // 静默处理错误（标签页可能没有 Content Script）
            });
        });

        // 等待所有消息发送完成
        await Promise.allSettled(promises);
    } catch (error) {
        // 处理错误
        if (error.message.includes("Could not establish connection")) {
            statusMessage.textContent = "无法连接到页面，请刷新页面后重试。";
        } else {
            statusMessage.textContent = `开启插件时出错: ${error.message}`;
        }
    }
};
