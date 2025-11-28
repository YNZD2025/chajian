// 一念 - 配置与环境切换（ES6 模块版本）
// 作用：供 background.js 等模块使用
// 注意：仅用于 service worker，不要在 content scripts 中引用

// 环境配置对象
const ENV_CONFIG = {
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
const CURRENT = ENV_CONFIG[ENV];

// 构建完整 URL：根据端口拼接
const buildUrl = (path, kind) => {
  const { HOST, PORT } = CURRENT[kind];
  const portSuffix = PORT === "443" ? "" : `:${PORT}`;
  return `${HOST}${portSuffix}${path}`;
};

// API 端点
export const API_BASE_URL = buildUrl("/api/autofill/", "API");
export const API_AUTH_URL = buildUrl("/api/plugin/", "API");
export const API_HISTORY_URL = buildUrl("/api/history/", "API");

// Web 端路由
export const WEB_DOMAIN = CURRENT.WEB.HOST;
export const WEB_URL = buildUrl("/resume", "WEB");
export const LOGIN_URL = buildUrl("/login?from=plugin", "WEB");
export const CAMPUS_URL = buildUrl("/campus", "WEB");
export const HISTORY_URL = buildUrl("/history", "WEB");
export const AUTOFILL_URL = buildUrl("/autofill", "WEB");
export const VERSION_URL = buildUrl("/crx/version.txt", "WEB");
export const WELCOME_URL = buildUrl("/welcome", "WEB");
export const PRICING_URL = buildUrl("/pricing", "WEB");

// 站点范围（内容脚本按此判断是否启用 UI）
export const ALL_WEB_URLS = [
  "http://192.168.1.144:*/*",
  "http://z6467e53.natappfree.cc/*",
  "http://localhost:*/*",
  "https://www.yinian.com/*"
];

// 环境辅助
export const isDevEnv = () => false;
export const getEnv = () => ENV;
