package com.nian.yinianzhida.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nian.yinianzhida.dto.JobQueryDTO;
import com.nian.yinianzhida.dto.PageResult;
import com.nian.yinianzhida.entity.Job;
import com.nian.yinianzhida.mapper.JobMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.SimpleDateFormat;
import java.util.*;

/**
 * 岗位服务类
 */
@Service
public class JobService {

    private static final Logger logger = LoggerFactory.getLogger(JobService.class);

    @Autowired
    private JobMapper jobMapper;

    @Autowired(required = false)
    private ChatClient.Builder chatClientBuilder;

    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * 计算文本的有效字数（排除JSON格式符号）
     * @param text 原始文本
     * @return 有效字数
     */
    public int calculateEffectiveCharCount(String text) {
        if (text == null || text.trim().isEmpty()) {
            return 0;
        }

        // 移除JSON格式符号：{}[]",:;空格、换行、制表符等
        String effectiveText = text
            .replaceAll("[\\{\\}\\[\\]\",:;\\s]", "")  // 移除JSON符号和空白字符
            .replaceAll("null", "");  // 移除null关键字

        return effectiveText.length();
    }

    /**
     * 使用AI解析上传的岗位文本，转换为数据库结构
     * @param rawText 原始文本（支持JSON格式或普通文本格式）
     * @return 解析后的Job对象列表
     * @throws Exception 解析异常
     */
    public List<Job> parseJobsWithAI(String rawText) throws Exception {
        if (chatClientBuilder == null) {
            throw new Exception("AI服务不可用，请检查Spring AI配置");
        }

        logger.info("开始AI解析岗位数据，原始数据长度: {}", rawText.length());

        ChatClient chatClient = chatClientBuilder.build();

        // 构建AI Prompt
        String systemPrompt = buildJobParsePrompt();

        // 调用AI解析
        String aiResponse = chatClient
                .prompt()
                .system(systemPrompt)
                .user("请解析以下岗位数据（可能是JSON格式或普通文本格式）:\n\n" + rawText)
                .call()
                .content();

        logger.info("AI解析完成，返回数据长度: {}", aiResponse.length());

        // 清理AI返回的内容（可能包含markdown代码块标记）
        String cleanedResponse = cleanAIResponse(aiResponse);

        // 打印AI返回的清理后内容用于调试
        logger.info("AI返回的清理后JSON（前500字符）: {}",
            cleanedResponse.length() > 500 ? cleanedResponse.substring(0, 500) + "..." : cleanedResponse);

        // 将AI返回的JSON字符串解析为Job对象列表
        List<Job> jobs = parseAIResponseToJobs(cleanedResponse);

        logger.info("成功解析 {} 个岗位", jobs.size());

        return jobs;
    }

    /**
     * 批量保存岗位
     * @param jobs 岗位列表
     * @return 保存成功的记录数
     */
    @Transactional(rollbackFor = Exception.class)
    public int batchSaveJobs(List<Job> jobs) {
        if (jobs == null || jobs.isEmpty()) {
            throw new IllegalArgumentException("岗位列表不能为空");
        }

        // 设置默认值和数据校验
        for (Job job : jobs) {
            // 必填字段校验
            if (job.getJobName() == null || job.getJobName().trim().isEmpty()) {
                throw new IllegalArgumentException("岗位名称不能为空");
            }
            if (job.getCompanyName() == null || job.getCompanyName().trim().isEmpty()) {
                throw new IllegalArgumentException("公司名称不能为空");
            }

            // 设置默认值
            if (job.getStatus() == null) {
                job.setStatus(1); // 默认上架
            }
            if (job.getViewCount() == null) {
                job.setViewCount(0);
            }
            if (job.getCollectCount() == null) {
                job.setCollectCount(0);
            }
            if (job.getIsUrgent() == null) {
                job.setIsUrgent(0);
            }
            if (job.getSource() == null || job.getSource().trim().isEmpty()) {
                job.setSource("管理员上传");
            }
            if (job.getSalaryType() == null || job.getSalaryType().trim().isEmpty()) {
                job.setSalaryType("monthly"); // 默认月薪
            }

            // 如果没有发布时间，设置为当前时间
            if (job.getPublishTime() == null) {
                job.setPublishTime(new Date());
            }
        }

        int count = jobMapper.batchInsert(jobs);
        logger.info("成功批量保存 {} 个岗位", count);

        return count;
    }

