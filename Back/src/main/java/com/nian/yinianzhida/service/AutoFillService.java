package com.nian.yinianzhida.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nian.yinianzhida.entity.Resume;
import com.nian.yinianzhida.mapper.ResumeMapper;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.*;

/**
 * AI自动填表服务
 * 提供字段智能分析和简历数据格式化功能
 */
@Service
public class AutoFillService {

    private final ChatClient chatClient;
    private final ResumeMapper resumeMapper;
    private final ObjectMapper objectMapper;
    private final SessionCacheService sessionCacheService;

    @Autowired(required = false)
    public AutoFillService(ChatClient.Builder chatClientBuilder,
                          ResumeMapper resumeMapper,
                          SessionCacheService sessionCacheService) {
        if (chatClientBuilder != null) {
            this.chatClient = chatClientBuilder.build();
        } else {
            this.chatClient = null;
        }
        this.resumeMapper = resumeMapper;
        this.objectMapper = new ObjectMapper();
        this.sessionCacheService = sessionCacheService;
    }

    /**
     * 【新增】分析页面HTML并提取字段结构
     * 阶段1：AI分析完整HTML，识别字段分组和类型
     */
    public Map<String, Object> analyzePageHTML(String html, String url, String company, String position) {
        if (chatClient == null) {
            // AI不可用，返回空结构
            Map<String, Object> fallbackResult = new HashMap<>();
            fallbackResult.put("sessionId", "");
            fallbackResult.put("sections", new ArrayList<>());
            fallbackResult.put("method", "local");
            return fallbackResult;
        }

        try {
            // 构建AI提示词
            String systemPrompt = buildPageAnalysisSystemPrompt();
            String userPrompt = buildPageAnalysisUserPrompt(html, url, company, position);

            // 调用AI
            String aiResponse = chatClient.prompt()
                    .system(systemPrompt)
                    .user(userPrompt)
                    .call()
                    .content();

            // 解析AI返回的JSON
            @SuppressWarnings("unchecked")
            Map<String, Object> result = objectMapper.readValue(aiResponse, Map.class);

            // 创建session并存储分析结果
            Map<String, Object> sessionData = new HashMap<>();
            sessionData.put("url", url);
            sessionData.put("company", company);
            sessionData.put("position", position);
            sessionData.put("sections", result.get("sections"));
            sessionData.put("timestamp", System.currentTimeMillis());

            String sessionId = sessionCacheService.createSession(sessionData, 10); // 10分钟过期

            // 返回结果
            Map<String, Object> response = new HashMap<>();
            response.put("sessionId", sessionId);
            response.put("sections", result.get("sections"));
            response.put("method", "ai");

            return response;

        } catch (Exception e) {
            System.err.println("AI页面分析失败: " + e.getMessage());
            e.printStackTrace();

            // 降级到空结构
            Map<String, Object> fallbackResult = new HashMap<>();
            fallbackResult.put("sessionId", "");
            fallbackResult.put("sections", new ArrayList<>());
            fallbackResult.put("method", "error");
            fallbackResult.put("error", e.getMessage());
            return fallbackResult;
        }
    }

    /**
     * 【新增】基于sessionId和简历JSON，AI生成填充值
     * 阶段2：AI智能匹配简历数据到字段
     */
    public Map<String, Object> fillValuesWithAI(
            String sessionId,
            List<Map<String, Object>> fields,
            Map<String, Object> resumeData,
            String company,
            String position) {

        if (chatClient == null) {
            // AI不可用，返回空匹配
            Map<String, Object> fallbackResult = new HashMap<>();
            fallbackResult.put("matches", new ArrayList<>());
            fallbackResult.put("method", "local");
            return fallbackResult;
        }

        try {
            // 获取session数据（验证sessionId有效性）
            Map<String, Object> sessionData = sessionCacheService.getSession(sessionId);
            if (sessionData == null) {
                System.err.println("Session已过期或不存在: " + sessionId);
            }

            // 构建AI提示词
            String systemPrompt = buildFillValuesSystemPrompt();
            String userPrompt = buildFillValuesUserPrompt(fields, resumeData, company, position);

            // 调用AI
            String aiResponse = chatClient.prompt()
                    .system(systemPrompt)
                    .user(userPrompt)
                    .call()
                    .content();

            // 解析AI返回的JSON
            @SuppressWarnings("unchecked")
            Map<String, Object> result = objectMapper.readValue(aiResponse, Map.class);

            // ⭐ 【新增】后处理验证：检查并修复日期格式
            result = validateAndFixDateFormats(result, fields);

            return result;

        } catch (Exception e) {
            System.err.println("AI填充值生成失败: " + e.getMessage());
            e.printStackTrace();

            // 降级到空匹配
            Map<String, Object> fallbackResult = new HashMap<>();
            fallbackResult.put("matches", new ArrayList<>());
            fallbackResult.put("method", "error");
            fallbackResult.put("error", e.getMessage());
            return fallbackResult;
        }
    }







