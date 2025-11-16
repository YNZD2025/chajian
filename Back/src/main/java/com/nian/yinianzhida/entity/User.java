package com.nian.yinianzhida.entity;

import lombok.Data;
import java.time.LocalDateTime;

/**
 * 用户实体类
 */
@Data
public class User {
    /**
     * 主键ID
     */
    private Long id;

    /**
     * 微信OpenID
     */
    private String openid;

    /**
     * 微信昵称
     */
    private String nickname;

    /**
     * 微信头像URL (存储在阿里云OSS)
     */
    private String avatar;

    /**
     * 联系电话
     */
    private String phone;

    /**
     * 邮箱（作为唯一标识）
     */
    private String email;

    /**
     * 邮箱验证状态（0-未验证 1-已验证）
     */
    private Integer emailVerified;

    /**
     * 密码哈希（邮箱注册用户使用）
     */
    private String passwordHash;

    /**
     * 性别（0-未知 1-男 2-女）
     */
    private Integer gender;

    /**
     * 用户标签（JSON格式）
     */
    private String tags;

    /**
     * 是否VIP（0-否 1-是）
     */
    private Integer isVip;

    /**
     * VIP过期时间
     */
    private LocalDateTime vipExpireTime;

    /**
     * 剩余简历优化次数
     */
    private Integer resumeOptimizeCount;

    /**
     * 账号状态（0-禁用 1-正常）
     */
    private Integer status;

    /**
     * 注册时间
     */
    private LocalDateTime createdAt;

    /**
     * 更新时间
     */
    private LocalDateTime updatedAt;

    /**
     * 最后登录时间
     */
    private LocalDateTime lastLoginTime;
}
