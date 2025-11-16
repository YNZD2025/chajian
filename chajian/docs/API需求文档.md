# 一念职达助手 - API 需求文档

## 📋 目录

- [概述](#概述)
- [认证系统API](#认证系统api)
- [AI自动填表API](#ai自动填表api)
- [用户数据API](#用户数据api)
- [文件服务API](#文件服务api)
- [数据模型](#数据模型)
- [错误处理](#错误处理)
- [安全要求](#安全要求)

## 🔍 概述

### 系统架构
- **前端**：Chrome浏览器扩展
- **后端**：RESTful API 服务
- **AI服务**：智能表单分析和填写服务
- **数据库**：用户数据和简历信息存储

### 技术规范
- **协议**：HTTPS
- **数据格式**：JSON
- **认证方式**：JWT双令牌机制
- **API版本**：v1

### 环境配置
```json
{
  "development": {
    "API_BASE_URL": "http://localhost:8080",
    "WEB_BASE_URL": "http://localhost:3000"
  },
  "production": {
    "API_BASE_URL": "https://your-production-api.com",
    "WEB_BASE_URL": "https://your-production-web.com"
  }
}
```

## 🔐 认证系统API

### 1. 用户注册

**接口地址**：`POST /api/auth/register`

**请求参数**：
```json
{
  "username": "string",      // 用户名，3-20字符
  "email": "string",         // 邮箱地址
  "password": "string",      // 密码，6-20字符
  "nickname": "string"       // 昵称（可选）
}
```

**响应示例**：
```json
{
  "success": true,
  "code": 200,
  "message": "注册成功",
  "data": {
    "user": {
      "id": "user_123456",
      "username": "testuser",
      "email": "test@example.com",
      "nickname": "测试用户",
      "avatar": "",
      "isVip": false,
      "createdAt": "2024-11-14T10:30:00Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 900  // 15分钟
  }
}
```

### 2. 邮箱/用户名登录

**接口地址**：`POST /api/auth/login`

**请求参数**：
```json
{
  "email": "string",    // 邮箱
  "password": "string",      // 密码
  "rememberMe": "boolean"    // 是否记住登录状态
}
```

**响应示例**：
```json
{
  "success": true,
  "code": 200,
  "message": "登录成功",
  "data": {
    "user": {
      "id": "user_123456",
      "username": "testuser",
      "email": "test@example.com",
      "nickname": "测试用户",
      "avatar": "https://example.com/avatar.jpg",
      "isVip": true
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 900  // 15分钟
  }
}
```

### 3. 微信OAuth登录

**接口地址**：`GET /api/auth/wechat/authorize`

**请求参数**：
- `redirect_uri`: 回调地址（可选）

**响应**：重定向到微信授权页面

**回调处理**：`POST /api/auth/wechat/callback`

**请求参数**：
```json
{
  "code": "string",         // 微信授权码
  "state": "string"         // 状态参数
}
```

### 4. 令牌刷新

**接口地址**：`POST /api/auth/refresh`

**请求头**：
```
Authorization: Bearer {refreshToken}
```

**响应示例**：
```json
{
  "success": true,
  "code": 200,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 900
  }
}
```

### 5. 退出登录

**接口地址**：`POST /api/auth/logout`

**请求头**：
```
Authorization: Bearer {accessToken}
```

**响应示例**：
```json
{
  "success": true,
  "code": 200,
  "message": "退出成功"
}
```

## 🤖 AI自动填表API

### 1. 页面结构分析

**接口地址**：`POST /api/autofill/analyze-page`

**请求头**：
```
Authorization: Bearer {accessToken}
Content-Type: application/json
```

**请求参数**：
```json
{
  "html": "string",          // 页面HTML内容
  "url": "string",           // 页面URL
  "companyName": "string",   // 公司名称（可选）
  "positionName": "string"   // 职位名称（可选）
}
```

**响应示例**：
```json
{
  "success": true,
  "code": 200,
  "message": "页面分析完成",
  "data": {
    "sessionId": "session_789012",
    "pageInfo": {
      "title": "软件工程师 - 阿里巴巴",
      "companyName": "阿里巴巴",
      "positionName": "软件工程师",
      "framework": "React"
    },
    "formSections": [
      {
        "sectionId": "basic_info",
        "sectionName": "基本信息",
        "fields": [
          {
            "fieldId": "name",
            "fieldType": "name",
            "label": "姓名",
            "selector": "#applicant-name",
            "required": true,
            "dataType": "string"
          },
          {
            "fieldId": "phone",
            "fieldType": "phone",
            "label": "联系电话",
            "selector": "input[name='mobile']",
            "required": true,
            "dataType": "string",
            "pattern": "^1[3-9]\\d{9}$"
          }
        ]
      }
    ],
    "totalFields": 15,
    "confidence": 0.95
  }
}
```

### 2. 智能填写表单

**接口地址**：`POST /api/autofill/fill-values`

**请求头**：
```
Authorization: Bearer {accessToken}
Content-Type: application/json
```

**请求参数**：
```json
{
  "sessionId": "string",     // 页面分析会话ID
  "resumeId": "string",      // 简历ID
  "companyName": "string",   // 公司名称（可选）
  "positionName": "string",  // 职位名称（可选）
  "customData": {            // 自定义数据（可选）
    "expectedSalary": "15-25K",
    "availableDate": "2024-12-01"
  }
}
```

**响应示例**：
```json
{
  "success": true,
  "code": 200,
  "message": "填写方案生成成功",
  "data": {
    "fillData": {
      "basic_info": {
        "name": "张三",
        "phone": "13912345678",
        "email": "zhangsan@example.com",
        "gender": "男",
        "birthday": "1995-03-15"
      },
      "education_info": {
        "school": "清华大学",
        "major": "计算机科学与技术",
        "education": "本科",
        "graduationDate": "2017-06"
      }
    },
    "fillStrategy": {
      "totalFields": 15,
      "plannedFills": 12,
      "confidence": 0.88,
      "warnings": [
        {
          "fieldId": "specialSkills",
          "message": "该字段需要手动填写"
        }
      ]
    },
    "usageInfo": {
      "remainingQuota": 45,
      "isVip": true
    }
  }
}
```

## 👤 用户数据API

### 1. 获取用户信息

**接口地址**：`GET /api/user/profile`

**请求头**：
```
Authorization: Bearer {accessToken}
```

**响应示例**：
```json
{
  "success": true,
  "code": 200,
  "data": {
    "user": {
      "id": "user_123456",
      "username": "testuser",
      "email": "test@example.com",
      "nickname": "测试用户",
      "avatar": "https://example.com/avatar.jpg",
      "isVip": true,
      "vipExpireDate": "2024-12-31T23:59:59Z",
      "usageStats": {
        "totalFills": 156,
        "successRate": 0.92,
        "monthlyUsage": 23
      }
    }
  }
}
```

### 2. 更新用户信息

**接口地址**：`PUT /api/user/profile`

**请求参数**：
```json
{
  "nickname": "string",
  "avatar": "string"       // 头像URL
}
```

### 3. 获取简历列表

**接口地址**：`GET /api/user/resumes`

**响应示例**：
```json
{
  "success": true,
  "code": 200,
  "data": {
    "resumes": [
      {
        "id": "resume_001",
        "name": "软件工程师简历",
        "isDefault": true,
        "createdAt": "2024-10-15T10:30:00Z",
        "updatedAt": "2024-11-10T16:45:00Z"
      }
    ]
  }
}
```

### 4. 获取简历详情

**接口地址**：`GET /api/user/resumes/{resumeId}`

**响应示例**：
```json
{
  "success": true,
  "code": 200,
  "data": {
    "resume": {
      "id": "resume_001",
      "name": "软件工程师简历",
      "basicInfo": {
        "name": "张三",
        "gender": "男",
        "phone": "13912345678",
        "email": "zhangsan@example.com",
        "birthday": "1995-03-15",
        "age": "29",
        "idCard": "110101199503151234"
      },
      "education": [
        {
          "school": "清华大学",
          "major": "计算机科学与技术",
          "education": "本科",
          "degree": "学士",
          "startDate": "2013-09",
          "endDate": "2017-06",
          "gpa": "3.8"
        }
      ],
      "experience": [
        {
          "company": "腾讯科技",
          "position": "高级软件工程师",
          "department": "微信事业群",
          "startDate": "2019-07",
          "endDate": "2024-03",
          "description": "负责微信后台服务开发..."
        }
      ],
      "intention": {
        "expectedSalary": "25-35K",
        "desiredPosition": "技术专家",
        "desiredCity": "北京,上海,深圳",
        "jobType": "全职"
      }
    }
  }
}
```

### 5. 创建/更新简历

**接口地址**：`POST /api/user/resumes` (新建) 或 `PUT /api/user/resumes/{resumeId}` (更新)

**请求参数**：参考简历详情的数据结构

## 📁 文件服务API

### 1. 上传简历文件

**接口地址**：`POST /api/files/resume`

**请求头**：
```
Authorization: Bearer {accessToken}
Content-Type: multipart/form-data
```

**请求参数**：
```
file: File                 // 简历文件 (PDF, DOC, DOCX)
```

**响应示例**：
```json
{
  "success": true,
  "code": 200,
  "message": "简历解析成功",
  "data": {
    "fileId": "file_789012",
    "fileName": "张三_软件工程师简历.pdf",
    "fileSize": 1048576,
    "parseResult": {
      "basicInfo": { ... },
      "education": [ ... ],
      "experience": [ ... ],
      "skills": [ ... ]
    },
    "confidence": 0.92
  }
}
```

### 2. 上传头像

**接口地址**：`POST /api/files/avatar`

**请求参数**：
```
file: File                 // 头像文件 (JPG, PNG)
```

**响应示例**：
```json
{
  "success": true,
  "code": 200,
  "data": {
    "url": "https://cdn.example.com/avatars/user_123456.jpg"
  }
}
```

## 📊 数据模型

### 用户模型 (User)
```typescript
interface User {
  id: string;
  username: string;
  email: string;
  nickname?: string;
  avatar?: string;
  isVip: boolean;
  vipExpireDate?: string;
  createdAt: string;
  updatedAt: string;
}
```

### 简历模型 (Resume)
```typescript
interface Resume {
  id: string;
  userId: string;
  name: string;
  isDefault: boolean;
  basicInfo: BasicInfo;
  education: Education[];
  experience: Experience[];
  skills: Skill[];
  intention: JobIntention;
  createdAt: string;
  updatedAt: string;
}

interface BasicInfo {
  name: string;
  gender?: string;
  phone: string;
  email: string;
  birthday?: string;
  age?: string;
  idCard?: string;
  address?: string;
  nationality?: string;
  politicalStatus?: string;
  maritalStatus?: string;
}

interface Education {
  school: string;
  major: string;
  education: string;  // 学历：高中/专科/本科/硕士/博士
  degree?: string;    // 学位：学士/硕士/博士
  startDate: string;
  endDate: string;
  gpa?: string;
  ranking?: string;
}

interface Experience {
  company: string;
  position: string;
  department?: string;
  startDate: string;
  endDate?: string;   // 空值表示至今
  description: string;
  achievements?: string[];
}

interface JobIntention {
  expectedSalary?: string;
  desiredPosition?: string;
  desiredCity?: string;
  jobType?: string;   // 全职/兼职/实习
  availableDate?: string;
}
```

### 填表会话模型 (AutofillSession)
```typescript
interface AutofillSession {
  sessionId: string;
  userId: string;
  url: string;
  pageInfo: PageInfo;
  formSections: FormSection[];
  createdAt: string;
  expiresAt: string;
}

interface PageInfo {
  title: string;
  companyName?: string;
  positionName?: string;
  framework?: string;
}

interface FormSection {
  sectionId: string;
  sectionName: string;
  fields: FormField[];
}

interface FormField {
  fieldId: string;
  fieldType: string;
  label: string;
  selector: string;
  required: boolean;
  dataType: string;
  pattern?: string;
  options?: string[];
}
```

## ❌ 错误处理

### 标准错误格式
```json
{
  "success": false,
  "code": 400,
  "message": "请求参数错误",
  "error": {
    "type": "VALIDATION_ERROR",
    "details": [
      {
        "field": "email",
        "message": "邮箱格式不正确"
      }
    ]
  }
}
```

### 错误码规范

#### 客户端错误 (4xx)
- `400` - 请求参数错误
- `401` - 未授权/令牌无效
- `403` - 权限不足
- `404` - 资源不存在
- `429` - 请求过于频繁

#### 服务器错误 (5xx)
- `500` - 内部服务器错误
- `502` - 网关错误
- `503` - 服务不可用

#### 业务错误码
- `AUTH001` - 用户名或密码错误
- `AUTH002` - 账号已被锁定
- `USER001` - 用户不存在
- `USER002` - 邮箱已被注册
- `RESUME001` - 简历解析失败
- `FILL001` - 页面分析失败
- `FILL002` - 填写配额不足

## 🔒 安全要求

### 认证安全
- **令牌机制**：使用JWT双令牌（access/refresh）
- **令牌过期**：访问令牌15分钟，刷新令牌14天
- **密码加密**：使用bcrypt加密存储
- **会话管理**：支持多设备同时登录

### 数据安全
- **HTTPS传输**：所有API必须使用HTTPS
- **敏感信息**：身份证、手机号等脱敏处理
- **数据校验**：严格的输入验证和SQL注入防护
- **访问控制**：基于角色的权限控制

### 接口安全
- **频率限制**：防止恶意请求和暴力破解
- **CORS配置**：严格的跨域资源共享配置
- **请求签名**：关键接口使用请求签名验证
- **日志审计**：完整的操作日志记录

### 隐私保护
- **数据最小化**：只收集必要的用户信息
- **用户同意**：明确的数据使用授权
- **数据删除**：用户可以删除个人数据
- **匿名化处理**：统计数据去标识化

## 🚀 性能要求

### 响应时间
- **页面分析**：< 3秒
- **填写方案生成**：< 2秒
- **用户登录**：< 1秒
- **数据查询**：< 500ms

### 并发能力
- **同时在线用户**：10,000+
- **每秒请求数**：1,000+
- **填表任务处理**：100/分钟

### 可用性
- **服务可用性**：99.9%
- **数据备份**：实时备份
- **故障恢复**：< 5分钟

---

**文档版本**：v1.0.0
**最后更新**：2024-11-14
**维护团队**：一念职达技术团队