    /**
     * 分页查询岗位列表
     * @param page 页码
     * @param pageSize 每页数量
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
     * @return 查询结果（包含列表和总数）
     */
    public Map<String, Object> getJobList(Integer page, Integer pageSize,
                                          String jobName, String jobType, String city,
                                          String industry, Integer status,
                                          Integer salaryMin, Integer salaryMax,
                                          String workExperience, String education,
                                          Date publishTimeStart, Date publishTimeEnd) {
        int offset = (page - 1) * pageSize;

        List<Job> jobs = jobMapper.selectByPage(offset, pageSize, jobName, jobType, city, industry,
                                                status, salaryMin, salaryMax, workExperience,
                                                education, publishTimeStart, publishTimeEnd);
        Integer total = jobMapper.countJobs(jobName, jobType, city, industry, status,
                                           salaryMin, salaryMax, workExperience,
                                           education, publishTimeStart, publishTimeEnd);

        Map<String, Object> result = new HashMap<>();
        result.put("jobs", jobs);
        result.put("total", total);
        result.put("page", page);
        result.put("pageSize", pageSize);
        result.put("totalPages", (int) Math.ceil((double) total / pageSize));

        return result;
    }

    /**
     * 根据ID查询岗位详情
     * @param id 岗位ID
     * @return 岗位信息
     */
    public Job getJobById(Long id) {
        return jobMapper.selectById(id);
    }

    /**
     * 增加岗位浏览次数
     * @param id 岗位ID
     */
    public void incrementViewCount(Long id) {
        jobMapper.incrementViewCount(id);
    }

    /**
     * 更新岗位状态
     * @param id 岗位ID
     * @param status 新状态
     * @return 是否更新成功
     */
    public boolean updateStatus(Long id, Integer status) {
        return jobMapper.updateStatus(id, status) > 0;
    }

    /**
     * 删除岗位
     * @param id 岗位ID
     * @return 是否删除成功
     */
    public boolean deleteJob(Long id) {
        return jobMapper.deleteById(id) > 0;
    }

    /**
     * 更新岗位信息
     * @param job 岗位对象
     * @return 是否更新成功
     */
    @Transactional(rollbackFor = Exception.class)
    public boolean updateJob(Job job) {
        if (job == null || job.getId() == null) {
            throw new IllegalArgumentException("岗位ID不能为空");
        }

        // 必填字段校验
        if (job.getJobName() != null && job.getJobName().trim().isEmpty()) {
            throw new IllegalArgumentException("岗位名称不能为空");
        }
        if (job.getCompanyName() != null && job.getCompanyName().trim().isEmpty()) {
            throw new IllegalArgumentException("公司名称不能为空");
        }

        int count = jobMapper.updateJob(job);
        logger.info("更新岗位信息成功，岗位ID: {}", job.getId());

        return count > 0;
    }

