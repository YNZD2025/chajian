# AutoFillController 接口文档

## 概述
AI自动填表控制器，为Chrome插件提供智能字段分析和简历数据API服务。

**基础路径**: `/api/autofill`  
**跨域**: 已配置 CORS，支持所有来源  
**认证**: 需要 JWT Token（通过 `Authorization: Bearer {token}` 头部传递）

---

## 接口列表

### 1. 分析页面HTML结构

**功能**: 接收完整HTML，通过AI分析页面结构，提取字段分组和字段列表，返回sessionId用于后续fill-values调用。

**请求**
```
POST /api/autofill/analyze-page
Content-Type: application/json
```

**请求参数**
```json
{
  "html": "string",       // 必填，页面完整HTML
  "url": "string",        // 选填，页面URL
  "company": "string",    // 选填，公司名称
  "position": "string"    // 选填，职位名称
}
```

**响应成功 (200)**
```json
{
  "success": true,
  "sessionId": "uuid-string",          // 会话ID，用于后续fill-values调用
  "sections": [                        // 字段分组列表
    {
      "sectionName": "基本信息",
      "fields": [
        {
          "fieldName": "姓名",
          "fieldType": "text",
          "required": true,
          "selector": "input[name='name']"
        }
      ]
    }
  ],
  "analyzeTime": 1500,                 // 分析耗时（毫秒）
  "message": "页面分析完成"
}
```

**响应失败 (400/500)**
```json
{
  "success": false,
  "message": "HTML不能为空",
  "error": "IllegalArgumentException"
}
```

---

### 2. AI生成填充值

**功能**: 基于analyze-page返回的sessionId和详细字段信息，结合简历JSON数据，AI生成每个字段的填充值。

**请求**
```
POST /api/autofill/fill-values
Content-Type: application/json
```

**请求参数**
```json
{
  "sessionId": "string",              // 必填，从analyze-page返回的会话ID
  "fields": [                         // 必填，字段列表
    {
      "fieldName": "姓名",
      "fieldType": "text",
      "selector": "input[name='name']",
      "required": true
    }
  ],
  "resumeData": {                     // 必填，简历JSON数据
    "basicInfo": {
      "name": "张三",
      "phone": "13800138000"
    },
    "education": [...],
    "workExperience": [...]
  },
  "company": "string",                // 选填，公司名称
  "position": "string"                // 选填，职位名称
}
```

**响应成功 (200)**
```json
{
  "success": true,
  "matches": {                        // 字段匹配结果
    "input[name='name']": {
      "value": "张三",
      "confidence": 0.95,
      "source": "basicInfo.name"
    },
    "input[name='phone']": {
      "value": "13800138000",
      "confidence": 0.90,
      "source": "basicInfo.phone"
    }
  },
  "fillTime": 2000,                   // 生成耗时（毫秒）
  "message": "填充值生成完成"
}
```

**响应失败 (400/500)**
```json
{
  "success": false,
  "message": "sessionId不能为空",
  "error": "IllegalArgumentException"
}
```

---

### 3. 获取简历填表数据

**功能**: 根据简历ID获取格式化后的简历数据，适用于自动填表。

**请求**
```
GET /api/autofill/resume/{resumeId}
Authorization: Bearer {token}
```

**路径参数**
- `resumeId` (Long, 必填): 简历ID

**响应成功 (200)**
```json
{
  "success": true,
  "data": {
    "resumeId": 1,
    "basicInfo": {
      "name": "张三",
      "email": "zhangsan@example.com",
      "phone": "13800138000",
      "gender": "男",
      "age": 25
    },
    "education": [
      {
        "school": "清华大学",
        "major": "计算机科学",
        "degree": "本科",
        "period": "2015.09 - 2019.06",
        "gpa": "3.8/4.0"
      }
    ],
    "workExperience": [...],
    "projects": [...],
    "skills": {...},
    "certifications": [...],
    "awards": [...],
    "languages": [...]
  },
  "message": "获取成功"
}
```

**响应失败 (401/400/500)**
```json
{
  "success": false,
  "message": "用户未登录"
}
```

---

### 4. 获取简历列表

**功能**: 获取当前用户的简历列表（仅返回ID、标题、状态等基本信息）。

**请求**
```
GET /api/autofill/resume/list
Authorization: Bearer {token}
```

**响应成功 (200)**
```json
{
  "success": true,
  "list": [
    {
      "id": 1,
      "title": "软件工程师简历",
      "parseStatus": 2,
      "createdAt": "2024-01-01T10:00:00",
      "updatedAt": "2024-01-15T14:30:00"
    },
    {
      "id": 2,
      "title": "产品经理简历",
      "parseStatus": 2,
      "createdAt": "2024-02-01T10:00:00",
      "updatedAt": "2024-02-15T14:30:00"
    }
  ],
  "total": 2,
  "message": "获取成功"
}
```

**响应失败 (401/500)**
```json
{
  "success": false,
  "message": "用户未登录"
}
```

---

### 5. 获取默认简历数据

