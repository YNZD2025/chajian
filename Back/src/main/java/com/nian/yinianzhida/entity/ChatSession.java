package com.nian.yinianzhida.entity;

import lombok.Data;
import java.time.LocalDateTime;

/**
 * AI对话会话实体类
 */
@Data
public class ChatSession {
    /**
     * 主键ID
     */
    private Long id;

    /**
     * 用户ID
     */
    private Long userId;

    /**
     * 会话类型（resume_diagnosis-简历诊断）
     */
    private String sessionType;

    /**
     * 关联的简历ID
     */
    private Long resumeId;

    /**
     * 会话标题
     */
    private String title;

    /**
     * 状态（0-已结束 1-进行中）
     */
    private Integer status;

    /**
     * 创建时间
     */
    private LocalDateTime createdAt;

    /**
     * 更新时间
     */
    private LocalDateTime updatedAt;
}
