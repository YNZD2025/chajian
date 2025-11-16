package com.nian.yinianzhida.util;

import java.util.HashMap;
import java.util.Map;

/**
 * 响应工具类
 * 用于统一创建API响应格式
 */
public class ResponseUtil {

    /**
     * 创建成功响应
     * @param message 响应消息
     * @param data 响应数据
     * @return 响应Map
     */
    public static Map<String, Object> success(String message, Object data) {
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("code", 0);  // 0 表示成功
        response.put("message", message);
        response.put("data", data);
        return response;
    }

    /**
     * 创建成功响应（无数据）
     * @param message 响应消息
     * @return 响应Map
     */
    public static Map<String, Object> success(String message) {
        return success(message, null);
    }

    /**
     * 创建错误响应
     * @param message 错误消息
     * @return 响应Map
     */
    public static Map<String, Object> error(String message) {
        Map<String, Object> response = new HashMap<>();
        response.put("success", false);
        response.put("code", -1);  // -1 或其他非0值表示失败
        response.put("message", message);
        response.put("data", null);
        return response;
    }

    /**
     * 创建错误响应（带自定义错误码）
     * @param code 错误码
     * @param message 错误消息
     * @return 响应Map
     */
    public static Map<String, Object> error(int code, String message) {
        Map<String, Object> response = new HashMap<>();
        response.put("success", false);
        response.put("code", code);
        response.put("message", message);
        response.put("data", null);
        return response;
    }
}
