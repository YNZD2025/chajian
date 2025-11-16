# API配置管理说明

## 概述
已为项目建立统一的BaseURL配置管理系统，支持开发环境和生产环境的快速切换。

## 文件结构
- `config.js` - 统一配置管理器
- `switch-env.js` - 环境切换工具脚本

## 配置的API地址
### 开发环境（当前）
- Web Base URL: `http://localhost:3000`
- API Base URL: `http://localhost:8080`

### 生产环境（需要配置）
- Web Base URL: `https://your-production-web.com` (待替换)
- API Base URL: `https://your-production-api.com` (待替换)

## 使用方法

### 1. 配置生产环境URL
修改 `config.js` 文件中的 PRODUCTION 配置：
```javascript
PRODUCTION: {
    WEB_BASE_URL: 'https://你的生产环境网站地址.com',
    API_BASE_URL: 'https://你的生产环境API地址.com'
}
```

### 2. 环境切换方式

#### 方式一：修改配置文件
在 `config.js` 文件中修改 ENV 值：
```javascript
ENV: 'production'  // 切换到生产环境
ENV: 'development' // 切换到开发环境
```

#### 方式二：使用切换脚本
在浏览器控制台运行：
```javascript
switchToProduction()    // 切换到生产环境
switchToDevelopment()   // 切换到开发环境
showCurrentConfig()     // 查看当前配置
```

## 已更新的文件
以下文件已更新使用新的配置管理器：
- ✅ `popup.js` - popup页面配置
- ✅ `content.js` - 自动填表引擎配置
- ✅ `js/autofill/AutoFillMain.js` - 主引擎配置
- ✅ `js/autofill/services/AIService.js` - AI服务配置
- ✅ `js/autofill/core/FormFillController.js` - 表单控制器配置
- ✅ `manifest.json` - 添加配置文件加载
- ✅ `popup.html` - 添加配置文件引用

## 注意事项
1. 所有API调用现在都会自动使用当前环境的配置
2. 如果CONFIG未加载，会自动回退到localhost开发环境
3. 切换环境后建议重新加载扩展以确保配置生效
4. 生产环境URL需要手动配置，请替换为实际的生产环境地址

## 兼容性
- ✅ 兼容原有代码结构
- ✅ 支持热切换（无需重启）
- ✅ 自动回退机制（配置加载失败时使用默认值）