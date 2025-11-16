package com.nian.yinianzhida.controller;

import com.nian.yinianzhida.dto.PageResult;
import com.nian.yinianzhida.dto.StrategyDTO;
import com.nian.yinianzhida.dto.StrategyParseDTO;
import com.nian.yinianzhida.dto.StrategyQueryDTO;
import com.nian.yinianzhida.entity.Strategy;
import com.nian.yinianzhida.service.StrategyService;
import com.nian.yinianzhida.util.ResponseUtil;
import com.nian.yinianzhida.vo.StrategyImageVO;
import com.nian.yinianzhida.vo.StrategyParseResultVO;
import com.nian.yinianzhida.vo.StrategyVO;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

/**
 * 攻略文章管理控制器（管理端API）
 */
@RestController
@RequestMapping("/admin/strategy")
@CrossOrigin(origins = "*")
public class AdminStrategyController {

    private static final Logger logger = LoggerFactory.getLogger(AdminStrategyController.class);

    @Autowired
    private StrategyService strategyService;

    /**
     * 获取文章列表（管理端，支持所有状态）
     */
    @GetMapping("/list")
    public Map<String, Object> getStrategyList(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer pageSize,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) Integer status,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "latest") String sortBy
    ) {
        logger.info("管理员查询攻略列表 - page: {}, pageSize: {}, category: {}, status: {}, keyword: {}",
                page, pageSize, category, status, keyword);

        try {
            // 构建查询参数
            StrategyQueryDTO queryDTO = new StrategyQueryDTO();
            queryDTO.setPage(page);
            queryDTO.setPageSize(pageSize);
            queryDTO.setCategory(category);
            queryDTO.setStatus(status);
            queryDTO.setKeyword(keyword);
            queryDTO.setSortBy(sortBy);

            // 查询文章列表（管理端可以查询所有状态的文章）
            PageResult<StrategyVO> result = strategyService.getAdminList(queryDTO);

            return ResponseUtil.success("获取成功", result);
        } catch (Exception e) {
            logger.error("获取攻略列表失败", e);
            return ResponseUtil.error("获取失败: " + e.getMessage());
        }
    }

    /**
     * 获取文章详情（用于编辑）
     */
    @GetMapping("/{id}")
    public Map<String, Object> getStrategyDetail(@PathVariable Long id) {
        logger.info("管理员查看攻略详情 - id: {}", id);

        try {
            Strategy strategy = strategyService.getStrategyById(id);

            return ResponseUtil.success("获取成功", strategy);
        } catch (Exception e) {
            logger.error("获取攻略详情失败", e);
            return ResponseUtil.error("获取失败: " + e.getMessage());
        }
    }

    /**
     * 创建文章
     */
    @PostMapping
    public Map<String, Object> createStrategy(@RequestBody @Valid StrategyDTO dto) {
        logger.info("管理员创建攻略 - title: {}, category: {}, status: {}",
                dto.getTitle(), dto.getCategory(), dto.getStatus());

        try {
            Long id = strategyService.createStrategy(dto);

            return ResponseUtil.success("创建成功", id);
        } catch (Exception e) {
            logger.error("创建攻略失败", e);
            return ResponseUtil.error("创建失败: " + e.getMessage());
        }
    }

    /**
     * 更新文章
     */
    @PutMapping("/{id}")
    public Map<String, Object> updateStrategy(
            @PathVariable Long id,
            @RequestBody @Valid StrategyDTO dto
    ) {
        logger.info("管理员更新攻略 - id: {}, title: {}", id, dto.getTitle());

        try {
            strategyService.updateStrategy(id, dto);

            return ResponseUtil.success("更新成功");
        } catch (Exception e) {
            logger.error("更新攻略失败", e);
            return ResponseUtil.error("更新失败: " + e.getMessage());
        }
    }

    /**
     * 删除文章
     */
    @DeleteMapping("/{id}")
    public Map<String, Object> deleteStrategy(@PathVariable Long id) {
        logger.info("管理员删除攻略 - id: {}", id);

        try {
            strategyService.deleteStrategy(id);

            return ResponseUtil.success("删除成功");
        } catch (Exception e) {
            logger.error("删除攻略失败", e);
            return ResponseUtil.error("删除失败: " + e.getMessage());
        }
    }

    /**
     * 批量删除文章
     */
    @DeleteMapping("/batch")
    public Map<String, Object> deleteBatch(@RequestBody List<Long> ids) {
        logger.info("管理员批量删除攻略 - ids: {}", ids);

        try {
            if (ids == null || ids.isEmpty()) {
                return ResponseUtil.error("请选择要删除的文章");
            }

            strategyService.deleteBatch(ids);

            return ResponseUtil.success("批量删除成功");
        } catch (Exception e) {
            logger.error("批量删除攻略失败", e);
            return ResponseUtil.error("批量删除失败: " + e.getMessage());
        }
    }

    /**
     * 发布文章（草稿->已发布）
     */
    @PutMapping("/{id}/publish")
    public Map<String, Object> publishStrategy(@PathVariable Long id) {
        logger.info("管理员发布攻略 - id: {}", id);

        try {
            strategyService.publishStrategy(id);

            return ResponseUtil.success("发布成功");
        } catch (Exception e) {
            logger.error("发布攻略失败", e);
            return ResponseUtil.error("发布失败: " + e.getMessage());
        }
    }

    /**
     * 下架文章（已发布->已下架）
     */
    @PutMapping("/{id}/offline")
    public Map<String, Object> offlineStrategy(@PathVariable Long id) {
        logger.info("管理员下架攻略 - id: {}", id);

        try {
            strategyService.offlineStrategy(id);

            return ResponseUtil.success("下架成功");
        } catch (Exception e) {
            logger.error("下架攻略失败", e);
            return ResponseUtil.error("下架失败: " + e.getMessage());
        }
    }

    /**
     * 获取分类统计
     */
    @GetMapping("/categories")
    public Map<String, Object> getCategoryStats() {
        logger.info("管理员获取分类统计");

        try {
            List<Map<String, Object>> stats = strategyService.getCategoryStats();

            return ResponseUtil.success("获取成功", stats);
        } catch (Exception e) {
            logger.error("获取分类统计失败", e);
            return ResponseUtil.error("获取失败: " + e.getMessage());
        }
    }

    /**
     * 获取统计数据
     */
    @GetMapping("/statistics")
    public Map<String, Object> getStatistics() {
        logger.info("管理员获取统计数据");

        try {
            Map<String, Object> stats = strategyService.getStatistics();

            return ResponseUtil.success("获取成功", stats);
        } catch (Exception e) {
            logger.error("获取统计数据失败", e);
            return ResponseUtil.error("获取失败: " + e.getMessage());
        }
    }

    // ==================== AI解析和图片管理接口 ====================

    /**
     * AI解析内容并创建草稿
     */
    @PostMapping("/parse-content")
    public Map<String, Object> parseContent(@RequestBody @Valid StrategyParseDTO dto) {
        logger.info("管理员AI解析攻略内容，类型: {}", dto.getContentType());

        try {
            StrategyParseResultVO result = strategyService.parseAndCreateDraft(dto);

            return ResponseUtil.success("解析成功", result);
        } catch (Exception e) {
            logger.error("解析攻略内容失败", e);
            return ResponseUtil.error("解析失败: " + e.getMessage());
        }
    }

    /**
     * 批量上传图片
     */
    @PostMapping("/{id}/images")
    public Map<String, Object> uploadImages(
            @PathVariable Long id,
            @RequestParam("files") List<MultipartFile> files
    ) {
        logger.info("管理员上传攻略图片，strategyId: {}, 数量: {}", id, files.size());

        try {
            List<StrategyImageVO> images = strategyService.uploadImages(id, files);

            return ResponseUtil.success("图片上传成功", images);
        } catch (Exception e) {
            logger.error("上传图片失败", e);
            return ResponseUtil.error("上传失败: " + e.getMessage());
        }
    }

    /**
     * 获取攻略图片列表
     */
    @GetMapping("/{id}/images")
    public Map<String, Object> getImages(@PathVariable Long id) {
        logger.info("管理员获取攻略图片列表，strategyId: {}", id);

        try {
            List<StrategyImageVO> images = strategyService.getStrategyImages(id);

            return ResponseUtil.success("获取成功", images);
        } catch (Exception e) {
            logger.error("获取图片列表失败", e);
            return ResponseUtil.error("获取失败: " + e.getMessage());
        }
    }

    /**
     * 设置封面图
     */
    @PutMapping("/{id}/cover")
    public Map<String, Object> setCover(
            @PathVariable Long id,
            @RequestBody Map<String, Long> body
    ) {
        logger.info("管理员设置攻略封面，strategyId: {}, imageId: {}", id, body.get("imageId"));

        try {
            Long imageId = body.get("imageId");
            if (imageId == null) {
                return ResponseUtil.error("请指定图片ID");
            }

            strategyService.setCoverImage(id, imageId);

            return ResponseUtil.success("封面设置成功");
        } catch (Exception e) {
            logger.error("设置封面失败", e);
            return ResponseUtil.error("设置失败: " + e.getMessage());
        }
    }

    /**
     * 删除单张图片
     */
    @DeleteMapping("/{id}/images/{imageId}")
    public Map<String, Object> deleteImage(
            @PathVariable Long id,
            @PathVariable Long imageId
    ) {
        logger.info("管理员删除攻略图片，strategyId: {}, imageId: {}", id, imageId);

        try {
            strategyService.deleteImage(id, imageId);

            return ResponseUtil.success("图片删除成功");
        } catch (Exception e) {
            logger.error("删除图片失败", e);
            return ResponseUtil.error("删除失败: " + e.getMessage());
        }
    }

    /**
     * 更新图片排序
     */
    @PutMapping("/{id}/images/sort")
    public Map<String, Object> sortImages(
            @PathVariable Long id,
            @RequestBody List<Map<String, Integer>> sortList
    ) {
        logger.info("管理员更新图片排序，strategyId: {}", id);

        try {
            strategyService.sortImages(id, sortList);

            return ResponseUtil.success("排序更新成功");
        } catch (Exception e) {
            logger.error("更新排序失败", e);
            return ResponseUtil.error("更新失败: " + e.getMessage());
        }
    }
}
