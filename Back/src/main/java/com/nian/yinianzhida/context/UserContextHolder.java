package com.nian.yinianzhida.context;

import org.jetbrains.annotations.Nullable;

/**
 * 用户上下文持有者 - 使用ThreadLocal存储当前请求的用户信息
 *
 * 注意：必须在请求结束后调用remove()清理，避免内存泄漏
 */
public class UserContextHolder {

    private static final ThreadLocal<UserContext> CONTEXT_HOLDER = new ThreadLocal<>();

    /**
     * 设置用户上下文
     */
    public static void setContext(UserContext userContext) {
        CONTEXT_HOLDER.set(userContext);
    }

    /**
     * 获取用户上下文
     */
    public static UserContext getContext() {
        return CONTEXT_HOLDER.get();
    }

    /**
     * 获取当前用户ID
     *
     * @return 用户ID，如果未登录返回null
     */
    public static @Nullable Long getUserId() {
        UserContext context = getContext();
        return context != null ? context.getUserId() : null;
    }

    /**
     * 获取当前用户OpenID
     *
     * @return OpenID，如果未登录返回null
     */
    public static String getOpenid() {
        UserContext context = getContext();
        return context != null ? context.getOpenid() : null;
    }

    /**
     * 获取当前用户昵称
     *
     * @return 昵称，如果未登录返回null
     */
    public static String getNickname() {
        UserContext context = getContext();
        return context != null ? context.getNickname() : null;
    }

    /**
     * 清理用户上下文（必须调用，避免内存泄漏）
     */
    public static void clear() {
        CONTEXT_HOLDER.remove();
    }
}
