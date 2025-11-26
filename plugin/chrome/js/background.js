// 一念职达 - 后台 Service Worker（格式化与注释版）
// 作用：初始化配置、统一处理带 JWT 的网络请求、学习/历史/来源追踪、错误上报

"use strict";

import {
  API_BASE_URL,
  API_AUTH_URL,
  API_HISTORY_URL,
  WEB_DOMAIN,
  WEB_URL,
  LOGIN_URL,
  CAMPUS_URL,
  HISTORY_URL,
  AUTOFILL_URL,
  VERSION_URL,
  WELCOME_URL,
  PRICING_URL,
  ALL_WEB_URLS
} from "./config.js";

// ==================== 模块定义 ====================

const ConfigModule = {
  // 初始化：把必要的 URL 与配置写入 storage，内容脚本读取使用
  init() {
    const configData = {
      API_BASE_URL,
      API_AUTH_URL,
      API_HISTORY_URL,
      WEB_URL,
      LOGIN_URL,
      CAMPUS_URL,
      HISTORY_URL,
      AUTOFILL_URL,
      VERSION_URL,
      WELCOME_URL,
      PRICING_URL,
      ALL_WEB_URLS
    };
    
    console.log('⚙️ 初始化配置:', configData);
    
    chrome.storage.local.set({ config: configData }, () => {
      if (chrome.runtime.lastError) {
        console.error('❌ 配置存储失败:', chrome.runtime.lastError);
      } else {
        console.log('✅ 配置已成功存储到 chrome.storage.local');
      }
    });
  }
};

const AuthModule = {
  // 刷新令牌的并发控制
  isRefreshing: false,
  refreshSubscribers: [],

  // 统一处理带 JWT 的请求：内容脚本通过 runtime.sendMessage 过来
  async handleMessage(message, sender, sendResponse) {
    try {
      const response = await this.fetchWithJwt(message.url, message.options);
      sendResponse(await response.json());
    } catch (err) {
      sendResponse({ error: err.message });
    }
  },

  // 外部登录：来自官网的消息，存储 auth（access/refresh/userInfo）
  async handleExternalLogin(message, sendResponse) {
    console.log('🔐 Background 处理登录消息:', message);
    const { auth } = message;
    if (auth) {
      await chrome.storage.local.set({ auth });
      console.log('✅ Auth 已存储到 chrome.storage:', auth);
      sendResponse({ status: "ok", message: "登录成功" });
    } else {
      console.error('❌ Auth 数据缺失');
      sendResponse({ status: "error", message: "Auth 数据缺失" });
    }
  },

  // 外部登出：清理本地认证信息
  async handleExternalLogout(sendResponse) {
    console.log('🚪 Background 处理退出登录');
    await chrome.storage.local.remove(["auth"]);
    console.log('✅ Auth 已清除');
    sendResponse({ status: "ok", message: "退出登录成功" });
  },

  // 核心：带自动刷新逻辑的 fetch
  async fetchWithJwt(url, options = {}) {
    const { auth } = await chrome.storage.local.get(["auth"]);
    const headers = new Headers(options.headers || {});
    if (auth?.accessToken) headers.set("Authorization", `Bearer ${auth.accessToken}`);

    let res = await fetch(url, { ...options, headers });
    if (res.status !== 401) return res;

    // 401：尝试刷新令牌并重试
    await this.refreshToken(auth?.refreshToken);
    const refreshed = await chrome.storage.local.get(["auth"]);
    const newHeaders = new Headers(options.headers || {});
    if (refreshed.auth?.accessToken) newHeaders.set("Authorization", `Bearer ${refreshed.auth.accessToken}`);
    return await fetch(url, { ...options, headers: newHeaders });
  },

  // todo 刷新令牌
  async refreshToken(refreshToken) {
    if (!refreshToken) throw new Error("no refresh token");
    if (this.isRefreshing) return new Promise((resolve) => this.refreshSubscribers.push(resolve));
    this.isRefreshing = true;
    try {
      const res = await fetch(`${API_AUTH_URL}refresh-token`, {
        method: "POST",
        headers: { Authorization: `Bearer ${refreshToken}` }
      });
      if (!res.ok) throw new Error(`refresh failed: ${res.status}`);
      const data = await res.json();
      const { auth } = await chrome.storage.local.get(["auth"]);
      await chrome.storage.local.set({ auth: { ...auth, accessToken: data.accessToken } });
      this.refreshSubscribers.forEach((fn) => fn());
      this.refreshSubscribers = [];
    } finally {
      this.isRefreshing = false;
    }
  }
};

