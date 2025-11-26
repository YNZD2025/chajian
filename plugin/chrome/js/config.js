// 一念 - 配置与环境切换（格式化与注释版）
// 作用：统一 Web/API 域名与路径拼接；默认生产环境

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

// 默认生产环境
const ENV = "development";
const CURRENT = ENV_CONFIG[ENV];

// 构建完整 URL：根据端口拼接
const buildUrl = (path, kind) => {
  const { HOST, PORT } = CURRENT[kind];
  const portSuffix = PORT === "443" ? "" : `:${PORT}`;
  return `${HOST}${portSuffix}${path}`;
};

// API 端点（与原始导出保持一致）
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

// 环境辅助（保持与原始行为一致）
export const isDevEnv = () => false;
export const getEnv = () => ENV;

