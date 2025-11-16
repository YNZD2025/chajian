package com.nian.yinianzhida.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nian.yinianzhida.dto.PageResult;
import com.nian.yinianzhida.dto.StrategyDTO;
import com.nian.yinianzhida.dto.StrategyParseDTO;
import com.nian.yinianzhida.dto.StrategyQueryDTO;
import com.nian.yinianzhida.entity.Strategy;
import com.nian.yinianzhida.entity.StrategyImage;
import com.nian.yinianzhida.mapper.StrategyImageMapper;
import com.nian.yinianzhida.mapper.StrategyMapper;
import com.nian.yinianzhida.vo.StrategyDetailVO;
import com.nian.yinianzhida.vo.StrategyImageVO;
import com.nian.yinianzhida.vo.StrategyParseResultVO;
import com.nian.yinianzhida.vo.StrategyVO;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;

/**
 * 攻略文章服务类
 */
@Service
public class StrategyService {

    private static final Logger logger = LoggerFactory.getLogger(StrategyService.class);

    private static final String UPLOAD_DIR = "uploads/strategy/";

    @Value("${app.base-url}")
    private String appBaseUrl;

    @Autowired
    private StrategyMapper strategyMapper;

    @Autowired
    private StrategyImageMapper strategyImageMapper;

    @Autowired(required = false)
    private ChatClient.Builder chatClientBuilder;

    private ChatClient chatClient;

    /**
     * 用户端：分页查询已发布的文章列表
     * @param queryDTO 查询参数
     * @param userId 用户ID（可为null,未登录用户）
     * @return 分页结果
     */
    public PageResult<StrategyVO> getPublishedList(StrategyQueryDTO queryDTO, Long userId) {
        // 只查询已发布的文章
        Integer status = 1;

        List<Strategy> strategies = strategyMapper.selectByPage(
                queryDTO.getOffset(),
                queryDTO.getPageSize(),
                queryDTO.getCategory(),
                queryDTO.getKeyword(),
                status,
                queryDTO.getSortBy()
        );

        Integer total = strategyMapper.countStrategies(
                queryDTO.getCategory(),
                queryDTO.getKeyword(),
                status
        );

        // 转换为VO
        List<StrategyVO> voList = convertToVOList(strategies, userId);

        PageResult<StrategyVO> result = new PageResult<>();
        result.setData(voList);
        result.setTotal(total.longValue());
        result.setPage(queryDTO.getPage());
        result.setPageSize(queryDTO.getPageSize());

        return result;
    }

    /**
     * 用户端：获取文章详情（自动增加阅读量）
     * @param id 文章ID
     * @param userId 用户ID（可为null）
     * @return 文章详情
     */
    @Transactional
    public StrategyDetailVO getDetail(Long id, Long userId) {
        Strategy strategy = strategyMapper.selectById(id);

        if (strategy == null) {
            throw new RuntimeException("文章不存在");
        }

        // 只有已发布的文章才能查看
        if (strategy.getStatus() != 1) {
            throw new RuntimeException("文章不存在或已下架");
        }

        // 异步增加阅读量
        try {
            strategyMapper.incrementReadCount(id);
        } catch (Exception e) {
            logger.error("增加阅读量失败", e);
        }

        // 转换为VO
        StrategyDetailVO vo = new StrategyDetailVO();
        BeanUtils.copyProperties(strategy, vo);

        // 查询图片列表
        try {
            List<StrategyImage> images = strategyImageMapper.selectByStrategyId(id);
            if (images != null && !images.isEmpty()) {
                List<StrategyDetailVO.StrategyImageVO> imageVOList = new ArrayList<>();
                for (StrategyImage image : images) {
                    StrategyDetailVO.StrategyImageVO imageVO = new StrategyDetailVO.StrategyImageVO();
                    imageVO.setId(image.getId());
                    imageVO.setImageUrl(image.getImageUrl());
                    imageVO.setImageTitle(image.getImageTitle());
                    imageVO.setIsCover(image.getIsCover());
                    imageVO.setSortOrder(image.getSortOrder());
                    imageVOList.add(imageVO);
                }
                vo.setImages(imageVOList);
            }
        } catch (Exception e) {
            logger.error("查询图片列表失败", e);
            vo.setImages(new ArrayList<>());
        }

        // 检查是否收藏
        if (userId != null) {
            Integer count = strategyMapper.checkUserCollected(userId, id);
            vo.setIsCollected(count > 0);
        } else {
            vo.setIsCollected(false);
        }

        return vo;
    }

