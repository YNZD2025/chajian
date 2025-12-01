/**
 * ============================================================================
 * 求职方舟 (Job Ark) - Content Script 配置文件
 * ============================================================================
 *
 * 此文件为 Content Script 专用配置
 * 使用 IIFE 方式将配置挂载到 window 对象
 * 注意：此文件不能使用 ES6 模块语法（export/import）
 *
 * @author 求职方舟团队
 * @version 基于 Manifest V3 规范
 */

(function() {
    'use strict';

    // ============================================================================
    // 环境配置
    // ============================================================================

    /**
     * 环境配置对象
     * 包含开发环境和生产环境的服务器地址配置
     */
    const environments = {
        // 开发环境配置
        development: {
            WEB: {
                HOST: "http://192.168.1.144",
                PORT: "3000"
            },
            API: {
                HOST: "http://192.168.1.144",
                PORT: "8080"
            }
        },

        // 生产环境配置
        production: {
            WEB: {
                HOST: "https://applymind.cn/",
                PORT: "443"
            },
            API: {
                HOST: "https://applymind.cn/",
                PORT: "443"
            }
        }
    };

    /**
     * 当前环境
     * 可选值: "development" | "production"
     */
    const currentEnv = "development";

    /**
     * 当前环境的配置
     */
    const config = environments[currentEnv];

    // ============================================================================
    // URL 构建函数
    // ============================================================================

    /**
     * 构建完整的 URL
     *
     * @param {string} path - URL 路径（如 "/api/chrome/"）
     * @param {string} type - 服务类型："API" 或 "WEB"
     * @returns {string} 完整的 URL
     */
    const buildUrl = (path, type) => {
        const { HOST, PORT } = config[type];

        // 443 端口（HTTPS 默认端口）不需要显示端口号
        const portSuffix = PORT === "443" ? "" : `:${PORT}`;

        return `${HOST}${portSuffix}${path}`;
    };

    // ============================================================================
    // 配置对象导出到 window
    // ============================================================================

    /**
     * 将所有配置挂载到 window.arkConfig 对象
     */
    window.config = {
        // API 端点
        API_BASE_URL: buildUrl("/api/autofill/", "API"),
        API_AUTH_URL: buildUrl("/api/plugin/", "API"),
        API_HISTORY_URL: buildUrl("/api/history/", "API"),
        API_RESUME_URL: buildUrl("/api/resume/", "API"),

        // 网站 URL
        WEB_DOMAIN: config.WEB.HOST,
        WEB_URL: buildUrl("/resume", "WEB"),
        LOGIN_URL: buildUrl("/login?from=plugin", "WEB"),
        CAMPUS_URL: buildUrl("/campus", "WEB"),
        HISTORY_URL: buildUrl("/history", "WEB"),
        AUTOFILL_URL: buildUrl("/autofill", "WEB"),
        VERSION_URL: buildUrl("/crx/version.txt", "WEB"),
        WELCOME_URL: buildUrl("/welcome", "WEB"),
        PRICING_URL: buildUrl("/pricing", "WEB"),

        // 所有官网 URL 列表
        ALL_WEB_URLS: [
            "http://localhost:5173",           // 开发环境
            "https://www.qiuzhifangzhou.com"   // 生产环境
        ],

        // 环境检测函数
        isDevEnv: () => currentEnv === "development",
        getEnv: () => currentEnv
    };

    console.log("Content Script 配置已加载:", window.arkConfig);
})();
