package com.nian.yinianzhida.mapper;

import com.nian.yinianzhida.entity.ChatSession;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

/**
 * AI对话会话Mapper接口
 */
@Mapper
public interface ChatSessionMapper {

    /**
     * 根据ID查询会话
     */
    ChatSession selectById(@Param("id") Long id);

    /**
     * 根据用户ID查询会话列表
     */
    List<ChatSession> selectByUserId(@Param("userId") Long userId);

    /**
     * 根据用户ID和简历ID查询最新的会话
     */
    ChatSession selectLatestByUserIdAndResumeId(@Param("userId") Long userId, @Param("resumeId") Long resumeId);

    /**
     * 插入新会话
     */
    int insert(ChatSession chatSession);

    /**
     * 更新会话
     */
    int updateById(ChatSession chatSession);

    /**
     * 更新会话状态
     */
    int updateStatus(@Param("id") Long id, @Param("status") Integer status);
}
