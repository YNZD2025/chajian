package com.nian.yinianzhida.controller;

import com.nian.yinianzhida.annotation.SkipAuth;
import com.nian.yinianzhida.context.UserContextHolder;
import com.nian.yinianzhida.entity.Resume;
import com.nian.yinianzhida.service.ResumeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.*;

/**
 * 简历解析V2版本：先快速显示原文，再返回JSON解析
 * 数据存储在MySQL数据库中，从UserContextHolder获取用户信息
 */
@Tag(name = "简历解析V2", description = "两阶段简历解析API - 快速提取文本后再进行AI结构化解析")
@RestController
@RequestMapping("/resume/v2")
@CrossOrigin(origins = "*")
public class ResumeV2Controller {

    private final ResumeService resumeService;

    // 允许的文件类型
    private static final List<String> ALLOWED_CONTENT_TYPES = Arrays.asList(
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );

    // 最大文件大小：10MB
    private static final long MAX_FILE_SIZE = 10 * 1024 * 1024;

    @Autowired
    public ResumeV2Controller(ResumeService resumeService) {
        this.resumeService = resumeService;
    }

    /**
     * 上传简历文件并提取文本
     */
    @Operation(
            summary = "上传简历文件并提取文本",
            description = "上传简历文件（PDF/Word），保存到数据库并提取原始文本内容。返回resumeId用于后续操作。"
    )
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "上传成功"),
            @ApiResponse(responseCode = "400", description = "文件验证失败"),
            @ApiResponse(responseCode = "401", description = "未登录"),
            @ApiResponse(responseCode = "500", description = "服务器错误")
    })
    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE, produces = "application/json;charset=UTF-8")
    public ResponseEntity<Map<String, Object>> uploadResume(
            @Parameter(description = "简历文件（支持PDF、DOC、DOCX，最大10MB）", required = true)
            @RequestParam("file") MultipartFile file) {
        Map<String, Object> response = new HashMap<>();

        try {
            // 获取当前登录用户ID（JWT拦截器已验证，这里不会为null）
            Long userId = UserContextHolder.getUserId();
            if (userId == null) {
                response.put("success", false);
                response.put("message", "用户未登录");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
            }

            // 验证文件
            String validationError = validateFile(file);
            if (validationError != null) {
                response.put("success", false);
                response.put("message", validationError);
                return ResponseEntity.badRequest().body(response);
            }

            long startTime = System.currentTimeMillis();

            // 1. 保存文件到数据库
            Long resumeId = resumeService.saveResumeFile(userId, file);

            // 2. 提取文本并保存
            resumeService.extractAndSaveText(resumeId);

            // 3. 获取简历详情
            Resume resume = resumeService.getResumeDetail(resumeId);

            long totalTime = System.currentTimeMillis() - startTime;

            // 返回结果
            response.put("success", true);
            response.put("resumeId", resumeId);
            response.put("fileName", resume.getFileName());
            response.put("extractedText", resume.getExtractedText());
            response.put("textLength", resume.getExtractedText().length());
            response.put("uploadTime", totalTime);
            response.put("message", "文件上传成功，文本提取完成");

            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(response);

        } catch (Exception e) {
            e.printStackTrace();
            response.put("success", false);
            response.put("message", "上传失败: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(response);
        }
    }

    /**
     * AI解析成JSON格式
     */
    @Operation(
            summary = "AI解析成JSON结构",
            description = "通过AI将简历文本解析为结构化JSON数据，约15秒返回。"
    )
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "解析成功"),
            @ApiResponse(responseCode = "400", description = "简历不存在"),
            @ApiResponse(responseCode = "500", description = "服务器错误")
    })
    @PostMapping("/parse/{resumeId}")
    public ResponseEntity<Map<String, Object>> parseResume(
            @Parameter(description = "简历ID", required = true)
            @PathVariable Long resumeId) {
        Map<String, Object> response = new HashMap<>();

        try {
            long startTime = System.currentTimeMillis();

            // AI解析并保存到数据库
            resumeService.parseAndSaveJson(resumeId);

            // 获取解析结果
            Resume resume = resumeService.getResumeDetail(resumeId);

            long parseTime = System.currentTimeMillis() - startTime;

            // 返回JSON结果
            response.put("success", true);
            response.put("resumeId", resumeId);
            response.put("parsedData", resume.getParsedData());
            response.put("parseTime", parseTime);
            response.put("message", "AI解析完成");

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            e.printStackTrace();
            response.put("success", false);
            response.put("message", "AI解析失败: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * 获取简历详情
     */
    @Operation(summary = "获取简历详情", description = "根据简历ID获取完整的简历数据")
    @GetMapping("/{resumeId}")
    public ResponseEntity<Map<String, Object>> getResumeDetail(
            @Parameter(description = "简历ID", required = true)
            @PathVariable Long resumeId) {
        Map<String, Object> response = new HashMap<>();

        try {
            Resume resume = resumeService.getResumeDetail(resumeId);

            if (resume == null) {
                response.put("success", false);
                response.put("message", "简历不存在");
                return ResponseEntity.badRequest().body(response);
            }

            response.put("success", true);
            response.put("resume", buildResumeResponse(resume));

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            e.printStackTrace();
            response.put("success", false);
            response.put("message", "获取简历失败: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * 获取用户的简历列表
     */
    @Operation(summary = "获取用户简历列表", description = "获取当前用户的所有简历")
    @GetMapping("/list")
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

            List<Resume> resumeList = resumeService.getUserResumeList(userId);

            // 构建响应数据（不包含file_data）
            List<Map<String, Object>> resumeResponseList = new ArrayList<>();
            for (Resume resume : resumeList) {
                resumeResponseList.add(buildResumeListItem(resume));
            }

            response.put("success", true);
            response.put("list", resumeResponseList);
            response.put("total", resumeList.size());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            e.printStackTrace();
            response.put("success", false);
            response.put("message", "获取列表失败: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * 获取用户最新的简历ID
     */
    @Operation(summary = "获取最新简历ID", description = "获取当前用户最新上传的简历ID")
    @GetMapping("/latest-id")
    public ResponseEntity<Map<String, Object>> getLatestResumeId() {
        Map<String, Object> response = new HashMap<>();

        try {
            // 获取当前用户ID
            Long userId = UserContextHolder.getUserId();
            if (userId == null) {
                response.put("success", false);
                response.put("message", "用户未登录");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
            }

            List<Resume> resumeList = resumeService.getUserResumeList(userId);

            if (resumeList == null || resumeList.isEmpty()) {
                response.put("success", false);
                response.put("message", "暂无简历数据");
                return ResponseEntity.ok(response);
            }

            // 列表已按创建时间降序排列，第一个就是最新的
            Long latestResumeId = resumeList.get(0).getId();

            response.put("success", true);
            response.put("resumeId", latestResumeId);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            e.printStackTrace();
            response.put("success", false);
            response.put("message", "获取失败: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * 更新简历的JSON数据（用户编辑后保存）
     */
    @Operation(summary = "更新简历数据", description = "更新用户编辑后的简历JSON数据")
    @PutMapping("/{resumeId}")
    public ResponseEntity<Map<String, Object>> updateResume(
            @PathVariable Long resumeId,
            @RequestBody Map<String, Object> requestBody) {
        Map<String, Object> response = new HashMap<>();

        try {
            String parsedData = (String) requestBody.get("parsedData");

            if (parsedData == null || parsedData.trim().isEmpty()) {
                response.put("success", false);
                response.put("message", "解析数据不能为空");
                return ResponseEntity.badRequest().body(response);
            }

            resumeService.updateParsedData(resumeId, parsedData);

            response.put("success", true);
            response.put("message", "更新成功");

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            e.printStackTrace();
            response.put("success", false);
            response.put("message", "更新失败: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * 删除简历
     */
    @Operation(summary = "删除简历", description = "删除指定的简历")
    @DeleteMapping("/{resumeId}")
    public ResponseEntity<Map<String, Object>> deleteResume(
            @PathVariable Long resumeId) {
        Map<String, Object> response = new HashMap<>();

        try {
            resumeService.deleteResume(resumeId);

            response.put("success", true);
            response.put("message", "删除成功");

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            e.printStackTrace();
            response.put("success", false);
            response.put("message", "删除失败: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * 设置默认简历
     */
    @Operation(summary = "设置默认简历", description = "将指定简历设置为默认简历")
    @PutMapping("/{resumeId}/set-default")
    public ResponseEntity<Map<String, Object>> setDefaultResume(
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

            resumeService.setDefaultResume(userId, resumeId);

            response.put("success", true);
            response.put("message", "设置成功");

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            e.printStackTrace();
            response.put("success", false);
            response.put("message", "设置失败: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * 重新触发AI解析（强制重新解析）
     */
    @Operation(summary = "重新解析简历", description = "强制重新进行AI解析")
    @PostMapping("/re-parse/{resumeId}")
    public ResponseEntity<Map<String, Object>> reParseResume(
            @PathVariable Long resumeId) {
        Map<String, Object> response = new HashMap<>();

        try {
            // 重置解析状态
            Resume resume = resumeService.getResumeDetail(resumeId);
            if (resume == null) {
                response.put("success", false);
                response.put("message", "简历不存在");
                return ResponseEntity.badRequest().body(response);
            }

            // 清空旧的解析数据，重置状态为待解析
            resumeService.updateParsedData(resumeId, null);

            // 触发AI解析
            resumeService.parseAndSaveJson(resumeId);

            // 获取最新数据
            Resume updatedResume = resumeService.getResumeDetail(resumeId);

            response.put("success", true);
            response.put("resumeId", resumeId);
            response.put("parsedData", updatedResume.getParsedData());
            response.put("message", "重新解析完成");

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            e.printStackTrace();
            response.put("success", false);
            response.put("message", "重新解析失败: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    // ==================== 辅助方法 ====================

    /**
     * 验证文件
     */
    private String validateFile(MultipartFile file) {
        if (file.isEmpty()) {
            return "请选择要上传的文件";
        }

        if (file.getSize() > MAX_FILE_SIZE) {
            return "文件大小不能超过10MB";
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType)) {
            return "只支持PDF和Word格式（.pdf, .doc, .docx）";
        }

        return null;
    }

    /**
     * 构建简历详情响应（包含所有字段）
     */
    private Map<String, Object> buildResumeResponse(Resume resume) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", resume.getId());
        map.put("userId", resume.getUserId());
        map.put("title", resume.getTitle());
        map.put("fileName", resume.getFileName());
        map.put("fileType", resume.getFileType());
        map.put("fileSize", resume.getFileSize());
        map.put("extractedText", resume.getExtractedText());
        map.put("parseStatus", resume.getParseStatus());
        map.put("parsedData", resume.getParsedData());
        map.put("isDefault", resume.getIsDefault());
        map.put("createdAt", resume.getCreatedAt());
        map.put("updatedAt", resume.getUpdatedAt());

        // 将file_data转换为base64（用于PDF预览）
        if (resume.getFileData() != null && resume.getFileData().length > 0) {
            String base64Data = java.util.Base64.getEncoder().encodeToString(resume.getFileData());
            String mimeType = getContentType(resume.getFileType());
            map.put("fileBase64", "data:" + mimeType + ";base64," + base64Data);
        }

        return map;
    }

    /**
     * 根据文件类型获取ContentType
     */
    private String getContentType(String fileType) {
        if (fileType == null) {
            return "application/octet-stream";
        }
        switch (fileType.toLowerCase()) {
            case "pdf":
                return "application/pdf";
            case "docx":
                return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
            case "doc":
                return "application/msword";
            default:
                return "application/octet-stream";
        }
    }

    /**
     * 构建简历列表项（不包含file_data和大字段）
     */
    private Map<String, Object> buildResumeListItem(Resume resume) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", resume.getId());
        map.put("title", resume.getTitle());
        map.put("fileName", resume.getFileName());
        map.put("fileType", resume.getFileType());
        map.put("fileSize", resume.getFileSize());
        map.put("parseStatus", resume.getParseStatus());
        map.put("isDefault", resume.getIsDefault());
        map.put("createdAt", resume.getCreatedAt());
        map.put("updatedAt", resume.getUpdatedAt());
        return map;
    }
}