    /**
     * 获取格式化的简历数据（用于自动填表）
     *
     * @param resumeId 简历ID
     * @param userId   用户ID
     * @return 格式化的简历数据
     */
    public Map<String, Object> getFormattedResumeData(Long resumeId, Long userId) {
        Resume resume = resumeMapper.selectById(resumeId);

        if (resume == null || !resume.getUserId().equals(userId)) {
            return null;
        }

        // 检查是否已解析
        if (resume.getParseStatus() == null || resume.getParseStatus() != 2) {
            return null;
        }

        try {
            // 解析JSON数据
            @SuppressWarnings("unchecked")
            Map<String, Object> parsedData = objectMapper.readValue(
                    resume.getParsedData(),
                    new TypeReference<Map<String, Object>>() {
                    }
            );

            // 格式化为平铺的键值对格式（方便前端使用）
            Map<String, Object> formattedData = flattenResumeData(parsedData);

            // 添加元数据
            formattedData.put("_resumeId", resume.getId());
            formattedData.put("_title", resume.getTitle());
            formattedData.put("_updatedAt", resume.getUpdatedAt());

            // 同时保留原始的完整数据（用于智能展开）
            formattedData.put("education", parsedData.get("education"));
            formattedData.put("workExperience", parsedData.get("workExperience"));
            formattedData.put("projects", parsedData.get("projects"));

            return formattedData;

        } catch (Exception e) {
            System.err.println("解析简历数据失败: " + e.getMessage());
            return null;
        }
    }

    /**
     * 将嵌套的简历JSON数据平铺为一维键值对
     */
    @SuppressWarnings("unchecked")
    private Map<String, Object> flattenResumeData(Map<String, Object> parsedData) {
        Map<String, Object> flattened = new HashMap<>();

        // 基本信息
        if (parsedData.containsKey("basicInfo")) {
            Map<String, Object> basicInfo = (Map<String, Object>) parsedData.get("basicInfo");
            flattened.put("name", basicInfo.get("name"));
            flattened.put("gender", basicInfo.get("gender"));
            flattened.put("age", basicInfo.get("age"));
            flattened.put("phone", basicInfo.get("phone"));
            flattened.put("email", basicInfo.get("email"));
            flattened.put("location", basicInfo.get("location"));
        }

        // 教育经历（取第一条）
        if (parsedData.containsKey("education")) {
            List<Map<String, Object>> education = (List<Map<String, Object>>) parsedData.get("education");
            if (!education.isEmpty()) {
                Map<String, Object> firstEdu = education.get(0);
                flattened.put("school", firstEdu.get("school"));
                flattened.put("major", firstEdu.get("major"));
                flattened.put("degree", firstEdu.get("degree"));
                flattened.put("educationPeriod", firstEdu.get("period"));
                flattened.put("gpa", firstEdu.get("gpa"));
            }
        }

        // 工作经历（取第一条）
        if (parsedData.containsKey("workExperience")) {
            List<Map<String, Object>> workExp = (List<Map<String, Object>>) parsedData.get("workExperience");
            if (!workExp.isEmpty()) {
                Map<String, Object> firstWork = workExp.get(0);
                flattened.put("company", firstWork.get("company"));
                flattened.put("position", firstWork.get("position"));
                flattened.put("workPeriod", firstWork.get("period"));
                flattened.put("workDescription", firstWork.get("responsibilities"));
            }
        }

        // 项目经历（取第一条）
        if (parsedData.containsKey("projects")) {
            List<Map<String, Object>> projects = (List<Map<String, Object>>) parsedData.get("projects");
            if (!projects.isEmpty()) {
                Map<String, Object> firstProject = projects.get(0);
                flattened.put("projectName", firstProject.get("name"));
                flattened.put("projectRole", firstProject.get("role"));
                flattened.put("projectDescription", firstProject.get("description"));
            }
        }

        // 技能
        if (parsedData.containsKey("skills")) {
            Map<String, Object> skills = (Map<String, Object>) parsedData.get("skills");
            flattened.put("programmingLanguages", skills.get("programmingLanguages"));
            flattened.put("frameworks", skills.get("frameworks"));
            flattened.put("tools", skills.get("tools"));
            flattened.put("skills", skills);
        }

        // 其他信息
        flattened.put("certifications", parsedData.get("certifications"));
        flattened.put("awards", parsedData.get("awards"));
        flattened.put("languages", parsedData.get("languages"));
        flattened.put("summary", parsedData.get("summary"));

        // 保留原始完整数据
        flattened.put("_fullData", parsedData);

        return flattened;
    }

    /**
     * 获取用户简历列表
     */
    public List<Map<String, Object>> getUserResumeList(Long userId) {
        List<Resume> resumeList = resumeMapper.selectListByUserId(userId);
        List<Map<String, Object>> result = new ArrayList<>();

        for (Resume resume : resumeList) {
            Map<String, Object> item = new HashMap<>();
            item.put("id", resume.getId());
            item.put("title", resume.getTitle());
            item.put("fileName", resume.getFileName());
            item.put("parseStatus", resume.getParseStatus());
            item.put("isDefault", resume.getIsDefault());
            item.put("createdAt", resume.getCreatedAt());
            item.put("updatedAt", resume.getUpdatedAt());

            // 添加状态描述
            String statusText = getParseStatusText(resume.getParseStatus());
            item.put("statusText", statusText);

            result.add(item);
        }

        return result;
    }

    /**
     * 获取默认简历数据
     */
    public Map<String, Object> getDefaultResumeData(Long userId) {
        List<Resume> resumeList = resumeMapper.selectListByUserId(userId);

        if (resumeList == null || resumeList.isEmpty()) {
            return null;
        }

        // 查找默认简历
        Resume defaultResume = null;
        for (Resume resume : resumeList) {
            if (resume.getIsDefault() != null && resume.getIsDefault() == 1) {
                defaultResume = resume;
                break;
            }
        }

        // 如果没有默认简历，使用最新的
        if (defaultResume == null) {
            defaultResume = resumeList.get(0);
        }

        return getFormattedResumeData(defaultResume.getId(), userId);
    }

