package com.nian.yinianzhida.controller;

import com.nian.yinianzhida.annotation.SkipAuth;
import com.nian.yinianzhida.dto.JobQueryDTO;
import com.nian.yinianzhida.dto.PageResult;
import com.nian.yinianzhida.entity.Job;
import com.nian.yinianzhida.service.JobService;
import com.nian.yinianzhida.util.ResponseUtil;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 岗位控制器（用户端API）
 */
@RestController
@RequestMapping("/api/jobs")
@CrossOrigin(origins = "*")
public class JobController {

    private static final Logger logger = LoggerFactory.getLogger(JobController.class);

    @Autowired
    private JobService jobService;

    /**
     * 获取岗位列表（支持筛选和排序）
     * 不需要登录，但如果登录了会标记收藏状态
     */
    @SkipAuth
    @GetMapping("/list")
    public Map<String, Object> getJobList(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer pageSize,
            @RequestParam(required = false) String jobType,
            @RequestParam(required = false) String city,
            @RequestParam(required = false) String industry,
            @RequestParam(required = false) Integer salaryMin,
            @RequestParam(required = false) Integer salaryMax,
            @RequestParam(required = false) String publishTimeStart,
            @RequestParam(required = false) String publishTimeEnd,
            @RequestParam(defaultValue = "latest") String sortBy,
            @RequestParam(required = false) String keyword,
            HttpServletRequest request
    ) {
        logger.info("用户查询岗位列表 - page: {}, pageSize: {}, jobType: {}, city: {}, industry: {}, sortBy: {}",
                page, pageSize, jobType, city, industry, sortBy);

        try {
            // 构建查询参数
            JobQueryDTO queryDTO = new JobQueryDTO();
            queryDTO.setPage(page);
            queryDTO.setPageSize(pageSize);
            queryDTO.setJobType(jobType);
            queryDTO.setCity(city);
            queryDTO.setIndustry(industry);
            queryDTO.setSalaryMin(salaryMin);
            queryDTO.setSalaryMax(salaryMax);
            queryDTO.setSortBy(sortBy);
            queryDTO.setKeyword(keyword);

            // 获取用户ID（如果已登录）
            Long userId = (Long) request.getAttribute("userId");

            // 查询岗位列表
            PageResult<Job> result = jobService.listJobsForUser(queryDTO, userId);

            return ResponseUtil.success("获取成功", result);
        } catch (Exception e) {
            logger.error("获取岗位列表失败", e);
            return ResponseUtil.error("获取失败: " + e.getMessage());
        }
    }

    /**
     * 获取岗位详情
     * 不需要登录，但如果登录了会标记收藏状态
     */
    @SkipAuth
    @GetMapping("/{id}")
    public Map<String, Object> getJobDetail(
            @PathVariable Long id,
            HttpServletRequest request
    ) {
        logger.info("用户查询岗位详情 - id: {}", id);

        try {
            // 获取用户ID（如果已登录）
            Long userId = (Long) request.getAttribute("userId");

            // 获取岗位详情（会自动增加浏览次数）
            Job job = jobService.getJobDetailForUser(id, userId);

            // 检查用户收藏状态
            Map<String, Object> data = new HashMap<>();
            data.put("job", job);

            if (userId != null) {
                // 已登录，查询收藏状态
                boolean collected = jobService.toggleCollect(userId, id);
                // 先查询再恢复状态
                if (collected) {
                    jobService.toggleCollect(userId, id); // 恢复
                }
                data.put("collected", !collected);
            } else {
                data.put("collected", false);
            }

            return ResponseUtil.success("获取成功", data);
        } catch (IllegalArgumentException e) {
            logger.warn("获取岗位详情失败: {}", e.getMessage());
            return ResponseUtil.error(e.getMessage());
        } catch (Exception e) {
            logger.error("获取岗位详情失败", e);
            return ResponseUtil.error("获取失败: " + e.getMessage());
        }
    }

    /**
     * 收藏/取消收藏岗位
     * 需要登录
     */
    @PostMapping("/{id}/collect")
    public Map<String, Object> toggleCollect(
            @PathVariable Long id,
            HttpServletRequest request
    ) {
        logger.info("用户切换岗位收藏状态 - jobId: {}", id);

        try {
            // 获取用户ID
            Long userId = (Long) request.getAttribute("userId");
            if (userId == null) {
                return ResponseUtil.error("请先登录");
            }

            // 切换收藏状态
            boolean collected = jobService.toggleCollect(userId, id);

            Map<String, Object> data = new HashMap<>();
            data.put("collected", collected);
            data.put("message", collected ? "收藏成功" : "取消收藏成功");

            return ResponseUtil.success(collected ? "收藏成功" : "取消收藏成功", data);
        } catch (IllegalArgumentException e) {
            logger.warn("切换收藏状态失败: {}", e.getMessage());
            return ResponseUtil.error(e.getMessage());
        } catch (Exception e) {
            logger.error("切换收藏状态失败", e);
            return ResponseUtil.error("操作失败: " + e.getMessage());
        }
    }

    /**
     * 获取用户收藏的岗位列表
     * 需要登录
     */
    @GetMapping("/collections")
    public Map<String, Object> getUserCollections(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer pageSize,
            HttpServletRequest request
    ) {
        logger.info("用户查询收藏列表 - page: {}, pageSize: {}", page, pageSize);

        try {
            // 获取用户ID
            Long userId = (Long) request.getAttribute("userId");
            if (userId == null) {
                return ResponseUtil.error("请先登录");
            }

            // 查询收藏列表
            PageResult<Job> result = jobService.getUserCollections(userId, page, pageSize);

            return ResponseUtil.success("获取成功", result);
        } catch (Exception e) {
            logger.error("获取收藏列表失败", e);
            return ResponseUtil.error("获取失败: " + e.getMessage());
        }
    }

    /**
     * 获取相关岗位推荐
     * 不需要登录
     */
    @SkipAuth
    @GetMapping("/{id}/related")
    public Map<String, Object> getRelatedJobs(@PathVariable Long id) {
        logger.info("查询相关岗位 - jobId: {}", id);

        try {
            List<Job> relatedJobs = jobService.getRelatedJobs(id);
            return ResponseUtil.success("获取成功", relatedJobs);
        } catch (Exception e) {
            logger.error("获取相关岗位失败", e);
            return ResponseUtil.error("获取失败: " + e.getMessage());
        }
    }
}
