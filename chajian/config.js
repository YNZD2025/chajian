/**
 * 环境配置管理
 * 支持开发环境和生产环境的BaseURL配置
 */

// 配置对象
const CONFIG = {
    // 当前环境 ('development' | 'production')
    ENV: 'development',

    // 开发环境配置
    DEVELOPMENT: {
        WEB_BASE_URL: 'http://localhost:3000',
        API_BASE_URL: 'http://localhost:8080'
    },

    // 生产环境配置（需要替换为实际的生产环境地址）
    PRODUCTION: {
        WEB_BASE_URL: 'https://your-production-web.com',
        API_BASE_URL: 'https://your-production-api.com'
    },

    // 获取当前环境的配置
    getCurrentConfig() {
        return this[this.ENV.toUpperCase()];
    },

    // 切换环境
    setEnvironment(env) {
        if (env === 'development' || env === 'production') {
            this.ENV = env;
            console.log(`环境已切换到: ${env}`);
            return this.getCurrentConfig();
        } else {
            console.error('无效的环境类型，只支持 development 或 production');
            return null;
        }
    },

    // 获取Web Base URL
    getWebBaseUrl() {
        return this.getCurrentConfig().WEB_BASE_URL;
    },

    // 获取API Base URL
    getApiBaseUrl() {
        return this.getCurrentConfig().API_BASE_URL;
    }
};

// 兼容原有代码的导出方式
window.CONFIG = CONFIG;

// 如果是模块环境，也支持模块导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}

console.log('配置管理器已加载，当前环境:', CONFIG.ENV);
console.log('当前配置:', CONFIG.getCurrentConfig());