    /**
     * 记录自动填表历史
     */
    public void recordAutoFillHistory(Long userId, Map<String, Object> historyData) {
        // TODO: 保存到数据库（可选功能）
        System.out.println("记录自动填表历史: userId=" + userId + ", data=" + historyData);
    }

    /**
     * 获取解析状态文本
     */
    private String getParseStatusText(Integer parseStatus) {
        if (parseStatus == null) {
            return "未解析";
        }
        switch (parseStatus) {
            case 0:
                return "待解析";
            case 1:
                return "解析中";
            case 2:
                return "已解析";
            case 3:
                return "解析失败";
            default:
                return "未知状态";
        }
    }

    // ==================== 新增：两阶段AI提示词构建方法 ====================

    /**
     * 【阶段1】构建页面分析的系统提示词
     */
    private String buildPageAnalysisSystemPrompt() {
        return """
                你是一个智能表单结构分析助手。你的任务是分析招聘网站的HTML结构，识别简历填写表单的字段分组和字段类型。

                请分析HTML中的表单结构，提取以下信息：
                1. 识别字段分组（section）：如"基本信息"、"教育经历"、"工作经历"、"项目经历"等
                2. 识别每个分组下的字段（field）：如"姓名"、"手机号"、"学校名称"等
                3. 判断字段的语义类型（fieldType）

                可能的字段类型包括：
                - 基本信息：name（姓名）、phone（手机）、email（邮箱）、gender（性别）、birthday（出生日期）、age（年龄）
                - 教育经历：school（学校）、major（专业）、education/degree（学历）、educationStartDate（入学时间）、educationEndDate（毕业时间）
                - 工作经历：company（公司）、position（职位）、workStartDate（入职时间）、workEndDate（离职时间）、workDescription（工作描述）
                - 项目经历：projectName（项目名称）、projectRole（项目角色）、projectStartDate（开始时间）、projectEndDate（结束时间）、projectDescription（项目描述）
                - 技能相关：skill（技能）、language（语言能力）、certificate（证书）
                - 求职意向：desiredPosition（期望职位）、expectedSalary（期望薪资）、desiredCity（期望城市）
                - 其他：selfEvaluation（自我评价）、attachment（附件上传）

                请严格按照以下JSON格式返回（不要使用markdown代码块）：

                {
                  "sections": [
                    {
                      "sectionName": "基本信息",
                      "fields": [
                        {
                          "fieldName": "姓名",
                          "fieldType": "name"
                        },
                        {
                          "fieldName": "手机号码",
                          "fieldType": "phone"
                        }
                      ]
                    },
                    {
                      "sectionName": "教育经历",
                      "fields": [
                        {
                          "fieldName": "学校名称",
                          "fieldType": "school"
                        },
                        {
                          "fieldName": "学历",
                          "fieldType": "education"
                        }
                      ]
                    }
                  ]
                }

                注意：
                1. 只返回JSON，不要添加其他说明文字
                2. sectionName是分组标题
                3. fieldName是字段的中文标签
                4. fieldType是字段的语义类型（英文）
                """;
    }

    /**
     * 【阶段1】构建页面分析的用户提示词
     */
    private String buildPageAnalysisUserPrompt(String html, String url, String company, String position) {
        StringBuilder prompt = new StringBuilder();
        prompt.append("请分析以下招聘网站的简历填写表单：\n\n");

        if (url != null && !url.isEmpty()) {
            prompt.append("页面URL：").append(url).append("\n");
        }
        if (company != null && !company.isEmpty()) {
            prompt.append("公司名称：").append(company).append("\n");
        }
        if (position != null && !position.isEmpty()) {
            prompt.append("职位名称：").append(position).append("\n");
        }

        prompt.append("\nHTML内容（已简化）：\n");
        prompt.append(html.length() > 50000 ? html.substring(0, 50000) + "\n...(截断)" : html);

        return prompt.toString();
    }

