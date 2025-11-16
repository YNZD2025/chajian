package com.nian.yinianzhida.controller;

import com.nian.yinianzhida.annotation.SkipAuth;
import com.nian.yinianzhida.service.AdminService;
import com.nian.yinianzhida.util.ResponseUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

/**
 * 管理员认证控制器
 * 负责管理员的登录、登出、信息获取等认证相关功能
 */
@RestController
@RequestMapping("/api/admin")
@CrossOrigin(origins = "*")
public class AdminAuthController {

    private static final Logger logger = LoggerFactory.getLogger(AdminAuthController.class);

    @Autowired
    private AdminService adminService;

    /**
     * 管理员登录
     * @param loginRequest 登录请求（包含username和password）
     * @return 登录结果
     */
    @SkipAuth
    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody Map<String, String> loginRequest) {
        logger.info("收到管理员登录请求");

        String username = loginRequest.get("username");
        String password = loginRequest.get("password");

        if (username == null || username.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(ResponseUtil.error("用户名不能为空"));
        }

        if (password == null || password.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(ResponseUtil.error("密码不能为空"));
        }

        try {
            Map<String, Object> result = adminService.login(username, password);
            return ResponseEntity.ok(ResponseUtil.success("登录成功", result));
        } catch (Exception e) {
            logger.error("管理员登录失败", e);
            return ResponseEntity.ok(ResponseUtil.error(e.getMessage()));
        }
    }

    /**
     * 获取当前管理员信息（需要Token）
     * @param token Authorization header中的token
     * @return 管理员信息
     */
    @GetMapping("/info")
    public ResponseEntity<Map<String, Object>> getInfo(@RequestHeader(value = "Authorization", required = false) String token) {
        if (token == null || !token.startsWith("Bearer ")) {
            return ResponseEntity.ok(ResponseUtil.error("未登录或token无效"));
        }

        // 提取token（去掉"Bearer "前缀）
        String jwtToken = token.substring(7);

        try {
            // 这里可以根据token获取管理员信息
            // 暂时返回成功，实际应该从token解析管理员ID并查询数据库
            Map<String, Object> data = new HashMap<>();
            data.put("message", "获取信息成功");
            return ResponseEntity.ok(ResponseUtil.success("获取信息成功", data));
        } catch (Exception e) {
            logger.error("获取管理员信息失败", e);
            return ResponseEntity.ok(ResponseUtil.error(e.getMessage()));
        }
    }

    /**
     * 管理员退出登录
     * @return 退出结果
     */
    @PostMapping("/logout")
    public ResponseEntity<Map<String, Object>> logout() {
        // 实际上前端会清除token，后端无需特殊处理
        return ResponseEntity.ok(ResponseUtil.success("退出成功"));
    }
}
