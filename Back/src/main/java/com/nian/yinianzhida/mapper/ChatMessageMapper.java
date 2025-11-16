package com.nian.yinianzhida.mapper;

import com.nian.yinianzhida.entity.ChatMessage;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

/**
 * AI对话消息Mapper接口
 */
@Mapper
public interface ChatMessageMapper {

    /**
     * 根据ID查询消息
     */
    ChatMessage selectById(@Param("id") Long id);

    /**
     * 根据会话ID查询所有消息
     */
    List<ChatMessage> selectBySessionId(@Param("sessionId") Long sessionId);

    /**
     * 插入新消息
     */
    int insert(ChatMessage chatMessage);

    /**
     * 批量插入消息
     */
    int batchInsert(@Param("messages") List<ChatMessage> messages);

    /**
     * 删除会话的所有消息
     */
    int deleteBySessionId(@Param("sessionId") Long sessionId);
}
