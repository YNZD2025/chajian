package com.nian.yinianzhida.service;

import com.nian.yinianzhida.entity.Resume;
import com.nian.yinianzhida.mapper.ResumeMapper;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.document.Document;
import org.springframework.ai.reader.tika.TikaDocumentReader;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.InputStreamResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

/**
 * 简历解析服务
 */
@Service
public class ResumeService {

    private final ChatClient chatClient;
    private final ResumeMapper resumeMapper;

    @Autowired(required = false)
    public ResumeService(ChatClient.Builder chatClientBuilder, ResumeMapper resumeMapper) {
        if (chatClientBuilder != null) {
            this.chatClient = chatClientBuilder.build();
        } else {
            this.chatClient = null;
        }
        this.resumeMapper = resumeMapper;
    }

    /**
     * 从文件中提取文本（快速，2秒内）
     */
    public String extractTextFromFile(MultipartFile file) throws IOException {
        InputStreamResource resource = new InputStreamResource(file.getInputStream());
        TikaDocumentReader reader = new TikaDocumentReader(resource);

        List<Document> documents = reader.get();

        StringBuilder text = new StringBuilder();
        for (Document doc : documents) {
            text.append(doc.getContent()).append("\n");
        }

        return text.toString();
    }

    /**
     * 使用AI分析简历并返回JSON格式（较慢，15秒左右）
     */
    public String analyzeResumeWithAI(String resumeText) {
        if (chatClient == null) {
            throw new RuntimeException("ChatClient未初始化，请检查Spring AI配置");
        }

        String systemPrompt = buildSystemPrompt();

        String userPrompt = "请分析以下简历内容，并严格按照JSON格式返回：\n\n" + resumeText;

        return chatClient.prompt()
                .system(systemPrompt)
                .user(userPrompt)
                .call()
                .content();
    }

    /**
     * 构建系统提示词
     */
    private String buildSystemPrompt() {
        return """
                你是一个专业的简历分析助手。请将简历内容解析为结构化的JSON格式。

                请严格按照以下JSON格式返回（不要添加markdown代码块标记）：

                {
                  "basicInfo": {
                    "name": "姓名",
                    "gender": "性别",
                    "age": "年龄",
                    "phone": "联系电话",
                    "email": "邮箱",
                    "location": "所在地"
                  },
                  "education": [
                    {
                      "school": "学校名称",
                      "major": "专业",
                      "degree": "学历（本科/硕士/博士）",
                      "period": "时间段",
                      "gpa": "GPA或成绩（如有）"
                    }
                  ],
                  "workExperience": [
                    {
                      "company": "公司名称",
                      "position": "职位",
                      "period": "时间段",
                      "responsibilities": "工作职责和成果"
                    }
                  ],
                  "projects": [
                    {
                      "name": "项目名称",
                      "period": "时间段",
                      "description": "项目描述",
                      "role": "个人职责",
                      "technologies": ["技术1", "技术2"]
                    }
                  ],
                  "skills": {
                    "programmingLanguages": ["语言1", "语言2"],
                    "frameworks": ["框架1", "框架2"],
                    "tools": ["工具1", "工具2"],
                    "databases": ["数据库1", "数据库2"],
                    "other": ["其他技能"]
                  },
                  "certifications": ["证书1", "证书2"],
                  "awards": ["奖项1", "奖项2"],
                  "languages": ["语言能力1", "语言能力2"],
                  "summary": "AI对简历的总体评价和建议（200字以内）"
                }

                注意事项：
                1. 如果某个字段没有对应信息，请设置为空字符串""或空数组[]
                2. 不要使用"未提供"、"无"等占位文本
                3. 只返回JSON，不要添加任何其他说明文字
                4. 不要使用markdown的```json代码块包裹
                5. 确保返回的是有效的JSON格式
                """;
    }

    // ==================== 数据库操作方法 ====================

    /**
     * 保存上传的简历文件到数据库
     *
     * @param userId 用户ID
     * @param file   上传的文件
     * @return 简历ID
     */
    @Transactional
    public Long saveResumeFile(Long userId, MultipartFile file) throws IOException {
        Resume resume = new Resume();
        resume.setUserId(userId);
        resume.setFileName(file.getOriginalFilename());
        resume.setFileType(getFileType(file.getContentType()));
        resume.setFileSize((int) file.getSize());
        resume.setFileData(file.getBytes());
        resume.setParseStatus(0); // 待解析
        resume.setIsDefault(0);

        // 自动生成标题（基于文件名）
        String title = generateResumeTitle(file.getOriginalFilename());
        resume.setTitle(title);

        resumeMapper.insert(resume);
        return resume.getId();
    }