    /**
     * 构建AI解析Prompt
     * @return Prompt文本
     */
    private String buildJobParsePrompt() {
        return """
            你是一个岗位信息结构化专家。请将用户提供的岗位数据（可能是JSON格式或普通文本格式）智能提取并转换为符合以下数据库表结构的JSON格式。

            **输入格式支持**：
            1. **JSON格式**：标准的JSON对象或数组格式的岗位数据
            2. **普通文本格式**：包含岗位信息的自然语言文本，例如：
               - 招聘信息格式："招聘Java工程师，公司：阿里巴巴，地点：杭州..."
               - 职位描述格式："岗位名称：产品经理\n公司：腾讯\n薪资：25-35K..."
               - 自由文本格式：任何包含岗位信息的文本

            **解析规则**：
            1. **智能识别格式**：自动判断输入是JSON还是普通文本，并进行相应处理
            2. **必须过滤掉所有recruiter相关字段**（recruiterId、name、title、avatarUrl、lastActivity、responseRate）
            3. **从文本中智能提取信息**：
               - 岗位名称(jobName)：识别职位、岗位相关的描述
               - 公司名称(companyName)：识别公司、企业相关的描述
               - 工作地点(city/workAddress)：识别城市、地点、地址信息
               - 薪资(salary*)：识别薪资、工资、待遇相关描述，提取min、max和type（daily/monthly/yearly）
               - 学历要求(education)：识别学历、教育背景要求
               - 经验要求(workExperience)：识别工作经验、年限要求；如果没有，根据岗位类型智能填充："实习"填"无需经验"，"校招"填"应届生"，"社招"填"1-3年"
               - 岗位类型(jobType)：根据上下文判断是"实习"、"校招"还是"社招"
               - 岗位职责(jobDuty)：识别职责、工作内容相关描述
               - 任职要求(jobRequirement)：识别要求、资格、技能相关描述
               - 其他信息：尽可能从文本中提取行业、公司规模、福利等信息
            4. 职责和要求如果是数组或多行，用换行符分隔
            5. 标签字段(jobTags、specialTags)保持JSON数组格式的字符串表示
            6. benefits字段转换为JSON对象格式的字符串表示
            7. 如果是实习岗位，尝试提取workDaysPerWeek和workDurationMonths
            8. 将原始数据完整保存到rawData字段（JSON字符串格式）
            9. publishTime使用当前时间，格式为 (yyyy-MM-dd HH:mm:ss)
            10. **必填字段**：jobName和companyName必须有值，如果无法提取则使用"未知"
            11. **合理推断**：如果某些字段缺失，根据上下文和常识进行合理推断

            **目标JSON结构**：
            {
              "jobName": "岗位名称",
              "companyName": "公司名称",
              "companyLogo": "公司Logo URL",
              "industry": "行业",
              "companySize": "公司规模",
              "companyFunding": "融资阶段",
              "jobType": "岗位类型(实习/校招/社招)",
              "city": "城市名称",
              "workAddress": "详细地址",
              "salaryMin": 最低薪资(数字),
              "salaryMax": 最高薪资(数字),
              "salaryType": "薪资类型(daily/monthly/yearly)",
              "salaryDetails": "薪资详情说明",
              "education": "学历要求",
              "workExperience": "经验要求",
              "workDaysPerWeek": 每周工作天数(数字,可选),
              "workDurationMonths": 工作时长月数(数字,可选),
              "jobDuty": "岗位职责(文本，用换行分隔)",
              "jobRequirement": "任职要求(文本，用换行分隔)",
              "jobTags": "[\\"标签1\\", \\"标签2\\"]",
              "specialTags": "[\\"特殊标签1\\"]",
              "benefits": "{\\"tags\\": [\\"福利1\\", \\"福利2\\"], \\"details\\": \\"福利说明\\"}",
              "applyLink": "申请链接",
              "publishTime": "发布时间(ISO 8601格式)",
              "isUrgent": 是否急招(0或1),
              "rawData": "原始完整数据的JSON字符串"
            }

            **输出要求**：
            - **严格使用上述字段名**：city（不是workCity）、education（不是educationRequirement）、workExperience（不是experienceRequirement）
            - 始终返回JSON数组格式，即使只有一个岗位
            - jobTags、specialTags、benefits、rawData字段需要是JSON格式的**字符串**，而不是对象
            - 请直接返回转换后的JSON数组，不要添加任何解释文字或markdown代码块标记
            - 确保所有JSON字段的双引号正确转义
            - 对于普通文本输入，如果能识别出多个岗位（例如用空行分隔），则返回多个岗位的数组
            - 如果文本信息不足以构建完整岗位，请尽量填充关键字段，其他字段可为null或空字符串

            **示例场景**：
            1. JSON输入：直接转换并过滤不需要的字段
            2. 文本输入："招聘Java工程师，公司阿里，杭州，月薪20-30K，本科以上" → 解析为完整JSON
            3. 简短文本："字节跳动招前端实习生" → 推断补充信息，构建JSON
            """;
    }

