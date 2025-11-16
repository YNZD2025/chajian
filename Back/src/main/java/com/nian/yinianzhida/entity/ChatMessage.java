package com.nian.yinianzhida.entity;

import lombok.Data;
import java.time.LocalDateTime;

/**
 * AI对话消息实体类
 */
@Data
public class ChatMessage {
    /**
     * 主键ID
     */
    private Long id;

    /**
     * 会话ID
     */
    private Long sessionId;

    /**
     * 角色（user-用户 assistant-AI助手 system-系统）
     */
    private String role;

    /**
     * 消息内容
     */
    private String content;

    /**
     * 创建时间
     */
    private LocalDateTime createdAt;
}