**功能**: 获取用户设置的默认简历数据，如果没有默认简历则返回最新的简历。

**请求**
```
GET /api/autofill/resume/default
Authorization: Bearer {token}
```

**响应成功 (200)**
```json
{
  "success": true,
  "data": {
    "resumeId": 1,
    "basicInfo": {...},
    "education": [...],
    "workExperience": [...],
    // ... 完整简历数据
  },
  "message": "获取成功"
}
```

**响应失败（无简历）(200)**
```json
{
  "success": false,
  "message": "暂无简历数据"
}
```

**响应失败 (401/500)**
```json
{
  "success": false,
  "message": "用户未登录"
}
```

---

### 6. 记录填表历史

**功能**: 记录用户的自动填表操作历史（可选功能）。

**请求**
```
POST /api/autofill/history
Content-Type: application/json
Authorization: Bearer {token}
```

**请求参数**
```json
{
  "resumeId": 1,
  "url": "https://example.com/jobs/apply",
  "company": "腾讯",
  "position": "后端开发工程师",
  "fieldsCount": 15,
  "filledCount": 12,
  "timestamp": "2024-11-28T10:00:00"
}
```

**响应成功 (200)**
```json
{
  "success": true,
  "message": "记录成功"
}
```

**响应失败 (401/500)**
```json
{
  "success": false,
  "message": "用户未登录"
}
```

---

## 使用流程

### 完整的自动填表流程

```
1. 用户登录
   ↓
2. GET /api/autofill/resume/default
   获取默认简历数据
   ↓
3. POST /api/autofill/analyze-page
   发送页面HTML，获取sessionId和字段结构
   ↓
4. POST /api/autofill/fill-values
   传入sessionId、字段列表、简历数据，获取填充值
   ↓
5. 插件自动填写表单
   ↓
6. POST /api/autofill/history（可选）
   记录填表历史
```

---

## 错误码说明

| HTTP状态码 | 说明 |
|-----------|------|
| 200 | 请求成功 |
| 400 | 请求参数错误 |
| 401 | 未授权（未登录或token过期） |
| 500 | 服务器内部错误 |

---

## 认证说明

所有接口（除了 `/analyze-page` 和 `/fill-values`）都需要JWT Token认证。

**请求头示例**:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**获取Token**: 通过用户登录接口 `/api/auth/login` 获取。

---

## 注意事项

1. **跨域支持**: 该控制器已配置 `@CrossOrigin(origins = "*")`，支持所有来源的跨域请求。

2. **超时时间**: AI分析和填充值生成可能需要较长时间（1-3秒），建议客户端设置合理的超时时间。

3. **Session管理**: `sessionId` 由 `analyze-page` 接口生成，用于后续 `fill-values` 调用时关联上下文。

4. **数据格式**: 简历数据格式需符合系统标准JSON结构（包含 `basicInfo`, `education`, `workExperience` 等字段）。

5. **性能优化**: 
   - 建议缓存 `analyze-page` 返回的字段结构
   - 避免频繁调用AI接口
   - 使用 `resume/default` 接口缓存默认简历数据

---

## 示例代码

### JavaScript (Chrome插件)

```javascript
// 1. 分析页面
async function analyzePage() {
  const html = document.documentElement.outerHTML;
  const response = await fetch('http://your-domain/api/autofill/analyze-page', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      html: html,
      url: window.location.href,
      company: '腾讯',
      position: '后端开发'
    })
  });
  
  const result = await response.json();
  return result.sessionId;
}

// 2. 获取填充值
async function getFillValues(sessionId, fields, resumeData) {
  const response = await fetch('http://your-domain/api/autofill/fill-values', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      sessionId: sessionId,
      fields: fields,
      resumeData: resumeData,
      company: '腾讯',
      position: '后端开发'
    })
  });
  
  const result = await response.json();
  return result.matches;
}

// 3. 获取默认简历
async function getDefaultResume() {
  const token = localStorage.getItem('token');
  const response = await fetch('http://your-domain/api/autofill/resume/default', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  const result = await response.json();
  return result.data;
}
```

### cURL示例

```bash
# 分析页面
curl -X POST http://your-domain/api/autofill/analyze-page \
  -H "Content-Type: application/json" \
  -d '{
    "html": "<html>...</html>",
    "url": "https://example.com",
    "company": "腾讯",
    "position": "后端开发"
  }'

# 获取默认简历
curl -X GET http://your-domain/api/autofill/resume/default \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 更新日志

### v1.0.0 (2024-11-28)
- ✅ 新增 `/analyze-page` 接口：AI分析页面HTML结构
- ✅ 新增 `/fill-values` 接口：AI生成字段填充值
- ✅ 新增 `/resume/{resumeId}` 接口：获取格式化简历数据
- ✅ 新增 `/resume/list` 接口：获取简历列表
- ✅ 新增 `/resume/default` 接口：获取默认简历
- ✅ 新增 `/history` 接口：记录填表历史

---

## 技术支持

如有问题，请联系开发团队或查看项目文档。

