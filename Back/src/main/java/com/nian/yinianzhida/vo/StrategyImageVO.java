package com.nian.yinianzhida.vo;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

import java.util.Date;

/**
 * 攻略文章图片VO
 */
@Data
public class StrategyImageVO {

    /**
     * 图片ID
     */
    private Long id;

    /**
     * 攻略文章ID
     */
    private Long strategyId;

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

    /**
     * 文件大小（字节）
     */
    private Integer fileSize;

    /**
     * 图片宽度（像素）
     */
    private Integer width;

    /**
     * 图片高度（像素）
     */
    private Integer height;

    /**
     * 上传时间
     */
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "GMT+8")
    private Date createdAt;
}
