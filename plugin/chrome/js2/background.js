"use strict";

/**
 * ============================================================================
 * 一念职达  - Background Service Worker
 * ============================================================================
 *
 * 此文件是 Chrome 扩展的后台服务工作线程 (Service Worker)
 * 负责处理以下核心功能：
 * - JWT 认证和 Token 管理
 * - 消息路由（Content Script ↔ Background）
 * - 标签页状态追踪
 * - API 请求代理
 * - 用户行为学习数据收集
 * - 投递历史记录管理
 *
 * @author 一念职达团队
 * @version 基于 Manifest V3 规范
 */

// ============================================================================
// 导入配置模块
// ============================================================================
import {
    API_BASE_URL,           // 基础 API 地址
    API_AUTH_URL,           // 认证 API 地址
    API_HISTORY_URL,        // 历史记录 API 地址
    API_RESUME_URL,         // 简历管理 API 地址
    WEB_DOMAIN,             // 网站域名
    WEB_URL,                // 网站完整 URL
    LOGIN_URL,              // 登录页面 URL
    CAMPUS_URL,             // 校招页面 URL
    HISTORY_URL,            // 历史记录页面 URL
    AUTOFILL_URL,           // 自动填充页面 URL
    VERSION_URL,            // 版本信息 URL
    WELCOME_URL,            // 欢迎页面 URL
    PRICING_URL,            // 定价页面 URL
    ALL_WEB_URLS            // 所有网站 URL 列表
} from "./config.js";

// ============================================================================
// Chrome 扩展生命周期事件监听
// ============================================================================

/**
 * 扩展安装/更新事件
 * - 初始化配置
 * - 首次安装时打开欢迎页面
 */
chrome.runtime.onInstalled.addListener((details) => {
    ConfigModule.init();
    if (details.reason === "install") {
        chrome.tabs.create({ url: WELCOME_URL });
    }
});

/**
 * 浏览器启动事件
 * - 重新初始化配置
 */
chrome.runtime.onStartup.addListener((event) => {
    ConfigModule.init();
});

// ============================================================================
// 内部消息通信 (Content Script → Background)
// ============================================================================

/**
 * 处理来自 Content Script 的消息
 * 根据消息类型路由到对应的处理模块
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // 消息类型到处理函数的映射表
    const messageHandlers = {
        // 带 JWT 的 API 请求
        fetchWithJwt: () => AuthModule.handleMessage(message, sender, sendResponse),

        // 学习字段相关
        learnField: () => LearningFieldModule.handleMessage(message, sender, sendResponse),
        stopLearnField: () => LearningFieldModule.handleMessage(message, sender, sendResponse),

        // 投递历史
        addHistory: () => HistoryModule.handleMessage(message, sender, sendResponse),

        // 来源追踪
        clickSource: () => TabSourceModule.handleMessage(message, sender, sendResponse),
        getSource: () => TabSourceModule.handleMessage(message, sender, sendResponse),

        // 导航历史
        getHistoryUrls: () => NavigationHistoryModule.handleMessage(message, sender, sendResponse),

        // 错误日志
        logError: () => ErrorModule.handleMessage(message, sender, sendResponse),

        // 评分功能
        checkStarRating: () => StarRatingModule.handleCheckMessage(message, sender, sendResponse),
        uploadStarRating: () => StarRatingModule.handleUploadMessage(message, sender, sendResponse),

        // 登录/登出（来自 messageBridge.js 的转发）
        login: () => {

            AuthModule.handleExternalLogin(message, sendResponse)
                .catch((error) => sendResponse({ error: error.message }));
        },
        logout: () => {

            AuthModule.handleExternalLogout(sendResponse)
                .catch((error) => sendResponse({ error: error.message }));
        },

        // 打开新标签页
        openTab: () => {

            if (message.url) {
                chrome.tabs.create({ url: message.url })
                    .then(() => {

                        sendResponse({ success: true });
                    })
                    .catch((error) => {
                        console.error("✗ 创建新标签页失败:", error);
                        sendResponse({ success: false, error: error.message });
                    });
            } else {
                console.error("✗ 缺少 URL 参数");
                sendResponse({ success: false, error: "缺少 URL 参数" });
            }
        }
    };

    // 查找并执行对应的处理函数
    const handler = messageHandlers[message.type];
    if (handler) {
        handler();
        return true; // 保持消息通道开启（用于异步响应）
    }
});

// ============================================================================
// 外部消息通信 (官网 → 扩展)
// ============================================================================

/**
 * 处理来自外部网站（官网）的消息
 * 用于登录状态同步
 */
chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {

    if (message.type === "login") {
        // 处理登录同步
        AuthModule.handleExternalLogin(message, sendResponse)
            .catch((error) => sendResponse({ error: error.message }));
    } else if (message.type === "logout") {
        // 处理登出同步
        AuthModule.handleExternalLogout(sendResponse)
            .catch((error) => sendResponse({ error: error.message }));
    } else if (message.type === "ping") {
        // 扩展存活检测
        sendResponse({
            status: "pong",
            version: chrome.runtime.getManifest().version
        });
    }
    return true; // 保持消息通道开启
});

// ============================================================================
// 标签页事件监听
// ============================================================================

/**
 * 新标签页创建事件
 * - 追踪标签页的来源
 */
chrome.tabs.onCreated.addListener((tab) => {
    TabSourceModule.handleTabCreate(tab);
});

/**
 * 标签页更新事件（URL 变化、加载状态等）
 * 当前未使用，预留扩展
 */
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // 预留：可在此处添加标签页更新逻辑
});

/**
 * 标签页关闭事件
 * - 清理各模块中该标签页的相关数据
 */
chrome.tabs.onRemoved.addListener((tabId) => {
    LearningFieldModule.handleTabRemove(tabId);
    HistoryModule.handleTabRemove(tabId);
    TabSourceModule.handleTabRemove(tabId);
    NavigationHistoryModule.handleTabRemove(tabId);
});

// ============================================================================
// 网页导航事件监听
// ============================================================================

/**
 * 页面加载完成事件
 * - 触发学习数据保存
 * - 更新导航历史
 * - 处理投递记录
 */
chrome.webNavigation.onCompleted.addListener((details) => {
    LearningFieldModule.handleNavigation(details);
    NavigationHistoryModule.handleNavigation(details);
    HistoryModule.handleNavigation(details);
});

/**
 * 历史状态更新事件（SPA 单页应用的路由变化）
 * - 处理不刷新页面的 URL 变化
 */
chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
    LearningFieldModule.handleNavigation(details);
    NavigationHistoryModule.handleNavigation(details);
    HistoryModule.handleNavigation(details);
});

// ============================================================================
// 配置模块 (ConfigModule)
// ============================================================================

/**
 * 配置模块
 * 负责将配置信息存储到 chrome.storage.local
 * 供 Content Script 和其他模块使用
 */
const ConfigModule = {
    /**
     * 初始化配置
     * 将所有 API 和 URL 配置写入本地存储
     */
    init() {
        chrome.storage.local.set({
            config: {
                API_BASE_URL,
                API_AUTH_URL,
                API_HISTORY_URL,
                API_RESUME_URL,
                WEB_URL,
                LOGIN_URL,
                CAMPUS_URL,
                HISTORY_URL,
                AUTOFILL_URL,
                VERSION_URL,
                WELCOME_URL,
                PRICING_URL,
                ALL_WEB_URLS
            }
        });
    }
};

// ============================================================================
// 认证模块 (AuthModule)
// ============================================================================

/**
 * 认证模块
 * 负责 JWT Token 管理、刷新和认证状态维护
 */
