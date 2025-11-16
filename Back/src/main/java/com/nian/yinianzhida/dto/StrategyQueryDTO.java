package com.nian.yinianzhida.dto;

import lombok.Data;

/**
 * 攻略文章查询参数DTO
 */
@Data
public class StrategyQueryDTO {
    /**
     * 页码（从1开始）
     */
    private Integer page = 1;

    /**
     * 每页大小
     */
    private Integer pageSize = 10;

    /**
     * 文章分类（简历技巧/面试攻略/谈薪技巧/行业求职/转行攻略）
     */
    private String category;

    /**
     * 关键词搜索（标题、摘要）
     */
    private String keyword;

    /**
     * 状态（0-草稿 1-已发布 2-已下架）
     */
    private Integer status;

    /**
     * 是否VIP专享（0-否 1-是）
     */
    private Integer isVipOnly;

    /**
     * 排序方式（latest-最新发布, read-阅读量, collect-收藏量）
     */
    private String sortBy = "latest";

    /**
     * 计算偏移量
     */
    public Integer getOffset() {
        return (page - 1) * pageSize;
    }
}
