// 消息桥接脚本
// 用于桥接网页的 window.postMessage() 和扩展的 chrome.runtime.sendMessage()

"use strict";

(function() {
    /**
     * 监听来自网页的 postMessage 消息
     * 将消息转发到 background.js
     */
    window.addEventListener('message', (event) => {
        // 只处理来自同一窗口的消息
        if (event.source !== window) {
            return;
        }

        const message = event.data;

        // 检查消息格式
        if (!message || typeof message !== 'object') {
            return;
        }

        // 只处理来自一念职达 Web 端的消息
        if (message.source !== 'YINIAN_WEB') {
            return;
        }
        // 根据消息类型处理
        if (message.type === 'PLUGIN_LOGIN_SUCCESS') {
            // 提取登录数据
            const authData = message.auth;

            if (!authData) {
                console.error("❌ [消息桥接] 登录消息缺少 auth 数据");
                return;
            }
            // 转发给 background.js
            chrome.runtime.sendMessage({
                type: 'login',
                data: {
                    token: authData
                }
            }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error("❌ [消息桥接] 发送消息到 background 失败:", chrome.runtime.lastError.message);
                } else {
                    // 回传成功消息给网页
                    window.postMessage({
                        source: 'YINIAN_EXTENSION',
                        type: 'PLUGIN_LOGIN_RESPONSE',
                        success: true,
                        response: response
                    }, '*');
                }
            });
        } else if (message.type === 'PLUGIN_LOGOUT') {
            // 转发登出消息
            chrome.runtime.sendMessage({
                type: 'logout'
            }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error("❌ [消息桥接] 发送登出消息失败:", chrome.runtime.lastError.message);
                } else {
                    // 回传成功消息给网页
                    window.postMessage({
                        source: 'YINIAN_EXTENSION',
                        type: 'PLUGIN_LOGOUT_RESPONSE',
                        success: true,
                        response: response
                    }, '*');
                }
            });
        } else {
        }
    });
})();