    /**
     * 清理AI返回的内容（去除markdown代码块标记等）
     * @param aiResponse AI原始返回内容
     * @return 清理后的JSON字符串
     */
    private String cleanAIResponse(String aiResponse) {
        if (aiResponse == null) {
            return null;
        }

        // 去除markdown代码块标记
        String cleaned = aiResponse.trim();
        if (cleaned.startsWith("```json")) {
            cleaned = cleaned.substring(7);
        } else if (cleaned.startsWith("```")) {
            cleaned = cleaned.substring(3);
        }
        if (cleaned.endsWith("```")) {
            cleaned = cleaned.substring(0, cleaned.length() - 3);
        }

        return cleaned.trim();
    }

    /**
     * 解析AI返回的JSON为Job对象列表
     * @param aiResponse 清理后的JSON字符串
     * @return Job对象列表
     * @throws Exception 解析异常
     */
    private List<Job> parseAIResponseToJobs(String aiResponse) throws Exception {
        try {
            // 尝试解析为数组
            return objectMapper.readValue(aiResponse, new TypeReference<List<Job>>() {});
        } catch (Exception e) {
            logger.warn("尝试作为数组解析失败，尝试作为单个对象解析: {}", e.getMessage());
            // 如果失败，尝试解析为单个对象
            try {
                Job job = objectMapper.readValue(aiResponse, Job.class);
                return Collections.singletonList(job);
            } catch (Exception ex) {
                logger.error("JSON解析失败，原始内容: {}", aiResponse);
                throw new Exception("AI返回的JSON格式不正确: " + ex.getMessage());
            }
        }
    }

    // ==================== 用户端相关方法 ====================

    /**
     * 用户端岗位列表查询（支持筛选和排序）
     * @param queryDTO 查询参数
     * @param userId 用户ID（可选，用于标记收藏状态）
     * @return 分页结果
     */
    public PageResult<Job> listJobsForUser(JobQueryDTO queryDTO, Long userId) {
        // 用户端默认只查询上架的岗位
        Integer status = 1;

        // 转换查询参数
        Date publishTimeStart = queryDTO.getPublishTimeStart() != null ?
                java.sql.Timestamp.valueOf(queryDTO.getPublishTimeStart()) : null;
        Date publishTimeEnd = queryDTO.getPublishTimeEnd() != null ?
                java.sql.Timestamp.valueOf(queryDTO.getPublishTimeEnd()) : null;

        // 查询岗位列表
        List<Job> jobs = jobMapper.selectByPage(
                queryDTO.getOffset(),
                queryDTO.getPageSize(),
                queryDTO.getKeyword(),
                queryDTO.getJobType(),
                queryDTO.getCity(),
                queryDTO.getIndustry(),
                status,
                queryDTO.getSalaryMin(),
                queryDTO.getSalaryMax(),
                null, // workExperience
                null, // education
                publishTimeStart,
                publishTimeEnd
        );

        // 查询总数
        Integer total = jobMapper.countJobs(
                queryDTO.getKeyword(),
                queryDTO.getJobType(),
                queryDTO.getCity(),
                queryDTO.getIndustry(),
                status,
                queryDTO.getSalaryMin(),
                queryDTO.getSalaryMax(),
                null,
                null,
                publishTimeStart,
                publishTimeEnd
        );

        // 如果用户已登录，标记收藏状态
        if (userId != null && !jobs.isEmpty()) {
            for (Job job : jobs) {
                Integer collected = jobMapper.checkUserCollected(userId, job.getId());
                // 可以在Job实体中添加一个transient字段来标记收藏状态
                // 或者在返回时添加到额外的map中
            }
        }

        return new PageResult<>(jobs, total.longValue(), queryDTO.getPage(), queryDTO.getPageSize());
    }

