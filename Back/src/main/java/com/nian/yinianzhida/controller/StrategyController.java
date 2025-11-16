package com.nian.yinianzhida.controller;

import com.nian.yinianzhida.annotation.SkipAuth;
import com.nian.yinianzhida.dto.PageResult;
import com.nian.yinianzhida.dto.StrategyQueryDTO;
import com.nian.yinianzhida.service.StrategyService;
import com.nian.yinianzhida.util.ResponseUtil;
import com.nian.yinianzhida.vo.StrategyDetailVO;
import com.nian.yinianzhida.vo.StrategyVO;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 攻略文章控制器（用户端API）
 */
@RestController
@RequestMapping("/api/strategy")
@CrossOrigin(origins = "*")
public class StrategyController {

    private static final Logger logger = LoggerFactory.getLogger(StrategyController.class);

    @Autowired
    private StrategyService strategyService;

    /**
     * 获取文章列表（支持筛选和排序）
     * 不需要登录，但如果登录了会标记收藏状态
     */
    @SkipAuth
    @GetMapping("/list")
    public Map<String, Object> getStrategyList(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer pageSize,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "latest") String sortBy,
            HttpServletRequest request
    ) {
        logger.info("用户查询攻略列表 - page: {}, pageSize: {}, category: {}, keyword: {}, sortBy: {}",
                page, pageSize, category, keyword, sortBy);

        try {
            // 构建查询参数
            StrategyQueryDTO queryDTO = new StrategyQueryDTO();
            queryDTO.setPage(page);
            queryDTO.setPageSize(pageSize);
            queryDTO.setCategory(category);
            queryDTO.setKeyword(keyword);
            queryDTO.setSortBy(sortBy);

            // 获取用户ID（如果已登录）
            Long userId = (Long) request.getAttribute("userId");

            // 查询文章列表（只查询已发布的）
            PageResult<StrategyVO> result = strategyService.getPublishedList(queryDTO, userId);

            return ResponseUtil.success("获取成功", result);
        } catch (Exception e) {
            logger.error("获取攻略列表失败", e);
            return ResponseUtil.error("获取失败: " + e.getMessage());
        }
    }

    /**
     * 获取文章详情
     * 不需要登录，但如果登录了会标记收藏状态
     */
    @SkipAuth
    @GetMapping("/{id}")
    public Map<String, Object> getStrategyDetail(
            @PathVariable Long id,
            HttpServletRequest request
    ) {
        logger.info("用户查看攻略详情 - id: {}", id);

        try {
            // 获取用户ID（如果已登录）
            Long userId = (Long) request.getAttribute("userId");

            // 查询文章详情（自动增加阅读量）
            StrategyDetailVO detail = strategyService.getDetail(id, userId);

            return ResponseUtil.success("获取成功", detail);
        } catch (Exception e) {
            logger.error("获取攻略详情失败", e);
            return ResponseUtil.error("获取失败: " + e.getMessage());
        }
    }

    /**
     * 收藏文章（需要登录）
     */
    @PostMapping("/{id}/collect")
    public Map<String, Object> collectStrategy(
            @PathVariable Long id,
            HttpServletRequest request
    ) {
        logger.info("用户收藏攻略 - id: {}", id);

        try {
            Long userId = (Long) request.getAttribute("userId");
            if (userId == null) {
                return ResponseUtil.error("请先登录");
            }

            strategyService.collectStrategy(userId, id);

            return ResponseUtil.success("收藏成功");
        } catch (Exception e) {
            logger.error("收藏攻略失败", e);
            return ResponseUtil.error(e.getMessage());
        }
    }

    /**
     * 取消收藏（需要登录）
     */
    @DeleteMapping("/{id}/collect")
    public Map<String, Object> uncollectStrategy(
            @PathVariable Long id,
            HttpServletRequest request
    ) {
        logger.info("用户取消收藏攻略 - id: {}", id);

        try {
            Long userId = (Long) request.getAttribute("userId");
            if (userId == null) {
                return ResponseUtil.error("请先登录");
            }

            strategyService.uncollectStrategy(userId, id);

            return ResponseUtil.success("取消收藏成功");
        } catch (Exception e) {
            logger.error("取消收藏失败", e);
            return ResponseUtil.error(e.getMessage());
        }
    }

    /**
     * 获取用户收藏列表（需要登录）
     */
    @GetMapping("/my-collections")
    public Map<String, Object> getMyCollections(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer pageSize,
            HttpServletRequest request
    ) {
        logger.info("用户查看收藏列表 - page: {}, pageSize: {}", page, pageSize);

        try {
            Long userId = (Long) request.getAttribute("userId");
            if (userId == null) {
                return ResponseUtil.error("请先登录");
            }

            PageResult<StrategyVO> result = strategyService.getUserCollections(userId, page, pageSize);

            return ResponseUtil.success("获取成功", result);
        } catch (Exception e) {
            logger.error("获取收藏列表失败", e);
            return ResponseUtil.error("获取失败: " + e.getMessage());
        }
    }

    /**
     * 获取推荐文章
     * 不需要登录
     */
    @SkipAuth
    @GetMapping("/{id}/recommend")
    public Map<String, Object> getRecommendStrategies(
            @PathVariable Long id,
            @RequestParam(defaultValue = "5") Integer limit
    ) {
        logger.info("获取推荐攻略 - strategyId: {}, limit: {}", id, limit);

        try {
            List<StrategyVO> strategies = strategyService.getRecommendStrategies(id, limit);

            return ResponseUtil.success("获取成功", strategies);
        } catch (Exception e) {
            logger.error("获取推荐攻略失败", e);
            return ResponseUtil.error("获取失败: " + e.getMessage());
        }
    }

    /**
     * 获取分类统计
     * 不需要登录
     */
    @SkipAuth
    @GetMapping("/categories")
    public Map<String, Object> getCategoryStats() {
        logger.info("获取分类统计");

        try {
            List<Map<String, Object>> stats = strategyService.getCategoryStats();

            return ResponseUtil.success("获取成功", stats);
        } catch (Exception e) {
            logger.error("获取分类统计失败", e);
            return ResponseUtil.error("获取失败: " + e.getMessage());
        }
    }
}