    /**
     * 【阶段2】构建填充值生成的系统提示词
     */
    private String buildFillValuesSystemPrompt() {
        return """
                你是一个智能简历填写助手。你的任务是根据JSON格式的简历数据和表单字段信息，生成每个字段的填充值。

                任务要求：
                1. 从JSON简历中提取对应字段的值
                2. 如果字段有items（下拉选项），从中选择最匹配的选项
                3. ⭐【重要】日期字段必须返回完整格式：
                   - 如果字段的items包含"(请填写年月)"，必须返回 YYYY-MM 格式（例如："2020-09"、"2024-06"）
                   - 如果字段的items包含"(请填写日期)"，必须返回 YYYY-MM-DD 格式（例如："2020-09-01"）
                   - 如果字段的items包含"(请填写年)"，必须返回 YYYY 格式（例如："2020"）
                   - ❌ 不要只返回月份（如"9月"、"04月"）
                   - ❌ 不要只返回年份在日期字段中
                   - ✅ 必须从简历的period字段中提取完整的年份和月份信息
                4. ⭐【智能预测时间 - 强制执行】当表单要求填写起止时间但简历只有结束时间时，必须智能推断开始时间：
                   - 教育经历学制推断：
                     * 本科4年：毕业2027-06 → 入学2023-09（09月秋季入学）
                     * 硕士3年：毕业2025-06 → 入学2022-09
                     * 博士4年：毕业2026-06 → 入学2022-09
                   - 项目经历：结束时间前推6-18个月
                     * 结束2024-09 → 开始2023-03（前推18个月）
                   - 工作经历：结束时间前推1-3年
                   - ⚠️ 强制要求：如果前端字段包含"起止"关键词或有两个时间input，必须推断并返回开始+结束两个时间
                   - 优先使用简历中明确的时间，无明确时间时必须推断
                5. ⭐【时间范围字段处理 - 关键】识别包含"起止"、"开始-结束"等含义的字段：
                   - 前端字段包含"起止时间"、"入学-毕业"、"开始-结束"等时，必须返回两个独立的字段
                   - ⚠️ 必须使用精确的fieldName：
                     * 第一个时间：{"fieldName": "开始时间", "value": "2023-03"}  或 {"fieldName": "入学时间", "value": "2023-09"}
                     * 第二个时间：{"fieldName": "结束时间", "value": "2024-09"}  或 {"fieldName": "毕业时间", "value": "2027-06"}
                   - 不要返回一个字段包含两个时间
                   - 即使简历中只有结束时间，也必须推断开始时间并返回两个字段
                6. ⭐【字段名匹配优化】fieldName必须与前端发送的label完全一致或高度相似：
                   - 如果前端字段是"学校"，返回"学校"而不是"学校名称"
                   - 如果前端字段包含提示语（如"无准确的毕业时间可填写预计毕业时间"），优先匹配核心关键词"毕业时间"
                   - 优先使用简短、常见的字段名
                7. 手机号码拆分为国家码和号码（如+86和13800138000）
                8. 如果简历中有多条数据（如多个教育经历、多个项目），应该为每一条都生成独立的section匹配
                9. 如果简历中没有对应的数据，value设为空字符串""

                JSON简历结构说明：
                - basicInfo: 基本信息对象，包含 name、gender、phone、email、birthday、location 等
                - education: 教育经历数组，每项包含 school、major、degree、period 等
                - workExperience: 工作经历数组，每项包含 company、position、period、responsibilities 等
                - projects: 项目经历数组，每项包含 name、role、period、description 等
                - skills: 技能对象，包含 programmingLanguages、frameworks、tools 等
                - certifications: 证书数组
                - languages: 语言能力数组

                请严格按照以下JSON格式返回（不要使用markdown代码块）：

                {
                  "matches": [
                    {
                      "sectionName": "基本信息",
                      "fields": [
                        {
                          "fieldName": "姓名",
                          "value": "张三"
                        },
                        {
                          "fieldName": "手机号码 - 国家",
                          "value": "+86"
                        },
                        {
                          "fieldName": "手机号码 - 号码",
                          "value": "13800138000"
                        }
                      ]
                    },
                    {
                      "sectionName": "教育经历",
                      "fields": [
                        {
                          "fieldName": "学校名称",
                          "value": "清华大学"
                        },
                        {
                          "fieldName": "学历",
                          "value": "本科"
                        },
                        {
                          "fieldName": "入学时间",
                          "value": "2020-09"
                        },
                        {
                          "fieldName": "毕业时间",
                          "value": "2024-06"
                        }
                      ]
                    }
                  ]
                }

                ⭐【日期格式示例】⭐
                错误示例❌：
                - {"fieldName": "入学时间", "value": "9月"}  ← 缺少年份
                - {"fieldName": "入学时间", "value": "04月"} ← 缺少年份
                - {"fieldName": "入学时间", "value": "2020"} ← 缺少月份
                - {"fieldName": "起止时间", "value": "2020-09 到 2024-06"} ← 应该拆分成两个字段

                正确示例✅：
                - {"fieldName": "入学时间", "value": "2020-09"} ← 完整的YYYY-MM格式
                - {"fieldName": "毕业时间", "value": "2024-06"} ← 完整的YYYY-MM格式
                - {"fieldName": "入职时间", "value": "2021-03"} ← 完整的YYYY-MM格式

                ⭐【智能预测时间示例】⭐
                场景1：教育经历只有毕业时间（智能预测入学时间）
                简历中：{"degree": "本科", "school": "清华大学", "major": "计算机科学", "graduationDate": "2024-06"}
                前端字段：学校名称、专业、学历、入学时间、毕业时间
                返回：
                {
                  "sectionName": "教育经历",
                  "fields": [
                    {"fieldName": "学校名称", "value": "清华大学"},
                    {"fieldName": "专业", "value": "计算机科学"},
                    {"fieldName": "学历", "value": "本科"},
                    {"fieldName": "入学时间", "value": "2020-09"},
                    {"fieldName": "毕业时间", "value": "2024-06"}
                  ]
                }
                说明：本科4年学制，毕业2024-06，推断入学2020-09

                场景2：项目经历只有结束时间（智能预测开始时间）
                简历中：{"projectName": "商城系统", "role": "全栈开发", "endDate": "2025-04", "description": "..."}
                前端字段：项目名称、项目角色、开始时间、结束时间、描述
                返回：
                {
                  "sectionName": "项目经历",
                  "fields": [
                    {"fieldName": "项目名称", "value": "商城系统"},
                    {"fieldName": "项目角色", "value": "全栈开发"},
                    {"fieldName": "开始时间", "value": "2024-10"},
                    {"fieldName": "结束时间", "value": "2025-04"},
                    {"fieldName": "描述", "value": "..."}
                  ]
                }
                说明：项目结束2025-04，推断开始时间为6个月前2024-10

                场景3：多个项目经历（智能预测+时间拆分）
                简历中：有2个项目，每个只有结束时间
                前端字段包含"起止时间"（时间范围字段）
                返回：生成2个独立的"项目经历"section，每个拆分成开始+结束时间
                {
                  "matches": [
                    {
                      "sectionName": "项目经历",
                      "fields": [
                        {"fieldName": "项目名称", "value": "学生离校系统"},
                        {"fieldName": "开始时间", "value": "2022-09"},
                        {"fieldName": "结束时间", "value": "2023-03"},
                        {"fieldName": "项目角色", "value": "前端开发"},
                        {"fieldName": "描述", "value": "学生离校安全预警系统是一个面向校园的后台服务系统..."}
                      ]
                    },
                    {
                      "sectionName": "项目经历",
                      "fields": [
                        {"fieldName": "项目名称", "value": "副食品商城"},
                        {"fieldName": "开始时间", "value": "2024-10"},
                        {"fieldName": "结束时间", "value": "2025-04"},
                        {"fieldName": "项目角色", "value": "前端开发"},
                        {"fieldName": "描述", "value": "副食品商城后台管理系统是一个面向副食品行业..."}
                      ]
                    }
                  ]
                }

                ⭐【字段名匹配示例】⭐
                前端字段：{"label": "无准确的毕业时间可填写预计毕业时间"}
                正确返回：{"fieldName": "毕业时间", "value": "2024-06"} ← 提取核心关键词
                错误返回：{"fieldName": "无准确的毕业时间可填写预计毕业时间", "value": "2024-06"} ← 太长

                注意：
                1. 只返回JSON，不要添加其他说明文字
                2. 如果字段有items下拉选项，value必须是items中的某一项（完全匹配）
                3. ⭐⭐⭐ 日期格式必须完整：YYYY-MM（如"2021-09"），不能只有月份或只有年份
                4. 如果简历中有多条教育/工作/项目经历，应该返回多个同名section的匹配，每个section代表一条记录
                5. fieldName要简短精确，提取核心关键词
                """;
    }