    /**
     * 用户端：收藏文章
     * @param userId 用户ID
     * @param strategyId 文章ID
     */
    @Transactional
    public void collectStrategy(Long userId, Long strategyId) {
        // 检查文章是否存在
        Strategy strategy = strategyMapper.selectById(strategyId);
        if (strategy == null || strategy.getStatus() != 1) {
            throw new RuntimeException("文章不存在或已下架");
        }

        // 检查是否已收藏
        Integer count = strategyMapper.checkUserCollected(userId, strategyId);
        if (count > 0) {
            throw new RuntimeException("已收藏过该文章");
        }

        // 添加收藏记录
        strategyMapper.insertCollection(userId, strategyId);

        // 增加收藏量
        strategyMapper.incrementCollectCount(strategyId);
    }

    /**
     * 用户端：取消收藏
     * @param userId 用户ID
     * @param strategyId 文章ID
     */
    @Transactional
    public void uncollectStrategy(Long userId, Long strategyId) {
        // 检查是否已收藏
        Integer count = strategyMapper.checkUserCollected(userId, strategyId);
        if (count == 0) {
            throw new RuntimeException("未收藏该文章");
        }

        // 删除收藏记录
        strategyMapper.deleteCollection(userId, strategyId);

        // 减少收藏量
        strategyMapper.decrementCollectCount(strategyId);
    }

    /**
     * 用户端：获取用户收藏列表
     * @param userId 用户ID
     * @param page 页码
     * @param pageSize 每页数量
     * @return 分页结果
     */
    public PageResult<StrategyVO> getUserCollections(Long userId, Integer page, Integer pageSize) {
        Integer offset = (page - 1) * pageSize;

        List<Strategy> strategies = strategyMapper.selectUserCollections(userId, offset, pageSize);
        Integer total = strategyMapper.countUserCollections(userId);

        // 转换为VO（收藏列表中所有文章都是已收藏状态）
        List<StrategyVO> voList = new ArrayList<>();
        for (Strategy strategy : strategies) {
            StrategyVO vo = new StrategyVO();
            BeanUtils.copyProperties(strategy, vo);
            vo.setIsCollected(true);
            voList.add(vo);
        }

        PageResult<StrategyVO> result = new PageResult<>();
        result.setData(voList);
        result.setTotal(total.longValue());
        result.setPage(page);
        result.setPageSize(pageSize);

        return result;
    }

    /**
     * 用户端：获取推荐文章
     * @param strategyId 当前文章ID
     * @param limit 限制数量
     * @return 推荐文章列表
     */
    public List<StrategyVO> getRecommendStrategies(Long strategyId, Integer limit) {
        // 获取当前文章的分类
        Strategy current = strategyMapper.selectById(strategyId);
        if (current == null) {
            return new ArrayList<>();
        }

        List<Strategy> strategies = strategyMapper.selectRecommendStrategies(
                strategyId, current.getCategory(), limit
        );

        return convertToVOList(strategies, null);
    }

    /**
     * 用户端/管理端：获取分类统计
     * @return 分类统计列表
     */
    public List<Map<String, Object>> getCategoryStats() {
        return strategyMapper.selectCategoryStats();
    }

    // ==================== 管理端方法 ====================

    /**
     * 管理端：分页查询文章列表（所有状态）
     * @param queryDTO 查询参数
     * @return 分页结果
     */
    public PageResult<StrategyVO> getAdminList(StrategyQueryDTO queryDTO) {
        List<Strategy> strategies = strategyMapper.selectByPage(
                queryDTO.getOffset(),
                queryDTO.getPageSize(),
                queryDTO.getCategory(),
                queryDTO.getKeyword(),
                queryDTO.getStatus(),
                queryDTO.getSortBy()
        );

        Integer total = strategyMapper.countStrategies(
                queryDTO.getCategory(),
                queryDTO.getKeyword(),
                queryDTO.getStatus() != null ? queryDTO.getStatus() : null
        );

        // 转换为VO（管理端不需要isCollected字段）
        List<StrategyVO> voList = convertToVOList(strategies, null);

        PageResult<StrategyVO> result = new PageResult<>();
        result.setData(voList);
        result.setTotal(total.longValue());
        result.setPage(queryDTO.getPage());
        result.setPageSize(queryDTO.getPageSize());

        return result;
    }

