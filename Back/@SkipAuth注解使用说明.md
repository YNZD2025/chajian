# @SkipAuth 注解使用说明

## 概述

`@SkipAuth` 是一个自定义注解，用于标记**不需要登录验证**的接口。系统默认拦截所有请求进行JWT验证，只有标记了 `@SkipAuth` 的接口才会跳过验证。

## 工作原理

1. **全局拦截**: `JwtInterceptor` 拦截所有请求（`/**`）
2. **检查注解**: 检查Controller方法或类上是否有 `@SkipAuth` 注解
3. **决策处理**:
   - 有注解 → 跳过JWT验证，直接放行
   - 无注解 → 验证JWT Token，验证失败返回401

## 使用方法

### 方式一：方法级别（推荐）

在具体的Controller方法上添加注解：

```java
@RestController
@RequestMapping("/api")
public class ExampleController {

    @GetMapping("/public")
    @SkipAuth  // 这个接口不需要登录
    public String publicApi() {
        return "公开接口，无需登录";
    }

    @GetMapping("/private")
    // 没有@SkipAuth，需要登录
    public String privateApi() {
        return "需要登录的接口";
    }
}
```

### 方式二：类级别

在整个Controller类上添加注解（该类的所有方法都跳过验证）：

```java
@RestController
@RequestMapping("/auth")
@SkipAuth  // 整个认证控制器都不需要登录
public class AuthController {

    @GetMapping("/login")
    public String login() {
        return "登录接口";
    }

    @GetMapping("/register")
    public String register() {
        return "注册接口";
    }
}
```

### 方式三：混合使用

类上有 `@SkipAuth`，但某个方法需要登录：

```java
@RestController
@RequestMapping("/user")
@SkipAuth  // 类级别：默认不需要登录
public class UserController {

    @GetMapping("/info")
    // 继承类级别的@SkipAuth，不需要登录
    public String getUserInfo() {
        return "用户信息";
    }

    // 注意：当前实现下，类级别的@SkipAuth会影响所有方法
    // 如果需要某个方法必须登录，需要移除类级别注解，改为方法级别
}
```

## 当前项目中的应用

### 1. 认证相关接口（AuthController）

```java
@RestController
@RequestMapping("/auth")
@SkipAuth  // 登录相关接口默认跳过验证
public class AuthController {
    // /auth/qrcode/generate - 生成二维码
    // /auth/qrcode/status/{sceneId} - 查询登录状态
    // /auth/wechat/callback - 微信回调
    // /auth/logout - 退出登录
}
```

**原因**: 登录接口本身不能要求用户先登录。

### 2. AI接口（AiController）

```java
@RestController
@RequestMapping("/ai")
@SkipAuth  // AI接口暂时公开访问
public class AiController {
    // /ai/chat - AI聊天
    // /ai/ask - AI问答
}
```

**原因**: 演示性质，方便测试。生产环境可以移除此注解要求登录。

### 3. 简历解析接口（ResumeV2Controller）

```java
@RestController
@RequestMapping("/resume/v2")
@SkipAuth  // 简历解析接口暂时公开访问
public class ResumeV2Controller {
    // /resume/v2/extract-text - 提取简历文本
    // /resume/v2/parse-json/{taskId} - 解析简历JSON
}
```

**原因**: 演示性质。生产环境建议移除，要求用户登录后才能使用。

## 如何要求接口必须登录

### 示例：创建一个需要登录的用户管理接口

```java
@RestController
@RequestMapping("/user")
// 不添加@SkipAuth，默认需要登录
public class UserManageController {

    @GetMapping("/profile")
    public Map<String, Object> getProfile(HttpServletRequest request) {
        // 从request中获取userId（拦截器已设置）
        Long userId = (Long) request.getAttribute("userId");

        // 查询用户信息
        // ...

        return userInfo;
    }

    @PostMapping("/update")
    public String updateProfile(HttpServletRequest request, @RequestBody UserDTO dto) {
        Long userId = (Long) request.getAttribute("userId");

        // 更新用户信息
        // ...

        return "更新成功";
    }
}
```

### 在方法中获取当前登录用户ID

JWT拦截器验证成功后，会将用户ID设置到request属性中：

```java
@GetMapping("/my-data")
public String getMyData(HttpServletRequest request) {
    // 方式1: 从request属性获取
    Long userId = (Long) request.getAttribute("userId");

    // 方式2: 如果需要更多用户信息，可以再查询数据库
    User user = userService.getUserById(userId);

    return "用户ID: " + userId + ", 昵称: " + user.getNickname();
}
```

## 注解参数（可选）

`@SkipAuth` 支持一个可选的 `value` 参数，用于说明跳过验证的原因：

```java
@GetMapping("/test")
@SkipAuth("仅用于开发测试")
public String test() {
    return "测试接口";
}

@GetMapping("/public-api")
@SkipAuth("公开API，无需用户身份")
public String publicApi() {
    return "公开数据";
}
```

## 安全建议