const AuthModule = {
    // 是否正在刷新 Token
    isRefreshing: false,

    // Token 刷新订阅者列表（用于并发请求时的 Token 刷新）
    refreshSubscribers: [],

    /**
     * 处理来自 Content Script 的 fetchWithJwt 请求
     * @param {Object} message - 消息对象，包含 url 和 options
     * @param {Object} sender - 发送者信息
     * @param {Function} sendResponse - 响应回调函数
     */
    async handleMessage(message, sender, sendResponse) {
        try {

            const response = await this.fetchWithJwt(message.url, message.options);

            const jsonData = await response.json();

            sendResponse(jsonData);
        } catch (error) {
            console.error("[AuthModule] 请求失败:", error.message);
            sendResponse({ error: error.message });
        }
    },

    /**
     * 处理来自官网的登录同步
     * @param {Object} message - 包含 token 信息的消息
     * @param {Function} sendResponse - 响应回调函数
     */
    async handleExternalLogin(message, sendResponse) {
        try {
            const tokenData = message.data.token;
            // 将认证信息存储到本地
            await chrome.storage.local.set({
                auth: {
                    token: tokenData.accessToken,
                    refreshToken: tokenData.refreshToken,
                    userInfo: tokenData.userInfo
                }
            });
            sendResponse({ status: "success" });
        } catch (error) {
            sendResponse({ status: "error", message: error.message });
        }
    },

    /**
     * 处理来自官网的登出同步
     * @param {Function} sendResponse - 响应回调函数
     */
    async handleExternalLogout(sendResponse) {
        try {
            // 清除认证信息
            await chrome.storage.local.remove(["auth"]);
            sendResponse({ status: "success" });
        } catch (error) {
            sendResponse({ status: "error", message: error.message });
        }
    },

    /**
     * 带 JWT 认证的 fetch 请求
     * 自动处理 Token 过期和刷新
     *
     * @param {string} url - 请求 URL
     * @param {Object} options - fetch 选项
     * @returns {Promise<Response>} - fetch 响应
     * @throws {Error} - 未登录或请求失败时抛出错误
     */
    async fetchWithJwt(url, options = {}) {

        // 获取存储的认证信息
        const { auth } = await chrome.storage.local.get(["auth"]);

        if (!auth?.token) {
            console.error("[AuthModule.fetchWithJwt] 未登录");
            throw new Error("未登录");
        }

        /**
         * 执行带 Token 的请求
         * @param {string} token - JWT Token
         */
        const executeRequest = async (token) => {

            return await fetch(url, {
                ...options,
                headers: {
                    ...options.headers,
                    Authorization: `Bearer ${token}`
                }
            });
        };

        try {
            // 首次请求

            let response = await executeRequest(auth.token);

            // 处理 401 未授权（Token 过期）
            if (response.status === 401) {
                // 如果正在刷新 Token，则等待刷新完成
                if (this.isRefreshing) {
                    return new Promise((resolve, reject) => {
                        this.subscribeTokenRefresh((newToken) => {
                            executeRequest(newToken).then(resolve).catch(reject);
                        });
                    });
                }

                // 开始刷新 Token
                try {
                    this.isRefreshing = true;
                    const newToken = await this.refreshToken();
                    this.onRefreshed(newToken);
                    response = await executeRequest(newToken);
                } catch (error) {
                    this.onRefreshError();
                    throw error;
                } finally {
                    this.isRefreshing = false;
                }
            }

            // 处理非 200 响应
            if (!response.ok) {
                const errorData = await response.json();
                if (errorData.detail) {
                    throw new Error(errorData.detail);
                }
                throw new Error("请求失败");
            }

            return response;
        } catch (error) {
            console.error("[AuthModule.fetchWithJwt] 捕获到错误:", error);
            console.error("[AuthModule.fetchWithJwt] 错误类型:", error.constructor.name);
            console.error("[AuthModule.fetchWithJwt] 错误消息:", error.message);
            throw error;
        }
    },

    /**
     * 刷新 Access Token
     * @returns {Promise<string>} - 新的 Access Token
     * @throws {Error} - 刷新失败时抛出错误
     */
    async refreshToken() {
        const { auth } = await chrome.storage.local.get(["auth"]);

        if (!auth?.refreshToken) {
            throw new Error("未登录");
        }

        // 调用刷新 Token API
        const response = await fetch(`${API_AUTH_URL}refresh-token`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${auth.refreshToken}`
            }
        });

        if (!response.ok) {
            throw new Error("刷新token失败");
        }

        const data = await response.json();

        if (!data?.accessToken) {
            throw new Error("刷新token返回数据格式错误");
        }

        // 更新存储的 Token
        await chrome.storage.local.set({
            auth: {
                ...auth,
                token: data.accessToken
            }
        });

        return data.accessToken;
    },

    /**
     * 订阅 Token 刷新完成事件
     * @param {Function} callback - 刷新完成后的回调函数
     */
    subscribeTokenRefresh(callback) {
        this.refreshSubscribers.push(callback);
    },

    /**
     * Token 刷新完成，通知所有订阅者
     * @param {string} newToken - 新的 Token
     */
    onRefreshed(newToken) {
        this.refreshSubscribers.map((callback) => callback(newToken));
        this.refreshSubscribers = [];
    },

    /**
     * Token 刷新失败，清空订阅者
     */
    onRefreshError() {
        this.refreshSubscribers = [];
    }
};

// ============================================================================
// 学习字段模块 (LearningFieldModule)
// ============================================================================

/**
 * 学习字段模块
 * 收集用户在表单中填写的字段数据，用于改进自动填充算法
 */
const LearningFieldModule = {
    // 上次发送数据的时间戳（防止频繁发送）
    lastSendTime: 0,

    /**
     * 获取所有正在学习的标签页数据
     * @returns {Promise<Object>} - 标签页 ID 到学习数据的映射
     */
    async getLearningTabs() {
        const { learningTabs = {} } = await chrome.storage.local.get("learningTabs");
        return learningTabs;
    },

    /**
     * 设置指定标签页的学习数据
     * @param {number} tabId - 标签页 ID
     * @param {Object} data - 学习数据
     */
    async setTab(tabId, data) {
        const tabs = await this.getLearningTabs();
        tabs[tabId] = data;
        await chrome.storage.local.set({ learningTabs: tabs });
    },

    /**
     * 移除指定标签页的学习数据
     * @param {number} tabId - 标签页 ID
     */
    async removeTab(tabId) {
        const tabs = await this.getLearningTabs();
        delete tabs[tabId];
        await chrome.storage.local.set({ learningTabs: tabs });
    },

    /**
     * 处理来自 Content Script 的消息
     * @param {Object} message - 消息对象
     * @param {Object} sender - 发送者信息
     * @param {Function} sendResponse - 响应回调
     */
    async handleMessage(message, sender, sendResponse) {
        const tabId = sender.tab.id;
        const learningData = {
            url: message.url,
            version: chrome.runtime.getManifest().version,
            html: message.html
        };

        if (message.type === "learnField") {
            // 开始学习：保存数据到标签页
            await this.setTab(tabId, learningData);
            sendResponse({ status: `已收到新的学习数据 ${message.html.length}` });
        } else if (message.type === "stopLearnField") {
            // 停止学习：移除标签页数据并上传到服务器
            await this.removeTab(tabId);
            await this.triggerSaveToServer(learningData, sendResponse);
        } else {
            sendResponse({ status: "error", message: "未知的消息类型" });
        }
    },

    /**
     * 处理页面导航事件
     * 当用户离开页面时，自动保存学习数据
     * @param {Object} details - 导航详情
     */
    async handleNavigation(details) {
        // 仅处理主框架
        if (details.frameId !== 0) return;

        const tabs = await this.getLearningTabs();
        const tabData = tabs[details.tabId];

        if (!tabData) return;

        // 移除标签页数据并上传
        await this.removeTab(details.tabId);
        await this.triggerSaveToServer(tabData);
    },

    /**
     * 处理标签页关闭事件
     * @param {number} tabId - 标签页 ID
     */
    async handleTabRemove(tabId) {
        const tabs = await this.getLearningTabs();
        if (tabs[tabId]) {
            await this.removeTab(tabId);
        }
    },

    /**
     * 触发数据保存到服务器
     * 包含防抖机制，10秒内不重复发送
     * @param {Object} data - 学习数据
     * @param {Function|null} sendResponse - 可选的响应回调
     */
    async triggerSaveToServer(data, sendResponse = null) {
        const now = Date.now();

        // 防抖：10秒内不重复发送
        if (now - this.lastSendTime < 10000) {
            if (sendResponse) {
                sendResponse({ status: "已忽略回传，距离上次回传不足10秒" });
            }
            return;
        }

        const url = `${API_BASE_URL}learningField`;
        await this.saveToServer(url, data);
        this.lastSendTime = now;

        if (sendResponse) {
            sendResponse({ status: `已保存数据 ${data.html.length}` });
        }
    },

    /**
     * 将数据保存到服务器
     * @param {string} url - API 地址
     * @param {Object} data - 要保存的数据
     */
    async saveToServer(url, data) {
        try {
            const response = await AuthModule.fetchWithJwt(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            });
            await response.json();
        } catch (error) {
            // 静默失败，不影响用户体验
        }
    }
};

// ============================================================================
// 投递历史模块 (HistoryModule)
// ============================================================================

/**
 * 投递历史模块
 * 管理用户的职位投递记录
 */
const HistoryModule = {
    /**
     * 获取所有待处理的历史记录标签页
     * @returns {Promise<Object>} - 标签页 ID 到历史数据的映射
     */
    async getHistoryTabs() {
        const { historyTabs = {} } = await chrome.storage.local.get("historyTabs");
        return historyTabs;
    },

    /**
     * 设置指定标签页的历史数据
     * @param {number} tabId - 标签页 ID
     * @param {Object} data - 历史数据
     */
    async setTab(tabId, data) {
        const tabs = await this.getHistoryTabs();
        tabs[tabId] = data;
        await chrome.storage.local.set({ historyTabs: tabs });
    },

    /**
     * 移除指定标签页的历史数据
     * @param {number} tabId - 标签页 ID
     */
    async removeTab(tabId) {
        const tabs = await this.getHistoryTabs();
        delete tabs[tabId];
        await chrome.storage.local.set({ historyTabs: tabs });
    },

    /**
     * 处理来自 Content Script 的消息
     * @param {Object} message - 消息对象
     * @param {Object} sender - 发送者信息
     * @param {Function} sendResponse - 响应回调
     */
    async handleMessage(message, sender, sendResponse) {
        const tabId = sender.tab.id;
        const historyData = {
            source: message.source,  // 来源（如 campus）
            data: message.data       // 投递数据
        };

        await this.setTab(tabId, historyData);
        sendResponse({
            status: `已收到新的投递记录数据 ${message.data.campusId || ""}`
        });
    },

    /**
     * 处理页面导航事件
     * 当用户离开页面时，自动保存投递记录
     * @param {Object} details - 导航详情
     */
    async handleNavigation(details) {
        // 仅处理主框架
        if (details.frameId !== 0) return;

        const tabs = await this.getHistoryTabs();
        const tabData = tabs[details.tabId];

        if (!tabData) return;

        // 移除并上传数据
        await this.removeTab(details.tabId);

        const url = `${API_HISTORY_URL}addHistoryByChrome`;
        const result = await this.saveToServer(url, tabData);

        // 如果是校招来源且保存成功，通知官网更新
        if (
            tabData.source === "campus" &&
            tabData.data.campusId &&
            result?.success &&
            result?.data?.historyId
        ) {
            this.sendHistoryIdToWebsite(tabData.data.campusId, result.data.historyId);
        }
    },

    /**
     * 处理标签页关闭事件
     * @param {number} tabId - 标签页 ID
     */
    async handleTabRemove(tabId) {
        await this.removeTab(tabId);
    },

    /**
     * 将历史记录保存到服务器
     * @param {string} url - API 地址
     * @param {Object} data - 历史数据
     * @returns {Promise<Object|null>} - 服务器响应或 null
     */
    async saveToServer(url, data) {
        try {
            const response = await AuthModule.fetchWithJwt(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            });
            return await response.json();
        } catch (error) {
            // 静默失败
        }
        return null;
    },

    /**
     * 向官网发送历史记录 ID
     * 用于同步校招投递状态
     * @param {string} campusId - 校招 ID
     * @param {string} historyId - 历史记录 ID
     */
    async sendHistoryIdToWebsite(campusId, historyId) {
        try {
            // 查找所有打开的官网标签页
            const tabs = await chrome.tabs.query({ url: `${WEB_DOMAIN}/*` });

            for (const tab of tabs) {
                chrome.tabs.sendMessage(tab.id, {
                    type: "addHistoryCampusId",
                    data: {
                        campusId: campusId,
                        historyId: historyId
                    }
                }).catch((error) => {
                    // 忽略发送失败（标签页可能已关闭）
                });
            }
        } catch (error) {
            // 静默失败
        }
    }
};

// ============================================================================
// 标签页来源追踪模块 (TabSourceModule)
// ============================================================================

/**
 * 标签页来源追踪模块
 * 追踪用户从哪个页面跳转到目标页面
 */
const TabSourceModule = {
    // 待分配的来源（用于新标签页）
    pendingSource: null,

    /**
     * 获取所有标签页的来源映射
     * @returns {Promise<Object>} - 标签页 ID 到来源的映射
     */
    async getSourceMap() {
        const { tabSourceMap = {} } = await chrome.storage.local.get("tabSourceMap");
        return tabSourceMap;
    },

    /**
     * 设置指定标签页的来源
     * @param {number} tabId - 标签页 ID
     * @param {string} source - 来源标识
     */
    async setSource(tabId, source) {
        const sourceMap = await this.getSourceMap();
        sourceMap[tabId] = source;
        await chrome.storage.local.set({ tabSourceMap: sourceMap });
    },

    /**
     * 移除指定标签页的来源
     * @param {number} tabId - 标签页 ID
     */
    async removeSource(tabId) {
        const sourceMap = await this.getSourceMap();
        delete sourceMap[tabId];
        await chrome.storage.local.set({ tabSourceMap: sourceMap });
    },

    /**
     * 处理来自 Content Script 的消息
     * @param {Object} message - 消息对象
     * @param {Object} sender - 发送者信息
     * @param {Function} sendResponse - 响应回调
     */
    async handleMessage(message, sender, sendResponse) {
        const tabId = sender.tab.id;

        if (message.type === "clickSource") {
            // 记录点击来源，等待新标签页创建时分配
            this.pendingSource = message.source;
            sendResponse({ status: "success" });
        } else if (message.type === "getSource") {
            // 获取当前标签页的来源
            const sourceMap = await this.getSourceMap();
            sendResponse({ source: sourceMap[tabId] });
        }
    },

    /**
     * 处理新标签页创建事件
     * 为新标签页分配来源
     * @param {chrome.tabs.Tab} tab - 新创建的标签页
     */
    async handleTabCreate(tab) {
        if (!tab.openerTabId) return;

        if (this.pendingSource) {
            // 如果有待分配的来源，使用它
            await this.setSource(tab.id, this.pendingSource);
            this.pendingSource = null;
        } else {
            // 否则继承父标签页的来源
            const sourceMap = await this.getSourceMap();
            const parentSource = sourceMap[tab.openerTabId];
            if (parentSource) {
                await this.setSource(tab.id, parentSource);
            }
        }
    },

    /**
     * 处理标签页关闭事件
     * @param {number} tabId - 标签页 ID
     */
    async handleTabRemove(tabId) {
        await this.removeSource(tabId);
    }
};

// ============================================================================
// 导航历史模块 (NavigationHistoryModule)
// ============================================================================

/**
 * 导航历史模块
 * 记录每个标签页的浏览历史（最近 5 条）
 */
const NavigationHistoryModule = {
    /**
     * 获取所有标签页的导航历史
     * @returns {Promise<Object>} - 标签页 ID 到 URL 数组的映射
     */
    async getHistoryMap() {
        const { navigationHistory = {} } = await chrome.storage.local.get("navigationHistory");
        return navigationHistory;
    },

    /**
     * 设置指定标签页的导航历史
     * @param {number} tabId - 标签页 ID
     * @param {Array<string>} history - URL 历史数组
     */
    async setHistory(tabId, history) {
        const historyMap = await this.getHistoryMap();
        historyMap[tabId] = history;
        await chrome.storage.local.set({ navigationHistory: historyMap });
    },

    /**
     * 移除指定标签页的导航历史
     * @param {number} tabId - 标签页 ID
     */
    async removeHistory(tabId) {
        const historyMap = await this.getHistoryMap();
        delete historyMap[tabId];
        await chrome.storage.local.set({ navigationHistory: historyMap });
    },

    /**
     * 处理页面导航事件
     * 记录新的 URL 到历史
     * @param {Object} details - 导航详情
     */
    async handleNavigation(details) {
        // 仅处理主框架
        if (details.frameId !== 0) return;

        const historyMap = await this.getHistoryMap();
        let history = historyMap[details.tabId] || [];

        // 避免记录重复的 URL
        if (history.length && history[history.length - 1] === details.url) {
            return;
        }

        // 添加新 URL
        history.push(details.url);

        // 只保留最近 5 条记录
        if (history.length > 5) {
            history.shift();
        }

        await this.setHistory(details.tabId, history);
    },

    /**
     * 处理标签页关闭事件
     * @param {number} tabId - 标签页 ID
     */
    async handleTabRemove(tabId) {
        await this.removeHistory(tabId);
    },

    /**
     * 处理来自 Content Script 的消息
     * @param {Object} message - 消息对象
     * @param {Object} sender - 发送者信息
     * @param {Function} sendResponse - 响应回调
     */
    async handleMessage(message, sender, sendResponse) {
        if (message.type === "getHistoryUrls") {
            const historyMap = await this.getHistoryMap();
            const history = historyMap[sender.tab.id] || [];
            // 返回逆序的历史（最新的在前）
            sendResponse([...history].reverse());
        }
    }
};

// ============================================================================
// 错误日志模块 (ErrorModule)
// ============================================================================

/**
 * 错误日志模块
 * 收集并上报扩展运行时的错误信息
 */
const ErrorModule = {
    /**
     * 处理来自 Content Script 的错误日志消息
     * @param {Object} message - 消息对象
     * @param {Object} sender - 发送者信息
     * @param {Function} sendResponse - 响应回调
     */
    async handleMessage(message, sender, sendResponse) {
        try {
            const {
                functionName,   // 出错的函数名
                duration,       // 持续时间
                errorStack,     // 错误堆栈
                company,        // 公司名称
                resumeId,       // 简历 ID
                browser,        // 浏览器信息
                version         // 扩展版本
            } = message;

            const tabId = sender.tab.id;
            const url = sender.tab.url;

            // 上报错误到服务器
            await this.saveErrorToServer({
                functionName,
                errorStack,
                duration,
                browser,
                version,
                resumeId,
                company,
                url
            });

            sendResponse({ status: "success" });
        } catch (error) {
            sendResponse({ status: "error", message: error.message });
        }
    },

    /**
     * 将错误日志保存到服务器
     * @param {Object} errorData - 错误数据
     * @returns {Promise<Object>} - 服务器响应
     */
    async saveErrorToServer(errorData) {
        try {
            const url = `${API_BASE_URL}logError`;
            const response = await AuthModule.fetchWithJwt(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(errorData)
            });
            return await response.json();
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
};

// ============================================================================
// 评分模块 (StarRatingModule)
// ============================================================================

/**
 * 评分模块
 * 处理用户评分截图的上传和状态检查
 */
const StarRatingModule = {
    /**
     * 检查用户是否已上传评分截图
     * @param {Object} message - 消息对象
     * @param {Object} sender - 发送者信息
     * @param {Function} sendResponse - 响应回调
     */
    async handleCheckMessage(message, sender, sendResponse) {
        try {
            const url = `${API_BASE_URL}isStarRatingUploaded`;
            const response = await AuthModule.fetchWithJwt(url, {
                method: "GET"
            });

            const result = await response.json();

            if (result.success && result.data && result.data.uploaded === true) {
                sendResponse({ uploaded: true });
            } else {
                sendResponse({ uploaded: false });
            }
        } catch (error) {
            sendResponse({ uploaded: false, error: error.message });
        }
    },

    /**
     * 上传用户的评分截图
     * @param {Object} message - 消息对象，包含 imageData 和 imageType
     * @param {Object} sender - 发送者信息
     * @param {Function} sendResponse - 响应回调
     */
    async handleUploadMessage(message, sender, sendResponse) {
        try {
            const { imageData, imageType } = message;

            // 创建 FormData 对象
            const formData = new FormData();

            // 将 Base64 图片数据转换为 Blob
            const base64Data = atob(imageData.split(",")[1]);
            const byteArray = new Array(base64Data.length);

            for (let i = 0; i < base64Data.length; i++) {
                byteArray[i] = base64Data.charCodeAt(i);
            }

            const uint8Array = new Uint8Array(byteArray);
            const blob = new Blob([uint8Array], { type: "image/png" });

            // 添加图片到表单
            formData.append("image", blob, "starRating.png");

            // 上传到服务器
            const url = `${API_BASE_URL}uploadStarRating`;
            const response = await AuthModule.fetchWithJwt(url, {
                method: "POST",
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                // 标记为已上传
                await chrome.storage.local.set({ starRatingUploaded: true });
                sendResponse({ success: true, data: result.data });
            } else {
                sendResponse({
                    success: false,
                    error: result.detail || "上传失败"
                });
            }
        } catch (error) {
            sendResponse({ success: false, error: error.message });
        }
    }
};

// ============================================================================
// 全局导出
// ============================================================================

/**
 * 将所有模块挂载到全局对象
 * 便于调试和其他脚本访问
 */
Object.assign(globalThis, {
    AuthModule,
    LearningFieldModule,
    HistoryModule,
    TabSourceModule,
    NavigationHistoryModule,
    ErrorModule,
    StarRatingModule
});
