package com.nian.yinianzhida.controller;

import com.nian.yinianzhida.annotation.SkipAuth;
import com.nian.yinianzhida.context.UserContextHolder;
import com.nian.yinianzhida.entity.ChatMessage;
import com.nian.yinianzhida.entity.ChatSession;
import com.nian.yinianzhida.service.ChatService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * AI对话控制器
 */
@Tag(name = "AI对话", description = "简历诊断AI对话API")
@RestController
@RequestMapping("/chat")
@CrossOrigin(origins = "*")
public class ChatController {

    private final ChatService chatService;

    @Autowired
    public ChatController(ChatService chatService) {
        this.chatService = chatService;
    }

    /**
     * 获取或创建会话
     * 用户ID从JWT Token中的UserContextHolder获取
     */
    @Operation(summary = "获取或创建会话", description = "获取用户的简历诊断会话，如果不存在则创建新会话")
    @PostMapping("/session")
    public ResponseEntity<Map<String, Object>> getOrCreateSession(
            @Parameter(description = "简历ID", required = true)
            @RequestParam Long resumeId) {
        Map<String, Object> response = new HashMap<>();

        try {
            // 从UserContextHolder获取当前用户ID
            Long currentUserId = UserContextHolder.getUserId();

            if (currentUserId == null) {
                response.put("success", false);
                response.put("message", "未获取到用户信息，请先登录");
                return ResponseEntity.badRequest().body(response);
            }

            ChatSession session = chatService.getOrCreateSession(currentUserId, resumeId);

            response.put("success", true);
            response.put("sessionId", session.getId());
            response.put("message", "会话创建成功");

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            e.printStackTrace();
            response.put("success", false);
            response.put("message", "创建会话失败: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    /**
     * 发送消息
     */
    @Operation(summary = "发送消息", description = "发送消息并获取AI回复")
    @PostMapping("/message")
    public ResponseEntity<Map<String, Object>> sendMessage(
            @Parameter(description = "会话ID", required = true)
            @RequestParam Long sessionId,
            @Parameter(description = "消息内容", required = true)
            @RequestParam String message) {
        Map<String, Object> response = new HashMap<>();

        try {
            String aiResponse = chatService.sendMessage(sessionId, message);

            response.put("success", true);
            response.put("message", aiResponse);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            e.printStackTrace();
            response.put("success", false);
            response.put("message", "发送消息失败: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    /**
     * 获取会话历史
     */
    @Operation(summary = "获取会话历史", description = "获取会话的所有历史消息")
    @GetMapping("/history/{sessionId}")
    public ResponseEntity<Map<String, Object>> getHistory(
            @Parameter(description = "会话ID", required = true)
            @PathVariable Long sessionId) {
        Map<String, Object> response = new HashMap<>();

        try {
            List<ChatMessage> history = chatService.getSessionHistory(sessionId);

            response.put("success", true);
            response.put("messages", history);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            e.printStackTrace();
            response.put("success", false);
            response.put("message", "获取历史消息失败: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    /**
     * 获取预设提示词（基于简历内容个性化）
     */
    @Operation(summary = "获取预设提示词", description = "根据简历内容获取个性化的推荐提问")
    @GetMapping("/preset-questions")
    public ResponseEntity<Map<String, Object>> getPresetQuestions(
            @Parameter(description = "简历ID")
            @RequestParam(required = false) Long resumeId) {
        Map<String, Object> response = new HashMap<>();

        try {
            List<String> questions;
            if (resumeId != null) {
                questions = chatService.getPresetQuestions(resumeId);
            } else {
                // 返回通用问题
                questions = new ArrayList<>();
                questions.add("我的简历有哪些问题需要优化？");
                questions.add("帮我分析一下简历的优势和不足");
                questions.add("简历中的项目经历应该怎么写更吸引人？");
            }

            response.put("success", true);
            response.put("questions", questions);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            e.printStackTrace();
            response.put("success", false);
            response.put("message", "获取预设问题失败: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    /**
     * 发送消息（流式响应）
     */
    @SkipAuth
    @Operation(summary = "发送消息（流式）", description = "发送消息并获取AI流式回复（SSE）")
    @GetMapping(value = "/message-stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<String> sendMessageStream(
            @Parameter(description = "会话ID", required = true)
            @RequestParam Long sessionId,
            @Parameter(description = "消息内容", required = true)
            @RequestParam String message) {
        try {
            return chatService.sendMessageStream(sessionId, message);
        } catch (Exception e) {
            e.printStackTrace();
            // 返回错误信息作为流的一部分
            return Flux.just("发送消息失败: " + e.getMessage());
        }
    }
}
