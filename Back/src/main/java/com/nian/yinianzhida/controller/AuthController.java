package com.nian.yinianzhida.controller;

import com.nian.yinianzhida.annotation.SkipAuth;
import com.nian.yinianzhida.entity.User;
import com.nian.yinianzhida.service.UserService;
import com.nian.yinianzhida.service.WeChatService;
import com.nian.yinianzhida.util.JwtUtil;
import me.chanjar.weixin.common.bean.WxOAuth2UserInfo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.web.bind.annotation.*;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * 认证控制器 - 处理登录相关请求
 */
@RestController
@RequestMapping("/auth")
@CrossOrigin(origins = "*")
@SkipAuth  // 登录相关接口默认跳过验证
public class AuthController {

    private static final Logger logger = LoggerFactory.getLogger(AuthController.class);

    @Autowired
    private WeChatService weChatService;

    @Autowired
    private UserService userService;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private RedisTemplate<String, String> redisTemplate;

    @Value("${wechat.callback.url}")
    private String wechatCallbackUrl;

    // 临时存储：sceneId -> 登录状态
    private static final ConcurrentHashMap<String, Map<String, Object>> loginStatusMap = new ConcurrentHashMap<>();

    /**
     * 获取当前登录用户信息
     * 前端携带JWT Token访问此接口验证登录状态
     */
    @GetMapping("/user/info")
    public Map<String, Object> getUserInfo(@RequestHeader("Authorization") String authorization) {
        Map<String, Object> response = new HashMap<>();

        try {
            // 提取Token（去掉"Bearer "前缀）
            String token = authorization.replace("Bearer ", "");

            // 验证Token
            if (!jwtUtil.validateToken(token)) {
                response.put("success", false);
                response.put("message", "Token已过期或无效");
                return response;
            }

            // 从Token中获取用户ID
            Long userId = jwtUtil.getUserIdFromToken(token);

            // 查询用户信息
            User user = userService.getUserById(userId);

            if (user == null) {
                response.put("success", false);
                response.put("message", "用户不存在");
                return response;
            }

            Map<String, Object> userInfo = new HashMap<>();
            userInfo.put("id", user.getId());
            userInfo.put("nickname", user.getNickname());
            userInfo.put("avatar", user.getAvatar());
            userInfo.put("phone", user.getPhone());
            userInfo.put("email", user.getEmail());
            userInfo.put("isVip", user.getIsVip());
            userInfo.put("vipExpireTime", user.getVipExpireTime());
            userInfo.put("resumeOptimizeCount", user.getResumeOptimizeCount());

            response.put("success", true);
            response.put("data", userInfo);

        } catch (Exception e) {
            e.printStackTrace();
            response.put("success", false);
            response.put("message", "获取用户信息失败: " + e.getMessage());
        }

        return response;
    }

