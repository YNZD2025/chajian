# 一念职达 API 接口文档

## 目录

- [1. 用户相关接口](#1-用户相关接口)
  - [1.1 用户认证](#11-用户认证)
  - [1.2 用户个人中心](#12-用户个人中心)
  - [1.3 账号安全](#13-账号安全)
- [2. 简历相关接口](#2-简历相关接口)
  - [2.1 简历解析V2](#21-简历解析v2)
  - [2.2 简历自定义模块](#22-简历自定义模块)
  - [2.3 简历渲染导出](#23-简历渲染导出)
- [3. AI对话](#3-ai对话)
- [4. AI自动填表](#4-ai自动填表)
- [5. 邀请系统](#5-邀请系统)
- [6. 岗位相关](#6-岗位相关)
- [7. 考研项目](#7-考研项目)
- [8. 留学项目](#8-留学项目)
- [9. 攻略文章](#9-攻略文章)
  - [9.1 用户端攻略](#91-用户端攻略)
  - [9.2 攻略评论](#92-攻略评论)
- [10. 订单支付](#10-订单支付)
  - [10.1 订单管理](#101-订单管理)
  - [10.2 支付管理](#102-支付管理)
- [11. 文件上传](#11-文件上传)
- [12. 管理端接口](#12-管理端接口)
  - [12.1 管理员认证](#121-管理员认证)
  - [12.2 管理员用户管理](#122-管理员用户管理)
  - [12.3 管理员简历管理](#123-管理员简历管理)
  - [12.4 管理员岗位管理](#124-管理员岗位管理)
  - [12.5 管理员订单管理](#125-管理员订单管理)
  - [12.6 管理员攻略管理](#126-管理员攻略管理)
  - [12.7 管理员邀请记录](#127-管理员邀请记录)
  - [12.8 管理员优化记录](#128-管理员优化记录)
- [13. Chrome插件接口](#13-chrome插件接口)

---

## 1. 用户相关接口

### 1.1 用户认证

#### 1.1.1 微信扫码登录 - 生成二维码

- **接口路径**: `GET /auth/qrcode/generate`
- **接口描述**: 生成微信登录二维码，返回sceneId用于轮询登录状态
- **请求参数**:
  - inviteCode (String, 可选): 邀请码
- **返回值**:
  ```json
  {
    "success": true,
    "sceneId": "唯一场景ID",
    "authUrl": "微信授权URL",
    "qrcodeUrl": "二维码图片URL",
    "message": "二维码生成成功，请使用微信扫码"
  }
  ```
- **限流**: 10次/分钟 (IP限流)

#### 1.1.2 轮询登录状态

- **接口路径**: `GET /auth/qrcode/status/{sceneId}`
- **接口描述**: 前端定时调用此接口检查用户是否已扫码并确认
- **请求参数**:
  - sceneId (String): 场景ID
- **返回值**:
  ```json
  {
    "success": true,
    "confirmed": true,
    "token": "JWT Token",
    "userInfo": {
      "id": 1,
      "nickname": "用户昵称",
      "avatar": "头像URL",
      "isVip": false
    }
  }
  ```
- **限流**: 60次/分钟 (IP限流)

#### 1.1.3 微信回调

- **接口路径**: `GET /auth/wechat/callback`
- **接口描述**: 微信授权后的回调接口
- **请求参数**:
  - code (String): 微信授权码
  - state (String): 场景ID
- **返回值**: HTML页面
- **限流**: 无

#### 1.1.4 获取用户信息

- **接口路径**: `GET /auth/user/info`
- **接口描述**: 验证JWT Token并获取用户信息
- **请求头**:
  - Authorization: Bearer {token}
- **返回值**: 用户详细信息
- **限流**: 60次/分钟 (用户限流)

#### 1.1.5 退出登录

- **接口路径**: `POST /auth/logout`
- **接口描述**: 退出登录
- **返回值**: {"success": true, "message": "退出登录成功"}
- **限流**: 30次/分钟 (用户限流)

#### 1.1.6 测试快速登录

- **接口路径**: `POST /auth/test/quick-login`
- **接口描述**: 生成测试账号并登录（仅用于开发测试）
- **请求参数**:
  - nickname (String, 可选): 测试用户昵称
- **返回值**:
  ```json
  {
    "success": true,
    "token": "JWT Token",
    "userInfo": {...},
    "message": "测试账号登录成功"
  }
  ```
- **限流**: 100次/分钟 (IP限流)

#### 1.1.7 邮箱登录

- **接口路径**: `POST /user/auth/login`
- **接口描述**: 邮箱密码登录或验证码登录
- **请求参数**:
  ```json
  {
    "email": "user@example.com",
    "password": "密码或验证码",
    "loginType": "password/code"
  }
  ```
- **返回值**:
  ```json
  {
    "code": 0,
    "success": true,
    "message": "登录成功",
    "data": {
      "token": "JWT Token",
      "user": {...}
    }
  }
  ```
- **限流**: 5次/分钟 (IP限流)

#### 1.1.8 邮箱注册

- **接口路径**: `POST /user/auth/register`
- **接口描述**: 邮箱注册新用户
- **请求参数**:
  ```json
  {
    "email": "user@example.com",
    "code": "验证码",
    "password": "密码",
    "nickname": "昵称"
  }
  ```
- **返回值**:
  ```json
  {
    "code": 0,
    "success": true,
    "message": "注册成功",
    "data": {
      "token": "JWT Token",
      "user": {...}
    }
  }
  ```
- **限流**: 10次/分钟 (IP限流)

#### 1.1.9 发送验证码

- **接口路径**: `POST /user/auth/send-code`
- **接口描述**: 发送邮箱验证码
- **请求参数**:
  ```json
  {
    "email": "user@example.com",
    "type": "register/login/reset"
  }
  ```
- **返回值**:
  ```json
  {
    "code": 0,
    "success": true,
    "message": "验证码已发送到您的邮箱，请查收"
  }
  ```
- **限流**: 1次/分钟 (IP限流)

### 1.2 用户个人中心

#### 1.2.1 获取个人信息

- **接口路径**: `GET /user/profile`
- **接口描述**: 获取当前登录用户的详细信息
- **请求参数**: 无
- **返回值**:
  ```json
  {
    "success": true,
    "message": "获取成功",
    "data": {
      "id": 1,
      "username": "用户名",
      "email": "邮箱",
      "nickname": "昵称",
      "avatar": "头像URL",
      "phone": "手机号",
      "gender": 0,
      "tags": "标签",
      "isAuthor": 0,
      "uid": "用户UID",
      "uidModified": false,
      "createdAt": "创建时间",
      "lastLoginTime": "最后登录时间",
      "isVip": false,
      "vipExpireTime": null,
      "resumeOptimizeCount": 0
    }
  }
  ```
- **限流**: 60次/分钟 (用户限流)

#### 1.2.2 更新个人资料

- **接口路径**: `PUT /user/profile`
- **接口描述**: 更新用户的昵称、手机号、性别等基本信息
- **请求参数**:
  ```json
  {
    "nickname": "新昵称",
    "avatar": "头像URL",
    "phone": "手机号",
    "gender": 1
  }
  ```
- **返回值**: {"success": true, "message": "更新成功"}
- **限流**: 60次/分钟 (用户限流)

#### 1.2.3 获取统计数据

- **接口路径**: `GET /user/statistics`
- **接口描述**: 获取用户的各项使用统计数据
- **请求参数**: 无
- **返回值**:
  ```json
  {
    "success": true,
    "data": {
      "resumeCount": 5,
      "collectedJobsCount": 0,
      "appliedJobsCount": 0,
      "optimizeCount": 0,
      "viewedJobsCount": 0,
      "readArticlesCount": 0,
      "inviteCount": 0,
      "rewardCount": 0
    }
  }
  ```
- **限流**: 60次/分钟 (用户限流)

#### 1.2.4 更新头像

- **接口路径**: `POST /user/avatar`
- **接口描述**: 上传并更新用户头像
- **请求参数**:
  ```json
  {
    "avatarUrl": "新头像URL"
  }
  ```
- **返回值**:
  ```json
  {
    "success": true,
    "message": "头像更新成功",
    "data": {
      "avatarUrl": "头像URL"
    }
  }
  ```

#### 1.2.5 修改邮箱

- **接口路径**: `PUT /user/email`
- **接口描述**: 修改用户邮箱（需要验证码）
- **请求参数**:
  ```json
  {
    "email": "新邮箱",
    "code": "验证码"
  }
  ```
- **返回值**: {"success": true, "message": "邮箱修改成功"}

#### 1.2.6 修改UID

- **接口路径**: `PUT /user/uid`
- **接口描述**: 修改用户唯一标识（仅可修改一次）
- **请求参数**:
  ```json
  {
    "uid": "新UID"
  }
  ```
- **返回值**:
  ```json
  {
    "success": true,
    "message": "UID修改成功",
    "data": {
      "uid": "新UID"
    }
  }
  ```
- **限流**: 10次/分钟 (用户限流)
- **说明**: UID规则为6-20位，字母开头，可包含字母、数字、下划线、减号

### 1.3 账号安全

#### 1.3.1 获取账号安全信息

- **接口路径**: `GET /user/security/info`
- **接口描述**: 获取当前用户的账号安全状态
- **请求参数**: 无
- **返回值**:
  ```json
  {
    "success": true,
    "data": {
      "email": "邮箱",
      "phone": "手机号",
      "hasPassword": true,
      "hasWechat": true
    }
  }
  ```

#### 1.3.2 修改邮箱

- **接口路径**: `PUT /user/security/email`
- **接口描述**: 修改用户绑定的邮箱地址
- **请求参数**:
  ```json
  {
    "email": "新邮箱",
    "code": "验证码"
  }
  ```
- **返回值**: {"success": true, "message": "邮箱修改成功"}
- **限流**: 3次/5分钟 (用户限流)
- **防重放**: 300秒超时

#### 1.3.3 发送邮箱验证码

- **接口路径**: `POST /user/security/email/code`
- **接口描述**: 发送邮箱修改验证码
- **请求参数**:
  ```json
  {
    "email": "邮箱"
  }
  ```
- **返回值**: {"success": true, "message": "验证码已发送"}
- **限流**: 1次/分钟 (IP限流)

#### 1.3.4 修改手机号

- **接口路径**: `PUT /user/security/phone`
- **接口描述**: 修改用户绑定的手机号
- **请求参数**:
  ```json
  {
    "phone": "新手机号",
    "code": "验证码"
  }
  ```
- **返回值**: {"success": true, "message": "手机号修改成功"}
- **限流**: 3次/5分钟 (用户限流)
- **防重放**: 300秒超时

#### 1.3.5 发送手机验证码

- **接口路径**: `POST /user/security/phone/code`
- **接口描述**: 发送手机号修改验证码
- **请求参数**:
  ```json
  {
    "phone": "手机号"
  }
  ```
- **返回值**: {"success": true, "message": "验证码已发送（测试验证码：123456）"}
- **限流**: 1次/分钟 (IP限流)

#### 1.3.6 修改密码

- **接口路径**: `PUT /user/security/password`
- **接口描述**: 修改用户登录密码
- **请求参数**:
  ```json
  {
    "oldPassword": "当前密码",
    "newPassword": "新密码"
  }
  ```
- **返回值**: {"success": true, "message": "密码修改成功"}
- **限流**: 3次/5分钟 (用户限流)
- **防重放**: 300秒超时
- **说明**: 密码长度必须在6-20个字符之间

#### 1.3.7 解绑微信账号

- **接口路径**: `POST /user/security/wechat/unbind`
- **接口描述**: 解绑当前用户的微信账号
- **请求参数**: 无
- **返回值**: {"success": true, "message": "微信账号解绑成功"}
- **限流**: 5次/分钟 (用户限流)
- **说明**: 解绑前必须设置邮箱和密码

#### 1.3.8 注销账号

- **接口路径**: `DELETE /user/security/account`
- **接口描述**: 永久注销当前用户账号
- **请求参数**: 无
- **返回值**: {"success": true, "message": "账号已注销"}
- **防重放**: 300秒超时

---

## 2. 简历相关接口

### 2.1 简历解析V2

#### 2.1.1 查询解析状态

- **接口路径**: `GET /resume/v2/parsing-status`
- **接口描述**: 查询当前用户是否有正在解析的简历
- **请求参数**: 无
- **返回值**:
  ```json
  {
    "success": true,
    "isParsing": true,
    "parsingResumeId": 123,
    "parsingResumeTitle": "简历标题",
    "duration": 15000
  }
  ```
- **限流**: 60次/分钟 (用户限流)

#### 2.1.2 上传简历文件

- **接口路径**: `POST /resume/v2/upload`
- **接口描述**: 上传简历文件（PDF/Word），保存到数据库并提取原始文本内容
- **请求参数**:
  - file (MultipartFile): 简历文件（支持PDF、DOC、DOCX，最大10MB）
- **返回值**:
  ```json
  {
    "success": true,
    "resumeId": 123,
    "fileName": "简历.pdf",
    "uploadTime": 1500,
    "message": "文件上传成功，正在AI解析中..."
  }
  ```
- **限流**: 10次/分钟 (用户限流)
- **说明**: 用户最多可上传10份简历，同时只能有一份简历在解析中

#### 2.1.3 AI解析成JSON

- **接口路径**: `POST /resume/v2/parse/{resumeId}`
- **接口描述**: 通过AI将简历文本解析为结构化JSON数据（异步处理，立即返回）
- **请求参数**:
  - resumeId (Long): 简历ID
- **返回值**:
  ```json
  {
    "success": true,
    "resumeId": 123,
    "parseStatus": 1,
    "queueSize": 2,
    "activeCount": 1,
    "message": "解析任务已提交，当前排队中有2个任务，请耐心等待"
  }
  ```
- **限流**: 10次/分钟 (用户限流)

#### 2.1.4 获取简历详情

- **接口路径**: `GET /resume/v2/{resumeId}`
- **接口描述**: 根据简历ID获取完整的简历数据
- **请求参数**:
  - resumeId (Long): 简历ID
- **返回值**:
  ```json
  {
    "success": true,
    "resume": {
      "id": 123,
      "userId": 1,
      "title": "简历标题",
      "fileName": "简历.pdf",
      "fileType": "pdf",
      "fileSize": 102400,
      "parseStatus": 2,
      "parsedData": "{...}",
      "isDefault": 0,
      "createdAt": "2024-01-01 12:00:00",
      "updatedAt": "2024-01-01 12:05:00"
    }
  }
  ```
- **限流**: 30次/分钟 (用户限流)

#### 2.1.5 获取简历列表

- **接口路径**: `GET /resume/v2/list`
- **接口描述**: 获取当前用户的所有简历
- **请求参数**: 无
- **返回值**:
  ```json
  {
    "success": true,
    "list": [...],
    "total": 5
  }
  ```
- **限流**: 30次/分钟 (用户限流)

#### 2.1.6 获取最新简历ID

- **接口路径**: `GET /resume/v2/latest-id`
- **接口描述**: 获取当前用户最新上传的简历ID
- **请求参数**: 无
- **返回值**:
  ```json
  {
    "success": true,
    "resumeId": 123
  }
  ```
- **限流**: 60次/分钟 (用户限流)

#### 2.1.7 更新简历数据

- **接口路径**: `PUT /resume/v2/{resumeId}`
- **接口描述**: 更新用户编辑后的简历JSON数据
- **请求参数**:
  ```json
  {
    "parsedData": "{...}",
    "isAIOptimize": false
  }
  ```
- **返回值**:
  ```json
  {
    "success": true,
    "message": "更新成功"
  }
  ```
- **限流**: 20次/分钟 (用户限流)
- **说明**: 如果isAIOptimize为true，会消耗1次深度优化次数

#### 2.1.8 删除简历

- **接口路径**: `DELETE /resume/v2/{resumeId}`
- **接口描述**: 删除指定的简历
- **请求参数**:
  - resumeId (Long): 简历ID
- **返回值**: {"success": true, "message": "删除成功"}
- **限流**: 10次/分钟 (用户限流)

#### 2.1.9 批量删除简历

- **接口路径**: `POST /resume/v2/batch-delete`
- **接口描述**: 批量删除多个简历
- **请求参数**:
  ```json
  {
    "resumeIds": [1, 2, 3]
  }
  ```
- **返回值**:
  ```json
  {
    "success": true,
    "deletedCount": 3,
    "totalCount": 3,
    "message": "成功删除3个简历"
  }
  ```
- **限流**: 10次/分钟 (用户限流)

#### 2.1.10 设置默认简历

- **接口路径**: `PUT /resume/v2/{resumeId}/set-default`
- **接口描述**: 将指定简历设置为默认简历
- **请求参数**:
  - resumeId (Long): 简历ID
- **返回值**: {"success": true, "message": "设置成功"}
- **限流**: 20次/分钟 (用户限流)

#### 2.1.11 重新解析简历

- **接口路径**: `POST /resume/v2/re-parse/{resumeId}`
- **接口描述**: 重新提交AI解析任务（解析失败的简历可以重试）
- **请求参数**:
  - resumeId (Long): 简历ID
- **返回值**:
  ```json
  {
    "success": true,
    "resumeId": 123,
    "parseStatus": 1,
    "queueSize": 0,
    "activeCount": 1,
    "message": "重新解析任务已提交（将自动重试最多3次），AI正在后台处理，请稍后刷新查看结果"
  }
  ```
- **限流**: 5次/分钟 (用户限流)

### 2.2 简历自定义模块

#### 2.2.1 查询自定义模块列表

- **接口路径**: `GET /resume/custom-module/list/{resumeId}`
- **接口描述**: 根据简历ID查询所有自定义模块
- **请求参数**:
  - resumeId (Long): 简历ID
- **返回值**:
  ```json
  {
    "success": true,
    "data": [...]
  }
  ```
- **限流**: 30次/分钟 (用户限流)

#### 2.2.2 创建自定义模块

- **接口路径**: `POST /resume/custom-module/create`
- **接口描述**: 创建自定义模块
- **请求参数**:
  ```json
  {
    "resumeId": 123,
    "moduleName": "模块名称",
    "moduleContent": "模块内容"
  }
  ```
- **返回值**:
  ```json
  {
    "success": true,
    "data": 456
  }
  ```
- **限流**: 20次/分钟 (用户限流)

#### 2.2.3 更新自定义模块

- **接口路径**: `PUT /resume/custom-module/update`
- **接口描述**: 更新自定义模块
- **请求参数**:
  ```json
  {
    "id": 456,
    "moduleName": "新模块名称",
    "moduleContent": "新模块内容"
  }
  ```
- **返回值**: {"success": true, "message": "更新成功"}
- **限流**: 20次/分钟 (用户限流)

#### 2.2.4 删除自定义模块

- **接口路径**: `DELETE /resume/custom-module/delete/{moduleId}`
- **接口描述**: 删除自定义模块
- **请求参数**:
  - moduleId (Long): 模块ID
- **返回值**: {"success": true, "message": "删除成功"}
- **限流**: 20次/分钟 (用户限流)

#### 2.2.5 批量删除自定义模块

- **接口路径**: `DELETE /resume/custom-module/delete-all/{resumeId}`
- **接口描述**: 批量删除简历的所有自定义模块
- **请求参数**:
  - resumeId (Long): 简历ID
- **返回值**: {"success": true, "message": "删除成功"}
- **限流**: 10次/分钟 (用户限流)

### 2.3 简历渲染导出

#### 2.3.1 获取简历模板列表

- **接口路径**: `GET /resume/render/templates`
- **接口描述**: 获取所有可用的简历模板
- **请求参数**: 无
- **返回值**:
  ```json
  {
    "success": true,
    "data": [...],
    "message": "获取模板列表成功"
  }
  ```
- **限流**: 60次/分钟 (用户限流)

#### 2.3.2 渲染简历

- **接口路径**: `POST /resume/render`
- **接口描述**: 使用Handlebars渲染简历HTML并缓存，不返回内容
- **请求参数**:
  - resumeId (Long): 简历ID
  - templateId (Long): 模板ID
- **返回值**:
  ```json
  {
    "success": true,
    "message": "渲染成功",
    "data": {
      "resumeId": 123,
      "templateId": 1,
      "renderTime": 500,
      "cached": true
    }
  }
  ```
- **限流**: 20次/分钟 (用户限流)

#### 2.3.3 预览简历

- **接口路径**: `POST /resume/render/preview`
- **接口描述**: 预览渲染后的简历HTML，优先从缓存读取
- **请求参数**:
  - resumeId (Long): 简历ID
  - templateId (Long): 模板ID
- **返回值**: HTML页面
- **限流**: 20次/分钟 (用户限流)

#### 2.3.4 导出简历为PDF

- **接口路径**: `POST /resume/render/export/pdf`
- **接口描述**: 使用指定模板导出简历为PDF文件
- **请求参数**:
  - resumeId (Long): 简历ID
  - templateId (Long): 模板ID
- **返回值**: PDF文件
- **限流**: 20次/分钟 (用户限流)

#### 2.3.5 获取渲染历史

- **接口路径**: `GET /resume/render/history`
- **接口描述**: 获取用户的简历渲染历史记录
- **请求参数**:
  - page (Integer): 页码，默认1
  - pageSize (Integer): 每页数量，默认20
- **返回值**:
  ```json
  {
    "success": true,
    "data": null,
    "message": "功能开发中"
  }
  ```
- **限流**: 30次/分钟 (用户限流)

---

## 3. AI对话

### 3.1 获取或创建会话

- **接口路径**: `POST /chat/session`
- **接口描述**: 获取用户的简历诊断会话，如果不存在则创建新会话
- **请求参数**:
  - resumeId (Long): 简历ID
- **返回值**:
  ```json
  {
    "success": true,
    "sessionId": 123,
    "message": "会话创建成功"
  }
  ```
- **限流**: 30次/分钟 (用户限流)

### 3.2 发送消息

- **接口路径**: `POST /chat/message`
- **接口描述**: 发送消息并获取AI回复
- **请求参数**:
  - sessionId (Long): 会话ID
  - message (String): 消息内容
- **返回值**:
  ```json
  {
    "success": true,
    "message": "AI回复内容"
  }
  ```
- **限流**: 30次/分钟 (用户限流)

### 3.3 获取会话历史

- **接口路径**: `GET /chat/history/{sessionId}`
- **接口描述**: 获取会话的所有历史消息
- **请求参数**:
  - sessionId (Long): 会话ID
- **返回值**:
  ```json
  {
    "success": true,
    "messages": [...]
  }
  ```
- **限流**: 30次/分钟 (用户限流)

### 3.4 获取预设提示词

- **接口路径**: `GET /chat/preset-questions`
- **接口描述**: 根据简历内容获取个性化的推荐提问
- **请求参数**:
  - resumeId (Long, 可选): 简历ID
- **返回值**:
  ```json
  {
    "success": true,
    "questions": [
      "我的简历有哪些问题需要优化？",
      "帮我分析一下简历的优势和不足",
      "简历中的项目经历应该怎么写更吸引人？"
    ]
  }
  ```
- **限流**: 30次/分钟 (用户限流)

### 3.5 发送消息（流式）

- **接口路径**: `GET /chat/message-stream`
- **接口描述**: 发送消息并获取AI流式回复（SSE）
- **请求参数**:
  - sessionId (Long): 会话ID
  - message (String): 消息内容
- **返回值**: Server-Sent Events流
- **限流**: 20次/分钟 (用户限流)
- **说明**: 此接口跳过认证，EventSource不支持自定义请求头

### 3.6 批量优化简历

- **接口路径**: `POST /chat/batch-optimize`
- **接口描述**: 根据AI建议批量优化简历内容
- **请求参数**:
  - sessionId (Long): 会话ID
  - suggestions (List<String>): 优化建议列表
- **返回值**:
  ```json
  {
    "success": true,
    "message": "简历优化成功",
    "data": {...}
  }
  ```
- **限流**: 5次/分钟 (用户限流)

---

## 4. AI自动填表

### 4.1 查询AutoFill额度

- **接口路径**: `GET /autofill/quota`
- **接口描述**: 查询当前用户的AutoFill插件剩余使用额度
- **请求参数**: 无
- **返回值**:
  ```json
  {
    "success": true,
    "quota": 10,
    "hasQuota": true,
    "message": "查询成功"
  }
  ```
- **限流**: 60次/分钟 (用户限流)

### 4.2 分析页面HTML结构

- **接口路径**: `POST /autofill/analyze-page`
- **接口描述**: 接收完整HTML，通过AI分析页面结构，提取字段分组和字段列表
- **请求参数**:
  ```json
  {
    "html": "页面HTML",
    "url": "页面URL"
  }
  ```
- **返回值**:
  ```json
  {
    "success": true,
    "sessionId": "会话ID",
    "fields": [...],
    "analyzeTime": 2000,
    "message": "页面分析完成"
  }
  ```
- **限流**: 10次/分钟 (用户限流)
- **说明**: 此步骤仅检查额度，不扣减

### 4.3 AI生成填充值

- **接口路径**: `POST /autofill/fill-values`
- **接口描述**: 基于sessionId和简历数据，AI智能生成每个字段的填充值
- **请求参数**:
  ```json
  {
    "sessionId": "会话ID",
    "resumeId": 123,
    "fields": [...],
    "company": "公司名称",
    "position": "职位名称",
    "task": "任务描述"
  }
  ```
- **返回值**:
  ```json
  {
    "success": true,
    "matches": {...},
    "fillTime": 3000,
    "message": "填充值生成完成"
  }
  ```
- **限流**: 10次/分钟 (用户限流)
- **说明**: 填充值成功返回后会自动扣减一次插件额度

### 4.4 获取简历填表数据

- **接口路径**: `GET /autofill/resume/{resumeId}`
- **接口描述**: 根据简历ID获取格式化后的简历数据，适用于自动填表
- **请求参数**:
  - resumeId (Long): 简历ID
- **返回值**:
  ```json
  {
    "success": true,
    "data": {...},
    "message": "获取成功"
  }
  ```
- **限流**: 30次/分钟 (用户限流)

### 4.5 获取简历列表

- **接口路径**: `GET /autofill/resume/list`
- **接口描述**: 获取当前用户的简历列表（仅返回ID、标题、状态等基本信息）
- **请求参数**: 无
- **返回值**:
  ```json
  {
    "success": true,
    "list": [...],
    "total": 5,
    "message": "获取成功"
  }
  ```
- **限流**: 30次/分钟 (用户限流)

### 4.6 获取默认简历数据

- **接口路径**: `GET /autofill/resume/default`
- **接口描述**: 获取用户设置的默认简历数据，如果没有默认简历则返回最新的简历
- **请求参数**: 无
- **返回值**:
  ```json
  {
    "success": true,
    "data": {...},
    "message": "获取成功"
  }
  ```
- **限流**: 60次/分钟 (用户限流)

### 4.7 记录填表历史

- **接口路径**: `POST /autofill/history`
- **接口描述**: 记录用户的自动填表操作历史
- **请求参数**: 历史数据对象
- **返回值**: {"success": true, "message": "记录成功"}
- **限流**: 20次/分钟 (用户限流)

---

## 5. 邀请系统

### 5.1 获取我的邀请码

- **接口路径**: `GET /invitation/my-code`
- **接口描述**: 获取当前用户的邀请码
- **请求参数**: 无
- **返回值**:
  ```json
  {
    "success": true,
    "data": "INVITE123",
    "message": "获取成功"
  }
  ```
- **限流**: 60次/分钟 (用户限流)

### 5.2 获取我的邀请链接

- **接口路径**: `GET /invitation/my-link`
- **接口描述**: 获取当前用户的邀请链接
- **请求参数**: 无
- **返回值**:
  ```json
  {
    "success": true,
    "data": "https://example.com/invite?code=INVITE123",
    "message": "获取成功"
  }
  ```
- **限流**: 60次/分钟 (用户限流)

### 5.3 获取我的邀请统计

- **接口路径**: `GET /invitation/my-stats`
- **接口描述**: 获取当前用户的邀请统计数据
- **请求参数**: 无
- **返回值**:
  ```json
  {
    "success": true,
    "data": {
      "totalInvites": 10,
      "successfulInvites": 8,
      "totalRewards": 80
    },
    "message": "获取成功"
  }
  ```
- **限流**: 60次/分钟 (用户限流)

### 5.4 获取我的邀请记录

- **接口路径**: `GET /invitation/my-invitations`
- **接口描述**: 获取当前用户的邀请记录列表
- **请求参数**: 无
- **返回值**:
  ```json
  {
    "success": true,
    "data": [...],
    "message": "获取成功"
  }
  ```
- **限流**: 30次/分钟 (用户限流)

### 5.5 获取我的奖励记录

- **接口路径**: `GET /invitation/my-rewards`
- **接口描述**: 获取当前用户的奖励记录列表
- **请求参数**: 无
- **返回值**:
  ```json
  {
    "success": true,
    "data": [...],
    "message": "获取成功"
  }
  ```
- **限流**: 30次/分钟 (用户限流)

### 5.6 填写邀请码

- **接口路径**: `POST /invitation/fill-code`
- **接口描述**: 填写邀请码并获取奖励
- **请求参数**:
  - inviteCode (String): 邀请码
- **返回值**:
  ```json
  {
    "success": true,
    "data": {...},
    "message": "邀请码填写成功，奖励已发放"
  }
  ```
- **限流**: 10次/分钟 (用户限流)

### 5.7 检查用户是否已被邀请

- **接口路径**: `GET /invitation/check-invited`
- **接口描述**: 检查当前用户是否已被邀请
- **请求参数**: 无
- **返回值**:
  ```json
  {
    "success": true,
    "data": false,
    "message": "查询成功"
  }
  ```
- **限流**: 60次/分钟 (用户限流)

### 5.8 获取有趣的邀请文案（AI生成）

- **接口路径**: `GET /invitation/fun-message`
- **接口描述**: 使用AI生成幽默风趣的邀请文案，包含用户的专属邀请码
- **请求参数**: 无
- **返回值**:
  ```json
  {
    "success": true,
    "data": {
      "inviteCode": "INVITE123",
      "inviteLink": "https://example.com/invite?code=INVITE123",
      "message": "AI生成的有趣邀请文案"
    },
    "message": "生成成功"
  }
  ```
- **限流**: 60次/分钟 (用户限流)

---

## 6. 岗位相关

### 6.1 获取岗位列表

- **接口路径**: `GET /jobs/list`
- **接口描述**: 获取岗位列表，支持筛选和排序
- **请求参数**:
  - page (Integer): 页码，默认1
  - pageSize (Integer): 每页数量，默认10
  - jobType (String, 可选): 岗位类型
  - city (String, 可选): 城市
  - industry (String, 可选): 行业
  - salaryMin (Integer, 可选): 最低薪资
  - salaryMax (Integer, 可选): 最高薪资
  - publishTimeStart (String, 可选): 发布开始时间
  - publishTimeEnd (String, 可选): 发布结束时间
  - sortBy (String): 排序方式，默认latest
  - keyword (String, 可选): 关键词
- **返回值**:
  ```json
  {
    "success": true,
    "data": {
      "list": [...],
      "total": 100,
      "page": 1,
      "pageSize": 10
    },
    "message": "获取成功"
  }
  ```
- **限流**: 30次/分钟 (IP限流)
- **说明**: 不需要登录，如果登录了会标记收藏状态

### 6.2 获取岗位详情

- **接口路径**: `GET /jobs/{id}`
- **接口描述**: 获取岗位详细信息
- **请求参数**:
  - id (Long): 岗位ID
- **返回值**:
  ```json
  {
    "success": true,
    "data": {
      "job": {...},
      "collected": false
    },
    "message": "获取成功"
  }
  ```
- **限流**: 30次/分钟 (IP限流)
- **说明**: 不需要登录，会自动增加浏览次数

### 6.3 收藏/取消收藏岗位

- **接口路径**: `POST /jobs/{id}/collect`
- **接口描述**: 切换岗位的收藏状态
- **请求参数**:
  - id (Long): 岗位ID
- **返回值**:
  ```json
  {
    "success": true,
    "data": {
      "collected": true,
      "message": "收藏成功"
    },
    "message": "收藏成功"
  }
  ```
- **说明**: 需要登录

### 6.4 获取收藏的岗位列表

- **接口路径**: `GET /jobs/collections`
- **接口描述**: 获取用户收藏的岗位列表
- **请求参数**:
  - page (Integer): 页码，默认1
  - pageSize (Integer): 每页数量，默认10
- **返回值**:
  ```json
  {
    "success": true,
    "data": {
      "list": [...],
      "total": 10
    },
    "message": "获取成功"
  }
  ```
- **说明**: 需要登录

### 6.5 获取相关岗位推荐

- **接口路径**: `GET /jobs/{id}/related`
- **接口描述**: 根据岗位ID获取相关推荐岗位
- **请求参数**:
  - id (Long): 岗位ID
- **返回值**:
  ```json
  {
    "success": true,
    "data": [...],
    "message": "获取成功"
  }
  ```
- **说明**: 不需要登录

### 6.6 搜索岗位

- **接口路径**: `GET /jobs/search`
- **接口描述**: 根据关键词搜索岗位
- **请求参数**:
  - keyword (String): 搜索关键词
  - page (Integer): 页码，默认1
  - pageSize (Integer): 每页数量，默认10
- **返回值**:
  ```json
  {
    "success": true,
    "data": {
      "list": [...],
      "total": 50
    },
    "message": "搜索成功"
  }
  ```
- **限流**: 30次/分钟 (IP限流)
- **说明**: 不需要登录

---

## 7. 考研项目

### 7.1 获取考研项目列表

- **接口路径**: `GET /postgraduate-exams/list`
- **接口描述**: 获取考研项目列表，支持筛选和排序
- **请求参数**:
  - page (Integer): 页码，默认1
  - pageSize (Integer): 每页数量，默认10
  - keyword (String, 可选): 关键词
  - universityName (String, 可选): 大学名称
  - examYear (String, 可选): 考试年份
  - degreeType (String, 可选): 学位类型
  - examType (String, 可选): 考试类型
  - sortBy (String): 排序方式，默认latest
- **返回值**:
  ```json
  {
    "success": true,
    "data": {
      "list": [...],
      "total": 100
    },
    "message": "获取成功"
  }
  ```
- **限流**: 30次/分钟 (IP限流)
- **说明**: 不需要登录

### 7.2 获取考研项目详情

- **接口路径**: `GET /postgraduate-exams/{id}`
- **接口描述**: 获取考研项目详细信息
- **请求参数**:
  - id (Long): 项目ID
- **返回值**:
  ```json
  {
    "success": true,
    "data": {
      "exam": {...},
      "collected": false
    },
    "message": "获取成功"
  }
  ```
- **限流**: 30次/分钟 (IP限流)
- **说明**: 不需要登录，会自动增加浏览次数

### 7.3 收藏/取消收藏考研项目

- **接口路径**: `POST /postgraduate-exams/{id}/collect`
- **接口描述**: 切换考研项目的收藏状态
- **请求参数**:
  - id (Long): 项目ID
- **返回值**:
  ```json
  {
    "success": true,
    "data": {
      "collected": true,
      "message": "收藏成功"
    },
    "message": "收藏成功"
  }
  ```
- **说明**: 需要登录

### 7.4 获取收藏的考研项目列表

- **接口路径**: `GET /postgraduate-exams/collections`
- **接口描述**: 获取用户收藏的考研项目列表
- **请求参数**:
  - page (Integer): 页码，默认1
  - pageSize (Integer): 每页数量，默认10
- **返回值**:
  ```json
  {
    "success": true,
    "data": {
      "list": [...],
      "total": 10
    },
    "message": "获取成功"
  }
  ```
- **说明**: 需要登录

### 7.5 获取相关考研项目推荐

- **接口路径**: `GET /postgraduate-exams/{id}/related`
- **接口描述**: 根据项目ID获取相关推荐项目
- **请求参数**:
  - id (Long): 项目ID
- **返回值**:
  ```json
  {
    "success": true,
    "data": [...],
    "message": "获取成功"
  }
  ```
- **说明**: 不需要登录

---

## 8. 留学项目

### 8.1 获取留学项目列表

- **接口路径**: `GET /study-abroad-programs/list`
- **接口描述**: 获取留学项目列表，支持筛选和排序
- **请求参数**:
  - page (Integer): 页码，默认1
  - pageSize (Integer): 每页数量，默认10
  - keyword (String, 可选): 关键词
  - universityName (String, 可选): 大学名称
  - degreeType (String, 可选): 学位类型
  - teachingLocation (String, 可选): 授课地点
  - certification (Integer, 可选): 认证状态
  - sortBy (String): 排序方式，默认latest
- **返回值**:
  ```json
  {
    "success": true,
    "data": {
      "list": [...],
      "total": 100
    },
    "message": "获取成功"
  }
  ```
- **限流**: 30次/分钟 (IP限流)
- **说明**: 不需要登录

### 8.2 获取留学项目详情

- **接口路径**: `GET /study-abroad-programs/{id}`
- **接口描述**: 获取留学项目详细信息
- **请求参数**:
  - id (Long): 项目ID
- **返回值**:
  ```json
  {
    "success": true,
    "data": {
      "program": {...},
      "collected": false
    },
    "message": "获取成功"
  }
  ```
- **限流**: 30次/分钟 (IP限流)
- **说明**: 不需要登录，会自动增加浏览次数

### 8.3 收藏/取消收藏留学项目

- **接口路径**: `POST /study-abroad-programs/{id}/collect`
- **接口描述**: 切换留学项目的收藏状态
- **请求参数**:
  - id (Long): 项目ID
- **返回值**:
  ```json
  {
    "success": true,
    "data": {
      "collected": true,
      "message": "收藏成功"
    },
    "message": "收藏成功"
  }
  ```
- **说明**: 需要登录

### 8.4 获取收藏的留学项目列表

- **接口路径**: `GET /study-abroad-programs/collections`
- **接口描述**: 获取用户收藏的留学项目列表
- **请求参数**:
  - page (Integer): 页码，默认1
  - pageSize (Integer): 每页数量，默认10
- **返回值**:
  ```json
  {
    "success": true,
    "data": {
      "list": [...],
      "total": 10
    },
    "message": "获取成功"
  }
  ```
- **说明**: 需要登录

### 8.5 获取相关留学项目推荐

- **接口路径**: `GET /study-abroad-programs/{id}/related`
- **接口描述**: 根据项目ID获取相关推荐项目
- **请求参数**:
  - id (Long): 项目ID
- **返回值**:
  ```json
  {
    "success": true,
    "data": [...],
    "message": "获取成功"
  }
  ```
- **说明**: 不需要登录

---

## 9. 攻略文章

### 9.1 用户端攻略

#### 9.1.1 获取攻略列表

- **接口路径**: `GET /strategy/list`
- **接口描述**: 获取已发布的攻略文章列表，支持筛选和排序
- **请求参数**:
  - page (Integer): 页码，默认1
  - pageSize (Integer): 每页数量，默认10
  - category (String, 可选): 分类
  - keyword (String, 可选): 关键词
  - sortBy (String): 排序方式，默认latest
- **返回值**:
  ```json
  {
    "success": true,
    "data": {
      "list": [...],
      "total": 100
    },
    "message": "获取成功"
  }
  ```
- **限流**: 30次/分钟 (IP限流)
- **说明**: 不需要登录

#### 9.1.2 获取攻略详情

- **接口路径**: `GET /strategy/{id}`
- **接口描述**: 获取攻略文章详细信息
- **请求参数**:
  - id (Long): 攻略ID
- **返回值**:
  ```json
  {
    "success": true,
    "data": {...},
    "message": "获取成功"
  }
  ```
- **限流**: 30次/分钟 (IP限流)
- **说明**: 不需要登录，会自动增加阅读量

#### 9.1.3 收藏攻略

- **接口路径**: `POST /strategy/{id}/collect`
- **接口描述**: 收藏攻略文章
- **请求参数**:
  - id (Long): 攻略ID
- **返回值**: {"success": true, "message": "收藏成功"}
- **说明**: 需要登录

#### 9.1.4 取消收藏

- **接口路径**: `DELETE /strategy/{id}/collect`
- **接口描述**: 取消收藏攻略文章
- **请求参数**:
  - id (Long): 攻略ID
- **返回值**: {"success": true, "message": "取消收藏成功"}
- **说明**: 需要登录

#### 9.1.5 点赞攻略

- **接口路径**: `POST /strategy/{id}/like`
- **接口描述**: 点赞攻略文章
- **请求参数**:
  - id (Long): 攻略ID
- **返回值**: {"success": true, "message": "点赞成功"}
- **说明**: 需要登录

#### 9.1.6 取消点赞

- **接口路径**: `DELETE /strategy/{id}/like`
- **接口描述**: 取消点赞攻略文章
- **请求参数**:
  - id (Long): 攻略ID
- **返回值**: {"success": true, "message": "取消点赞成功"}
- **说明**: 需要登录

#### 9.1.7 解锁VIP攻略

- **接口路径**: `POST /strategy/{id}/unlock`
- **接口描述**: 解锁VIP攻略（消耗解锁次数）
- **请求参数**:
  - id (Long): 攻略ID
- **返回值**:
  ```json
  {
    "success": true,
    "data": {
      "remainingUnlockCount": 5
    },
    "message": "解锁成功"
  }
  ```
- **限流**: 30次/分钟 (IP限流)
- **说明**: 需要登录

#### 9.1.8 获取剩余解锁次数

- **接口路径**: `GET /strategy/unlock-count`
- **接口描述**: 获取用户剩余的VIP攻略解锁次数
- **请求参数**: 无
- **返回值**:
  ```json
  {
    "success": true,
    "data": {
      "unlockCount": 5
    },
    "message": "获取成功"
  }
  ```
- **说明**: 需要登录

#### 9.1.9 获取收藏列表

- **接口路径**: `GET /strategy/my-collections`
- **接口描述**: 获取用户收藏的攻略列表
- **请求参数**:
  - page (Integer): 页码，默认1
  - pageSize (Integer): 每页数量，默认10
- **返回值**:
  ```json
  {
    "success": true,
    "data": {
      "list": [...],
      "total": 10
    },
    "message": "获取成功"
  }
  ```
- **说明**: 需要登录

#### 9.1.10 获取推荐攻略

- **接口路径**: `GET /strategy/{id}/recommend`
- **接口描述**: 根据攻略ID获取推荐攻略
- **请求参数**:
  - id (Long): 攻略ID
  - limit (Integer): 推荐数量，默认5
- **返回值**:
  ```json
  {
    "success": true,
    "data": [...],
    "message": "获取成功"
  }
  ```
- **说明**: 不需要登录

#### 9.1.11 获取分类统计

- **接口路径**: `GET /strategy/categories`
- **接口描述**: 获取攻略分类统计信息
- **请求参数**: 无
- **返回值**:
  ```json
  {
    "success": true,
    "data": [...],
    "message": "获取成功"
  }
  ```
- **说明**: 不需要登录

### 9.2 攻略评论

#### 9.2.1 发表评论

- **接口路径**: `POST /strategy-comments`
- **接口描述**: 在攻略文章下发表一级评论
- **请求参数**:
  ```json
  {
    "articleId": 123,
    "content": "评论内容"
  }
  ```
- **返回值**:
  ```json
  {
    "success": true,
    "data": {...},
    "message": "发表成功"
  }
  ```
- **限流**: 60次/分钟 (用户限流)
- **说明**: 需要登录

#### 9.2.2 回复评论

- **接口路径**: `POST /strategy-comments/reply`
- **接口描述**: 回复某条评论（楼中楼）
- **请求参数**:
  ```json
  {
    "articleId": 123,
    "parentId": 456,
    "content": "回复内容",
    "replyToUserId": 789
  }
  ```
- **返回值**:
  ```json
  {
    "success": true,
    "data": {...},
    "message": "回复成功"
  }
  ```
- **限流**: 60次/分钟 (用户限流)
- **说明**: 需要登录

#### 9.2.3 删除评论

- **接口路径**: `DELETE /strategy-comments/{commentId}`
- **接口描述**: 删除自己的评论（软删除）
- **请求参数**:
  - commentId (Long): 评论ID
- **返回值**: {"success": true, "message": "删除成功"}
- **限流**: 60次/分钟 (用户限流)
- **说明**: 需要登录

#### 9.2.4 获取评论列表

- **接口路径**: `GET /strategy-comments/{articleId}`
- **接口描述**: 获取攻略文章的一级评论列表（分页）
- **请求参数**:
  - articleId (Long): 文章ID
  - sortBy (String): 排序方式（latest-最新，hot-最热），默认latest
  - page (Integer): 页码，默认1
  - pageSize (Integer): 每页条数，默认20
- **返回值**:
  ```json
  {
    "success": true,
    "data": {
      "list": [...],
      "total": 100
    },
    "message": "获取成功"
  }
  ```
- **限流**: 60次/分钟 (IP限流)
- **说明**: 不需要登录

#### 9.2.5 获取楼中楼回复

- **接口路径**: `GET /strategy-comments/{commentId}/replies`
- **接口描述**: 获取某条一级评论的楼中楼回复列表（分页）
- **请求参数**:
  - commentId (Long): 评论ID
  - page (Integer): 页码，默认1
  - pageSize (Integer): 每页条数，默认10
- **返回值**:
  ```json
  {
    "success": true,
    "data": {
      "list": [...],
      "total": 50
    },
    "message": "获取成功"
  }
  ```
- **限流**: 60次/分钟 (IP限流)
- **说明**: 不需要登录

#### 9.2.6 点赞评论

- **接口路径**: `POST /strategy-comments/{commentId}/like`
- **接口描述**: 给评论点赞
- **请求参数**:
  - commentId (Long): 评论ID
- **返回值**: {"success": true, "message": "点赞成功"}
- **限流**: 60次/分钟 (用户限流)
- **说明**: 需要登录

#### 9.2.7 取消点赞

- **接口路径**: `DELETE /strategy-comments/{commentId}/like`
- **接口描述**: 取消评论的点赞
- **请求参数**:
  - commentId (Long): 评论ID
- **返回值**: {"success": true, "message": "取消点赞成功"}
- **限流**: 100次/分钟 (用户限流)
- **说明**: 需要登录

---

## 10. 订单支付

### 10.1 订单管理

#### 10.1.1 获取订单列表

- **接口路径**: `GET /orders/list`
- **接口描述**: 获取当前登录用户的VIP订单列表（分页）
- **请求参数**:
  - page (Integer): 页码，默认1
  - pageSize (Integer): 每页数量，默认10
- **返回值**:
  ```json
  {
    "success": true,
    "data": {
      "list": [...],
      "total": 10
    },
    "message": "获取成功"
  }
  ```
- **限流**: 30次/分钟 (用户限流)

#### 10.1.2 获取订单详情

- **接口路径**: `GET /orders/{id}`
- **接口描述**: 根据订单ID获取订单详细信息
- **请求参数**:
  - id (Long): 订单ID
- **返回值**:
  ```json
  {
    "success": true,
    "data": {...},
    "message": "获取成功"
  }
  ```
- **限流**: 30次/分钟 (用户限流)

### 10.2 支付管理

#### 10.2.1 获取VIP产品列表

- **接口路径**: `GET /payment/products`
- **接口描述**: 获取所有可购买的VIP产品
- **请求参数**: 无
- **返回值**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": 1,
        "name": "月度VIP",
        "price": 29.9,
        "vipDays": 30,
        "optimizeCount": 10,
        "description": "..."
      }
    ],
    "message": "获取成功"
  }
  ```
- **限流**: 60次/分钟 (IP限流)
- **说明**: 不需要登录

#### 10.2.2 创建支付订单

- **接口路径**: `POST /payment/create`
- **接口描述**: 创建微信Native扫码支付订单，返回二维码URL
- **请求参数**:
  - productId (Integer): 产品ID
- **返回值**:
  ```json
  {
    "success": true,
    "data": {
      "orderNo": "订单号",
      "codeUrl": "二维码URL",
      "amount": 29.9
    },
    "message": "订单创建成功，请扫码支付"
  }
  ```
- **限流**: 60次/分钟 (用户限流)
- **防重放**: 300秒超时，需要签名

#### 10.2.3 查询订单支付状态

- **接口路径**: `GET /payment/query`
- **接口描述**: 轮询查询订单是否支付成功
- **请求参数**:
  - orderNo (String): 订单号
- **返回值**:
  ```json
  {
    "success": true,
    "data": {
      "payStatus": 1,
      "message": "支付成功"
    },
    "message": "支付成功"
  }
  ```
- **限流**: 30次/分钟 (用户限流)

#### 10.2.4 微信支付回调

- **接口路径**: `POST /payment/notify/wechat`
- **接口描述**: 接收微信支付异步通知
- **请求参数**: XML格式的微信支付通知数据
- **返回值**: XML格式响应
- **说明**: 此接口由微信服务器调用，不需要JWT认证

#### 10.2.5 取消订单

- **接口路径**: `POST /payment/cancel`
- **接口描述**: 取消未支付的订单
- **请求参数**:
  - orderId (Long): 订单ID
- **返回值**: {"success": true, "message": "订单已取消"}
- **限流**: 60次/分钟 (用户限流)
- **防重放**: 300秒超时，需要签名

---

## 11. 文件上传

### 11.1 上传头像

- **接口路径**: `POST /upload/avatar`
- **接口描述**: 上传用户头像图片
- **请求参数**:
  - file (MultipartFile): 图片文件（支持JPG、PNG，最大2MB）
- **返回值**:
  ```json
  {
    "success": true,
    "data": {
      "url": "/uploads/avatars/avatar_xxx.jpg",
      "filename": "avatar_xxx.jpg"
    },
    "message": "上传成功"
  }
  ```
- **限流**: 50次/分钟 (用户限流)

### 11.2 上传图片

- **接口路径**: `POST /upload/image`
- **接口描述**: 上传通用图片文件
- **请求参数**:
  - file (MultipartFile): 图片文件（支持JPG、PNG，最大2MB）
- **返回值**:
  ```json
  {
    "success": true,
    "data": {
      "url": "/uploads/images/xxx.jpg",
      "filename": "xxx.jpg"
    },
    "message": "上传成功"
  }
  ```
- **限流**: 30次/分钟 (用户限流)

---

## 12. 管理端接口

### 12.1 管理员认证

#### 12.1.1 管理员登录

- **接口路径**: `POST /admin/login`
- **接口描述**: 管理员账号密码登录
- **请求参数**:
  ```json
  {
    "username": "admin",
    "password": "密码"
  }
  ```
- **返回值**:
  ```json
  {
    "success": true,
    "data": {
      "token": "JWT Token",
      "adminInfo": {...}
    },
    "message": "登录成功"
  }
  ```
- **限流**: 10次/分钟 (IP限流)
- **说明**: 跳过JWT认证

#### 12.1.2 获取管理员信息

- **接口路径**: `GET /admin/info`
- **接口描述**: 获取当前登录管理员的信息
- **请求头**:
  - Authorization: Bearer {token}
- **返回值**:
  ```json
  {
    "success": true,
    "data": {...},
    "message": "获取信息成功"
  }
  ```

#### 12.1.3 管理员退出登录

- **接口路径**: `POST /admin/logout`
- **接口描述**: 退出登录
- **返回值**: {"success": true, "message": "退出成功"}

### 12.2 管理员用户管理

#### 12.2.1 获取用户列表

- **接口路径**: `GET /admin/users/list`
- **接口描述**: 获取用户列表（分页+搜索）
- **请求参数**:
  - keyword (String, 可选): 关键词（昵称/手机号/邮箱）
  - isVip (Integer, 可选): VIP状态（0-普通用户 1-VIP用户）
  - status (Integer, 可选): 账号状态（0-禁用 1-正常）
  - page (Integer): 页码，默认1
  - size (Integer): 每页大小，默认20
- **返回值**:
  ```json
  {
    "success": true,
    "data": {
      "list": [...],
      "total": 100
    },
    "message": "获取用户列表成功"
  }
  ```

#### 12.2.2 获取用户详情

- **接口路径**: `GET /admin/users/{id}`
- **接口描述**: 获取指定用户的详细信息
- **请求参数**:
  - id (Long): 用户ID
- **返回值**:
  ```json
  {
    "success": true,
    "data": {
      "id": 1,
      "nickname": "用户昵称",
      "email": "邮箱",
      "isVip": false,
      "vipDetails": {...}
    },
    "message": "获取用户详情成功"
  }
  ```

#### 12.2.3 更新用户信息

- **接口路径**: `PUT /admin/users/{id}`
- **接口描述**: 更新用户信息（包含VIP信息）
- **请求参数**:
  ```json
  {
    "nickname": "新昵称",
    "phone": "手机号",
    "email": "邮箱",
    "gender": 1,
    "status": 1,
    "monthlyVipDays": 30,
    "quarterlyVipDays": 0,
    "yearlyVipDays": 0,
    "resumeOptimizeCount": 10
  }
  ```
- **返回值**: {"success": true, "message": "更新用户信息成功"}

#### 12.2.4 删除用户

- **接口路径**: `DELETE /admin/users/{id}`
- **接口描述**: 删除指定用户
- **请求参数**:
  - id (Long): 用户ID
- **返回值**: {"success": true, "message": "删除用户成功"}

#### 12.2.5 批量删除用户

- **接口路径**: `DELETE /admin/users/batch`
- **接口描述**: 批量删除用户
- **请求参数**:
  ```json
  [1, 2, 3, 4, 5]
  ```
- **返回值**: {"success": true, "message": "批量删除用户成功"}

#### 12.2.6 更新用户状态

- **接口路径**: `PUT /admin/users/{id}/status`
- **接口描述**: 更新用户状态（启用/禁用）
- **请求参数**:
  ```json
  {
    "status": 1
  }
  ```
- **返回值**: {"success": true, "message": "更新用户状态成功"}

#### 12.2.7 修复缺失的会员记录

- **接口路径**: `POST /admin/users/fix-membership`
- **接口描述**: 为所有没有会员信息的用户创建默认会员记录
- **请求参数**: 无
- **返回值**: {"success": true, "message": "成功修复XX个用户的会员记录"}

### 12.3 管理员简历管理

#### 12.3.1 获取简历列表

- **接口路径**: `GET /admin/resumes/list`
- **接口描述**: 获取简历列表（支持筛选）
- **请求参数**:
  - page (Integer): 页码，默认1
  - pageSize (Integer): 每页数量，默认10
  - userId (Long, 可选): 用户ID
  - fileName (String, 可选): 文件名
  - parseStatus (Integer, 可选): 解析状态
  - startDate (Date, 可选): 开始日期
  - endDate (Date, 可选): 结束日期
- **返回值**:
  ```json
  {
    "success": true,
    "data": {
      "list": [...],
      "total": 100,
      "page": 1,
      "pageSize": 10
    },
    "message": "获取成功"
  }
  ```

#### 12.3.2 获取简历详情

- **接口路径**: `GET /admin/resumes/{id}`
- **接口描述**: 获取简历详细信息
- **请求参数**:
  - id (Long): 简历ID
- **返回值**:
  ```json
  {
    "success": true,
    "data": {...},
    "message": "获取成功"
  }
  ```

#### 12.3.3 删除简历

- **接口路径**: `DELETE /admin/resumes/{id}`
- **接口描述**: 删除指定简历
- **请求参数**:
  - id (Long): 简历ID
- **返回值**: {"success": true, "message": "删除成功"}

### 12.4 管理员岗位管理

#### 12.4.1 解析岗位

- **接口路径**: `POST /admin/jobs/parse`
- **接口描述**: 上传岗位文本，AI解析成结构化数据
- **请求参数**:
  ```json
  {
    "rawText": "岗位原始文本"
  }
  ```
- **返回值**:
  ```json
  {
    "success": true,
    "data": {
      "jobs": [...],
      "count": 10
    },
    "message": "解析成功"
  }
  ```
- **说明**: 有效字数限制为10000字

#### 12.4.2 批量保存岗位

- **接口路径**: `POST /admin/jobs/batch-save`
- **接口描述**: 批量保存岗位数据
- **请求参数**:
  ```json
  {
    "jobs": [...]
  }
  ```
- **返回值**:
  ```json
  {
    "success": true,
    "data": {
      "savedCount": 10
    },
    "message": "保存成功"
  }
  ```

#### 12.4.3 获取岗位列表

- **接口路径**: `GET /admin/jobs/list`
- **接口描述**: 获取岗位列表（管理端可查看所有状态）
- **请求参数**:
  - page (Integer): 页码，默认1
  - pageSize (Integer): 每页数量，默认10
  - jobName (String, 可选): 岗位名称
  - jobType (String, 可选): 岗位类型
  - city (String, 可选): 城市
  - industry (String, 可选): 行业
  - status (Integer, 可选): 状态
  - salaryMin (Integer, 可选): 最低薪资
  - salaryMax (Integer, 可选): 最高薪资
  - workExperience (String, 可选): 工作经验
  - education (String, 可选): 学历要求
  - publishTimeStart (Date, 可选): 发布开始时间
  - publishTimeEnd (Date, 可选): 发布结束时间
- **返回值**:
  ```json
  {
    "success": true,
    "data": {
      "list": [...],
      "total": 100
    },
    "message": "获取成功"
  }
  ```

#### 12.4.4 更新岗位状态

- **接口路径**: `PUT /admin/jobs/{id}/status`
- **接口描述**: 更新岗位状态
- **请求参数**:
  ```json
  {
    "status": 1
  }
  ```
- **返回值**: {"success": true, "message": "更新成功"}

#### 12.4.5 删除岗位

- **接口路径**: `DELETE /admin/jobs/{id}`
- **接口描述**: 删除指定岗位
- **请求参数**:
  - id (Long): 岗位ID
- **返回值**: {"success": true, "message": "删除成功"}

#### 12.4.6 获取岗位详情

- **接口路径**: `GET /admin/jobs/{id}`
- **接口描述**: 获取岗位详细信息
- **请求参数**:
  - id (Long): 岗位ID
- **返回值**:
  ```json
  {
    "success": true,
    "data": {...},
    "message": "获取成功"
  }
  ```

#### 12.4.7 更新岗位信息

- **接口路径**: `PUT /admin/jobs/{id}`
- **接口描述**: 更新岗位信息
- **请求参数**: 岗位对象
- **返回值**: {"success": true, "message": "更新成功"}

### 12.5 管理员订单管理

#### 12.5.1 获取订单列表

- **接口路径**: `GET /admin/orders/list`
- **接口描述**: 获取订单列表（支持多条件筛选）
- **请求参数**:
  - page (Integer): 页码，默认1
  - pageSize (Integer): 每页数量，默认10
  - userId (Long, 可选): 用户ID
  - orderNo (String, 可选): 订单号
  - productId (Integer, 可选): 产品ID
  - payStatus (Integer, 可选): 支付状态
  - startDate (Date, 可选): 开始日期
  - endDate (Date, 可选): 结束日期
- **返回值**:
  ```json
  {
    "success": true,
    "data": {
      "list": [...],
      "total": 100,
      "page": 1,
      "pageSize": 10
    },
    "message": "获取成功"
  }
  ```

#### 12.5.2 获取订单统计

- **接口路径**: `GET /admin/orders/statistics`
- **接口描述**: 统计订单总数、总金额等数据
- **请求参数**:
  - startDate (Date, 可选): 开始日期
  - endDate (Date, 可选): 结束日期
- **返回值**:
  ```json
  {
    "success": true,
    "data": {
      "totalOrders": 1000,
      "paidOrders": 800,
      "unpaidOrders": 200,
      "totalRevenue": 23980.0
    },
    "message": "获取成功"
  }
  ```

#### 12.5.3 获取订单详情

- **接口路径**: `GET /admin/orders/{id}`
- **接口描述**: 获取单个订单的详细信息
- **请求参数**:
  - id (Long): 订单ID
- **返回值**:
  ```json
  {
    "success": true,
    "data": {...},
    "message": "获取成功"
  }
  ```

#### 12.5.4 取消订单

- **接口路径**: `PUT /admin/orders/{id}/cancel`
- **接口描述**: 将订单状态更新为已取消
- **请求参数**:
  - id (Long): 订单ID
- **返回值**: {"success": true, "message": "取消成功"}

### 12.6 管理员攻略管理

#### 12.6.1 获取攻略列表

- **接口路径**: `GET /admin/strategy/list`
- **接口描述**: 获取攻略列表（管理端可查看所有状态）
- **请求参数**:
  - page (Integer): 页码，默认1
  - pageSize (Integer): 每页数量，默认10
  - category (String, 可选): 分类
  - status (Integer, 可选): 状态
  - keyword (String, 可选): 关键词
  - sortBy (String): 排序方式，默认latest
- **返回值**:
  ```json
  {
    "success": true,
    "data": {
      "list": [...],
      "total": 100
    },
    "message": "获取成功"
  }
  ```

#### 12.6.2 获取攻略详情

- **接口路径**: `GET /admin/strategy/{id}`
- **接口描述**: 获取攻略详细信息（用于编辑）
- **请求参数**:
  - id (Long): 攻略ID
- **返回值**:
  ```json
  {
    "success": true,
    "data": {...},
    "message": "获取成功"
  }
  ```

#### 12.6.3 创建攻略

- **接口路径**: `POST /admin/strategy`
- **接口描述**: 创建新攻略
- **请求参数**: 攻略DTO对象
- **返回值**:
  ```json
  {
    "success": true,
    "data": 123,
    "message": "创建成功"
  }
  ```

#### 12.6.4 更新攻略

- **接口路径**: `PUT /admin/strategy/{id}`
- **接口描述**: 更新攻略信息
- **请求参数**: 攻略DTO对象
- **返回值**: {"success": true, "message": "更新成功"}

#### 12.6.5 删除攻略

- **接口路径**: `DELETE /admin/strategy/{id}`
- **接口描述**: 删除攻略
- **请求参数**:
  - id (Long): 攻略ID
- **返回值**: {"success": true, "message": "删除成功"}

#### 12.6.6 批量删除攻略

- **接口路径**: `DELETE /admin/strategy/batch`
- **接口描述**: 批量删除攻略
- **请求参数**:
  ```json
  [1, 2, 3, 4, 5]
  ```
- **返回值**: {"success": true, "message": "批量删除成功"}

#### 12.6.7 发布攻略

- **接口路径**: `PUT /admin/strategy/{id}/publish`
- **接口描述**: 发布攻略（草稿->已发布）
- **请求参数**:
  - id (Long): 攻略ID
- **返回值**: {"success": true, "message": "发布成功"}

#### 12.6.8 下架攻略

- **接口路径**: `PUT /admin/strategy/{id}/offline`
- **接口描述**: 下架攻略（已发布->已下架）
- **请求参数**:
  - id (Long): 攻略ID
- **返回值**: {"success": true, "message": "下架成功"}

#### 12.6.9 获取分类统计

- **接口路径**: `GET /admin/strategy/categories`
- **接口描述**: 获取攻略分类统计
- **请求参数**: 无
- **返回值**:
  ```json
  {
    "success": true,
    "data": [...],
    "message": "获取成功"
  }
  ```

#### 12.6.10 获取统计数据

- **接口路径**: `GET /admin/strategy/statistics`
- **接口描述**: 获取攻略总体统计数据
- **请求参数**: 无
- **返回值**:
  ```json
  {
    "success": true,
    "data": {
      "totalStrategies": 100,
      "publishedStrategies": 80,
      "draftStrategies": 20
    },
    "message": "获取成功"
  }
  ```

#### 12.6.11 AI解析内容并创建草稿

- **接口路径**: `POST /admin/strategy/parse`
- **接口描述**: 支持纯文本AI解析和JSON硬编码解析
- **请求参数**: 解析DTO对象
- **返回值**:
  ```json
  {
    "success": true,
    "data": {...},
    "message": "解析成功"
  }
  ```

#### 12.6.12 批量保存攻略草稿

- **接口路径**: `POST /admin/strategy/batch-save`
- **接口描述**: JSON批量导入攻略
- **请求参数**: 攻略DTO数组（最多100条）
- **返回值**:
  ```json
  {
    "success": true,
    "data": {
      "successCount": 95,
      "failCount": 5,
      "failedTitles": [...]
    },
    "message": "批量保存成功"
  }
  ```

#### 12.6.13 批量上传图片

- **接口路径**: `POST /admin/strategy/{id}/images`
- **接口描述**: 为攻略批量上传图片
- **请求参数**:
  - files (List<MultipartFile>): 图片文件列表
- **返回值**:
  ```json
  {
    "success": true,
    "data": [...],
    "message": "图片上传成功"
  }
  ```

#### 12.6.14 获取攻略图片列表

- **接口路径**: `GET /admin/strategy/{id}/images`
- **接口描述**: 获取攻略的图片列表
- **请求参数**:
  - id (Long): 攻略ID
- **返回值**:
  ```json
  {
    "success": true,
    "data": [...],
    "message": "获取成功"
  }
  ```

#### 12.6.15 设置封面图

- **接口路径**: `PUT /admin/strategy/{id}/cover`
- **接口描述**: 设置攻略的封面图
- **请求参数**:
  ```json
  {
    "imageId": 456
  }
  ```
- **返回值**: {"success": true, "message": "封面设置成功"}

#### 12.6.16 删除图片

- **接口路径**: `DELETE /admin/strategy/{id}/images/{imageId}`
- **接口描述**: 删除攻略的单张图片
- **请求参数**:
  - id (Long): 攻略ID
  - imageId (Long): 图片ID
- **返回值**: {"success": true, "message": "图片删除成功"}

#### 12.6.17 更新图片排序

- **接口路径**: `PUT /admin/strategy/{id}/images/sort`
- **接口描述**: 更新攻略图片的排序
- **请求参数**: 排序列表
- **返回值**: {"success": true, "message": "排序更新成功"}

### 12.7 管理员邀请记录

#### 12.7.1 获取邀请记录列表

- **接口路径**: `GET /admin/invitations/list`
- **接口描述**: 管理端分页查询邀请记录列表，支持多条件筛选
- **请求参数**:
  - page (Integer): 页码，默认1
  - pageSize (Integer): 每页数量，默认10
  - inviterId (Long, 可选): 邀请者ID
  - inviteeId (Long, 可选): 被邀请者ID
  - inviteCode (String, 可选): 邀请码
  - status (Integer, 可选): 状态
  - rewardStatus (Integer, 可选): 奖励状态
  - startDate (Date, 可选): 开始日期
  - endDate (Date, 可选): 结束日期
- **返回值**:
  ```json
  {
    "success": true,
    "data": {
      "list": [...],
      "total": 100,
      "page": 1,
      "pageSize": 10
    },
    "message": "获取成功"
  }
  ```

#### 12.7.2 获取邀请统计

- **接口路径**: `GET /admin/invitations/statistics`
- **接口描述**: 统计邀请总数、完成数等数据
- **请求参数**:
  - startDate (Date, 可选): 开始日期
  - endDate (Date, 可选): 结束日期
- **返回值**:
  ```json
  {
    "success": true,
    "data": {
      "totalInvitations": 1000,
      "completedInvitations": 800,
      "pendingInvitations": 200,
      "rewardGranted": 800,
      "rewardPending": 200,
      "completionRate": "80.0"
    },
    "message": "获取成功"
  }
  ```

#### 12.7.3 获取邀请记录详情

- **接口路径**: `GET /admin/invitations/{id}`
- **接口描述**: 获取单个邀请记录的详细信息
- **请求参数**:
  - id (Long): 邀请记录ID
- **返回值**:
  ```json
  {
    "success": true,
    "data": {...},
    "message": "获取成功"
  }
  ```

### 12.8 管理员优化记录

#### 12.8.1 获取优化记录列表

- **接口路径**: `GET /admin/optimization-logs/list`
- **接口描述**: 管理端分页查询简历优化记录列表，支持多条件筛选
- **请求参数**:
  - page (Integer): 页码，默认1
  - pageSize (Integer): 每页数量，默认10
  - userId (Long, 可选): 用户ID
  - resumeId (Long, 可选): 简历ID
  - optimizationType (String, 可选): 优化类型
  - startDate (Date, 可选): 开始日期
  - endDate (Date, 可选): 结束日期
- **返回值**:
  ```json
  {
    "success": true,
    "data": {
      "list": [...],
      "total": 100,
      "page": 1,
      "pageSize": 10
    },
    "message": "获取成功"
  }
  ```

#### 12.8.2 获取优化记录详情

- **接口路径**: `GET /admin/optimization-logs/{id}`
- **接口描述**: 获取单个优化记录的详细信息
- **请求参数**:
  - id (Long): 优化记录ID
- **返回值**:
  ```json
  {
    "success": true,
    "data": {...},
    "message": "获取成功"
  }
  ```

#### 12.8.3 删除优化记录

- **接口路径**: `DELETE /admin/optimization-logs/{id}`
- **接口描述**: 删除优化记录
- **请求参数**:
  - id (Long): 优化记录ID
- **返回值**: {"success": true, "message": "删除成功"}

---

## 13. Chrome插件接口

### 13.1 生成插件登录token

- **接口路径**: `POST /plugin/generate-login-token`
- **接口描述**: Web端登录成功后生成短期token供插件使用
- **请求参数**: 无
- **返回值**:
  ```json
  {
    "success": true,
    "data": {
      "loginToken": "短期token（5分钟有效）"
    },
    "message": "生成成功"
  }
  ```
- **限流**: 10次/分钟 (IP限流)

### 13.2 交换token

- **接口路径**: `POST /plugin/exchange-token`
- **接口描述**: 使用短期loginToken换取正式的accessToken和refreshToken
- **请求参数**:
  ```json
  {
    "loginToken": "短期token"
  }
  ```
- **返回值**:
  ```json
  {
    "success": true,
    "data": {
      "accessToken": "访问token（1天有效）",
      "refreshToken": "刷新token（30天有效）",
      "userInfo": {...}
    },
    "message": "交换成功"
  }
  ```
- **限流**: 20次/分钟 (IP限流)

### 13.3 刷新token

- **接口路径**: `POST /plugin/refresh-token`
- **接口描述**: 使用refreshToken获取新的accessToken
- **请求头**:
  - Authorization: Bearer {refreshToken}
- **返回值**:
  ```json
  {
    "success": true,
    "data": {
      "accessToken": "新的访问token"
    },
    "message": "刷新成功"
  }
  ```
- **限流**: 30次/分钟 (用户限流)

### 13.4 验证token

- **接口路径**: `GET /plugin/validate-token`
- **接口描述**: 验证当前token是否有效
- **请求参数**: 无
- **返回值**:
  ```json
  {
    "success": true,
    "data": {
      "id": 1,
      "nickname": "用户昵称",
      "avatar": "头像URL"
    },
    "message": "Token有效"
  }
  ```
- **限流**: 60次/分钟 (IP限流)

---

## 附录

### 限流说明

- **用户限流 (USER)**: 基于登录用户ID限流
- **IP限流 (IP)**: 基于客户端IP地址限流

### 认证说明

- 大部分接口需要JWT Token认证
- 带有 `@SkipAuth` 注解的接口跳过认证
- Token通过请求头传递：`Authorization: Bearer {token}`

### 防重放说明

- 部分敏感接口启用防重放机制
- 通过 `@PreventReplay` 注解配置
- 需要在指定时间窗口内提供有效签名

### 返回格式

所有接口统一返回格式：

```json
{
  "success": true/false,
  "message": "操作结果描述",
  "data": {...}  // 数据对象或数组（可选）
}
```

---

**文档生成时间**: 2024-12-07
**API版本**: v1.0
