/**
 * 认证管理器 - 统一处理用户认证相关操作
 * 支持双Token机制和多种登录方式
 */

class AuthManager {
    constructor(config = {}) {
        this.config = {
            apiBaseUrl: config.apiBaseUrl || (window.CONFIG ? window.CONFIG.getApiBaseUrl() : 'http://localhost:8080'),
            webBaseUrl: config.webBaseUrl || (window.CONFIG ? window.CONFIG.getWebBaseUrl() : 'http://localhost:3000'),
            tokenRefreshInterval: 14 * 60 * 1000, // 14分钟刷新一次
            ...config
        };

        // Token存储键
        this.storageKeys = {
            accessToken: 'access_token',
            refreshToken: 'refresh_token',
            userInfo: 'user_info',
            tokenExpiry: 'token_expiry'
        };

        // 自动刷新Timer
        this.refreshTimer = null;

        // 初始化
        this.init();
    }

    /**
     * 初始化认证管理器
     */
    init() {
        console.log('[AuthManager] 初始化认证管理器...');
        this.startTokenRefreshTimer();
    }

    /**
     * 发送邮箱验证码
     */
    async sendEmailCode(email, type = 'register') {
        try {
            const response = await this.apiCall1('/api/auth/email/send-code', {
                method: 'POST',
                body: JSON.stringify({
                    email,
                    type
                })
            });

            if (response.success) {
                console.log('[AuthManager] 验证码发送成功');
                return response;
            }
            throw new Error(response.message || '发送验证码失败');
        } catch (error) {
            console.error('[AuthManager] 发送验证码失败:', error);
            throw error;
        }
    }

    /**
     * 邮箱注册
     */
    async emailRegister(userData) {
        try {
            const response = await this.apiCall1('/api/auth/email/register', {
                method: 'POST',
                body: JSON.stringify(userData)
            });

            if (response.success) {
                await this.saveTokens(response.data);
                return response.data;
            }
            throw new Error(response.message || '注册失败');
        } catch (error) {
            console.error('[AuthManager] 邮箱注册失败:', error);
            throw error;
        }
    }

    /**
     * 邮箱验证码登录
     */
    async emailLoginWithCode(email, verificationCode, rememberMe = false) {
        try {
            const response = await this.apiCall1('/api/auth/email/login-code', {
                method: 'POST',
                body: JSON.stringify({
                    email,
                    verificationCode,
                    rememberMe
                })
            });

            if (response.success) {
                await this.saveTokens(response.data);
                return response.data;
            }
            throw new Error(response.message || '登录失败');
        } catch (error) {
            console.error('[AuthManager] 邮箱验证码登录失败:', error);
            throw error;
        }
    }

    /**
     * 邮箱验证码登录
     */
    async emailLoginWithCode(email, verificationCode, rememberMe = false) {
        try {
            const response = await this.apiCall1('/api/auth/email/login-code', {
                method: 'POST',
                body: JSON.stringify({
                    email,
                    verificationCode,
                    rememberMe
                })
            });

            if (response.success) {
                await this.saveTokens(response.data);
                return response.data;
            }
            throw new Error(response.message || '登录失败');
        } catch (error) {
            console.error('[AuthManager] 邮箱验证码登录失败:', error);
            throw error;
        }
    }

    /**
     * 邮箱密码登录
     */
    async emailLogin(email, password, rememberMe = false) {
        try {
            const response = await this.apiCall1('/api/auth/email/login', {
                method: 'POST',
                body: JSON.stringify({
                    email,
                    password,
                    rememberMe
                })
            });

            if (response.success) {
                await this.saveTokens(response.data);
                return response.data;
            }
            throw new Error(response.message || '登录失败');
        } catch (error) {
            console.error('[AuthManager] 邮箱登录失败:', error);
            throw error;
        }
    }

    /**
     * 发送邮箱验证码
     */
    async sendEmailCode(email, type = 'register') {
        try {
            const response = await this.apiCall1('/api/auth/email/send-code', {
                method: 'POST',
                body: JSON.stringify({
                    email,
                    type
                })
            });

            if (response.success) {
                console.log('[AuthManager] 验证码发送成功');
                return response;
            }
            throw new Error(response.message || '发送验证码失败');
        } catch (error) {
            console.error('[AuthManager] 发送验证码失败:', error);
            throw error;
        }
    }

    /**
     * 邮箱注册（新接口）
     */
    async emailRegister(userData) {
        try {
            const response = await this.apiCall1('/api/auth/email/register', {
                method: 'POST',
                body: JSON.stringify(userData)
            });

            if (response.success) {
                await this.saveTokens(response.data);
                return response.data;
            }
            throw new Error(response.message || '注册失败');
        } catch (error) {
            console.error('[AuthManager] 邮箱注册失败:', error);
            throw error;
        }
    }

