package com.nian.yinianzhida.context;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 用户上下文信息
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserContext {

    /**
     * 用户ID
     */
    private Long userId;

    /**
     * 微信OpenID
     */
    private String openid;

    /**
     * 用户昵称
     */
    private String nickname;

    /**
     * Token字符串（可选，某些场景可能需要）
     */
    private String token;

    /**
     * 构造方法（不包含token）
     */
    public UserContext(Long userId, String openid, String nickname) {
        this.userId = userId;
        this.openid = openid;
        this.nickname = nickname;
    }
//    public UserContext(Long userId, String openid, String nickname,String token) {
//        this.userId = userId;
//        this.openid = openid;
//        this.nickname = nickname;
//        this.token = token;
//    }
}