    /**
     * 【阶段2】构建填充值生成的用户提示词
     */
    private String buildFillValuesUserPrompt(
            List<Map<String, Object>> fields,
            Map<String, Object> resumeData,
            String company,
            String position) {

        StringBuilder prompt = new StringBuilder();
        prompt.append("请根据以下简历数据和表单字段，生成每个字段的填充值：\n\n");

        // 目标职位信息
        if (company != null && !company.isEmpty()) {
            prompt.append("目标公司：").append(company).append("\n");
        }
        if (position != null && !position.isEmpty()) {
            prompt.append("目标职位：").append(position).append("\n");
        }

        // 简历JSON数据
        prompt.append("\n简历数据（JSON格式）：\n");
        try {
            String resumeJson = objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(resumeData);
            prompt.append(resumeJson);
        } catch (Exception e) {
            prompt.append(resumeData.toString());
        }

        // 字段信息
        prompt.append("\n\n表单字段信息：\n");
        try {
            String fieldsJson = objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(fields);
            prompt.append(fieldsJson);
        } catch (Exception e) {
            prompt.append(fields.toString());
        }

        return prompt.toString();
    }

    // ==================== 【新增】日期格式验证和修复方法 ====================

    /**
     * 验证并修复AI返回的日期格式
     * @param result AI返回的结果
     * @param fields 前端发送的字段列表（包含items信息）
     * @return 修复后的结果
     */
    @SuppressWarnings("unchecked")
    private Map<String, Object> validateAndFixDateFormats(
            Map<String, Object> result,
            List<Map<String, Object>> fields) {

        System.out.println("\n========== 开始日期格式验证与语义检查 ==========");

        if (result == null || !result.containsKey("matches")) {
            System.out.println("【验证跳过】result为空或没有matches");
            return result;
        }

        // 构建字段items映射（同时使用 label 和 fieldType + label 作为key）
        Map<String, List<String>> fieldItemsMap = new HashMap<>();
        Map<Integer, List<String>> fieldIndexMap = new HashMap<>();

        // ⭐ 新增：构建字段类型映射（用于语义验证）
        Map<String, String> fieldTypeMap = new HashMap<>(); // fieldName → fieldType
        Map<String, String> fieldLabelMap = new HashMap<>(); // fieldName → label

        for (int i = 0; i < fields.size(); i++) {
            Map<String, Object> field = fields.get(i);
            String label = (String) field.get("label");
            String fieldType = (String) field.get("fieldType");
            Integer index = (Integer) field.get("index");
            Object itemsObj = field.get("items");

            if (itemsObj instanceof List) {
                List<String> items = new ArrayList<>();
                for (Object item : (List<?>) itemsObj) {
                    if (item instanceof Map) {
                        items.add((String) ((Map<String, Object>) item).get("text"));
                    } else if (item instanceof String) {
                        items.add((String) item);
                    }
                }

                if (!items.isEmpty()) {
                    // 关键修复：同时存储多种key方式
                    if (label != null) {
                        fieldItemsMap.put(label, items);
                        fieldLabelMap.put(label, label);
                    }
                    if (fieldType != null && label != null) {
                        fieldItemsMap.put(fieldType + "_" + label, items);
                        fieldTypeMap.put(label, fieldType);
                    }
                    if (index != null) {
                        fieldIndexMap.put(index, items);
                    }

                    System.out.println(String.format(
                            "【构建映射】label=%s, fieldType=%s, index=%d, items=%s",
                            label, fieldType, index, items.toString()
                    ));
                }
            }
        }

        System.out.println(String.format("【映射完成】共构建 %d 个字段映射，%d 个类型映射",
                fieldItemsMap.size(), fieldTypeMap.size()));

        // 遍历matches，检查并修复日期字段
        List<Map<String, Object>> matches = (List<Map<String, Object>>) result.get("matches");
        int fixedCount = 0;
        int checkedCount = 0;
        int removedCount = 0; // 删除的错误映射数量
        int emptyFieldNameCount = 0; // 空fieldName数量

        for (Map<String, Object> match : matches) {
            String sectionName = (String) match.get("sectionName");
            List<Map<String, Object>> matchFields = (List<Map<String, Object>>) match.get("fields");

            if (matchFields == null) continue;

            // 使用迭代器以便安全删除元素
            Iterator<Map<String, Object>> iterator = matchFields.iterator();

            while (iterator.hasNext()) {
                Map<String, Object> matchField = iterator.next();
                String fieldName = (String) matchField.get("fieldName");
                String value = (String) matchField.get("value");

                // ⭐ 智能修复空fieldName
                if (fieldName == null || fieldName.trim().isEmpty()) {
                    System.out.println(String.format(
                            "  ⚠️ 检测到空fieldName: value=%s (section=%s)", value, sectionName
                    ));

                    // 尝试根据value的类型推断fieldName
                    String inferredFieldName = inferFieldNameFromValue(value, fields);

                    if (inferredFieldName != null) {
                        matchField.put("fieldName", inferredFieldName);
                        fieldName = inferredFieldName;
                        emptyFieldNameCount++;
                        System.out.println(String.format(
                                "  ✅ 修复成功：推断fieldName为 '%s'", inferredFieldName
                        ));
                    } else {
                        // 无法推断，保留空fieldName，让前端处理
                        System.out.println("  ⚠️ 无法推断fieldName，保留原值供前端模糊匹配");
                        emptyFieldNameCount++;
                    }
                }

                if (value == null || value.trim().isEmpty()) {
                    continue;
                }

                checkedCount++;
                System.out.println(String.format(
                        "【检查字段 %d】section=%s, fieldName=%s, value=%s",
                        checkedCount, sectionName, fieldName, value
                ));

                // ⭐ 智能修复：检测日期值是否被错误分配给非日期字段
                if (isDateFormatValue(value)) {
                    System.out.println("  ⚠️ 检测到日期格式的值，进行语义验证...");

                    // 获取字段类型
                    String fieldType = fieldTypeMap.get(fieldName);
                    String fieldLabel = fieldLabelMap.get(fieldName);

                    // 判断字段是否应该接受日期值
                    boolean isDateField = isDateTypeField(fieldName, fieldType, fieldLabel);

                    if (!isDateField) {
                        // 尝试智能修复：查找真正的日期字段
                        System.out.println(String.format(
                                "  ⚠️ 日期值 '%s' 被分配给非日期字段 '%s' (fieldType=%s)，尝试修复...",
                                value, fieldName, fieldType
                        ));

                        String correctFieldName = findCorrectDateField(value, fields, sectionName);

                        if (correctFieldName != null) {
                            matchField.put("fieldName", correctFieldName);
                            fixedCount++;
                            System.out.println(String.format(
                                    "  ✅【智能修复】将日期值重新映射到字段: '%s'", correctFieldName
                            ));
                        } else {
                            // 无法找到正确的日期字段，保留原值让前端处理
                            System.out.println("  ⚠️ 未找到合适的日期字段，保留原映射供前端模糊匹配");
                        }
                    } else {
                        System.out.println(String.format(
                                "  ✓ 语义验证通过：'%s' 是日期类型字段 (fieldType=%s)",
                                fieldName, fieldType
                        ));
                    }
                }

                // 尝试多种方式获取items
                List<String> items = fieldItemsMap.get(fieldName);

                // 如果直接匹配失败，尝试模糊匹配
                if (items == null || items.isEmpty()) {
                    System.out.println(String.format(
                            "  ⚠️ 直接匹配失败，尝试模糊匹配: %s", fieldName
                    ));

                    // 尝试包含关系匹配（例如 "起止时间" 包含在 label 中）
                    for (Map.Entry<String, List<String>> entry : fieldItemsMap.entrySet()) {
                        String key = entry.getKey();

                        // 跳过空字符串的key，避免误匹配
                        if (key == null || key.trim().isEmpty()) {
                            continue;
                        }

                        if (key.contains(fieldName) || fieldName.contains(key)) {
                            items = entry.getValue();
                            System.out.println(String.format(
                                    "  ✓ 模糊匹配成功: %s ↔ %s", fieldName, key
                            ));
                            break;
                        }
                    }
                }

                if (items == null || items.isEmpty()) {
                    System.out.println("  ✗ 无法找到对应的items，跳过");
                    continue;
                }

                System.out.println("  找到items: " + items.toString());

                // 检查是否是日期字段
                boolean isYearMonth = items.contains("(请填写年月)");
                boolean isFullDate = items.contains("(请填写日期)");
                boolean isYear = items.contains("(请填写年)");

                // 也检查月份选项（如 "01月", "02月" 等）
                boolean hasMonthOptions = items.stream().anyMatch(item -> item.matches("\\d{2}月"));

                System.out.println(String.format(
                        "  日期类型判断: isYearMonth=%s, isFullDate=%s, isYear=%s, hasMonthOptions=%s",
                        isYearMonth, isFullDate, isYear, hasMonthOptions
                ));

                if (!isYearMonth && !isFullDate && !isYear && !hasMonthOptions) {
                    System.out.println("  ✗ 不是日期字段，跳过");
                    continue;
                }

                // 验证并修复日期格式
                String fixedValue = validateAndFixSingleDateValue(
                        value, fieldName, isYearMonth || hasMonthOptions, isFullDate, isYear);

                if (fixedValue != null && !fixedValue.equals(value)) {
                    matchField.put("value", fixedValue);
                    fixedCount++;

                    System.out.println(String.format(
                            "  ✅【日期修复】字段: %s, 原值: %s, 修复后: %s",
                            fieldName, value, fixedValue
                    ));
                } else {
                    System.out.println("  ✓ 日期格式正确，无需修复");
                }
            }
        }

        System.out.println(String.format(
                "\n========== 验证完成：检查了 %d 个字段，修复了 %d 个日期字段，删除了 %d 个语义错误映射，删除了 %d 个空fieldName ==========\n",
                checkedCount, fixedCount, removedCount, emptyFieldNameCount
        ));

        return result;
    }

