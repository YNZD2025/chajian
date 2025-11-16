package com.nian.yinianzhida.controller;

import com.nian.yinianzhida.entity.Job;
import com.nian.yinianzhida.service.JobService;
import com.nian.yinianzhida.util.ResponseUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 管理员岗位管理控制器
 * 负责岗位的增删改查、AI解析、批量操作等功能
 */
@RestController
@RequestMapping("/api/admin")
@CrossOrigin(origins = "*")
public class AdminJobController {

    private static final Logger logger = LoggerFactory.getLogger(AdminJobController.class);

    @Autowired
    private JobService jobService;

    /**
     * 上传岗位文件/文本，AI解析
     * @param request 包含rawText字段的JSON请求
     * @return 解析结果预览
     */
    @PostMapping("/jobs/parse")
    public ResponseEntity<Map<String, Object>> parseJobs(@RequestBody Map<String, String> request) {
        logger.info("收到岗位解析请求");

        try {
            String rawText = request.get("rawText");
            if (rawText == null || rawText.trim().isEmpty()) {
                return ResponseEntity.ok(ResponseUtil.error("上传内容不能为空"));
            }

            // 计算有效字数（排除JSON格式符号）
            int effectiveCharCount = jobService.calculateEffectiveCharCount(rawText);

            // 验证有效字数限制（10000字）
            if (effectiveCharCount > 10000) {
                logger.warn("上传内容有效字数超过限制 - 原始长度: {} 字, 有效字数: {} 字",
                    rawText.length(), effectiveCharCount);
                return ResponseEntity.ok(ResponseUtil.error(
                    "文本有效内容超过10000字限制，当前有效字数为" + effectiveCharCount + "字（已排除JSON格式符号），请精简后重试"));
            }

            logger.info("开始解析岗位数据 - 原始长度: {} 字, 有效字数: {} 字",
                rawText.length(), effectiveCharCount);

            // 使用AI解析
            List<Job> jobs = jobService.parseJobsWithAI(rawText);

            Map<String, Object> data = new HashMap<>();
            data.put("jobs", jobs);
            data.put("count", jobs.size());

            logger.info("岗位解析成功，共解析出 {} 个岗位", jobs.size());
            return ResponseEntity.ok(ResponseUtil.success("解析成功", data));
        } catch (Exception e) {
            logger.error("解析岗位失败", e);
            return ResponseEntity.ok(ResponseUtil.error("解析失败: " + e.getMessage()));
        }
    }

    /**
     * 批量保存岗位
     * @param request 包含jobs数组的JSON请求
     * @return 保存结果
     */
    @PostMapping("/jobs/batch-save")
    public ResponseEntity<Map<String, Object>> batchSaveJobs(@RequestBody Map<String, Object> request) {
        logger.info("收到岗位批量保存请求");

        try {
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> jobMaps = (List<Map<String, Object>>) request.get("jobs");

            if (jobMaps == null || jobMaps.isEmpty()) {
                return ResponseEntity.ok(ResponseUtil.error("岗位列表不能为空"));
            }

            // 将Map列表转换为Job对象列表
            com.fasterxml.jackson.databind.ObjectMapper objectMapper = new com.fasterxml.jackson.databind.ObjectMapper();
            List<Job> jobs = new java.util.ArrayList<>();
            for (Map<String, Object> jobMap : jobMaps) {
                Job job = objectMapper.convertValue(jobMap, Job.class);
                jobs.add(job);
            }

            int count = jobService.batchSaveJobs(jobs);

            Map<String, Object> data = new HashMap<>();
            data.put("savedCount", count);

            logger.info("岗位批量保存成功，共保存 {} 个岗位", count);
            return ResponseEntity.ok(ResponseUtil.success("保存成功", data));
        } catch (Exception e) {
            logger.error("保存岗位失败", e);
            return ResponseEntity.ok(ResponseUtil.error("保存失败: " + e.getMessage()));
        }
    }