    /**
     * 微信登录（重定向到OAuth页面）
     */
    openWeChatLogin() {
        const loginUrl = `${this.config.webBaseUrl}/login?redirect=/plugin-callback`;

        if (typeof chrome !== 'undefined' && chrome.tabs) {
            // 插件环境
            chrome.tabs.create({
                url: loginUrl,
                active: true
            });
        } else {
            // 网页环境
            window.open(loginUrl, '_blank');
        }
    }

    /**
     * 刷新Token
     */
    async refreshToken() {
        try {
            const refreshToken = await this.getStoredRefreshToken();
            if (!refreshToken) {
                throw new Error('没有有效的Refresh Token');
            }

            const response = await this.apiCall1('/api/auth/refresh', {
                method: 'POST',
                body: JSON.stringify({ refreshToken })
            });

            if (response.success) {
                await this.saveTokens(response.data);
                console.log('[AuthManager] Token刷新成功');
                return response.data;
            }
            throw new Error(response.message || 'Token刷新失败');
        } catch (error) {
            console.error('[AuthManager] Token刷新失败:', error);
            // 刷新失败，清除所有认证信息
            await this.clearAuth();
            throw error;
        }
    }

    /**
     * 获取当前用户信息
     */
    async getCurrentUser() {
        try {
            const response = await this.apiCall('/api/auth/me', {
                method: 'GET',
                requireAuth: true
            });

            if (response.success) {
                // 更新本地用户信息
                await this.updateUserInfo(response.data);
                return response.data;
            }
            throw new Error(response.message || '获取用户信息失败');
        } catch (error) {
            console.error('[AuthManager] 获取用户信息失败:', error);
            throw error;
        }
    }

    /**
     * 用户注销
     */
    async logout() {
        try {
            const refreshToken = await this.getStoredRefreshToken();

            // 调用注销API
            await this.apiCall('/api/auth/logout', {
                method: 'POST',
                body: JSON.stringify({ refreshToken }),
                requireAuth: true
            });
        } catch (error) {
            console.warn('[AuthManager] 注销API调用失败:', error);
            // 即使API失败，也要清除本地数据
        } finally {
            await this.clearAuth();
            console.log('[AuthManager] 用户已注销');
        }
    }

    /**
     * 检查登录状态
     */
    async isLoggedIn() {
        try {
            const accessToken = await this.getStoredAccessToken();
            const userInfo = await this.getStoredUserInfo();

            if (!accessToken || !userInfo) {
                return false;
            }

            // 检查token是否过期
            const isExpired = await this.isTokenExpired();
            if (isExpired) {
                // 尝试刷新token
                try {
                    await this.refreshToken();
                    return true;
                } catch (refreshError) {
                    return false;
                }
            }

            return true;
        } catch (error) {
            console.error('[AuthManager] 检查登录状态失败:', error);
            return false;
        }
    }

    /**
     * 保存Token和用户信息
     */
    async saveTokens(authData) {
        const { accessToken, refreshToken, user, expiresIn } = authData;

        // 计算过期时间
        const expiry = Date.now() + (expiresIn * 1000);

        const saveData = {
            [this.storageKeys.accessToken]: accessToken,
            [this.storageKeys.refreshToken]: refreshToken,
            [this.storageKeys.userInfo]: user,
            [this.storageKeys.tokenExpiry]: expiry
        };

        if (typeof chrome !== 'undefined' && chrome.storage) {
            // Chrome扩展环境
            await new Promise((resolve) => {
                chrome.storage.local.set(saveData, resolve);
            });
        } else {
            // 普通网页环境
            Object.entries(saveData).forEach(([key, value]) => {
                localStorage.setItem(key, JSON.stringify(value));
            });
        }

        console.log('[AuthManager] 认证信息已保存');
    }

    /**
     * 更新用户信息
     */
    async updateUserInfo(userInfo) {
        if (typeof chrome !== 'undefined' && chrome.storage) {
            await new Promise((resolve) => {
                chrome.storage.local.set({
                    [this.storageKeys.userInfo]: userInfo
                }, resolve);
            });
        } else {
            localStorage.setItem(this.storageKeys.userInfo, JSON.stringify(userInfo));
        }
    }

    /**
     * 清除所有认证信息
     */
    async clearAuth() {
        const keys = Object.values(this.storageKeys);

        if (typeof chrome !== 'undefined' && chrome.storage) {
            await new Promise((resolve) => {
                chrome.storage.local.remove(keys, resolve);
            });
        } else {
            keys.forEach(key => localStorage.removeItem(key));
        }

        // 清除刷新定时器
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
        }