    /**
     * 管理端：创建文章
     * @param dto 文章DTO
     * @return 文章ID
     */
    @Transactional
    public Long createStrategy(StrategyDTO dto) {
        Strategy strategy = new Strategy();
        BeanUtils.copyProperties(dto, strategy);

        // 如果是发布状态,设置发布时间
        if (dto.getStatus() == 1) {
            strategy.setPublishTime(new Date());
        }

        strategyMapper.insert(strategy);
        return strategy.getId();
    }

    /**
     * 管理端：更新文章
     * @param id 文章ID
     * @param dto 文章DTO
     */
    @Transactional
    public void updateStrategy(Long id, StrategyDTO dto) {
        Strategy existing = strategyMapper.selectById(id);
        if (existing == null) {
            throw new RuntimeException("文章不存在");
        }

        Strategy strategy = new Strategy();
        strategy.setId(id);
        BeanUtils.copyProperties(dto, strategy);

        // 如果从草稿变为发布,设置发布时间
        if (existing.getStatus() != 1 && dto.getStatus() == 1) {
            strategy.setPublishTime(new Date());
        }

        strategyMapper.updateById(strategy);
    }

    /**
     * 管理端：删除文章
     * @param id 文章ID
     */
    @Transactional
    public void deleteStrategy(Long id) {
        Strategy strategy = strategyMapper.selectById(id);
        if (strategy == null) {
            throw new RuntimeException("文章不存在");
        }

        strategyMapper.deleteById(id);
    }

    /**
     * 管理端：批量删除文章
     * @param ids 文章ID列表
     */
    @Transactional
    public void deleteBatch(List<Long> ids) {
        strategyMapper.deleteBatchByIds(ids);
    }

    /**
     * 管理端：发布文章
     * @param id 文章ID
     */
    @Transactional
    public void publishStrategy(Long id) {
        Strategy strategy = strategyMapper.selectById(id);
        if (strategy == null) {
            throw new RuntimeException("文章不存在");
        }

        if (strategy.getStatus() == 1) {
            throw new RuntimeException("文章已发布");
        }

        strategyMapper.updateStatus(id, 1);

        // 设置发布时间
        Strategy update = new Strategy();
        update.setId(id);
        update.setPublishTime(new Date());
        strategyMapper.updateById(update);
    }

    /**
     * 管理端：下架文章
     * @param id 文章ID
     */
    @Transactional
    public void offlineStrategy(Long id) {
        Strategy strategy = strategyMapper.selectById(id);
        if (strategy == null) {
            throw new RuntimeException("文章不存在");
        }

        if (strategy.getStatus() != 1) {
            throw new RuntimeException("只能下架已发布的文章");
        }

        strategyMapper.updateStatus(id, 2);
    }

    /**
     * 管理端：获取文章详情（用于编辑）
     * @param id 文章ID
     * @return 文章信息
     */
    public Strategy getStrategyById(Long id) {
        Strategy strategy = strategyMapper.selectById(id);
        if (strategy == null) {
            throw new RuntimeException("文章不存在");
        }
        return strategy;
    }

    /**
     * 管理端：获取统计数据
     * @return 统计数据
     */
    public Map<String, Object> getStatistics() {
        return strategyMapper.selectStatistics();
    }

    // ==================== 私有辅助方法 ====================

    /**
     * 转换Entity列表为VO列表
     * @param strategies Entity列表
     * @param userId 用户ID（可为null）
     * @return VO列表
     */
    private List<StrategyVO> convertToVOList(List<Strategy> strategies, Long userId) {
        List<StrategyVO> voList = new ArrayList<>();

        for (Strategy strategy : strategies) {
            StrategyVO vo = new StrategyVO();
            BeanUtils.copyProperties(strategy, vo);

            // 检查是否收藏
            if (userId != null) {
                Integer count = strategyMapper.checkUserCollected(userId, strategy.getId());
                vo.setIsCollected(count > 0);
            } else {
                vo.setIsCollected(false);
            }

            voList.add(vo);
        }

        return voList;
    }

    // ==================== AI解析和图片管理方法 ====================

