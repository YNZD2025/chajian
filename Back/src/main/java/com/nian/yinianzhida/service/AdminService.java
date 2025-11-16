package com.nian.yinianzhida.service;

import com.nian.yinianzhida.entity.Admin;
import com.nian.yinianzhida.mapper.AdminMapper;
import com.nian.yinianzhida.util.JwtUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

/**
 * 管理员服务类
 */
@Service
public class AdminService {

    private static final Logger logger = LoggerFactory.getLogger(AdminService.class);

    @Autowired
    private AdminMapper adminMapper;

    @Autowired
    private JwtUtil jwtUtil;

    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    /**
     * 管理员登录
     * @param username 用户名
     * @param password 密码
     * @return 登录结果（包含token和管理员信息）
     */
    public Map<String, Object> login(String username, String password) {
        logger.info("管理员登录尝试: username={}", username);

        // 查询管理员
        Admin admin = adminMapper.findByUsername(username);
        if (admin == null) {
            logger.warn("管理员不存在: username={}", username);
            throw new RuntimeException("用户名或密码错误");
        }

        // 检查账号状态
        if (admin.getStatus() == 0) {
            logger.warn("管理员账号已禁用: username={}", username);
            throw new RuntimeException("账号已被禁用");
        }

        // 验证密码
        if (!passwordEncoder.matches(password, admin.getPassword())) {
            logger.warn("密码错误: username={}", username);
            throw new RuntimeException("用户名或密码错误");
        }

        // 更新最后登录时间
        adminMapper.updateLastLoginTime(admin.getId());

        // 生成Token
        String token = jwtUtil.generateAdminToken(admin.getId(), admin.getUsername(), admin.getRole());

        // 构建返回结果
        Map<String, Object> result = new HashMap<>();
        result.put("token", token);

        // 管理员信息（不包含密码）
        Map<String, Object> adminInfo = new HashMap<>();
        adminInfo.put("id", admin.getId());
        adminInfo.put("username", admin.getUsername());
        adminInfo.put("realName", admin.getRealName());
        adminInfo.put("phone", admin.getPhone());
        adminInfo.put("role", admin.getRole());
        adminInfo.put("status", admin.getStatus());

        result.put("adminInfo", adminInfo);

        logger.info("管理员登录成功: username={}, id={}", username, admin.getId());
        return result;
    }

    /**
     * 根据ID获取管理员信息
     * @param id 管理员ID
     * @return 管理员对象
     */
    public Admin getAdminById(Long id) {
        return adminMapper.findById(id);
    }

    /**
     * 根据用户名获取管理员信息
     * @param username 用户名
     * @return 管理员对象
     */
    public Admin getAdminByUsername(String username) {
        return adminMapper.findByUsername(username);
    }

    /**
     * 密码加密（用于创建管理员时）
     * @param rawPassword 原始密码
     * @return 加密后的密码
     */
    public String encryptPassword(String rawPassword) {
        return passwordEncoder.encode(rawPassword);
    }
}
