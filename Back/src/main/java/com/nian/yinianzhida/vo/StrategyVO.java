package com.nian.yinianzhida.vo;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

import java.util.Date;

/**
 * 攻略文章列表VO
 */
@Data
public class StrategyVO {

    /**
     * 主键ID
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
     * 封面图URL
     */
    private String coverImage;

    /**
     * 作者
     */
    private String author;

    /**
     * 是否VIP专享（0-否 1-是）
     */
    private Integer isVipOnly;

    /**
     * 阅读量
     */
    private Integer readCount;

    /**
     * 收藏量
     */
    private Integer collectCount;

    /**
     * 状态（0-草稿 1-已发布 2-已下架）
     */
    private Integer status;

    /**
     * 是否已收藏（需要登录后才有值）
     */
    private Boolean isCollected;

    /**
     * 发布时间
     */
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "GMT+8")
    private Date publishTime;

    /**
     * 创建时间
     */
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "GMT+8")
    private Date createdAt;
}
