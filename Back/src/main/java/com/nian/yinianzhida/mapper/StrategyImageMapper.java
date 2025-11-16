package com.nian.yinianzhida.mapper;

import com.nian.yinianzhida.entity.StrategyImage;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

/**
 * 攻略文章图片Mapper接口
 */
@Mapper
public interface StrategyImageMapper {

    /**
     * 插入图片记录
     */
    void insert(StrategyImage image);

    /**
     * 根据攻略ID查询图片列表
     */
    List<StrategyImage> selectByStrategyId(@Param("strategyId") Long strategyId);

    /**
     * 根据ID查询图片
     */
    StrategyImage selectById(@Param("id") Long id);

    /**
     * 更新图片信息
     */
    void updateById(StrategyImage image);

    /**
     * 删除图片
     */
    void deleteById(@Param("id") Long id);

    /**
     * 更新攻略所有图片的封面状态
     */
    void updateIsCoverByStrategyId(@Param("strategyId") Long strategyId, @Param("isCover") Integer isCover);

    /**
     * 统计攻略图片数量
     */
    Integer countByStrategyId(@Param("strategyId") Long strategyId);

    /**
     * 批量插入图片
     */
    void batchInsert(@Param("images") List<StrategyImage> images);

    /**
     * 根据攻略ID删除所有图片
     */
    void deleteByStrategyId(@Param("strategyId") Long strategyId);

    /**
     * 更新图片排序
     */
    void updateSortOrder(@Param("id") Long id, @Param("sortOrder") Integer sortOrder);
}
