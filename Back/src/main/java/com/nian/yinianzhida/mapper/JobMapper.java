package com.nian.yinianzhida.mapper;

import com.nian.yinianzhida.entity.Job;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

/**
 * 岗位Mapper接口
 */
@Mapper
public interface JobMapper {

    /**
     * 批量插入岗位
     * @param jobs 岗位列表
     * @return 插入成功的记录数
     */
    int batchInsert(@Param("jobs") List<Job> jobs);

    /**
     * 根据ID查询岗位
     * @param id 岗位ID
     * @return 岗位信息
     */
    Job selectById(@Param("id") Long id);

    /**
     * 分页查询岗位列表（带筛选条件）
     * @param offset 偏移量
     * @param limit 每页数量
     * @param jobName 岗位名称（可选）
     * @param jobType 岗位类型（可选）
     * @param city 城市（可选）
     * @param industry 行业（可选）
     * @param status 状态（可选）
     * @param salaryMin 薪资最小值（可选）
     * @param salaryMax 薪资最大值（可选）
     * @param workExperience 工作经验（可选）
     * @param education 学历要求（可选）
     * @param publishTimeStart 发布时间开始（可选）
     * @param publishTimeEnd 发布时间结束（可选）
     * @return 岗位列表
     */
    List<Job> selectByPage(@Param("offset") Integer offset,
                           @Param("limit") Integer limit,
                           @Param("jobName") String jobName,
                           @Param("jobType") String jobType,
                           @Param("city") String city,
                           @Param("industry") String industry,
                           @Param("status") Integer status,
                           @Param("salaryMin") Integer salaryMin,
                           @Param("salaryMax") Integer salaryMax,
                           @Param("workExperience") String workExperience,
                           @Param("education") String education,
                           @Param("publishTimeStart") java.util.Date publishTimeStart,
                           @Param("publishTimeEnd") java.util.Date publishTimeEnd);

    /**
     * 统计岗位数量（带筛选条件）
     * @param jobName 岗位名称（可选）
     * @param jobType 岗位类型（可选）
     * @param city 城市（可选）
     * @param industry 行业（可选）
     * @param status 状态（可选）
     * @param salaryMin 薪资最小值（可选）
     * @param salaryMax 薪资最大值（可选）
     * @param workExperience 工作经验（可选）
     * @param education 学历要求（可选）
     * @param publishTimeStart 发布时间开始（可选）
     * @param publishTimeEnd 发布时间结束（可选）
     * @return 岗位总数
     */
    Integer countJobs(@Param("jobName") String jobName,
                      @Param("jobType") String jobType,
                      @Param("city") String city,
                      @Param("industry") String industry,
                      @Param("status") Integer status,
                      @Param("salaryMin") Integer salaryMin,
                      @Param("salaryMax") Integer salaryMax,
                      @Param("workExperience") String workExperience,
                      @Param("education") String education,
                      @Param("publishTimeStart") java.util.Date publishTimeStart,
                      @Param("publishTimeEnd") java.util.Date publishTimeEnd);

    /**
     * 更新岗位状态
     * @param id 岗位ID
     * @param status 新状态
     * @return 更新成功的记录数
     */
    int updateStatus(@Param("id") Long id, @Param("status") Integer status);

    /**
     * 增加浏览次数
     * @param id 岗位ID
     * @return 更新成功的记录数
     */
    int incrementViewCount(@Param("id") Long id);

    /**
     * 删除岗位（根据ID）
     * @param id 岗位ID
     * @return 删除成功的记录数
     */
    int deleteById(@Param("id") Long id);

    /**
     * 更新岗位信息
     * @param job 岗位对象
     * @return 更新成功的记录数
     */
    int updateJob(Job job);

    /**
     * 查询相关岗位（基于行业和城市）
     * @param jobId 当前岗位ID（用于排除）
     * @param industry 行业
     * @param city 城市
     * @param limit 限制数量
     * @return 相关岗位列表
     */
    List<Job> selectRelatedJobs(@Param("jobId") Long jobId,
                                @Param("industry") String industry,
                                @Param("city") String city,
                                @Param("limit") Integer limit);

    /**
     * 查询用户收藏的岗位列表
     * @param userId 用户ID
     * @param offset 偏移量
     * @param limit 每页数量
     * @return 收藏的岗位列表
     */
    List<Job> selectUserCollections(@Param("userId") Long userId,
                                    @Param("offset") Integer offset,
                                    @Param("limit") Integer limit);

    /**
     * 统计用户收藏的岗位数量
     * @param userId 用户ID
     * @return 收藏数量
     */
    Integer countUserCollections(@Param("userId") Long userId);

    /**
     * 检查用户是否收藏了某个岗位
     * @param userId 用户ID
     * @param jobId 岗位ID
     * @return 收藏记录数（0或1）
     */
    Integer checkUserCollected(@Param("userId") Long userId, @Param("jobId") Long jobId);

    /**
     * 添加收藏
     * @param userId 用户ID
     * @param jobId 岗位ID
     * @return 插入成功的记录数
     */
    int insertCollection(@Param("userId") Long userId, @Param("jobId") Long jobId);

    /**
     * 取消收藏
     * @param userId 用户ID
     * @param jobId 岗位ID
     * @return 删除成功的记录数
     */
    int deleteCollection(@Param("userId") Long userId, @Param("jobId") Long jobId);

    /**
     * 更新岗位收藏次数
     * @param jobId 岗位ID
     * @param delta 变化量（+1或-1）
     * @return 更新成功的记录数
     */
    int updateCollectCount(@Param("jobId") Long jobId, @Param("delta") Integer delta);
}
