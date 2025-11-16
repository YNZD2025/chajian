package com.nian.yinianzhida.entity;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;

/**
 * 简历实体类
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Resume {

    /**
     * 主键，自增
     */
    private Long id;

    /**
     * 用户ID
     */
    private Long userId;

    /**
     * 简历标题（如"校招版简历"）
     */
    private String title;

    /**
     * 原始文件名
     */
    private String fileName;

    /**
     * 文件类型（pdf/docx/doc）
     */
    private String fileType;

    /**
     * 文件大小（字节）
     */
    private Integer fileSize;

    /**
     * 简历文件二进制数据（PDF/Word原始文件）
     */
    private byte[] fileData;

    /**
     * 提取的原始文本内容（Tika提取）
     */
    private String extractedText;

    /**
     * 是否默认简历（0-否 1-是）
     */
    private Integer isDefault;

    /**
     * 解析状态（0-待解析 1-解析中 2-解析成功 3-解析失败）
     */
    private Integer parseStatus;

    /**
     * 解析错误信息
     */
    private String parseError;

    /**
     * AI解析的结构化数据（JSON格式，可编辑）
     * 使用String存储，便于序列化和反序列化
     */
    private String parsedData;

    /**
     * 创建时间
     */
    private Date createdAt;

    /**
     * 更新时间
     */
    private Date updatedAt;
}
