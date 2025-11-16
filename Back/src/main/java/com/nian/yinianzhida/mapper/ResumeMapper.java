package com.nian.yinianzhida.mapper;

import com.nian.yinianzhida.entity.Resume;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

/**
 * 简历Mapper接口
 */
@Mapper
public interface ResumeMapper {

    /**
     * 插入新简历
     *
     * @param resume 简历对象
     * @return 影响的行数
     */
    int insert(Resume resume);

    /**
     * 根据ID查询简历
     *
     * @param id 简历ID
     * @return 简历对象
     */
    Resume selectById(@Param("id") Long id);

    /**
     * 根据用户ID查询所有简历列表
     *
     * @param userId 用户ID
     * @return 简历列表
     */
    List<Resume> selectByUserId(@Param("userId") Long userId);

    /**
     * 更新提取的文本
     *
     * @param id            简历ID
     * @param extractedText 提取的文本
     * @param parseStatus   解析状态
     * @return 影响的行数
     */
    int updateExtractedText(@Param("id") Long id,
                            @Param("extractedText") String extractedText,
                            @Param("parseStatus") Integer parseStatus);

    /**
     * 更新AI解析结果
     *
     * @param id          简历ID
     * @param parsedData  解析的JSON数据
     * @param parseStatus 解析状态
     * @return 影响的行数
     */
    int updateParsedData(@Param("id") Long id,
                         @Param("parsedData") String parsedData,
                         @Param("parseStatus") Integer parseStatus);

    /**
     * 更新解析失败信息
     *
     * @param id         简历ID
     * @param parseError 错误信息
     * @return 影响的行数
     */
    int updateParseError(@Param("id") Long id,
                         @Param("parseError") String parseError);

    /**
     * 删除简历
     *
     * @param id 简历ID
     * @return 影响的行数
     */
    int deleteById(@Param("id") Long id);

    /**
     * 设置默认简历（先将用户所有简历设为非默认，再设置指定简历为默认）
     *
     * @param userId   用户ID
     * @param resumeId 简历ID
     * @return 影响的行数
     */
    int clearDefaultByUserId(@Param("userId") Long userId);

    /**
     * 设置指定简历为默认
     *
     * @param id 简历ID
     * @return 影响的行数
     */
    int setDefaultById(@Param("id") Long id);

    /**
     * 根据ID查询简历（不包含file_data，用于列表查询）
     *
     * @param userId 用户ID
     * @return 简历列表
     */
    List<Resume> selectListByUserId(@Param("userId") Long userId);

    /**
     * 根据简历ID和用户ID查询简历（权限验证）
     * 用于确保用户只能访问自己的简历
     *
     * @param id     简历ID
     * @param userId 用户ID
     * @return 简历对象（包含所有字段）
     */
    Resume selectByIdAndUserId(@Param("id") Long id, @Param("userId") Long userId);

    /**
     * 管理员查询简历列表（支持筛选，不包含file_data）
     *
     * @param offset       偏移量
     * @param limit        限制数量
     * @param userId       用户ID（可选）
     * @param fileName     文件名（可选）
     * @param parseStatus  解析状态（可选）
     * @param startDate    开始日期（可选）
     * @param endDate      结束日期（可选）
     * @return 简历列表
     */
    List<Resume> selectAdminList(@Param("offset") Integer offset,
                                  @Param("limit") Integer limit,
                                  @Param("userId") Long userId,
                                  @Param("fileName") String fileName,
                                  @Param("parseStatus") Integer parseStatus,
                                  @Param("startDate") java.util.Date startDate,
                                  @Param("endDate") java.util.Date endDate);

    /**
     * 管理员查询简历总数（支持筛选）
     *
     * @param userId       用户ID（可选）
     * @param fileName     文件名（可选）
     * @param parseStatus  解析状态（可选）
     * @param startDate    开始日期（可选）
     * @param endDate      结束日期（可选）
     * @return 总数
     */
    int countAdminList(@Param("userId") Long userId,
                       @Param("fileName") String fileName,
                       @Param("parseStatus") Integer parseStatus,
                       @Param("startDate") java.util.Date startDate,
                       @Param("endDate") java.util.Date endDate);
}
