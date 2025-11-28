// 一念 - 配置与环境切换（格式化与注释版）
// 作用：统一 Web/API 域名与路径拼接；默认生产环境

// 环境配置对象（全局可访问）
window.ENV_CONFIG = {
  development: {
    WEB: { HOST: "http://192.168.1.144", PORT: "3000" },
    API: { HOST: "http://192.168.1.144", PORT: "8080" }
  },
  production: {
    WEB: { HOST: "http://192.168.1.144", PORT: "8080" },
    API: { HOST: "http://z6467e53.natappfree.cc", PORT: "80" }
  }
};

// 默认环境（可修改为 "production"）
const ENV = "development";
const ENV_CONFIG = window.ENV_CONFIG;
const CURRENT = ENV_CONFIG[ENV];

// 构建完整 URL：根据端口拼接
const buildUrl = (path, kind) => {
  const { HOST, PORT } = CURRENT[kind];
  const portSuffix = PORT === "443" ? "" : `:${PORT}`;
  return `${HOST}${portSuffix}${path}`;
};

// API 端点（暴露为全局变量和 export，兼容 module 和 script）
const API_BASE_URL = buildUrl("/api/autofill/", "API");
const API_AUTH_URL = buildUrl("/api/plugin/", "API");
const API_HISTORY_URL = buildUrl("/api/history/", "API");

// Web 端路由
const WEB_DOMAIN = CURRENT.WEB.HOST;
const WEB_URL = buildUrl("/resume", "WEB");
const LOGIN_URL = buildUrl("/login?from=plugin", "WEB");
const CAMPUS_URL = buildUrl("/campus", "WEB");
const HISTORY_URL = buildUrl("/history", "WEB");
const AUTOFILL_URL = buildUrl("/autofill", "WEB");
const VERSION_URL = buildUrl("/crx/version.txt", "WEB");
const WELCOME_URL = buildUrl("/welcome", "WEB");
const PRICING_URL = buildUrl("/pricing", "WEB");

// 站点范围（内容脚本按此判断是否启用 UI）
const ALL_WEB_URLS = [
  "http://192.168.1.144:*/*",
  "http://z6467e53.natappfree.cc/*",
  "http://localhost:*/*",
  "https://www.yinian.com/*"
];

// 环境辅助
const isDevEnv = () => false;
const getEnv = () => ENV;

// 将所有配置挂载到全局对象（供 content scripts 使用）
window.YinianConfig = {
  ENV_CONFIG: window.ENV_CONFIG,
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
  ALL_WEB_URLS,
  isDevEnv,
  getEnv
};

// 标记配置已加载
window.YinianConfigLoaded = true;

console.log('✅ 配置已加载（content script 模式）');

