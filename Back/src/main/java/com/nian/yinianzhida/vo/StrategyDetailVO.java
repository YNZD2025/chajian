package com.nian.yinianzhida.vo;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

import java.util.Date;
import java.util.List;

/**
 * 攻略文章详情VO
 */
@Data
public class StrategyDetailVO {

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
     * 正文内容（富文本）
     */
    private String content;

    /**
     * 封面图URL
     */
    private String coverImage;

    /**
     * 文章图片列表（按照sortOrder排序）
     */
    private List<StrategyImageVO> images;

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

    /**
     * 更新时间
     */
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "GMT+8")
    private Date updatedAt;

    /**
     * 文章图片VO
     */
    @Data
    public static class StrategyImageVO {
        /**
         * 图片ID
         */
        private Long id;

        /**
         * 图片URL
         */
        private String imageUrl;

        /**
         * 图片标题/说明
         */
        private String imageTitle;

        /**
         * 是否封面（0-否 1-是）
         */
        private Integer isCover;

        /**
         * 排序序号
         */
        private Integer sortOrder;
    }
}
