package com.nian.yinianzhida.mapper;

import com.nian.yinianzhida.entity.Strategy;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;
import java.util.Map;

/**
 * 攻略文章Mapper接口
 */
@Mapper
public interface StrategyMapper {

    /**
     * 分页查询文章列表（带筛选条件）
     * @param offset 偏移量
     * @param limit 每页数量
     * @param category 分类（可选）
     * @param keyword 关键词（可选）
     * @param status 状态（可选）
     * @param sortBy 排序方式
     * @return 文章列表
     */
    List<Strategy> selectByPage(@Param("offset") Integer offset,
                                 @Param("limit") Integer limit,
                                 @Param("category") String category,
                                 @Param("keyword") String keyword,
                                 @Param("status") Integer status,
                                 @Param("sortBy") String sortBy);

    /**
     * 统计文章数量（带筛选条件）
     * @param category 分类（可选）
     * @param keyword 关键词（可选）
     * @param status 状态（可选）
     * @return 文章总数
     */
    Integer countStrategies(@Param("category") String category,
                           @Param("keyword") String keyword,
                           @Param("status") Integer status);

    /**
     * 根据ID查询文章
     * @param id 文章ID
     * @return 文章信息
     */
    Strategy selectById(@Param("id") Long id);

    /**
     * 插入文章
     * @param strategy 文章对象
     * @return 插入成功的记录数
     */
    int insert(Strategy strategy);

    /**
     * 更新文章
     * @param strategy 文章对象
     * @return 更新成功的记录数
     */
    int updateById(Strategy strategy);

    /**
     * 删除文章
     * @param id 文章ID
     * @return 删除成功的记录数
     */
    int deleteById(@Param("id") Long id);

    /**
     * 批量删除文章
     * @param ids 文章ID列表
     * @return 删除成功的记录数
     */
    int deleteBatchByIds(@Param("ids") List<Long> ids);

    /**
     * 更新文章状态
     * @param id 文章ID
     * @param status 新状态
     * @return 更新成功的记录数
     */
    int updateStatus(@Param("id") Long id, @Param("status") Integer status);

    /**
     * 增加阅读量
     * @param id 文章ID
     * @return 更新成功的记录数
     */
    int incrementReadCount(@Param("id") Long id);

    /**
     * 增加收藏量
     * @param id 文章ID
     * @return 更新成功的记录数
     */
    int incrementCollectCount(@Param("id") Long id);

    /**
     * 减少收藏量
     * @param id 文章ID
     * @return 更新成功的记录数
     */
    int decrementCollectCount(@Param("id") Long id);

    /**
     * 查询推荐文章（基于分类）
     * @param strategyId 当前文章ID（用于排除）
     * @param category 分类
     * @param limit 限制数量
     * @return 推荐文章列表
     */
    List<Strategy> selectRecommendStrategies(@Param("strategyId") Long strategyId,
                                            @Param("category") String category,
                                            @Param("limit") Integer limit);

    /**
     * 获取所有分类及其文章数量
     * @return 分类统计列表
     */
    List<Map<String, Object>> selectCategoryStats();

    /**
     * 统计数据（总文章数、总阅读量等）
     * @return 统计数据
     */
    Map<String, Object> selectStatistics();

    /**
     * 检查用户是否收藏了某篇文章
     * @param userId 用户ID
     * @param strategyId 文章ID
     * @return 收藏记录数（0或1）
     */
    Integer checkUserCollected(@Param("userId") Long userId, @Param("strategyId") Long strategyId);

    /**
     * 添加收藏
     * @param userId 用户ID
     * @param strategyId 文章ID
     * @return 插入成功的记录数
     */
    int insertCollection(@Param("userId") Long userId, @Param("strategyId") Long strategyId);

    /**
     * 取消收藏
     * @param userId 用户ID
     * @param strategyId 文章ID
     * @return 删除成功的记录数
     */
    int deleteCollection(@Param("userId") Long userId, @Param("strategyId") Long strategyId);

    /**
     * 查询用户收藏的文章列表
     * @param userId 用户ID
     * @param offset 偏移量
     * @param limit 每页数量
     * @return 收藏的文章列表
     */
    List<Strategy> selectUserCollections(@Param("userId") Long userId,
                                         @Param("offset") Integer offset,
                                         @Param("limit") Integer limit);

    /**
     * 统计用户收藏的文章数量
     * @param userId 用户ID
     * @return 收藏数量
     */
    Integer countUserCollections(@Param("userId") Long userId);
}
