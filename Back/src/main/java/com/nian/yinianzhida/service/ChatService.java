package com.nian.yinianzhida.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nian.yinianzhida.entity.ChatMessage;
import com.nian.yinianzhida.entity.ChatSession;
import com.nian.yinianzhida.entity.Resume;
import com.nian.yinianzhida.mapper.ChatMessageMapper;
import com.nian.yinianzhida.mapper.ChatSessionMapper;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import reactor.core.publisher.Flux;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * AI对话服务
 */
@Service
public class ChatService {

    private final ChatClient chatClient;
    private final ChatSessionMapper chatSessionMapper;
    private final ChatMessageMapper chatMessageMapper;
    private final ResumeService resumeService;
    private final ObjectMapper objectMapper;

    // 内存缓存会话消息，提升速度
    private static final ConcurrentHashMap<Long, List<ChatMessage>> sessionCache = new ConcurrentHashMap<>();

    @Autowired
    public ChatService(ChatClient.Builder chatClientBuilder,
                      ChatSessionMapper chatSessionMapper,
                      ChatMessageMapper chatMessageMapper,
                      ResumeService resumeService) {
        this.chatClient = chatClientBuilder.build();
        this.chatSessionMapper = chatSessionMapper;
        this.chatMessageMapper = chatMessageMapper;
        this.resumeService = resumeService;
        this.objectMapper = new ObjectMapper();
    }

    /**
     * 获取或创建用户的简历诊断会话
     */
    @Transactional
    public ChatSession getOrCreateSession(Long userId, Long resumeId) {
        // 查找用户是否已有进行中的会话
        ChatSession session = chatSessionMapper.selectLatestByUserIdAndResumeId(userId, resumeId);

        if (session == null) {
            // 创建新会话
            session = new ChatSession();
            session.setUserId(userId);
            session.setResumeId(resumeId);
            session.setSessionType("resume_diagnosis");
            session.setTitle("简历诊断对话");
            session.setStatus(1); // 进行中
            chatSessionMapper.insert(session);

            // 添加系统欢迎消息
            ChatMessage welcomeMessage = new ChatMessage();
            welcomeMessage.setSessionId(session.getId());
            welcomeMessage.setRole("assistant");
            welcomeMessage.setContent(getWelcomeMessage());
            chatMessageMapper.insert(welcomeMessage);

            // 清空缓存，让下次获取时重新加载
            sessionCache.remove(session.getId());
        }

        return session;
    }

    /**
     * 发送消息并获取AI回复
     */
    @Transactional
    public String sendMessage(Long sessionId, String userMessage) {
        // 保存用户消息
        ChatMessage userChatMessage = new ChatMessage();
        userChatMessage.setSessionId(sessionId);
        userChatMessage.setRole("user");
        userChatMessage.setContent(userMessage);
        chatMessageMapper.insert(userChatMessage);

        // 清除缓存
        sessionCache.remove(sessionId);

        // 获取会话信息和简历数据
        ChatSession session = chatSessionMapper.selectById(sessionId);
        Resume resume = resumeService.getResumeDetail(session.getResumeId());

        // 获取会话历史
        List<ChatMessage> history = getSessionHistory(sessionId);

        // 构建消息列表
        List<Message> messages = new ArrayList<>();
        // 添加包含简历信息的系统提示
        messages.add(new SystemMessage(getSystemPromptWithResume(resume)));

        for (ChatMessage msg : history) {
            if ("user".equals(msg.getRole())) {
                messages.add(new UserMessage(msg.getContent()));
            } else if ("assistant".equals(msg.getRole())) {
                messages.add(new AssistantMessage(msg.getContent()));
            }
        }

        // 调用AI
        Prompt prompt = new Prompt(messages);
        String aiResponse = chatClient.prompt(prompt).call().content();

        // 保存AI回复
        ChatMessage aiChatMessage = new ChatMessage();
        aiChatMessage.setSessionId(sessionId);
        aiChatMessage.setRole("assistant");
        aiChatMessage.setContent(aiResponse);
        chatMessageMapper.insert(aiChatMessage);

        // 清除缓存
        sessionCache.remove(sessionId);

        return aiResponse;
    }

    /**
     * 获取会话历史消息
     */
    public List<ChatMessage> getSessionHistory(Long sessionId) {
        // 先从缓存获取
        if (sessionCache.containsKey(sessionId)) {
            return sessionCache.get(sessionId);
        }

        // 从数据库获取
        List<ChatMessage> messages = chatMessageMapper.selectBySessionId(sessionId);

        // 放入缓存
        sessionCache.put(sessionId, messages);

        return messages;
    }