    /**
     * AI解析内容并创建草稿
     * @param dto 解析请求DTO
     * @return 解析结果VO
     */
    @Transactional
    public StrategyParseResultVO parseAndCreateDraft(StrategyParseDTO dto) {
        logger.info("开始解析攻略内容，类型: {}", dto.getContentType());

        // 检查ChatClient是否可用
        if (chatClientBuilder == null) {
            throw new RuntimeException("AI服务不可用，请检查配置");
        }

        if (chatClient == null) {
            chatClient = chatClientBuilder.build();
        }

        // 构建AI解析Prompt
        String prompt = buildParsePrompt(dto.getContentType(), dto.getContent());

        try {
            // 调用AI解析
            String aiResponse = chatClient.prompt()
                    .user(prompt)
                    .call()
                    .content();

            logger.info("AI解析结果: {}", aiResponse);

            // 解析JSON结果
            ObjectMapper objectMapper = new ObjectMapper();
            Map<String, String> parsedData = objectMapper.readValue(aiResponse, Map.class);

            // 创建Strategy草稿
            Strategy strategy = new Strategy();
            strategy.setTitle(parsedData.get("title"));
            strategy.setCategory(parsedData.get("category"));
            strategy.setSummary(parsedData.get("summary"));
            strategy.setContent(parsedData.get("content"));
            strategy.setAuthor(parsedData.get("author"));
            strategy.setStatus(0);  // 草稿状态
            strategy.setIsVipOnly(0);
            strategy.setReadCount(0);
            strategy.setCollectCount(0);

            // 插入数据库
            strategyMapper.insert(strategy);

            // 构建返回VO
            StrategyParseResultVO resultVO = new StrategyParseResultVO();
            BeanUtils.copyProperties(strategy, resultVO);

            logger.info("攻略草稿创建成功，ID: {}", strategy.getId());

            return resultVO;

        } catch (Exception e) {
            logger.error("AI解析失败", e);
            throw new RuntimeException("AI解析失败: " + e.getMessage());
        }
    }

    /**
     * 构建AI解析Prompt
     */
    private String buildParsePrompt(String contentType, String content) {
        return String.format("""
        你是一个专业的求职攻略内容解析助手。请分析以下内容并提取关键信息。

        ## 任务要求
        1. 提取文章标题(title)
        2. 判断文章分类(category): 必须从以下选项中选择一个
           - 简历技巧
           - 面试攻略
           - 谈薪技巧
           - 行业求职
           - 转行攻略
        3. 生成文章摘要(summary): 50-200字，概括核心内容
        4. 提取正文内容(content): 转换为HTML格式，保留段落、标题、列表结构
        5. 提取作者名称(author): 如果没有则返回"佚名"

        ## 输出格式
        严格按照以下JSON格式输出，不要包含任何其他文字，不要使用markdown代码块格式：
        {
          "title": "文章标题",
          "category": "分类(必须是上述5个之一)",
          "summary": "文章摘要",
          "content": "HTML格式正文",
          "author": "作者名称"
        }

        ## 输入内容(格式: %s)
        %s

        请开始解析:
        """, contentType, content);
    }

    /**
     * 批量上传图片
     * @param strategyId 攻略ID
     * @param files 图片文件列表
     * @return 图片VO列表
     */
    @Transactional
    public List<StrategyImageVO> uploadImages(Long strategyId, List<MultipartFile> files) {
        logger.info("开始上传攻略图片，strategyId: {}, 图片数量: {}", strategyId, files.size());

        // 验证攻略是否存在
        Strategy strategy = strategyMapper.selectById(strategyId);
        if (strategy == null) {
            throw new RuntimeException("攻略不存在");
        }

        // 验证图片数量
        if (files == null || files.isEmpty()) {
            throw new RuntimeException("请至少上传一张图片");
        }

        if (files.size() > 10) {
            throw new RuntimeException("最多只能上传10张图片");
        }

        // 创建上传目录
        File uploadDir = new File(UPLOAD_DIR);
        if (!uploadDir.exists()) {
            uploadDir.mkdirs();
        }

        List<StrategyImageVO> imageVOList = new ArrayList<>();
        int currentImageCount = strategyImageMapper.countByStrategyId(strategyId);

        for (int i = 0; i < files.size(); i++) {
            MultipartFile file = files.get(i);

            // 验证文件
            if (file.isEmpty()) {
                continue;
            }

            // 验证文件类型
            String contentType = file.getContentType();
            if (contentType == null || !contentType.startsWith("image/")) {
                throw new RuntimeException("只能上传图片文件");
            }

            // 验证文件大小 (2MB)
            if (file.getSize() > 2 * 1024 * 1024) {
                throw new RuntimeException("图片大小不能超过2MB");
            }

            try {
                // 生成唯一文件名
                String originalFilename = file.getOriginalFilename();
                String extension = originalFilename != null && originalFilename.contains(".")
                        ? originalFilename.substring(originalFilename.lastIndexOf("."))
                        : ".jpg";
                String filename = strategyId + "_" + System.currentTimeMillis() + "_" + i + extension;

                // 保存文件
                Path filePath = Paths.get(UPLOAD_DIR + filename);
                Files.write(filePath, file.getBytes());

                // 构建完整URL
                String imageUrl = appBaseUrl + "/uploads/strategy/" + filename;

                // 创建图片记录
                StrategyImage image = new StrategyImage();
                image.setStrategyId(strategyId);
                image.setImageUrl(imageUrl);
                image.setImageTitle(originalFilename);
                image.setIsCover(0);
                image.setSortOrder(currentImageCount + i);
                image.setFileSize((int) file.getSize());

                // 插入数据库
                strategyImageMapper.insert(image);

                // 转换为VO
                StrategyImageVO vo = new StrategyImageVO();
                BeanUtils.copyProperties(image, vo);
                imageVOList.add(vo);

            } catch (IOException e) {
                logger.error("图片上传失败", e);
                throw new RuntimeException("图片上传失败: " + e.getMessage());
            }
        }

        logger.info("攻略图片上传成功，共{}张", imageVOList.size());

        return imageVOList;
    }