    /**
     * 验证并修复单个日期值
     * @param value 原始值
     * @param fieldName 字段名（用于日志）
     * @param isYearMonth 是否是年月字段
     * @param isFullDate 是否是完整日期字段
     * @param isYear 是否是年份字段
     * @return 修复后的值，如果无法修复则返回null
     */
    private String validateAndFixSingleDateValue(
            String value,
            String fieldName,
            boolean isYearMonth,
            boolean isFullDate,
            boolean isYear) {

        // 如果已经是正确格式，直接返回
        if (isYearMonth && value.matches("\\d{4}-\\d{2}")) {
            return value; // 已经是 YYYY-MM 格式
        }
        if (isFullDate && value.matches("\\d{4}-\\d{2}-\\d{2}")) {
            return value; // 已经是 YYYY-MM-DD 格式
        }
        if (isYear && value.matches("\\d{4}")) {
            return value; // 已经是 YYYY 格式
        }

        System.out.println("【日期验证】字段: " + fieldName + ", 值: " + value + ", 格式不正确");

        // 尝试修复：只有月份的情况（如 "04月"、"9月"）
        if (value.matches("\\d{1,2}月?")) {
            int month = Integer.parseInt(value.replaceAll("[^\\d]", ""));
            if (month >= 1 && month <= 12) {
                int currentYear = java.time.Year.now().getValue();
                String fixedValue = String.format("%d-%02d", currentYear, month);

                System.out.println("【日期修复警告】只有月份，使用当前年份: " + currentYear +
                        " (建议检查AI提示词或简历数据)");

                return fixedValue;
            }
        }

        // 尝试修复：YYYY年MM月 格式
        if (value.matches("\\d{4}年\\d{1,2}月")) {
            String[] parts = value.split("[年月]");
            if (parts.length >= 2) {
                int year = Integer.parseInt(parts[0]);
                int month = Integer.parseInt(parts[1]);
                return String.format("%d-%02d", year, month);
            }
        }

        // 尝试修复：YYYY-M 格式（月份缺少前导0）
        if (value.matches("\\d{4}-\\d{1}$")) {
            String[] parts = value.split("-");
            if (parts.length == 2) {
                int year = Integer.parseInt(parts[0]);
                int month = Integer.parseInt(parts[1]);
                return String.format("%d-%02d", year, month);
            }
        }

        // 尝试修复：YYYY.MM 或 YYYY/MM 格式
        if (value.matches("\\d{4}[./]\\d{1,2}")) {
            String normalized = value.replaceAll("[./]", "-");
            String[] parts = normalized.split("-");
            if (parts.length == 2) {
                int year = Integer.parseInt(parts[0]);
                int month = Integer.parseInt(parts[1]);
                return String.format("%d-%02d", year, month);
            }
        }

        // 无法修复 - 返回null表示保持原值
        return null;
    }

