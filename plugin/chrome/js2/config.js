/**
 * ============================================================================
 * 求职方舟 (Job Ark) - 配置文件
 * ============================================================================
 *
 * 此文件定义了扩展的所有环境配置和 API 端点
 * 支持开发环境和生产环境的切换
 *
 * @author 求职方舟团队
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
 *
 * @example
 * buildUrl("/api/chrome/", "API")
 * // 生产环境返回: "https://api.qiuzhifangzhou.com/api/chrome/"
 * // 开发环境返回: "http://localhost:8080/api/chrome/"
 */
const buildUrl = (path, type) => {
    const { HOST, PORT } = config[type];

    // 443 端口（HTTPS 默认端口）不需要显示端口号
    const portSuffix = PORT === "443" ? "" : `:${PORT}`;

    return `${HOST}${portSuffix}${path}`;
};

// ============================================================================
// API 端点导出
// ============================================================================

/**
 * Chrome 扩展相关 API 基础路径
 * 用于：自动填充、字段学习、错误上报等
 *
 * @example
 * fetch(`${API_BASE_URL}getNeedField`, { method: "POST" })
 */
export const API_BASE_URL = buildUrl("/api/autofill/", "API");

/**
 * 认证相关 API 基础路径
 * 用于：Token 刷新
 *
 * @example
 * fetch(`${API_AUTH_URL}refreshToken`, { method: "POST" })
 */
export const API_AUTH_URL = buildUrl("/api/plugin/", "API");

/**
 * 历史记录相关 API 基础路径
 * 用于：投递记录管理
 *
 * @example
 * fetch(`${API_HISTORY_URL}addHistoryByChrome`, { method: "POST" })
 */
export const API_HISTORY_URL = buildUrl("/api/history/", "API");

// ============================================================================
// 网站 URL 导出
// ============================================================================

/**
 * 网站域名（不含路径）
 * 用于：标签页查询、消息发送
 */
export const WEB_DOMAIN = config.WEB.HOST;

/**
 * 简历管理页面 URL
 */
export const WEB_URL = buildUrl("/resume", "WEB");

/**
 * 登录页面 URL
 * 带有 login=true 参数，自动打开登录弹窗
 */
export const LOGIN_URL = buildUrl("/resume?login=true", "WEB");

/**
 * 校招信息页面 URL
 */
export const CAMPUS_URL = buildUrl("/campus", "WEB");

/**
 * 投递历史页面 URL
 */
export const HISTORY_URL = buildUrl("/history", "WEB");

/**
 * 自动填充介绍页面 URL
 */
export const AUTOFILL_URL = buildUrl("/autofill", "WEB");

/**
 * 版本信息文件 URL
 * 用于检查扩展是否有新版本
 */
export const VERSION_URL = buildUrl("/crx/version.txt", "WEB");

/**
 * 欢迎页面 URL
 * 首次安装扩展时打开
 */
export const WELCOME_URL = buildUrl("/welcome", "WEB");

/**
 * 定价页面 URL
 * 配额用完时引导用户升级
 */
export const PRICING_URL = buildUrl("/pricing", "WEB");

/**
 * 所有官网 URL 列表
 * 用于判断当前页面是否为官网（官网不显示填充UI）
 */
export const ALL_WEB_URLS = [
    "http://localhost:5173",           // 开发环境
    "https://www.qiuzhifangzhou.com"   // 生产环境
];

// ============================================================================
// 环境检测函数
// ============================================================================

/**
 * 检查是否为开发环境
 * @returns {boolean} 是否为开发环境
 */
export const isDevEnv = () => {
    return currentEnv === "development";
};

/**
 * 获取当前环境名称
 * @returns {string} 环境名称："development" 或 "production"
 */
export const getEnv = () => {
    return currentEnv;
};
