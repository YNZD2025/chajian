/**
 * 环境切换示例脚本
 * 使用方法：
 * 1. 在浏览器控制台中运行此脚本
 * 2. 或者在扩展的popup页面控制台中运行
 */

// 切换到开发环境
function switchToDevelopment() {
    if (window.CONFIG) {
        const newConfig = window.CONFIG.setEnvironment('development');
        console.log('已切换到开发环境:', newConfig);
        return newConfig;
    } else {
        console.error('CONFIG配置管理器未加载');
    }
}

// 切换到生产环境
function switchToProduction() {
    if (window.CONFIG) {
        const newConfig = window.CONFIG.setEnvironment('production');
        console.log('已切换到生产环境:', newConfig);
        console.warn('注意：请确保在config.js中设置了正确的生产环境URL');
        return newConfig;
    } else {
        console.error('CONFIG配置管理器未加载');
    }
}

// 查看当前环境配置
function showCurrentConfig() {
    if (window.CONFIG) {
        console.log('当前环境:', window.CONFIG.ENV);
        console.log('当前配置:', window.CONFIG.getCurrentConfig());
        console.log('Web Base URL:', window.CONFIG.getWebBaseUrl());
        console.log('API Base URL:', window.CONFIG.getApiBaseUrl());
    } else {
        console.error('CONFIG配置管理器未加载');
    }
}

// 导出函数到全局
window.switchToDevelopment = switchToDevelopment;
window.switchToProduction = switchToProduction;
window.showCurrentConfig = showCurrentConfig;

console.log('🔄 环境切换工具已加载');
console.log('可用命令:');
console.log('  switchToDevelopment() - 切换到开发环境');
console.log('  switchToProduction() - 切换到生产环境');
console.log('  showCurrentConfig() - 查看当前配置');

// 初始显示当前配置
if (window.CONFIG) {
    showCurrentConfig();
}