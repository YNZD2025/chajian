/**
 * ============================================================================
 * 一念职达 - Background Service Worker 配置文件
 * ============================================================================
 *
 * 此文件为 Background Service Worker 专用配置
 * 使用 ES6 模块语法（export）
 *
 * @author 一念职达团队
 * @version 基于 Manifest V3 规范
 */

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
            HOST: "https://test.applymind.cn",
            PORT: "443"
        },
        API: {
            HOST: "https://test.applymind.cn",
            PORT: "443"
        }
    }
};

/**
 * 当前环境
 * 可选值: "development" | "production"
 */
const currentEnv = "production";

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
// 导出配置
// ============================================================================

// API 端点
export const API_BASE_URL = buildUrl("/api/autofill/", "API");
export const API_AUTH_URL = buildUrl("/api/plugin/", "API");
export const API_HISTORY_URL = buildUrl("/api/history/", "API");
export const API_RESUME_URL = buildUrl("/api/resume/", "API");

// 网站 URL
export const WEB_DOMAIN = config.WEB.HOST;
export const WEB_URL = buildUrl("/resume", "WEB");
export const LOGIN_URL = buildUrl("/login?from=plugin", "WEB");
export const CAMPUS_URL = buildUrl("/campus", "WEB");
export const HISTORY_URL = buildUrl("/history", "WEB");
export const AUTOFILL_URL = buildUrl("/autofill", "WEB");
export const VERSION_URL = buildUrl("/crx/version.txt", "WEB");
export const WELCOME_URL = buildUrl("/welcome", "WEB");
export const PRICING_URL = buildUrl("/vip", "WEB");

// 所有官网 URL 列表
export const ALL_WEB_URLS = [
    "http://localhost:5173",           // 开发环境
    "https://test.applymind.cn"        // 测试环境
];