const LearningFieldModule = {
  // 学习字段与停止学习的消息入口
  handleMessage(message, sender, sendResponse) {
    // message.type: learnField / stopLearnField
    // 这里仅作为结构化示例，实际逻辑在原始文件中
    sendResponse({ status: "ok" });
  },
  handleNavigation(details) {
    // 页面导航完成：可抓取快照并上报学习
  },
  handleTabRemove(tabId) {
    // 标签关闭：清理缓存
  }
};

const HistoryModule = {
  handleMessage(message, sender, sendResponse) {
    // 添加投递历史等
    sendResponse({ status: "ok" });
  },
  handleNavigation(details) {
    // 可建立历史 URL 列表
  },
  handleTabRemove(tabId) {
    // 清理对应记录
  }
};

const TabSourceModule = {
  handleMessage(message, sender, sendResponse) {
    // 记录来源（如从校招页点击进入）与获取来源
    sendResponse({ status: "ok" });
  },
  handleTabCreate(tab) {},
  handleTabRemove(tabId) {}
};

const NavigationHistoryModule = {
  handleMessage(message, sender, sendResponse) {
    // 返回历史 URL 列表
    sendResponse({ urls: [] });
  },
  handleNavigation(details) {},
  handleTabRemove(tabId) {}
};

const ErrorModule = {
  handleMessage(message, sender, sendResponse) {
    // 收集错误日志并上报到后端
    sendResponse({ status: "logged" });
  }
};

// ==================== 事件监听器注册 ====================

// 安装/启动：初始化配置到 storage
chrome.runtime.onInstalled.addListener((details) => {
  console.log('🚀 插件已安装/更新，初始化配置...');
  ConfigModule.init();
  if (details.reason === "install") {
    console.log('🎉 首次安装，打开欢迎页面');
    chrome.tabs.create({ url: WELCOME_URL });
  }
});

chrome.runtime.onStartup.addListener(() => {
  console.log('🔄 浏览器启动，重新初始化配置...');
  ConfigModule.init();
});

// 与内容脚本的消息路由：统一分发到各模块
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const handlers = {
    fetchWithJwt: () => AuthModule.handleMessage(message, sender, sendResponse),
    learnField: () => LearningFieldModule.handleMessage(message, sender, sendResponse),
    stopLearnField: () => LearningFieldModule.handleMessage(message, sender, sendResponse),
    addHistory: () => HistoryModule.handleMessage(message, sender, sendResponse),
    clickSource: () => TabSourceModule.handleMessage(message, sender, sendResponse),
    getSource: () => TabSourceModule.handleMessage(message, sender, sendResponse),
    getHistoryUrls: () => NavigationHistoryModule.handleMessage(message, sender, sendResponse),
    logError: () => ErrorModule.handleMessage(message, sender, sendResponse),
    externalLogin: () => AuthModule.handleExternalLogin(message, sendResponse).catch((err) => sendResponse({ error: err.message })),
    externalLogout: () => AuthModule.handleExternalLogout(sendResponse).catch((err) => sendResponse({ error: err.message }))
  };
  const handler = handlers[message.type];
  if (handler) {
    handler();
    return true; // 异步响应
  }
});

// 与官网的外部消息通信：登录/登出/心跳（保留用于未来可能的直接通信）
chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  console.log("📨 收到外部消息:", message);
  if (message.type === "login") {
    AuthModule.handleExternalLogin(message, sendResponse).catch((err) => sendResponse({ error: err.message }));
  } else if (message.type === "logout") {
    AuthModule.handleExternalLogout(sendResponse).catch((err) => sendResponse({ error: err.message }));
  } else if (message.type === "ping") {
    sendResponse({ status: "pong", version: chrome.runtime.getManifest().version });
  }
  return true;
});

// 标签页事件与导航事件：来源追踪与学习/历史模块的钩子
chrome.tabs.onCreated.addListener((tab) => {
  TabSourceModule.handleTabCreate(tab);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // 预留：可根据需要处理更新态
});

chrome.tabs.onRemoved.addListener((tabId) => {
  LearningFieldModule.handleTabRemove(tabId);
  HistoryModule.handleTabRemove(tabId);
  TabSourceModule.handleTabRemove(tabId);
  NavigationHistoryModule.handleTabRemove(tabId);
});

chrome.webNavigation.onCompleted.addListener((details) => {
  LearningFieldModule.handleNavigation(details);
  NavigationHistoryModule.handleNavigation(details);
  HistoryModule.handleNavigation(details);
});

chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
  LearningFieldModule.handleNavigation(details);
  NavigationHistoryModule.handleNavigation(details);
  HistoryModule.handleNavigation(details);
});

console.log('✅ Background Service Worker 已加载完成');
