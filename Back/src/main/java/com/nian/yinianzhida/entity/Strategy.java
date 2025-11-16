package com.nian.yinianzhida.entity;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

import java.io.Serializable;
import java.util.Date;

/**
 * 攻略文章实体类
 * 对应数据库表：strategy
 */
@Data
public class Strategy implements Serializable {

    private static final long serialVersionUID = 1L;

    /**
     * 主键ID
     */
    private Long id;

    /**
     * 文章标题
     */
    private String title;

    /**
     * 文章分类（简历技巧/面试攻略/谈薪技巧/行业求职/转行攻略）
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
}
