package com.nian.yinianzhida.controller;

import com.nian.yinianzhida.entity.User;
import com.nian.yinianzhida.service.UserService;
import com.nian.yinianzhida.util.ResponseUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 后台管理 - 用户管理控制器
 * 负责用户的增删改查等管理功能
 */
@RestController
@RequestMapping("/api/admin/users")
@CrossOrigin(origins = "*")
public class AdminUserController {

    private static final Logger logger = LoggerFactory.getLogger(AdminUserController.class);

    @Autowired
    private UserService userService;

    /**
     * 获取用户列表（分页+搜索）
     * @param keyword 关键词（昵称/手机号/邮箱）
     * @param isVip VIP状态（0-普通用户 1-VIP用户）
     * @param status 账号状态（0-禁用 1-正常）
     * @param page 当前页
     * @param size 每页大小
     * @return 用户列表
     */
    @GetMapping("/list")
    public ResponseEntity<Map<String, Object>> getUserList(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Integer isVip,
            @RequestParam(required = false) Integer status,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size) {

        logger.info("获取用户列表 - keyword:{}, isVip:{}, status:{}, page:{}, size:{}",
                keyword, isVip, status, page, size);

        try {
            Map<String, Object> result = userService.getUserList(keyword, isVip, status, page, size);
            return ResponseEntity.ok(ResponseUtil.success("获取用户列表成功", result));
        } catch (Exception e) {
            logger.error("获取用户列表失败", e);
            return ResponseEntity.ok(ResponseUtil.error("获取用户列表失败: " + e.getMessage()));
        }
    }

    /**
     * 获取用户详情
     * @param id 用户ID
     * @return 用户详情
     */
    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getUserDetail(@PathVariable Long id) {
        logger.info("获取用户详情 - id:{}", id);

        try {
            User user = userService.getUserById(id);
            if (user == null) {
                return ResponseEntity.ok(ResponseUtil.error("用户不存在"));
            }
            return ResponseEntity.ok(ResponseUtil.success("获取用户详情成功", user));
        } catch (Exception e) {
            logger.error("获取用户详情失败", e);
            return ResponseEntity.ok(ResponseUtil.error("获取用户详情失败: " + e.getMessage()));
        }
    }

    /**
     * 更新用户信息
     * @param id 用户ID
     * @param userRequest 用户信息
     * @return 更新结果
     */
    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> updateUser(
            @PathVariable Long id,
            @RequestBody User userRequest) {

        logger.info("更新用户信息 - id:{}", id);

        try {
            // 检查用户是否存在
            User user = userService.getUserById(id);
            if (user == null) {
                return ResponseEntity.ok(ResponseUtil.error("用户不存在"));
            }

            // 更新字段
            user.setNickname(userRequest.getNickname());
            user.setPhone(userRequest.getPhone());
            user.setEmail(userRequest.getEmail());
            user.setGender(userRequest.getGender());
            user.setTags(userRequest.getTags());
            user.setIsVip(userRequest.getIsVip());
            user.setVipExpireTime(userRequest.getVipExpireTime());
            user.setResumeOptimizeCount(userRequest.getResumeOptimizeCount());
            user.setStatus(userRequest.getStatus());

            boolean success = userService.updateUser(user);
            if (success) {
                return ResponseEntity.ok(ResponseUtil.success("更新用户信息成功"));
            } else {
                return ResponseEntity.ok(ResponseUtil.error("更新用户信息失败"));
            }
        } catch (Exception e) {
            logger.error("更新用户信息失败", e);
            return ResponseEntity.ok(ResponseUtil.error("更新用户信息失败: " + e.getMessage()));
        }
    }

    /**
     * 删除用户
     * @param id 用户ID
     * @return 删除结果
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> deleteUser(@PathVariable Long id) {
        logger.info("删除用户 - id:{}", id);

        try {
            boolean success = userService.deleteUser(id);
            if (success) {
                return ResponseEntity.ok(ResponseUtil.success("删除用户成功"));
            } else {
                return ResponseEntity.ok(ResponseUtil.error("删除用户失败"));
            }
        } catch (Exception e) {
            logger.error("删除用户失败", e);
            return ResponseEntity.ok(ResponseUtil.error("删除用户失败: " + e.getMessage()));
        }
    }

    /**
     * 批量删除用户
     * @param ids 用户ID列表
     * @return 删除结果
     */
    @DeleteMapping("/batch")
    public ResponseEntity<Map<String, Object>> batchDeleteUsers(@RequestBody List<Long> ids) {
        logger.info("批量删除用户 - ids:{}", ids);

        try {
            if (ids == null || ids.isEmpty()) {
                return ResponseEntity.ok(ResponseUtil.error("请选择要删除的用户"));
            }

            boolean success = userService.batchDeleteUsers(ids);
            if (success) {
                return ResponseEntity.ok(ResponseUtil.success("批量删除用户成功"));
            } else {
                return ResponseEntity.ok(ResponseUtil.error("批量删除用户失败"));
            }
        } catch (Exception e) {
            logger.error("批量删除用户失败", e);
            return ResponseEntity.ok(ResponseUtil.error("批量删除用户失败: " + e.getMessage()));
        }
    }

    /**
     * 更新用户状态（启用/禁用）
     * @param id 用户ID
     * @param statusRequest 状态请求
     * @return 更新结果
     */
    @PutMapping("/{id}/status")
    public ResponseEntity<Map<String, Object>> updateUserStatus(
            @PathVariable Long id,
            @RequestBody Map<String, Integer> statusRequest) {

        logger.info("更新用户状态 - id:{}, status:{}", id, statusRequest.get("status"));

        try {
            User user = userService.getUserById(id);
            if (user == null) {
                return ResponseEntity.ok(ResponseUtil.error("用户不存在"));
            }

            user.setStatus(statusRequest.get("status"));
            boolean success = userService.updateUser(user);
            if (success) {
                return ResponseEntity.ok(ResponseUtil.success("更新用户状态成功"));
            } else {
                return ResponseEntity.ok(ResponseUtil.error("更新用户状态失败"));
            }
        } catch (Exception e) {
            logger.error("更新用户状态失败", e);
            return ResponseEntity.ok(ResponseUtil.error("更新用户状态失败: " + e.getMessage()));
        }
    }
}
