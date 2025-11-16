package com.nian.yinianzhida.entity;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.io.Serializable;
import java.util.Date;

/**
 * 岗位实体类
 * 对应数据库表：job
 */
@Data
public class Job implements Serializable {

    private static final long serialVersionUID = 1L;

    /**
     * 主键ID
     */
    private Long id;

    /**
     * 岗位名称
     */
    private String jobName;

    /**
     * 公司名称
     */
    private String companyName;

    /**
     * 公司Logo URL
     */
    private String companyLogo;

    /**
     * 所属行业
     */
    private String industry;

    /**
     * 公司规模（如"100-499人"）
     */
    private String companySize;

    /**
     * 融资阶段（如"B轮"、"已上市"）
     */
    private String companyFunding;

    /**
     * 岗位类型（校招/社招/实习）
     */
    private String jobType;

    /**
     * 工作城市（JSON数组格式）
     */
    @JsonProperty("city")
    private String workCity;

    /**
     * 详细办公地址
     */
    private String workAddress;

    /**
     * 薪资最低值（单位：千元）
     */
    private Integer salaryMin;

    /**
     * 薪资最高值（单位：千元）
     */
    private Integer salaryMax;

    /**
     * 薪资类型（daily-日薪/monthly-月薪/yearly-年薪）
     */
    private String salaryType;

    /**
     * 薪资详情说明
     */
    private String salaryDetails;

    /**
     * 学历要求（不限/专科/本科/硕士/博士）
     */
    @JsonProperty("education")
    private String educationRequirement;

    /**
     * 工作经验要求（如"1-3年"）
     */
    @JsonProperty("workExperience")
    private String experienceRequirement;

    /**
     * 每周工作天数（实习岗位使用）
     */
    private Integer workDaysPerWeek;

    /**
     * 工作时长要求（月数，实习岗位使用）
     */
    private Integer workDurationMonths;

    /**
     * 岗位职责
     */
    private String jobDuty;

    /**
     * 任职要求
     */
    private String jobRequirement;

    /**
     * 原始上传数据备份（JSON格式）
     */
    private String rawData;

    /**
     * 岗位标签（JSON数组格式）
     */
    private String jobTags;

    /**
     * 特殊标签（JSON数组格式，如["可转正","大牛带队"]）
     */
    private String specialTags;

    /**
     * 岗位福利（JSON格式）
     */
    private String benefits;

    /**
     * 申请链接
     */
    private String applyLink;

    /**
     * 信息来源（如"智联招聘"）
     */
    private String source;

    /**
     * 发布时间
     */
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "GMT+8")
    private Date publishTime;

    /**
     * 过期时间
     */
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "GMT+8")
    private Date expireTime;

    /**
     * 状态（0-下架 1-上架 2-已过期）
     */
    private Integer status;

    /**
     * 是否急招（0-否 1-是）
     */
    private Integer isUrgent;

    /**
     * 浏览次数
     */
    private Integer viewCount;

    /**
     * 收藏次数
     */
    private Integer collectCount;

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