    /**
     * 退出登录
     */
    @PostMapping("/logout")
    public Map<String, Object> logout() {
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "退出登录成功");
        return response;
    }

    /**
     * 邮箱验证码登录
     */
    @PostMapping("/email/login-code")
    public Map<String, Object> emailLoginWithCode(@RequestBody Map<String, String> request) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            String email = request.get("email");
            String verificationCode = request.get("verificationCode");
            
            // 验证参数
            if (email == null || verificationCode == null) {
                response.put("success", false);
                response.put("message", "参数不完整");
                return response;
            }
            
            // 验证邮箱格式
            if (!email.matches("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$")) {
                response.put("success", false);
                response.put("message", "邮箱格式不正确");
                return response;
            }
            
            // 验证验证码
            String redisKey = "email:verification:login:" + email;
            String storedCode = redisTemplate.opsForValue().get(redisKey);
            
            if (storedCode == null || !storedCode.equals(verificationCode)) {
                response.put("success", false);
                response.put("message", "验证码错误或已过期");
                return response;
            }
            
            // 根据邮箱查找用户
            User user = userService.getUserByEmail(email);
            if (user == null) {
                // 用户不存在，自动注册
                user = new User();
                user.setEmail(email);
                user.setNickname(email.split("@")[0]);
                user.setEmailVerified(1); // 已验证
                user.setStatus(1); // 正常状态
                user.setIsVip(0); // 非VIP
                user.setResumeOptimizeCount(3); // 默认3次简历优化次数
                
                // 保存用户
                boolean success = userService.createUser(user);
                if (!success) {
                    response.put("success", false);
                    response.put("message", "自动注册失败");
                    return response;
                }
            }
            
            // 检查账号状态
            if (user.getStatus() == 0) {
                response.put("success", false);
                response.put("message", "账号已被禁用");
                return response;
            }
            
            // 更新最后登录时间
            userService.updateLastLoginTime(user.getId());
            
            // 删除验证码
            redisTemplate.delete(redisKey);
            
            // 生成JWT token
            String token = jwtUtil.generateToken(user.getId(), user.getOpenid(), user.getNickname());
            //String refreshToken = jwtUtil.generateRefreshToken(user.getId());
            
            logger.info("邮箱验证码登录成功 - email:{}", email);
            
            response.put("success", true);
            response.put("message", "登录成功");
            
            Map<String, Object> data = new HashMap<>();
            data.put("userId", user.getId());
            data.put("accessToken", token);
            //data.put("refreshToken", refreshToken);
            
            Map<String, Object> userInfo = new HashMap<>();
            userInfo.put("id", user.getId());
            userInfo.put("email", user.getEmail());
            userInfo.put("nickname", user.getNickname());
            userInfo.put("isVip", user.getIsVip());
            userInfo.put("resumeOptimizeCount", user.getResumeOptimizeCount());
            
            data.put("userInfo", userInfo);
            response.put("data", data);
            
        } catch (Exception e) {
            logger.error("邮箱验证码登录失败", e);
            response.put("success", false);
            response.put("message", "登录失败: " + e.getMessage());
        }
        
        return response;
    }

    /**
     * 发送邮箱验证码（注册/重置密码）
     */
    @PostMapping("/email/send-code")
    public Map<String, Object> sendEmailCode(@RequestBody Map<String, String> request) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            String email = request.get("email");
            String type = request.get("type"); // register/reset
            
            if (email == null || !email.matches("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$")) {
                response.put("success", false);
                response.put("message", "邮箱格式不正确");
                return response;
            }
            
            // 生成6位验证码
            String code = String.format("%06d", (int)(Math.random() * 1000000));
            
            // 存储到Redis，5分钟过期
            String redisKey = "email:verification:" + type + ":" + email;
            redisTemplate.opsForValue().set(redisKey, code, 5, TimeUnit.MINUTES);
            
            logger.info("发送邮箱验证码 - email:{}, type:{}, code:{}", email, type, code);
            
            // TODO: 这里需要集成实际的邮件发送服务
            // 暂时返回验证码给前端，方便测试
            response.put("success", true);
            response.put("message", "验证码发送成功");
            response.put("code", code); // 测试用，生产环境需要移除
            
        } catch (Exception e) {
            logger.error("发送邮箱验证码失败", e);
            response.put("success", false);
            response.put("message", "发送验证码失败: " + e.getMessage());
        }
        
        return response;
    }

    /**
     * 邮箱注册
     */
    @PostMapping("/email/register")
    public Map<String, Object> emailRegister(@RequestBody Map<String, String> request) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            String email = request.get("email");
            String password = request.get("password");
            String verificationCode = request.get("verificationCode");
            String nickname = request.get("nickname");
            
            // 验证参数
            if (email == null || password == null || verificationCode == null) {
                response.put("success", false);
                response.put("message", "参数不完整");
                return response;
            }
            
            // 验证邮箱格式
            if (!email.matches("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$")) {
                response.put("success", false);
                response.put("message", "邮箱格式不正确");
                return response;
            }
            
            // 验证验证码
            String redisKey = "email:verification:register:" + email;
            String storedCode = redisTemplate.opsForValue().get(redisKey);
            
            if (storedCode == null || !storedCode.equals(verificationCode)) {
                response.put("success", false);
                response.put("message", "验证码错误或已过期");
                return response;
            }
            
            // 检查邮箱是否已存在
            User existingUser = userService.getUserByEmail(email);
            if (existingUser != null) {
                response.put("success", false);
                response.put("message", "邮箱已被注册");
                return response;
            }
            
            // 创建新用户
            User user = new User();
            user.setEmail(email);
            user.setPasswordHash(hashPassword(password));
            user.setNickname(nickname != null ? nickname : email.split("@")[0]);
            user.setEmailVerified(1); // 已验证
            user.setStatus(1); // 正常状态
            user.setIsVip(0); // 非VIP
            user.setResumeOptimizeCount(3); // 默认3次简历优化次数
            
            // 保存用户
            boolean success = userService.createUser(user);
            if (!success) {
                response.put("success", false);
                response.put("message", "注册失败");
                return response;
            }
            
            // 删除验证码
            redisTemplate.delete(redisKey);
            
            // 生成JWT token
            String token = jwtUtil.generateToken(user.getId(), user.getOpenid(), user.getNickname());
            //String refreshToken = jwtUtil.generateRefreshToken(user.getId());
            
            logger.info("邮箱注册成功 - email:{}", email);
            
            response.put("success", true);
            response.put("message", "注册成功");
            
            Map<String, Object> data = new HashMap<>();
            data.put("userId", user.getId());
            data.put("accessToken", token);
            //data.put("refreshToken", refreshToken);
            
            Map<String, Object> userInfo = new HashMap<>();
            userInfo.put("id", user.getId());
            userInfo.put("email", user.getEmail());
            userInfo.put("nickname", user.getNickname());
            userInfo.put("isVip", user.getIsVip());
            userInfo.put("resumeOptimizeCount", user.getResumeOptimizeCount());
            
            data.put("userInfo", userInfo);
            response.put("data", data);
            
        } catch (Exception e) {
            logger.error("邮箱注册失败", e);
            response.put("success", false);
            response.put("message", "注册失败: " + e.getMessage());
        }
        
        return response;
    }

    /**
     * 邮箱登录
     */
    @PostMapping("/email/login")
    public Map<String, Object> emailLogin(@RequestBody Map<String, String> request) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            String email = request.get("email");
            String password = request.get("password");
            
            // 验证参数
            if (email == null || password == null) {
                response.put("success", false);
                response.put("message", "参数不完整");
                return response;
            }
            
            // 根据邮箱查找用户
            User user = userService.getUserByEmail(email);
            if (user == null) {
                response.put("success", false);
                response.put("message", "用户不存在");
                return response;
            }
            
            // 验证密码
            if (!verifyPassword(password, user.getPasswordHash())) {
                response.put("success", false);
                response.put("message", "密码错误");
                return response;
            }
            
            // 检查账号状态
            if (user.getStatus() == 0) {
                response.put("success", false);
                response.put("message", "账号已被禁用");
                return response;
            }
            
            // 更新最后登录时间
            userService.updateLastLoginTime(user.getId());
            
            // 生成JWT token
            String token = jwtUtil.generateToken(user.getId(), user.getOpenid(), user.getNickname());
            //String refreshToken = jwtUtil.generateRefreshToken(user.getId());
            
            logger.info("邮箱登录成功 - email:{}", email);
            
            response.put("success", true);
            response.put("message", "登录成功");
            
            Map<String, Object> data = new HashMap<>();
            data.put("userId", user.getId());
            data.put("accessToken", token);
            //data.put("refreshToken", refreshToken);
            
            Map<String, Object> userInfo = new HashMap<>();
            userInfo.put("id", user.getId());
            userInfo.put("email", user.getEmail());
            userInfo.put("nickname", user.getNickname());
            userInfo.put("isVip", user.getIsVip());
            userInfo.put("resumeOptimizeCount", user.getResumeOptimizeCount());
            
            data.put("userInfo", userInfo);
            response.put("data", data);
            
        } catch (Exception e) {
            logger.error("邮箱登录失败", e);
            response.put("success", false);
            response.put("message", "登录失败: " + e.getMessage());
        }
        
        return response;
    }

    /**
     * 密码哈希函数
     */
    private String hashPassword(String password) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] hash = md.digest(password.getBytes());
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) {
                    hexString.append('0');
                }
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("密码哈希失败", e);
        }
    }

    /**
     * 密码验证函数
     */
    private boolean verifyPassword(String password, String storedHash) {
        return hashPassword(password).equals(storedHash);
    }
}