        console.log('[AuthManager] 认证信息已清除');
    }

    /**
     * 获取存储的AccessToken
     */
    async getStoredAccessToken() {
        return await this.getStoredValue(this.storageKeys.accessToken);
    }

    /**
     * 获取存储的RefreshToken
     */
    async getStoredRefreshToken() {
        return await this.getStoredValue(this.storageKeys.refreshToken);
    }

    /**
     * 获取存储的用户信息
     */
    async getStoredUserInfo() {
        return await this.getStoredValue(this.storageKeys.userInfo);
    }

    /**
     * 获取存储的值
     */
    async getStoredValue(key) {
        if (typeof chrome !== 'undefined' && chrome.storage) {
            return await new Promise((resolve) => {
                chrome.storage.local.get([key], (result) => {
                    resolve(result[key]);
                });
            });
        } else {
            const value = localStorage.getItem(key);
            return value ? JSON.parse(value) : null;
        }
    }

    /**
     * 检查Token是否过期
     */
    async isTokenExpired() {
        const expiry = await this.getStoredValue(this.storageKeys.tokenExpiry);
        if (!expiry) return true;

        // 提前5分钟判断为过期，避免临界情况
        return Date.now() > (expiry - 5 * 60 * 1000);
    }

    /**
     * 启动Token自动刷新定时器
     */
    startTokenRefreshTimer() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
        }

        this.refreshTimer = setInterval(async () => {
            try {
                const isLoggedIn = await this.isLoggedIn();
                if (isLoggedIn) {
                    const isExpired = await this.isTokenExpired();
                    if (isExpired) {
                        await this.refreshToken();
                    }
                }
            } catch (error) {
                console.error('[AuthManager] 定时刷新Token失败:', error);
            }
        }, this.config.tokenRefreshInterval);
    }

    /**
     * API调用封装
     */
    async apiCall(endpoint, options = {}) {
        const {
            method = 'GET',
            body,
            requireAuth = false,
            headers = {}
        } = options;

        const url = `${this.config.apiBaseUrl}${endpoint}`;
        const requestHeaders = {
            'Content-Type': 'application/json',
            ...headers
        };

        // 如果需要认证，添加Authorization头
        if (requireAuth) {
            const accessToken = await this.getStoredAccessToken();
            if (accessToken) {
                requestHeaders['Authorization'] = `Bearer ${accessToken}`;
            }
        }

        const response = await fetch(url, {
            method,
            headers: requestHeaders,
            body
        });

        const data = await response.json();

        // 处理401错误（Token过期）
        if (response.status === 401 && data.needRefresh && requireAuth) {
            try {
                await this.refreshToken();
                // 重试请求
                const newToken = await this.getStoredAccessToken();
                requestHeaders['Authorization'] = `Bearer ${newToken}`;

                const retryResponse = await fetch(url, {
                    method,
                    headers: requestHeaders,
                    body
                });

                return await retryResponse.json();
            } catch (refreshError) {
                console.error('[AuthManager] Token刷新重试失败:', refreshError);
                throw refreshError;
            }
        }

        return data;
    }

    /**
     * API调用封装
     */
    async apiCall1(endpoint, options = {}) {
        const {
            method = 'GET',
            body,
            requireAuth = false,
            headers = {}
        } = options;

        const url = `${"http://localhost:8080"}${endpoint}`;
        const requestHeaders = {
            'Content-Type': 'application/json',
            ...headers
        };

        // 如果需要认证，添加Authorization头
        if (requireAuth) {
            const accessToken = await this.getStoredAccessToken();
            if (accessToken) {
                requestHeaders['Authorization'] = `Bearer ${accessToken}`;
            }
        }

        const response = await fetch(url, {
            method,
            headers: requestHeaders,
            body
        });

        const data = await response.json();

        // 处理401错误（Token过期）
        if (response.status === 401 && data.needRefresh && requireAuth) {
            try {
                await this.refreshToken();
                // 重试请求
                const newToken = await this.getStoredAccessToken();
                requestHeaders['Authorization'] = `Bearer ${newToken}`;

                const retryResponse = await fetch(url, {
                    method,
                    headers: requestHeaders,
                    body
                });

                return await retryResponse.json();
            } catch (refreshError) {
                console.error('[AuthManager] Token刷新重试失败:', refreshError);
                throw refreshError;
            }
        }

        return data;
    }

    /**
     * 销毁认证管理器
     */
    destroy() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
        }
    }
}

// 导出认证管理器
if (typeof window !== 'undefined') {
    window.AuthManager = AuthManager;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthManager;
}