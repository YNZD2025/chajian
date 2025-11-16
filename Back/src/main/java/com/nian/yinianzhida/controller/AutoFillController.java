package com.nian.yinianzhida.controller;


import com.nian.yinianzhida.context.UserContextHolder;
import com.nian.yinianzhida.service.AutoFillService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * AI自动填表控制器
 * 为Chrome插件提供智能字段分析和简历数据API
 */
@Tag(name = "AI自动填表", description = "为Chrome插件提供字段智能匹配和简历数据服务")
@RestController
@RequestMapping("/api/autofill")
@CrossOrigin(origins = "*")
public class AutoFillController {

    private final AutoFillService autoFillService;

    @Autowired
    public AutoFillController(AutoFillService autoFillService) {
        this.autoFillService = autoFillService;
    }

    /**
     * 【新增】分析页面HTML并提取字段结构
     * 阶段1：接收完整HTML，AI分析字段分组和类型
     */
    @Operation(
            summary = "分析页面HTML结构",
            description = "接收完整HTML，通过AI分析页面结构，提取字段分组和字段列表，返回sessionId用于后续fill-values调用"
    )
    @PostMapping("/analyze-page")
    public ResponseEntity<Map<String, Object>> analyzePage(
            @Parameter(description = "页面分析请求（包含html、url、company、position）", required = true)
            @RequestBody Map<String, Object> request) {
        Map<String, Object> response = new HashMap<>();

        try {
            // 获取请求参数
            String html = (String) request.get("html");
            String url = (String) request.get("url");
            String company = (String) request.get("company");
            String position = (String) request.get("position");

            // 参数验证
            if (html == null || html.isEmpty()) {
                response.put("success", false);
                response.put("message", "HTML不能为空");
                return ResponseEntity.badRequest().body(response);
            }

            long startTime = System.currentTimeMillis();

            // 调用AI分析服务
            Map<String, Object> analysisResult = autoFillService.analyzePageHTML(
                    html, url, company, position
            );

            long analyzeTime = System.currentTimeMillis() - startTime;

            // 返回结果
            response.put("success", true);
            response.put("sessionId", analysisResult.get("sessionId"));
            response.put("sections", analysisResult.get("sections"));
            response.put("analyzeTime", analyzeTime);
            response.put("message", "页面分析完成");

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            e.printStackTrace();
            response.put("success", false);
            response.put("message", "分析失败: " + e.getMessage());
            response.put("error", e.getClass().getSimpleName());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * 【新增】AI生成填充值
     * 阶段2：基于sessionId和简历数据，AI智能生成每个字段的填充值
     */
    @Operation(
            summary = "AI生成填充值",
            description = "基于analyze-page返回的sessionId和详细字段信息，结合简历JSON数据，AI生成每个字段的填充值"
    )
    @PostMapping("/fill-values")
    public ResponseEntity<Map<String, Object>> fillValues(
            @Parameter(description = "填充值生成请求（包含sessionId、fields、resumeData）", required = true)
            @RequestBody Map<String, Object> request) {
        Map<String, Object> response = new HashMap<>();

        try {
            // 获取请求参数
            String sessionId = (String) request.get("sessionId");
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> fields = (List<Map<String, Object>>) request.get("fields");
            @SuppressWarnings("unchecked")
            Map<String, Object> resumeData = (Map<String, Object>) request.get("resumeData");
            String company = (String) request.get("company");
            String position = (String) request.get("position");

            // 参数验证
            if (sessionId == null || sessionId.isEmpty()) {
                response.put("success", false);
                response.put("message", "sessionId不能为空");
                return ResponseEntity.badRequest().body(response);
            }

            if (fields == null || fields.isEmpty()) {
                response.put("success", false);
                response.put("message", "字段列表不能为空");
                return ResponseEntity.badRequest().body(response);
            }

            if (resumeData == null || resumeData.isEmpty()) {
                response.put("success", false);
                response.put("message", "简历数据不能为空");
                return ResponseEntity.badRequest().body(response);
            }

            long startTime = System.currentTimeMillis();

            // 调用AI填充值生成服务
            Map<String, Object> fillResult = autoFillService.fillValuesWithAI(
                    sessionId, fields, resumeData, company, position
            );

            long fillTime = System.currentTimeMillis() - startTime;

            // 返回结果
            response.put("success", true);
            response.put("matches", fillResult.get("matches"));
            response.put("fillTime", fillTime);
            response.put("message", "填充值生成完成");

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            e.printStackTrace();
            response.put("success", false);
            response.put("message", "生成失败: " + e.getMessage());
            response.put("error", e.getClass().getSimpleName());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }



    /**
     * 获取简历数据（格式化为自动填表所需格式）
     */
    @Operation(
            summary = "获取简历填表数据",
            description = "根据简历ID获取格式化后的简历数据，适用于自动填表"
    )
    @GetMapping("/resume/{resumeId}")
    public ResponseEntity<Map<String, Object>> getResumeForAutoFill(
            @Parameter(description = "简历ID", required = true)
            @PathVariable Long resumeId) {
        Map<String, Object> response = new HashMap<>();

        try {
            // 获取当前用户ID
            Long userId = UserContextHolder.getUserId();
            if (userId == null) {
                response.put("success", false);
                response.put("message", "用户未登录");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
            }

            // 获取格式化的简历数据
            Map<String, Object> resumeData = autoFillService.getFormattedResumeData(resumeId, userId);

            if (resumeData == null) {
                response.put("success", false);
                response.put("message", "简历不存在或未解析");
                return ResponseEntity.badRequest().body(response);
            }

            response.put("success", true);
            response.put("data", resumeData);
            response.put("message", "获取成功");

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            e.printStackTrace();
            response.put("success", false);
            response.put("message", "获取失败: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * 获取用户简历列表（简化版，仅用于插件选择简历）
     */
    @Operation(
            summary = "获取简历列表",
            description = "获取当前用户的简历列表（仅返回ID、标题、状态等基本信息）"
    )
    @GetMapping("/resume/list")
    public ResponseEntity<Map<String, Object>> getResumeList() {
        Map<String, Object> response = new HashMap<>();

        try {
            // 获取当前用户ID
            Long userId = UserContextHolder.getUserId();
            if (userId == null) {
                response.put("success", false);
                response.put("message", "用户未登录");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
            }

            // 获取简历列表
            List<Map<String, Object>> resumeList = autoFillService.getUserResumeList(userId);

            response.put("success", true);
            response.put("list", resumeList);
            response.put("total", resumeList.size());
            response.put("message", "获取成功");

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            e.printStackTrace();
            response.put("success", false);
            response.put("message", "获取失败: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * 获取默认简历的数据
     */
    @Operation(
            summary = "获取默认简历数据",
            description = "获取用户设置的默认简历数据，如果没有默认简历则返回最新的简历"
    )
    @GetMapping("/resume/default")
    public ResponseEntity<Map<String, Object>> getDefaultResume() {
        Map<String, Object> response = new HashMap<>();

        try {
            // 获取当前用户ID
            Long userId = UserContextHolder.getUserId();
            if (userId == null) {
                response.put("success", false);
                response.put("message", "用户未登录");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
            }

            // 获取默认简历数据
            Map<String, Object> resumeData = autoFillService.getDefaultResumeData(userId);

            if (resumeData == null) {
                response.put("success", false);
                response.put("message", "暂无简历数据");
                return ResponseEntity.ok(response);
            }

            response.put("success", true);
            response.put("data", resumeData);
            response.put("message", "获取成功");

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            e.printStackTrace();
            response.put("success", false);
            response.put("message", "获取失败: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * 记录填表历史（可选功能）
     */
    @Operation(
            summary = "记录填表历史",
            description = "记录用户的自动填表操作历史"
    )
    @PostMapping("/history")
    public ResponseEntity<Map<String, Object>> recordAutoFillHistory(
            @RequestBody Map<String, Object> historyData) {
        Map<String, Object> response = new HashMap<>();

        try {
            // 获取当前用户ID
            Long userId = UserContextHolder.getUserId();
            if (userId == null) {
                response.put("success", false);
                response.put("message", "用户未登录");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
            }

            // 记录历史（可以扩展为保存到数据库）
            autoFillService.recordAutoFillHistory(userId, historyData);

            response.put("success", true);
            response.put("message", "记录成功");

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            e.printStackTrace();
            response.put("success", false);
            response.put("message", "记录失败: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
}
