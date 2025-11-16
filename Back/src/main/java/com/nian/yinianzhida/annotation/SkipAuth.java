package com.nian.yinianzhida.annotation;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * 跳过登录验证注解
 *
 * 使用场景：
 * - 登录接口
 * - 公开的API接口
 * - 不需要用户身份的接口
 *
 * 使用方法：
 * 在Controller的方法上添加此注解即可跳过JWT验证
 *
 * @author ApplyMind
 */
@Target({ElementType.METHOD, ElementType.TYPE})  // 可以用于方法和类
@Retention(RetentionPolicy.RUNTIME)              // 运行时保留
public @interface SkipAuth {
    /**
     * 说明原因（可选）
     */
    String value() default "";
}