    /**
     * 获取岗位详情（含收藏状态）
     * @param jobId 岗位ID
     * @param userId 用户ID（可选）
     * @return 岗位详情
     */
    @Transactional(rollbackFor = Exception.class)
    public Job getJobDetailForUser(Long jobId, Long userId) {
        Job job = jobMapper.selectById(jobId);

        if (job == null) {
            throw new IllegalArgumentException("岗位不存在或已下架");
        }

        // 增加浏览次数
        jobMapper.incrementViewCount(jobId);

        // 如果用户已登录，检查收藏状态
        if (userId != null) {
            Integer collected = jobMapper.checkUserCollected(userId, jobId);
            // 可以在Job实体中添加collected字段来标记
        }

        return job;
    }

    /**
     * 切换收藏状态
     * @param userId 用户ID
     * @param jobId 岗位ID
     * @return 当前收藏状态（true-已收藏，false-未收藏）
     */
    @Transactional(rollbackFor = Exception.class)
    public boolean toggleCollect(Long userId, Long jobId) {
        if (userId == null || jobId == null) {
            throw new IllegalArgumentException("用户ID和岗位ID不能为空");
        }

        // 检查岗位是否存在
        Job job = jobMapper.selectById(jobId);
        if (job == null) {
            throw new IllegalArgumentException("岗位不存在");
        }

        // 检查是否已收藏
        Integer collected = jobMapper.checkUserCollected(userId, jobId);

        if (collected > 0) {
            // 已收藏，执行取消收藏
            jobMapper.deleteCollection(userId, jobId);
            jobMapper.updateCollectCount(jobId, -1);
            logger.info("用户 {} 取消收藏岗位 {}", userId, jobId);
            return false;
        } else {
            // 未收藏，执行收藏
            jobMapper.insertCollection(userId, jobId);
            jobMapper.updateCollectCount(jobId, 1);
            logger.info("用户 {} 收藏岗位 {}", userId, jobId);
            return true;
        }
    }

    /**
     * 获取用户收藏的岗位列表
     * @param userId 用户ID
     * @param page 页码
     * @param pageSize 每页数量
     * @return 分页结果
     */
    public PageResult<Job> getUserCollections(Long userId, Integer page, Integer pageSize) {
        if (userId == null) {
            throw new IllegalArgumentException("用户ID不能为空");
        }

        int offset = (page - 1) * pageSize;

        List<Job> jobs = jobMapper.selectUserCollections(userId, offset, pageSize);
        Integer total = jobMapper.countUserCollections(userId);

        return new PageResult<>(jobs, total.longValue(), page, pageSize);
    }

    /**
     * 获取相关岗位推荐
     * @param jobId 当前岗位ID
     * @return 相关岗位列表（最多6个）
     */
    public List<Job> getRelatedJobs(Long jobId) {
        if (jobId == null) {
            throw new IllegalArgumentException("岗位ID不能为空");
        }

        // 获取当前岗位信息
        Job currentJob = jobMapper.selectById(jobId);
        if (currentJob == null) {
            return Collections.emptyList();
        }

        // 提取行业和城市（workCity可能是JSON数组，取第一个城市）
        String industry = currentJob.getIndustry();
        String city = extractFirstCity(currentJob.getWorkCity());

        // 查询相关岗位
        List<Job> relatedJobs = jobMapper.selectRelatedJobs(jobId, industry, city, 6);

        return relatedJobs;
    }

    /**
     * 从JSON城市数组中提取第一个城市
     * @param workCity 城市JSON字符串，如 ["北京", "上海"]
     * @return 第一个城市名称
     */
    private String extractFirstCity(String workCity) {
        if (workCity == null || workCity.trim().isEmpty()) {
            return "";
        }

        try {
            // 尝试解析JSON数组
            List<String> cities = objectMapper.readValue(workCity, new TypeReference<List<String>>() {});
            return cities.isEmpty() ? "" : cities.get(0);
        } catch (Exception e) {
            // 如果不是JSON格式，直接返回原字符串
            return workCity;
        }
    }
}