    /**
     * 管理端获取岗位列表（支持筛选，包含所有状态）
     * @param page 页码
     * @param pageSize 每页数量
     * @param jobName 岗位名称（可选）
     * @param jobType 岗位类型（可选）
     * @param city 城市（可选）
     * @param industry 行业（可选）
     * @param status 状态（可选，管理端可查看所有状态）
     * @param salaryMin 薪资最小值（可选）
     * @param salaryMax 薪资最大值（可选）
     * @param workExperience 工作经验（可选）
     * @param education 学历要求（可选）
     * @param publishTimeStart 发布时间开始（可选）
     * @param publishTimeEnd 发布时间结束（可选）
     * @return 岗位列表
     */
    @GetMapping("/jobs/list")
    public ResponseEntity<Map<String, Object>> getAdminJobList(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer pageSize,
            @RequestParam(required = false) String jobName,
            @RequestParam(required = false) String jobType,
            @RequestParam(required = false) String city,
            @RequestParam(required = false) String industry,
            @RequestParam(required = false) Integer status,
            @RequestParam(required = false) Integer salaryMin,
            @RequestParam(required = false) Integer salaryMax,
            @RequestParam(required = false) String workExperience,
            @RequestParam(required = false) String education,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(pattern = "yyyy-MM-dd") java.util.Date publishTimeStart,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(pattern = "yyyy-MM-dd") java.util.Date publishTimeEnd
    ) {
        logger.info("管理员查询岗位列表 - page: {}, pageSize: {}, jobName: {}, jobType: {}, city: {}, industry: {}, status: {}, salaryMin: {}, salaryMax: {}, workExperience: {}, education: {}, publishTimeStart: {}, publishTimeEnd: {}",
                page, pageSize, jobName, jobType, city, industry, status, salaryMin, salaryMax, workExperience, education, publishTimeStart, publishTimeEnd);

        try {
            Map<String, Object> result = jobService.getJobList(page, pageSize, jobName, jobType, city, industry,
                    status, salaryMin, salaryMax, workExperience, education, publishTimeStart, publishTimeEnd);
            return ResponseEntity.ok(ResponseUtil.success("获取成功", result));
        } catch (Exception e) {
            logger.error("获取岗位列表失败", e);
            return ResponseEntity.ok(ResponseUtil.error("获取失败: " + e.getMessage()));
        }
    }

    /**
     * 更新岗位状态
     * @param id 岗位ID
     * @param request 包含status字段
     * @return 更新结果
     */
    @PutMapping("/jobs/{id}/status")
    public ResponseEntity<Map<String, Object>> updateJobStatus(
            @PathVariable Long id,
            @RequestBody Map<String, Integer> request
    ) {
        logger.info("管理员更新岗位状态 - id: {}, status: {}", id, request.get("status"));

        try {
            Integer status = request.get("status");
            if (status == null) {
                return ResponseEntity.ok(ResponseUtil.error("状态参数不能为空"));
            }

            boolean success = jobService.updateStatus(id, status);
            if (success) {
                return ResponseEntity.ok(ResponseUtil.success("更新成功"));
            } else {
                return ResponseEntity.ok(ResponseUtil.error("更新失败，岗位不存在"));
            }
        } catch (Exception e) {
            logger.error("更新岗位状态失败", e);
            return ResponseEntity.ok(ResponseUtil.error("更新失败: " + e.getMessage()));
        }
    }

    /**
     * 删除岗位
     * @param id 岗位ID
     * @return 删除结果
     */
    @DeleteMapping("/jobs/{id}")
    public ResponseEntity<Map<String, Object>> deleteJob(@PathVariable Long id) {
        logger.info("管理员删除岗位 - id: {}", id);

        try {
            boolean success = jobService.deleteJob(id);
            if (success) {
                return ResponseEntity.ok(ResponseUtil.success("删除成功"));
            } else {
                return ResponseEntity.ok(ResponseUtil.error("删除失败，岗位不存在"));
            }
        } catch (Exception e) {
            logger.error("删除岗位失败", e);
            return ResponseEntity.ok(ResponseUtil.error("删除失败: " + e.getMessage()));
        }
    }

    /**
     * 获取单个岗位详情
     * @param id 岗位ID
     * @return 岗位详情
     */
    @GetMapping("/jobs/{id}")
    public ResponseEntity<Map<String, Object>> getJobDetail(@PathVariable Long id) {
        logger.info("管理员获取岗位详情 - id: {}", id);

        try {
            Job job = jobService.getJobById(id);
            if (job == null) {
                return ResponseEntity.ok(ResponseUtil.error("岗位不存在"));
            }
            return ResponseEntity.ok(ResponseUtil.success("获取成功", job));
        } catch (Exception e) {
            logger.error("获取岗位详情失败", e);
            return ResponseEntity.ok(ResponseUtil.error("获取失败: " + e.getMessage()));
        }
    }

    /**
     * 更新岗位信息
     * @param id 岗位ID
     * @param job 岗位信息
     * @return 更新结果
     */
    @PutMapping("/jobs/{id}")
    public ResponseEntity<Map<String, Object>> updateJob(
            @PathVariable Long id,
            @RequestBody Job job
    ) {
        logger.info("管理员更新岗位 - id: {}", id);

        try {
            // 设置ID
            job.setId(id);

            boolean success = jobService.updateJob(job);
            if (success) {
                return ResponseEntity.ok(ResponseUtil.success("更新成功"));
            } else {
                return ResponseEntity.ok(ResponseUtil.error("更新失败，岗位不存在"));
            }
        } catch (Exception e) {
            logger.error("更新岗位失败", e);
            return ResponseEntity.ok(ResponseUtil.error("更新失败: " + e.getMessage()));
        }
    }
}