    /**
     * 设置封面图
     * @param strategyId 攻略ID
     * @param imageId 图片ID
     */
    @Transactional
    public void setCoverImage(Long strategyId, Long imageId) {
        logger.info("设置封面图，strategyId: {}, imageId: {}", strategyId, imageId);

        // 验证图片是否属于该攻略
        StrategyImage image = strategyImageMapper.selectById(imageId);
        if (image == null || !image.getStrategyId().equals(strategyId)) {
            throw new RuntimeException("图片不存在或不属于该攻略");
        }

        // 将该攻略所有图片的is_cover设为0
        strategyImageMapper.updateIsCoverByStrategyId(strategyId, 0);

        // 将指定图片的is_cover设为1
        StrategyImage update = new StrategyImage();
        update.setId(imageId);
        update.setIsCover(1);
        strategyImageMapper.updateById(update);

        // 同步更新strategy表的cover_image字段
        Strategy strategy = new Strategy();
        strategy.setId(strategyId);
        strategy.setCoverImage(image.getImageUrl());
        strategyMapper.updateById(strategy);

        logger.info("封面图设置成功");
    }

    /**
     * 获取攻略图片列表
     * @param strategyId 攻略ID
     * @return 图片VO列表
     */
    public List<StrategyImageVO> getStrategyImages(Long strategyId) {
        List<StrategyImage> images = strategyImageMapper.selectByStrategyId(strategyId);

        List<StrategyImageVO> voList = new ArrayList<>();
        for (StrategyImage image : images) {
            StrategyImageVO vo = new StrategyImageVO();
            BeanUtils.copyProperties(image, vo);
            voList.add(vo);
        }

        return voList;
    }

    /**
     * 删除图片
     * @param strategyId 攻略ID
     * @param imageId 图片ID
     */
    @Transactional
    public void deleteImage(Long strategyId, Long imageId) {
        logger.info("删除图片，strategyId: {}, imageId: {}", strategyId, imageId);

        // 验证图片是否属于该攻略
        StrategyImage image = strategyImageMapper.selectById(imageId);
        if (image == null || !image.getStrategyId().equals(strategyId)) {
            throw new RuntimeException("图片不存在或不属于该攻略");
        }

        // 如果是封面图，不允许删除 (可根据需求调整)
        if (image.getIsCover() == 1) {
            throw new RuntimeException("封面图不能删除，请先设置其他图片为封面");
        }

        // 删除数据库记录
        strategyImageMapper.deleteById(imageId);

        // 删除物理文件
        try {
            Path filePath = Paths.get(image.getImageUrl().substring(1)); // 去掉开头的 /
            Files.deleteIfExists(filePath);
        } catch (IOException e) {
            logger.warn("删除图片文件失败", e);
        }

        logger.info("图片删除成功");
    }

    /**
     * 更新图片排序
     * @param strategyId 攻略ID
     * @param sortList 排序列表 [{id: 1, sortOrder: 0}, ...]
     */
    @Transactional
    public void sortImages(Long strategyId, List<Map<String, Integer>> sortList) {
        logger.info("更新图片排序，strategyId: {}", strategyId);

        for (Map<String, Integer> item : sortList) {
            Long imageId = item.get("id").longValue();
            Integer sortOrder = item.get("sortOrder");

            // 验证图片属于该攻略
            StrategyImage image = strategyImageMapper.selectById(imageId);
            if (image != null && image.getStrategyId().equals(strategyId)) {
                strategyImageMapper.updateSortOrder(imageId, sortOrder);
            }
        }

        logger.info("图片排序更新成功");
    }
}