    /**
     * 检测值是否是日期格式
     * @param value 值
     * @return 是否是日期格式
     */
    private boolean isDateFormatValue(String value) {
        if (value == null || value.isEmpty()) {
            return false;
        }

        // 匹配各种日期格式
        return value.matches("\\d{4}-\\d{1,2}(-\\d{1,2})?")  // YYYY-MM 或 YYYY-MM-DD
                || value.matches("\\d{4}[./]\\d{1,2}([./]\\d{1,2})?")  // YYYY.MM 或 YYYY/MM
                || value.matches("\\d{4}年\\d{1,2}月(\\d{1,2}日)?")  // YYYY年MM月 或 YYYY年MM月DD日
                || value.matches("\\d{1,2}月")  // XX月
                || value.matches("\\d{4}")  // YYYY (年份)
                || value.matches("\\d{1,2}/\\d{1,2}/\\d{4}")  // MM/DD/YYYY
                || value.matches("\\d{1,2}-\\d{1,2}-\\d{4}");  // DD-MM-YYYY
    }

    /**
     * 判断字段是否应该接受日期值
     * @param fieldName 字段名
     * @param fieldType 字段类型
     * @param fieldLabel 字段标签
     * @return 是否是日期类型字段
     */
    private boolean isDateTypeField(String fieldName, String fieldType, String fieldLabel) {
        // 如果字段类型或标签为空，进行保守判断
        if (fieldType == null && fieldLabel == null) {
            // 根据字段名进行判断
            return isDateRelatedName(fieldName);
        }

        // 检查fieldType是否是日期相关
        if (fieldType != null) {
            String typeLower = fieldType.toLowerCase();
            if (typeLower.contains("date") || typeLower.contains("time") || typeLower.contains("period")) {
                return true;
            }
        }

        // 检查fieldLabel是否包含日期关键词
        if (fieldLabel != null && isDateRelatedName(fieldLabel)) {
            return true;
        }

        // 检查fieldName是否包含日期关键词
        if (fieldName != null && isDateRelatedName(fieldName)) {
            return true;
        }

        return false;
    }

