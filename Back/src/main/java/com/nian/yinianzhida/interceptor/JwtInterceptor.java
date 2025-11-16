package com.nian.yinianzhida.interceptor;

import com.nian.yinianzhida.annotation.SkipAuth;
import com.nian.yinianzhida.context.UserContext;
import com.nian.yinianzhida.context.UserContextHolder;
import com.nian.yinianzhida.util.JwtUtil;
import io.jsonwebtoken.Claims;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * JWT拦截器 - 验证请求中的JWT Token并设置用户上下文
 */
@Component
public class JwtInterceptor implements HandlerInterceptor {

    @Autowired
    private JwtUtil jwtUtil;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        // 处理OPTIONS预检请求
        if ("OPTIONS".equals(request.getMethod())) {
            return true;
        }

        // 如果不是方法处理器，直接放行
        if (!(handler instanceof HandlerMethod)) {
            return true;
        }

        HandlerMethod handlerMethod = (HandlerMethod) handler;

        // 检查方法上是否有@SkipAuth注解
        SkipAuth methodAnnotation = handlerMethod.getMethodAnnotation(SkipAuth.class);
        if (methodAnnotation != null) {
            return true; // 跳过验证
        }

        // 检查类上是否有@SkipAuth注解
        SkipAuth classAnnotation = handlerMethod.getBeanType().getAnnotation(SkipAuth.class);
        if (classAnnotation != null) {
            return true; // 跳过验证
        }

        // 获取Authorization header
        String authorization = request.getHeader("Authorization");

        if (authorization == null || !authorization.startsWith("Bearer ")) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write("{\"success\":false,\"message\":\"未登录或登录已过期\"}");
            return false;
        }

        // 提取Token
        String token = authorization.substring(7); // 去掉"Bearer "前缀

        // 验证Token
        if (!jwtUtil.validateToken(token)) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write("{\"success\":false,\"message\":\"Token已过期或无效\"}");
            return false;
        }

        // Token有效，提取用户信息并设置到ThreadLocal
        try {
            Claims claims = jwtUtil.getClaimsFromToken(token);

            // 判断是管理员Token还是用户Token
            Object isAdmin = claims.get("isAdmin");
            Long userId;
            String openid = null;
            String nickname = null;

            if (isAdmin != null && (Boolean) isAdmin) {
                // 管理员Token：使用adminId作为userId
                userId = Long.valueOf(claims.get("adminId").toString());
                nickname = claims.get("username") != null ? claims.get("username").toString() : null;
            } else {
                // 用户Token：正常提取userId
                userId = Long.valueOf(claims.get("userId").toString());
                openid = claims.get("openid") != null ? claims.get("openid").toString() : null;
                nickname = claims.get("nickname") != null ? claims.get("nickname").toString() : null;
            }

            // 创建用户上下文
            UserContext userContext = new UserContext(userId, openid, nickname);
            UserContextHolder.setContext(userContext);

        } catch (Exception e) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write("{\"success\":false,\"message\":\"Token解析失败\"}");
            return false;
        }

        return true;
    }

    /**
     * 请求完成后清理ThreadLocal，避免内存泄漏
     * 注意：无论请求成功还是失败都会执行此方法
     */
    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) {
        UserContextHolder.clear();
    }
}