    /**
     * 根据简历内容获取个性化的预设问题
     */
    public List<String> getPresetQuestions(Long resumeId) {
        List<String> questions = new ArrayList<>();

        // 获取简历数据
        Resume resume = resumeService.getResumeDetail(resumeId);

        if (resume == null || resume.getParsedData() == null) {
            // 如果简历还未解析，返回通用问题
            questions.add("我的简历有哪些问题需要优化？");
            questions.add("帮我分析一下简历的优势和不足");
            questions.add("简历中的项目经历应该怎么写更吸引人？");
            return questions;
        }

        try {
            // 解析简历JSON数据
            String parsedDataStr = resume.getParsedData();
            if (parsedDataStr.startsWith("```json")) {
                parsedDataStr = parsedDataStr.replace("```json\n", "").replace("```", "").trim();
            }

            Map<String, Object> resumeData = objectMapper.readValue(parsedDataStr, Map.class);

            // 根据简历内容生成个性化问题
            Map<String, Object> basicInfo = (Map<String, Object>) resumeData.get("basicInfo");
            List<Map<String, Object>> workExp = (List<Map<String, Object>>) resumeData.get("workExperience");
            List<Map<String, Object>> projects = (List<Map<String, Object>>) resumeData.get("projects");
            List<Map<String, Object>> education = (List<Map<String, Object>>) resumeData.get("education");

            // 问题1：总体评价
            questions.add("帮我全面诊断一下简历，有哪些需要优化的地方？");

            // 问题2：根据工作经验判断
            if (workExp != null && !workExp.isEmpty()) {
                questions.add("我的工作经历该如何优化才能更吸引HR？");
            } else {
                questions.add("我是应届生/转行人员，简历怎么突出亮点？");
            }

            // 问题3：根据项目经历判断
            if (projects != null && !projects.isEmpty()) {
                questions.add("项目经历的描述不够出彩，怎么改进？");
            } else {
                questions.add("简历里没有项目经历，该怎么补充？");
            }

            // 问题4：针对性优化
            questions.add("针对【后端/全钱/产品】岗位，我的简历该怎么调整？");

            // 问题5：薪资相关（可选）
            questions.add("根据我的背景，面试时薪资范围该怎么谈？");

        } catch (Exception e) {
            e.printStackTrace();
            // 如果解析失败，返回通用问题
            questions.add("我的简历有哪些问题需要优化？");
            questions.add("帮我分析一下简历的优势和不足");
            questions.add("简历中的项目经历应该怎么写更吸引人？");
        }

        return questions;
    }

    /**
     * 系统提示词 - 简历诊断AI助手（包含简历信息）
     */
    private String getSystemPromptWithResume(Resume resume) {
        StringBuilder prompt = new StringBuilder();
        prompt.append("你是一个专业的简历诊断AI助手，名字叫'一念助手'。你的任务是帮助用户优化简历，提高求职成功率。\n\n");

        prompt.append("=== 用户简历信息 ===\n");
        if (resume != null && resume.getParsedData() != null) {
            prompt.append("以下是用户的简历结构化数据（JSON格式）：\n");
            prompt.append(resume.getParsedData());
            prompt.append("\n\n");
        } else {
            prompt.append("用户的简历正在解析中，暂时无法查看详细信息。\n\n");
        }

        prompt.append("=== 你的职责 ===\n");
        prompt.append("1. 基于用户的实际简历内容，提供个性化的优化建议\n");
        prompt.append("2. 指出简历中的具体问题（如格式、内容、关键词等）\n");
        prompt.append("3. 根据用户的背景和求职意向，给出针对性建议\n");
        prompt.append("4. 提供可量化的改进方案（而非空泛的理论）\n\n");

        prompt.append("=== 回答要求（重要！）===\n");
        prompt.append("1. **控制篇幅**：每次回复严格控制在100-150字以内，简洁有力\n");
        prompt.append("2. **结构化回答**：使用要点式回答，采用编号列表或要点符号（*、数字）\n");
        prompt.append("3. **聚焦核心**：只讲1-3个核心问题，不展开细节\n");
        prompt.append("4. **引导追问**：如果用户需要详细说明，可以主动引导用户针对具体要点追问\n");
        prompt.append("5. **避免长篇大论**：禁止一次性给出所有细节，优先给出框架性建议\n");
        prompt.append("6. **提供快捷选项**：当需要用户选择时，使用格式 [OPTION:选项文本] 提供快捷按钮\n\n");

        prompt.append("=== 交流风格 ===\n");
        prompt.append("- 热情专业，像一个资深HR和职业导师\n");
        prompt.append("- 直接指出问题，不要过度客套\n");
        prompt.append("- 使用简单易懂的语言，适当使用emoji（📝✨💡等）\n");
        prompt.append("- 给出的建议必须具体可行，可以简短举例\n");
        prompt.append("- 鼓励用户行动，提供清晰的优化方向（不需要详细步骤）\n\n");

        prompt.append("=== 回答示例 ===\n");
        prompt.append("❌ 错误示例（太长）：\n");
        prompt.append("\"你的简历存在以下问题：第一，项目经历部分缺少量化数据，比如你可以添加性能提升百分比、用户增长数据等...(300字)\"\n\n");

        prompt.append("✅ 正确示例1（简洁列表）：\n");
        prompt.append("\"📝 发现3个核心问题：\n");
        prompt.append("1. 项目经历缺少量化数据\n");
        prompt.append("2. 技能罗列过多不够聚焦\n");
        prompt.append("3. 工作职责描述过于笼统\n\n");
        prompt.append("想深入了解哪个问题的优化建议？\"\n\n");

        prompt.append("✅ 正确示例2（带快捷选项）：\n");
        prompt.append("\"有目标岗位了吗，比如想要找哪方面的工作呢？从你的简历来看，最适配的岗位是：【后端】，也可以选择：【全栈】、【项目专员】\n\n");
        prompt.append("[OPTION:后端]\n");
        prompt.append("[OPTION:全栈]\n");
        prompt.append("[OPTION:项目专员]\"\n\n");

        prompt.append("注意：使用 [OPTION:xxx] 时，每个选项单独一行，这样前端会渲染成可点击的按钮。\n\n");

        prompt.append("=== 重要提示 ===\n");
        prompt.append("- 你已经看到了用户的完整简历数据，不要再让用户重复提供\n");
        prompt.append("- 分析问题时要引用简历中的具体内容（简短引用）\n");
        prompt.append("- 如果发现简历缺少某个重要模块，明确指出并建议补充\n");
        prompt.append("- 记住：简洁比详尽更重要，用户可以随时追问细节\n");

        return prompt.toString();
    }