### ✅ 推荐做法

1. **最小权限原则**: 只在确实不需要登录的接口上添加 `@SkipAuth`
2. **方法级别优先**: 优先使用方法级别注解，更精确控制
3. **代码审查**: 添加 `@SkipAuth` 时在代码审查中重点关注
4. **定期检查**: 定期检查哪些接口标记了 `@SkipAuth`，确保符合业务需求

### ❌ 避免的做法

1. **不要滥用**: 不要为了方便测试就给所有接口加 `@SkipAuth`
2. **不要暴露敏感数据**: 涉及用户隐私、支付等敏感操作的接口必须要求登录
3. **不要在生产环境遗留**: 开发时为了测试添加的 `@SkipAuth`，上线前要移除

## 实际场景示例

### 场景1：公开的岗位列表

```java
@RestController
@RequestMapping("/jobs")
public class JobController {

    @GetMapping("/list")
    @SkipAuth("公开岗位列表，游客可查看")
    public List<Job> getJobList() {
        return jobService.getPublicJobs();
    }

    @PostMapping("/apply")
    // 申请岗位需要登录
    public String applyJob(@RequestBody ApplyDTO dto, HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");
        return jobService.applyJob(userId, dto);
    }

    @GetMapping("/my-applications")
    // 查看我的申请需要登录
    public List<Application> getMyApplications(HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");
        return jobService.getUserApplications(userId);
    }
}
```

### 场景2：VIP内容保护

```java
@RestController
@RequestMapping("/strategy")
public class StrategyController {

    @GetMapping("/free")
    @SkipAuth("免费攻略，无需登录")
    public List<Strategy> getFreeStrategies() {
        return strategyService.getFreeStrategies();
    }

    @GetMapping("/vip")
    // VIP攻略需要登录并验证VIP身份
    public List<Strategy> getVipStrategies(HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");
        User user = userService.getUserById(userId);

        if (user.getIsVip() != 1) {
            throw new RuntimeException("需要VIP会员");
        }

        return strategyService.getVipStrategies();
    }
}
```

### 场景3：简历管理

```java
@RestController
@RequestMapping("/resume")
public class ResumeController {

    @PostMapping("/upload")
    // 上传简历需要登录
    public String uploadResume(@RequestParam("file") MultipartFile file, HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");
        return resumeService.uploadResume(userId, file);
    }

    @GetMapping("/my-resumes")
    // 查看我的简历需要登录
    public List<Resume> getMyResumes(HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");
        return resumeService.getUserResumes(userId);
    }

    @GetMapping("/template")
    @SkipAuth("简历模板公开下载")
    public byte[] downloadTemplate() {
        return resumeService.getTemplate();
    }
}
```

## 调试技巧

### 1. 查看哪些接口跳过了验证

在 `JwtInterceptor` 中添加日志：

```java
@Override
public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
    // ...

    if (methodAnnotation != null || classAnnotation != null) {
        System.out.println("跳过验证: " + request.getRequestURI());
        return true;
    }

    System.out.println("需要验证: " + request.getRequestURI());
    // ...
}
```

### 2. 测试接口是否需要登录

```bash
# 不带Token访问（应该返回401）
curl http://localhost:8080/user/profile

# 带Token访问（应该成功）
curl -H "Authorization: Bearer your_token_here" http://localhost:8080/user/profile

# 跳过验证的接口（不带Token也能访问）
curl http://localhost:8080/auth/qrcode/generate
```

## 常见问题

### Q1: 为什么我加了@SkipAuth还是返回401？

**可能原因**:
1. 检查注解是否正确导入 `com.nian.yinianzhida.annotation.SkipAuth`
2. 检查拦截器是否正确配置
3. 检查是否重启了应用

### Q2: 如何让整个Controller除了某个方法都跳过验证？

**解决方案**: 在类上加 `@SkipAuth`，但当前实现下无法单独要求某个方法登录。建议改为方法级别控制：

```java
@RestController
@RequestMapping("/api")
public class ApiController {

    @GetMapping("/public1")
    @SkipAuth
    public String public1() { ... }

    @GetMapping("/public2")
    @SkipAuth
    public String public2() { ... }

    @GetMapping("/private")
    // 需要登录的方法不加注解
    public String privateMethod() { ... }
}
```

### Q3: 前端如何知道哪些接口需要Token？

**建议**: 在API文档中明确标注，或者约定规则：
- `/auth/**` - 认证相关，不需要Token
- `/public/**` - 公开API，不需要Token
- 其他路径默认需要Token

## 总结

使用 `@SkipAuth` 注解可以灵活控制接口的登录验证：

✅ **优点**:
- 清晰明了，代码即文档
- 精确控制到方法级别
- 易于维护和审查

⚠️ **注意**:
- 遵循最小权限原则
- 定期审查标记了 `@SkipAuth` 的接口
- 生产环境移除测试用的 `@SkipAuth`

---

**一念职达（ApplyMind）** - AI赋能求职，一键直达理想Offer