    /**
     * 判断名称是否包含日期相关关键词
     * @param name 名称
     * @return 是否包含日期关键词
     */
    private boolean isDateRelatedName(String name) {
        if (name == null || name.isEmpty()) {
            return false;
        }

        String nameLower = name.toLowerCase();

        // 中文日期关键词
        String[] chineseKeywords = {
                "时间", "日期", "年月", "年份", "月份",
                "入学", "毕业", "入职", "离职",
                "开始", "结束", "起止", "起始",
                "出生", "生日", "创建", "更新",
                "截止", "期限", "有效期"
        };

        for (String keyword : chineseKeywords) {
            if (nameLower.contains(keyword)) {
                return true;
            }
        }

        // 英文日期关键词
        String[] englishKeywords = {
                "date", "time", "period", "year", "month", "day",
                "start", "end", "begin", "finish",
                "from", "to", "until", "since",
                "birth", "create", "update", "expire"
        };

        for (String keyword : englishKeywords) {
            if (nameLower.contains(keyword)) {
                return true;
            }
        }

        return false;
    }

    /**
     * 根据值的类型推断fieldName
     * @param value 值
     * @param fields 字段列表
     * @return 推断的fieldName，如果无法推断则返回null
     */
    private String inferFieldNameFromValue(String value, List<Map<String, Object>> fields) {
        if (value == null || value.trim().isEmpty()) {
            return null;
        }

        // 如果是日期格式，查找日期类型字段
        if (isDateFormatValue(value)) {
            for (Map<String, Object> field : fields) {
                String label = (String) field.get("label");
                String fieldType = (String) field.get("fieldType");

                if (isDateTypeField(label, fieldType, label)) {
                    return label;
                }
            }
        }

        // 如果是手机号格式
        if (value.matches("^1[3-9]\\d{9}$") || value.matches("^\\+?86\\s*1[3-9]\\d{9}$")) {
            for (Map<String, Object> field : fields) {
                String label = (String) field.get("label");
                if (label != null && (label.contains("手机") || label.contains("电话") || label.contains("联系方式"))) {
                    return label;
                }
            }
        }

        // 如果是邮箱格式
        if (value.matches("^[\\w.-]+@[\\w.-]+\\.\\w+$")) {
            for (Map<String, Object> field : fields) {
                String label = (String) field.get("label");
                if (label != null && (label.contains("邮箱") || label.contains("email") || label.toLowerCase().contains("mail"))) {
                    return label;
                }
            }
        }

        // 如果是学历关键词
        if (value.matches("(本科|硕士|博士|专科|大专|高中|初中|PhD|Master|Bachelor)")) {
            for (Map<String, Object> field : fields) {
                String label = (String) field.get("label");
                if (label != null && (label.contains("学历") || label.contains("学位") || label.contains("degree"))) {
                    return label;
                }
            }
        }

        return null;
    }

    /**
     * 查找正确的日期字段
     * @param value 日期值
     * @param fields 字段列表
     * @param sectionName 当前section名称
     * @return 正确的日期字段名，如果找不到则返回null
     */
    private String findCorrectDateField(String value, List<Map<String, Object>> fields, String sectionName) {
        // 优先在同一个section内查找
        for (Map<String, Object> field : fields) {
            String label = (String) field.get("label");
            String fieldType = (String) field.get("fieldType");
            String section = (String) field.get("section");

            // 检查是否在同一个section
            boolean sameSection = (section != null && section.equals(sectionName)) ||
                    (section == null && sectionName == null);

            if (sameSection && isDateTypeField(label, fieldType, label)) {
                // 检查字段的items，确定是否匹配日期格式
                Object itemsObj = field.get("items");
                if (itemsObj instanceof List) {
                    List<?> items = (List<?>) itemsObj;
                    if (!items.isEmpty()) {
                        String firstItem = items.get(0).toString();

                        // 如果value是YYYY-MM格式，查找年月字段
                        if (value.matches("\\d{4}-\\d{2}")) {
                            if (firstItem.contains("请填写年月") || items.stream().anyMatch(item -> item.toString().matches("\\d{2}月"))) {
                                return label;
                            }
                        }

                        // 如果value是YYYY-MM-DD格式，查找完整日期字段
                        if (value.matches("\\d{4}-\\d{2}-\\d{2}")) {
                            if (firstItem.contains("请填写日期")) {
                                return label;
                            }
                        }

                        // 如果value是YYYY格式，查找年份字段
                        if (value.matches("\\d{4}")) {
                            if (firstItem.contains("请填写年")) {
                                return label;
                            }
                        }
                    }
                }

                // 如果没有items信息，根据label判断
                if (label != null) {
                    // 入学/毕业时间通常是年月
                    if ((label.contains("入学") || label.contains("毕业")) && value.matches("\\d{4}-\\d{2}")) {
                        return label;
                    }

                    // 入职/离职时间通常是年月
                    if ((label.contains("入职") || label.contains("离职")) && value.matches("\\d{4}-\\d{2}")) {
                        return label;
                    }

                    // 开始/结束时间
                    if ((label.contains("开始") || label.contains("结束") || label.contains("起止")) && value.matches("\\d{4}-\\d{2}")) {
                        return label;
                    }
                }
            }
        }

        return null;
    }
}
