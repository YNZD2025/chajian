package com.nian.yinianzhida.controller;

import com.nian.yinianzhida.entity.Resume;
import com.nian.yinianzhida.mapper.ResumeMapper;
import com.nian.yinianzhida.util.ResponseUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 管理员简历管理控制器
 * 负责简历的查询、删除等管理功能
 */
@RestController
@RequestMapping("/api/admin")
@CrossOrigin(origins = "*")
public class AdminResumeController {

    private static final Logger logger = LoggerFactory.getLogger(AdminResumeController.class);

    @Autowired
    private ResumeMapper resumeMapper;

    /**
     * 管理端获取简历列表（支持筛选）
     * @param page 页码
     * @param pageSize 每页数量
     * @param userId 用户ID（可选）
     * @param fileName 文件名（可选）
     * @param parseStatus 解析状态（可选：0-待解析 1-解析中 2-解析成功 3-解析失败）
     * @param startDate 开始日期（可选）
     * @param endDate 结束日期（可选）
     * @return 简历列表
     */
    @GetMapping("/resumes/list")
    public ResponseEntity<Map<String, Object>> getAdminResumeList(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer pageSize,
            @RequestParam(required = false) Long userId,
            @RequestParam(required = false) String fileName,
            @RequestParam(required = false) Integer parseStatus,
            @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM-dd") Date startDate,
            @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM-dd") Date endDate
    ) {
        logger.info("管理员查询简历列表 - page: {}, pageSize: {}, userId: {}, fileName: {}, parseStatus: {}, startDate: {}, endDate: {}",
                page, pageSize, userId, fileName, parseStatus, startDate, endDate);

        try {
            // 计算偏移量
            int offset = (page - 1) * pageSize;

            // 查询简历列表
            List<Resume> resumes = resumeMapper.selectAdminList(offset, pageSize, userId, fileName, parseStatus, startDate, endDate);

            // 查询总数
            int total = resumeMapper.countAdminList(userId, fileName, parseStatus, startDate, endDate);

            // 构建返回数据
            Map<String, Object> data = new HashMap<>();
            data.put("list", resumes);
            data.put("total", total);
            data.put("page", page);
            data.put("pageSize", pageSize);

            logger.info("查询简历列表成功，共 {} 条记录", total);
            return ResponseEntity.ok(ResponseUtil.success("获取成功", data));
        } catch (Exception e) {
            logger.error("获取简历列表失败", e);
            return ResponseEntity.ok(ResponseUtil.error("获取失败: " + e.getMessage()));
        }
    }

    /**
     * 获取单个简历详情
     * @param id 简历ID
     * @return 简历详情（不包含file_data）
     */
    @GetMapping("/resumes/{id}")
    public ResponseEntity<Map<String, Object>> getResumeDetail(@PathVariable Long id) {
        logger.info("管理员获取简历详情 - id: {}", id);

        try {
            Resume resume = resumeMapper.selectById(id);
            if (resume == null) {
                return ResponseEntity.ok(ResponseUtil.error("简历不存在"));
            }

            // 清空file_data，避免传输大量数据
            resume.setFileData(null);

            return ResponseEntity.ok(ResponseUtil.success("获取成功", resume));
        } catch (Exception e) {
            logger.error("获取简历详情失败", e);
            return ResponseEntity.ok(ResponseUtil.error("获取失败: " + e.getMessage()));
        }
    }

    /**
     * 删除简历
     * @param id 简历ID
     * @return 删除结果
     */
    @DeleteMapping("/resumes/{id}")
    public ResponseEntity<Map<String, Object>> deleteResume(@PathVariable Long id) {
        logger.info("管理员删除简历 - id: {}", id);

        try {
            int count = resumeMapper.deleteById(id);
            if (count > 0) {
                return ResponseEntity.ok(ResponseUtil.success("删除成功"));
            } else {
                return ResponseEntity.ok(ResponseUtil.error("删除失败，简历不存在"));
            }
        } catch (Exception e) {
            logger.error("删除简历失败", e);
            return ResponseEntity.ok(ResponseUtil.error("删除失败: " + e.getMessage()));
        }
    }
}