    /**
     * 提取文本并保存到数据库
     *
     * @param resumeId 简历ID
     */
    @Transactional
    public void extractAndSaveText(Long resumeId) throws Exception {
        Resume resume = resumeMapper.selectById(resumeId);
        if (resume == null) {
            throw new RuntimeException("简历不存在");
        }

        // 从数据库中读取文件数据
        byte[] fileData = resume.getFileData();
        if (fileData == null || fileData.length == 0) {
            throw new RuntimeException("简历文件数据为空");
        }

        // 使用TikaDocumentReader提取文本
        InputStreamResource resource = new InputStreamResource(new java.io.ByteArrayInputStream(fileData));
        TikaDocumentReader reader = new TikaDocumentReader(resource);
        List<Document> documents = reader.get();

        StringBuilder text = new StringBuilder();
        for (Document doc : documents) {
            text.append(doc.getContent()).append("\n");
        }

        // 更新数据库
        resumeMapper.updateExtractedText(resumeId, text.toString(), 1); // 1-解析中
    }

    /**
     * AI解析并保存到数据库
     *
     * @param resumeId 简历ID
     */
    @Transactional
    public void parseAndSaveJson(Long resumeId) throws Exception {
        Resume resume = resumeMapper.selectById(resumeId);
        if (resume == null) {
            throw new RuntimeException("简历不存在");
        }

        // ✅ 防重复解析：检查是否已经解析成功
        if (resume.getParseStatus() != null && resume.getParseStatus() == 2) {
            System.out.println("简历已解析成功，跳过AI调用，resumeId: " + resumeId);
            return;
        }

        String extractedText = resume.getExtractedText();
        if (extractedText == null || extractedText.trim().isEmpty()) {
            throw new RuntimeException("简历文本为空，请先提取文本");
        }

        try {
            System.out.println("开始AI解析简历，resumeId: " + resumeId);

            // AI解析
            String jsonResult = analyzeResumeWithAI(extractedText);

            // 更新数据库
            resumeMapper.updateParsedData(resumeId, jsonResult, 2); // 2-解析成功

            System.out.println("AI解析完成，resumeId: " + resumeId);
        } catch (Exception e) {
            System.err.println("AI解析失败，resumeId: " + resumeId + ", error: " + e.getMessage());
            // 解析失败，记录错误信息
            resumeMapper.updateParseError(resumeId, e.getMessage());
            throw e;
        }
    }

    /**
     * 获取用户所有简历列表（不包含file_data）
     *
     * @param userId 用户ID
     * @return 简历列表
     */
    public List<Resume> getUserResumeList(Long userId) {
        return resumeMapper.selectListByUserId(userId);
    }

    /**
     * 获取简历详情（包含所有字段）
     *
     * @param resumeId 简历ID
     * @return 简历对象
     */
    public Resume getResumeDetail(Long resumeId) {
        return resumeMapper.selectById(resumeId);
    }

    /**
     * 删除简历
     *
     * @param resumeId 简历ID
     */
    @Transactional
    public void deleteResume(Long resumeId) {
        resumeMapper.deleteById(resumeId);
    }

    /**
     * 设置默认简历
     *
     * @param userId   用户ID
     * @param resumeId 简历ID
     */
    @Transactional
    public void setDefaultResume(Long userId, Long resumeId) {
        // 先清除该用户所有简历的默认标记
        resumeMapper.clearDefaultByUserId(userId);
        // 再设置指定简历为默认
        resumeMapper.setDefaultById(resumeId);
    }

    /**
     * 更新解析的JSON数据（用户编辑后保存）
     *
     * @param resumeId   简历ID
     * @param parsedData JSON数据
     */
    @Transactional
    public void updateParsedData(Long resumeId, String parsedData) {
        resumeMapper.updateParsedData(resumeId, parsedData, 2); // 保持解析成功状态
    }

    // ==================== 辅助方法 ====================

    /**
     * 根据ContentType获取文件类型
     */
    private String getFileType(String contentType) {
        if (contentType == null) {
            return "unknown";
        }
        if (contentType.contains("pdf")) {
            return "pdf";
        } else if (contentType.contains("wordprocessingml")) {
            return "docx";
        } else if (contentType.contains("msword")) {
            return "doc";
        }
        return "unknown";
    }

    /**
     * 生成简历标题
     */
    private String generateResumeTitle(String fileName) {
        if (fileName == null || fileName.isEmpty()) {
            return "我的简历";
        }
        // 移除文件扩展名
        int dotIndex = fileName.lastIndexOf('.');
        if (dotIndex > 0) {
            return fileName.substring(0, dotIndex);
        }
        return fileName;
    }
}