    /**
     * 系统提示词 - 简历诊断AI助手（通用版）
     */
    private String getSystemPrompt() {
        return "你是一个专业的简历诊断AI助手，名字叫'一念助手'。你的任务是帮助用户优化简历，提高求职成功率。\n" +
               "\n职责：\n" +
               "1. 分析用户简历，找出问题和改进点\n" +
               "2. 根据用户的求职意向，提供针对性的优化建议\n" +
               "3. 推荐适合用户的岗位\n" +
               "4. 以友好、专业的语气与用户对话\n" +
               "5. 每次回复保持简洁，不超过300字\n" +
               "\n交流风格：\n" +
               "- 热情友好，像一个职业顾问\n" +
               "- 使用简单易懂的语言\n" +
               "- 适当使用emoji让对话更生动\n" +
               "- 提供具体可行的建议，而不是空泛的理论";
    }

    /**
     * 欢迎消息
     */
    private String getWelcomeMessage() {
        return "你好，我们已经收到了你的简历，已经上传的简历列表可以点击页面的右上角头像进行查看。如果你想要使用插件投递简历，可以直接关闭本页面，到网申页面进行使用（刷新网申页面即可重新加载简历列表）。\n\n" +
               "在此之前，你也可以免费体验一下我们的简历诊断服务，分析一下简历可能存在的问题，提高网申的成功率。现在咱们是什么状态了呀，已经开始投递了吗？";
    }

    /**
     * 发送消息并获取AI流式回复（SSE）
     */
    public Flux<String> sendMessageStream(Long sessionId, String userMessage) {
        // 保存用户消息
        ChatMessage userChatMessage = new ChatMessage();
        userChatMessage.setSessionId(sessionId);
        userChatMessage.setRole("user");
        userChatMessage.setContent(userMessage);
        chatMessageMapper.insert(userChatMessage);

        // 清除缓存
        sessionCache.remove(sessionId);

        // 获取会话信息和简历数据
        ChatSession session = chatSessionMapper.selectById(sessionId);
        Resume resume = resumeService.getResumeDetail(session.getResumeId());

        // 获取会话历史
        List<ChatMessage> history = getSessionHistory(sessionId);

        // 构建消息列表
        List<Message> messages = new ArrayList<>();
        // 添加包含简历信息的系统提示
        messages.add(new SystemMessage(getSystemPromptWithResume(resume)));

        for (ChatMessage msg : history) {
            if ("user".equals(msg.getRole())) {
                messages.add(new UserMessage(msg.getContent()));
            } else if ("assistant".equals(msg.getRole())) {
                messages.add(new AssistantMessage(msg.getContent()));
            }
        }

        // 调用AI流式API
        Prompt prompt = new Prompt(messages);

        // 累积完整响应用于保存到数据库
        StringBuilder completeResponse = new StringBuilder();

        return chatClient.prompt(prompt)
                .stream()
                .content()
                .doOnNext(chunk -> completeResponse.append(chunk))
                .doOnComplete(() -> {
                    // 流结束后保存完整的AI回复
                    ChatMessage aiChatMessage = new ChatMessage();
                    aiChatMessage.setSessionId(sessionId);
                    aiChatMessage.setRole("assistant");
                    aiChatMessage.setContent(completeResponse.toString());
                    chatMessageMapper.insert(aiChatMessage);

                    // 清除缓存
                    sessionCache.remove(sessionId);
                })
                .doOnError(error -> {
                    // 流出错时记录日志
                    System.err.println("AI流式响应出错: " + error.getMessage());
                    error.printStackTrace();
                });
    }

    /**
     * 清除会话缓存
     */
    public void clearSessionCache(Long sessionId) {
        sessionCache.remove(sessionId);
    }
}
