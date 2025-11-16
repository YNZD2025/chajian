package com.nian.yinianzhida.dto;

import lombok.Data;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * 攻略文章创建/更新DTO
 */
@Data
public class StrategyDTO {

    /**
     * 文章标题
     */
    @NotBlank(message = "文章标题不能为空")
    private String title;

    /**
     * 文章分类
     */
    @NotBlank(message = "文章分类不能为空")
    private String category;

    /**
     * 文章摘要
     */
    @NotBlank(message = "文章摘要不能为空")
    private String summary;

    /**
     * 正文内容（富文本）
     */
    @NotBlank(message = "正文内容不能为空")
    private String content;

    /**
     * 封面图URL
     */
    private String coverImage;

    /**
     * 作者
     */
    @NotBlank(message = "作者不能为空")
    private String author;

    /**
     * 是否VIP专享（0-否 1-是）
     */
    private Integer isVipOnly = 0;

    /**
     * 状态（0-草稿 1-已发布 2-已下架）
     */
    @NotNull(message = "状态不能为空")
    private Integer status;
}
