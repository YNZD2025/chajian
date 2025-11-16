package com.nian.yinianzhida.dto;

import lombok.Data;
import java.time.LocalDateTime;

/**
 * 岗位查询参数DTO
 */
@Data
public class JobQueryDTO {
    /**
     * 页码（从1开始）
     */
    private Integer page = 1;

    /**
     * 每页大小
     */
    private Integer pageSize = 10;

    /**
     * 岗位类型（校招/社招/实习）
     */
    private String jobType;

    /**
     * 行业
     */
    private String industry;

    /**
     * 城市
     */
    private String city;

    /**
     * 最低薪资（千元/月）
     */
    private Integer salaryMin;

    /**
     * 最高薪资（千元/月）
     */
    private Integer salaryMax;

    /**
     * 发布时间开始
     */
    private LocalDateTime publishTimeStart;

    /**
     * 发布时间结束
     */
    private LocalDateTime publishTimeEnd;

    /**
     * 排序方式（latest-最新发布, salary-薪资最高, match-匹配度）
     */
    private String sortBy = "latest";

    /**
     * 关键词搜索（岗位名称）
     */
    private String keyword;

    /**
     * 计算偏移量
     */
    public Integer getOffset() {
        return (page - 1) * pageSize;
    }
}
