package com.nian.yinianzhida.vo;

import lombok.Data;

/**
 * 攻略解析结果VO
 */
@Data
public class StrategyParseResultVO {

    /**
     * 策略ID（新创建的草稿ID）
     */
    private Long id;

    /**
     * 文章标题
     */
    private String title;

    /**
     * 文章分类
     */
    private String category;

    /**
     * 文章摘要
     */
    private String summary;

    /**
     * 正文内容（HTML格式）
     */
    private String content;

    /**
     * 作者
     */
    private String author;

    /**
     * 状态（默认为0草稿）
     */
    private Integer status;
}
