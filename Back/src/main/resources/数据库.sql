-- ================================================================
-- 一念职达（ApplyMind）数据库建表脚本
-- 数据库：MySQL 5.7+
-- 编码：UTF8MB4
-- ================================================================

-- 创建数据库
CREATE DATABASE IF NOT EXISTS applymind DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE applymind;

-- ================================================================
-- 一、用户系统模块
-- ================================================================

-- 用户表 (user)
DROP TABLE IF EXISTS `user`;
CREATE TABLE `user` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键，自增',
  `openid` VARCHAR(128) DEFAULT NULL COMMENT '微信OpenID',
  `nickname` VARCHAR(100) DEFAULT NULL COMMENT '微信昵称',
  `avatar` VARCHAR(500) DEFAULT NULL COMMENT '微信头像URL',
  `phone` VARCHAR(20) DEFAULT NULL COMMENT '联系电话',
  `email` VARCHAR(100) DEFAULT NULL COMMENT '邮箱',
  `password` VARCHAR(255) DEFAULT NULL COMMENT '密码（加密存储）',
  `gender` TINYINT DEFAULT 0 COMMENT '性别（0-未知 1-男 2-女）',
  `tags` VARCHAR(500) DEFAULT NULL COMMENT '用户标签（JSON格式）如：["应届生","VIP用户","高频简历上传用户"]',
  `status` TINYINT DEFAULT 1 COMMENT '账号状态（0-禁用 1-正常）',
  `email_verified` TINYINT DEFAULT 0 COMMENT '邮箱是否验证（0-未验证 1-已验证）',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '注册时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `last_login_time` DATETIME DEFAULT NULL COMMENT '最后登录时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_openid` (`openid`),
  UNIQUE KEY `idx_email` (`email`),
  KEY `idx_status` (`status`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';


-- 登录日志表 (login_log)
DROP TABLE IF EXISTS `login_log`;
CREATE TABLE `login_log` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键，自增',
  `user_id` BIGINT NOT NULL COMMENT '用户ID',
  `login_type` VARCHAR(20) DEFAULT 'wechat' COMMENT '登录类型（wechat-微信扫码）',
  `login_ip` VARCHAR(50) DEFAULT NULL COMMENT '登录IP',
  `login_device` VARCHAR(200) DEFAULT NULL COMMENT '登录设备信息',
  `login_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '登录时间',
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_login_time` (`login_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='登录日志表';

-- ================================================================
-- 二、简历管理模块
-- ================================================================

-- 简历表 (resume)
DROP TABLE IF EXISTS `resume`;
CREATE TABLE `resume` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键，自增',
  `user_id` BIGINT NOT NULL COMMENT '用户ID',
  `title` VARCHAR(200) DEFAULT NULL COMMENT '简历标题（如"校招版简历"）',
  `file_name` VARCHAR(200) DEFAULT NULL COMMENT '原始文件名',
  `file_type` VARCHAR(20) DEFAULT NULL COMMENT '文件类型（pdf/docx/doc）',
  `file_size` INT DEFAULT NULL COMMENT '文件大小（字节）',
  `file_data` LONGBLOB DEFAULT NULL COMMENT '简历文件二进制数据（PDF/Word原始文件）',
  `extracted_text` LONGTEXT DEFAULT NULL COMMENT '提取的原始文本内容（Tika提取）',
  `is_default` TINYINT DEFAULT 0 COMMENT '是否默认简历（0-否 1-是）',
  `parse_status` TINYINT DEFAULT 0 COMMENT '解析状态（0-待解析 1-解析中 2-解析成功 3-解析失败）',
  `parse_error` TEXT DEFAULT NULL COMMENT '解析错误信息',
  `parsed_data` JSON DEFAULT NULL COMMENT 'AI解析的结构化数据（JSON格式，可编辑）',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='简历表';


-- 简历基础信息表 (resume_basic_info)
DROP TABLE IF EXISTS `resume_basic_info`;
CREATE TABLE `resume_basic_info` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键，自增',
  `resume_id` BIGINT NOT NULL COMMENT '简历ID',
  `name` VARCHAR(50) DEFAULT NULL COMMENT '姓名',
  `gender` TINYINT DEFAULT 0 COMMENT '性别（0-未知 1-男 2-女）',
  `phone` VARCHAR(20) DEFAULT NULL COMMENT '联系电话',
  `email` VARCHAR(100) DEFAULT NULL COMMENT '邮箱',
  `job_intention` VARCHAR(200) DEFAULT NULL COMMENT '求职意向（岗位名称）',
  `expected_salary_min` INT DEFAULT NULL COMMENT '期望薪资最低值（单位：千元/月）',
  `expected_salary_max` INT DEFAULT NULL COMMENT '期望薪资最高值（单位：千元/月）',
  `expected_city` VARCHAR(200) DEFAULT NULL COMMENT '期望城市（JSON数组格式）',
  `self_evaluation` TEXT DEFAULT NULL COMMENT '自我评价',
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_resume_id` (`resume_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='简历基础信息表';


-- 教育背景表 (resume_education)
DROP TABLE IF EXISTS `resume_education`;
CREATE TABLE `resume_education` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键，自增',
  `resume_id` BIGINT NOT NULL COMMENT '简历ID',
  `school_name` VARCHAR(200) DEFAULT NULL COMMENT '学校名称',
  `education_level` VARCHAR(50) DEFAULT NULL COMMENT '学历（专科/本科/硕士/博士）',
  `major` VARCHAR(100) DEFAULT NULL COMMENT '专业',
  `start_date` DATE DEFAULT NULL COMMENT '入学时间',
  `end_date` DATE DEFAULT NULL COMMENT '毕业时间',
  `is_current` TINYINT DEFAULT 0 COMMENT '是否在读（0-否 1-是）',
  `gpa` VARCHAR(20) DEFAULT NULL COMMENT 'GPA成绩',
  `honors` TEXT DEFAULT NULL COMMENT '荣誉奖项（JSON数组格式）',
  `sort_order` INT DEFAULT 0 COMMENT '排序序号',
  PRIMARY KEY (`id`),
  KEY `idx_resume_id` (`resume_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='教育背景表';


-- 工作经历表 (resume_work_experience)
DROP TABLE IF EXISTS `resume_work_experience`;
CREATE TABLE `resume_work_experience` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键，自增',
  `resume_id` BIGINT NOT NULL COMMENT '简历ID',
  `company_name` VARCHAR(200) DEFAULT NULL COMMENT '公司名称',
  `position_name` VARCHAR(100) DEFAULT NULL COMMENT '岗位名称',
  `industry` VARCHAR(100) DEFAULT NULL COMMENT '所属行业',
  `start_date` DATE DEFAULT NULL COMMENT '入职时间',
  `end_date` DATE DEFAULT NULL COMMENT '离职时间',
  `is_current` TINYINT DEFAULT 0 COMMENT '是否在职（0-否 1-是）',
  `work_content` TEXT DEFAULT NULL COMMENT '工作内容（职责+成果）',
  `sort_order` INT DEFAULT 0 COMMENT '排序序号',
  PRIMARY KEY (`id`),
  KEY `idx_resume_id` (`resume_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='工作经历表';


-- 项目经历表 (resume_project_experience)
DROP TABLE IF EXISTS `resume_project_experience`;
CREATE TABLE `resume_project_experience` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键，自增',
  `resume_id` BIGINT NOT NULL COMMENT '简历ID',
  `work_experience_id` BIGINT DEFAULT NULL COMMENT '关联工作经历ID（可为空）',
  `project_name` VARCHAR(200) DEFAULT NULL COMMENT '项目名称',
  `project_role` VARCHAR(100) DEFAULT NULL COMMENT '项目角色',
  `start_date` DATE DEFAULT NULL COMMENT '开始时间',
  `end_date` DATE DEFAULT NULL COMMENT '结束时间',
  `project_description` TEXT DEFAULT NULL COMMENT '项目描述',
  `project_achievement` TEXT DEFAULT NULL COMMENT '项目成果',
  `sort_order` INT DEFAULT 0 COMMENT '排序序号',
  PRIMARY KEY (`id`),
  KEY `idx_resume_id` (`resume_id`),
  KEY `idx_work_experience_id` (`work_experience_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='项目经历表';


-- 技能特长表 (resume_skill)
DROP TABLE IF EXISTS `resume_skill`;
CREATE TABLE `resume_skill` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键，自增',
  `resume_id` BIGINT NOT NULL COMMENT '简历ID',
  `skill_name` VARCHAR(100) DEFAULT NULL COMMENT '技能名称（如Python、Excel）',
  `skill_level` VARCHAR(20) DEFAULT NULL COMMENT '熟练程度（入门/熟练/精通）',
  `skill_category` VARCHAR(50) DEFAULT NULL COMMENT '技能分类（编程语言/工具软件/专业技能）',
  `sort_order` INT DEFAULT 0 COMMENT '排序序号',
  PRIMARY KEY (`id`),
  KEY `idx_resume_id` (`resume_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='技能特长表';


-- 证书资质表 (resume_certificate)
DROP TABLE IF EXISTS `resume_certificate`;
CREATE TABLE `resume_certificate` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键，自增',
  `resume_id` BIGINT NOT NULL COMMENT '简历ID',
  `certificate_name` VARCHAR(200) DEFAULT NULL COMMENT '证书名称',
  `issue_organization` VARCHAR(200) DEFAULT NULL COMMENT '颁发机构',
  `issue_date` DATE DEFAULT NULL COMMENT '获取时间',
  `certificate_no` VARCHAR(100) DEFAULT NULL COMMENT '证书编号',
  `sort_order` INT DEFAULT 0 COMMENT '排序序号',
  PRIMARY KEY (`id`),
  KEY `idx_resume_id` (`resume_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='证书资质表';


-- 其他信息表 (resume_other_info)
DROP TABLE IF EXISTS `resume_other_info`;
CREATE TABLE `resume_other_info` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键，自增',
  `resume_id` BIGINT NOT NULL COMMENT '简历ID',
  `campus_experience` TEXT DEFAULT NULL COMMENT '校园经历（JSON数组格式）',
  `social_practice` TEXT DEFAULT NULL COMMENT '社会实践（JSON数组格式）',
  `hobbies` TEXT DEFAULT NULL COMMENT '兴趣爱好（JSON数组格式）',
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_resume_id` (`resume_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='其他信息表';


-- ================================================================
-- 三、岗位管理模块
-- ================================================================

-- 岗位表 (job)
DROP TABLE IF EXISTS `job`;
CREATE TABLE `job` (
                       `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键，自增',
                       `job_name` VARCHAR(200) DEFAULT NULL COMMENT '岗位名称',
                       `company_name` VARCHAR(200) DEFAULT NULL COMMENT '公司名称',
                       `company_logo` VARCHAR(500) COMMENT '公司Logo URL',
                       `industry` VARCHAR(100) DEFAULT NULL COMMENT '所属行业',
                       `company_size` VARCHAR(50) COMMENT '公司规模（如"100-499人"）',
                       `company_funding` VARCHAR(50) COMMENT '融资阶段（如"B轮"、"已上市"）',
                       `job_type` VARCHAR(50) DEFAULT NULL COMMENT '岗位类型（校招/社招/实习）',
                       `work_city` VARCHAR(200) DEFAULT NULL COMMENT '工作城市（JSON数组格式）',
                       `work_address` VARCHAR(500) COMMENT '详细办公地址',
                       `salary_min` INT DEFAULT NULL COMMENT '薪资最低值（单位：千元/月）',
                       `salary_max` INT DEFAULT NULL COMMENT '薪资最高值（单位：千元/月）',
                       `salary_type` VARCHAR(20) DEFAULT 'monthly' COMMENT '薪资类型（daily-日薪/monthly-月薪/yearly-年薪）',
                       `salary_details` VARCHAR(500) COMMENT '薪资详情说明',
                       `education_requirement` VARCHAR(50) DEFAULT NULL COMMENT '学历要求（不限/专科/本科/硕士/博士）',
                       `experience_requirement` VARCHAR(50) DEFAULT NULL COMMENT '工作经验要求（如"1-3年"）',
                       `work_days_per_week` INT COMMENT '每周工作天数（实习岗位使用）',
                       `work_duration_months` INT COMMENT '工作时长要求（月数，实习岗位使用）',
                       `job_duty` TEXT DEFAULT NULL COMMENT '岗位职责',
                       `job_requirement` TEXT DEFAULT NULL COMMENT '任职要求',
                       `raw_data` JSON COMMENT '原始上传数据备份（JSON格式）',
                       `job_tags` VARCHAR(500) DEFAULT NULL COMMENT '岗位标签（JSON数组格式）',
                       `benefits` JSON COMMENT '岗位福利（JSON格式：{"tags":["福利1","福利2"],"details":"福利说明"}）',
                       `special_tags` VARCHAR(500) COMMENT '特殊标签（JSON数组格式，如["可转正","大牛带队"]）',
                       `apply_link` VARCHAR(500) DEFAULT NULL COMMENT '申请链接',
                       `source` VARCHAR(100) DEFAULT NULL COMMENT '信息来源（如"智联招聘"）',
                       `publish_time` DATETIME DEFAULT NULL COMMENT '发布时间',
                       `expire_time` DATETIME DEFAULT NULL COMMENT '过期时间',
                       `status` TINYINT DEFAULT 1 COMMENT '状态（0-下架 1-上架 2-已过期）',
                       `is_urgent` TINYINT DEFAULT 0 COMMENT '是否急招（0-否 1-是）',
                       `view_count` INT DEFAULT 0 COMMENT '浏览次数',
                       `collect_count` INT DEFAULT 0 COMMENT '收藏次数',
                       `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
                       `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
                       PRIMARY KEY (`id`),
                       KEY `idx_job_type` (`job_type`),
                       KEY `idx_industry` (`industry`),
                       KEY `idx_publish_time` (`publish_time`),
                       KEY `idx_status` (`status`),
                       FULLTEXT KEY `idx_job_name` (`job_name`),
                       KEY `idx_is_urgent` (`is_urgent`),
                       KEY `idx_company_name` (`company_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='岗位表';


-- 岗位收藏表 (job_collection)
DROP TABLE IF EXISTS `job_collection`;
CREATE TABLE `job_collection` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键，自增',
  `user_id` BIGINT NOT NULL COMMENT '用户ID',
  `job_id` BIGINT NOT NULL COMMENT '岗位ID',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '收藏时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_user_job` (`user_id`, `job_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_job_id` (`job_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='岗位收藏表';


-- 岗位推荐记录表 (job_recommendation)
DROP TABLE IF EXISTS `job_recommendation`;
CREATE TABLE `job_recommendation` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键，自增',
  `user_id` BIGINT NOT NULL COMMENT '用户ID',
  `resume_id` BIGINT NOT NULL COMMENT '简历ID',
  `job_id` BIGINT NOT NULL COMMENT '岗位ID',
  `match_score` DECIMAL(5,2) DEFAULT NULL COMMENT '匹配度分数（0-100）',
  `match_reason` TEXT DEFAULT NULL COMMENT '匹配理由（JSON格式）',
  `is_clicked` TINYINT DEFAULT 0 COMMENT '是否点击（0-否 1-是）',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '推荐时间',
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='岗位推荐记录表';


-- ================================================================
-- 四、求职攻略模块
-- ================================================================

-- 攻略文章表 (strategy)
DROP TABLE IF EXISTS `strategy`;
CREATE TABLE `strategy` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键，自增',
  `title` VARCHAR(300) DEFAULT NULL COMMENT '文章标题',
  `category` VARCHAR(50) DEFAULT NULL COMMENT '文章分类（简历技巧/面试攻略/谈薪技巧/行业求职/转行攻略）',
  `summary` TEXT DEFAULT NULL COMMENT '文章摘要',
  `content` LONGTEXT DEFAULT NULL COMMENT '正文内容（富文本）',
  `cover_image` VARCHAR(500) DEFAULT NULL COMMENT '封面图URL',
  `author` VARCHAR(100) DEFAULT NULL COMMENT '作者',
  `is_vip_only` TINYINT DEFAULT 0 COMMENT '是否VIP专享（0-否 1-是）',
  `read_count` INT DEFAULT 0 COMMENT '阅读量',
  `collect_count` INT DEFAULT 0 COMMENT '收藏量',
  `status` TINYINT DEFAULT 0 COMMENT '状态（0-草稿 1-已发布 2-已下架）',
  `publish_time` DATETIME DEFAULT NULL COMMENT '发布时间',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_category` (`category`),
  KEY `idx_publish_time` (`publish_time`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='攻略文章表';


-- 攻略收藏表 (strategy_collection)
DROP TABLE IF EXISTS `strategy_collection`;
CREATE TABLE `strategy_collection` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键，自增',
  `user_id` BIGINT NOT NULL COMMENT '用户ID',
  `strategy_id` BIGINT NOT NULL COMMENT '攻略文章ID',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '收藏时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_user_strategy` (`user_id`, `strategy_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_strategy_id` (`strategy_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='攻略收藏表';


-- 攻略文章图片表 (strategy_image)
DROP TABLE IF EXISTS `strategy_image`;
CREATE TABLE `strategy_image` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键，自增',
  `strategy_id` BIGINT NOT NULL COMMENT '攻略文章ID',
  `image_url` VARCHAR(500) NOT NULL COMMENT '图片URL',
  `image_title` VARCHAR(200) DEFAULT NULL COMMENT '图片标题/说明',
  `is_cover` TINYINT DEFAULT 0 COMMENT '是否封面（0-否 1-是）',
  `sort_order` INT DEFAULT 0 COMMENT '排序序号',
  `file_size` INT DEFAULT NULL COMMENT '文件大小（字节）',
  `width` INT DEFAULT NULL COMMENT '图片宽度（像素）',
  `height` INT DEFAULT NULL COMMENT '图片高度（像素）',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '上传时间',
  PRIMARY KEY (`id`),
  KEY `idx_strategy_id` (`strategy_id`),
  KEY `idx_is_cover` (`is_cover`),
  KEY `idx_sort_order` (`sort_order`),
  CONSTRAINT `fk_strategy_image_strategy` FOREIGN KEY (`strategy_id`)
    REFERENCES `strategy` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='攻略文章图片表';


-- ================================================================
-- 五、VIP系统模块
-- ================================================================

-- 会员订单表 (membership_order)
DROP TABLE IF EXISTS `membership_order`;
CREATE TABLE `membership_order` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键，自增',
  `order_no` VARCHAR(50) NOT NULL COMMENT '订单号（唯一）',
  `user_id` BIGINT NOT NULL COMMENT '用户ID',
  `membership_level` TINYINT DEFAULT NULL COMMENT '购买的会员等级（1-月度VIP 2-季度VIP 3-年度VIP）',
  `product_name` VARCHAR(100) DEFAULT NULL COMMENT '商品名称（如"月度VIP会员"）',
  `duration_days` INT DEFAULT NULL COMMENT '会员时长（天数）',
  `optimize_count` INT DEFAULT NULL COMMENT '赠送优化次数',
  `price` DECIMAL(10,2) DEFAULT NULL COMMENT '价格（单位：元）',
  `pay_type` VARCHAR(20) DEFAULT 'wechat' COMMENT '支付方式（wechat-微信支付）',
  `pay_status` TINYINT DEFAULT 0 COMMENT '支付状态（0-待支付 1-已支付 2-已取消 3-已退款）',
  `transaction_id` VARCHAR(100) DEFAULT NULL COMMENT '微信支付交易号',
  `pay_time` DATETIME DEFAULT NULL COMMENT '支付时间',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_order_no` (`order_no`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_membership_level` (`membership_level`),
  KEY `idx_pay_status` (`pay_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='会员订单表';


-- 用户会员信息表 (user_membership)
DROP TABLE IF EXISTS `user_membership`;
CREATE TABLE `user_membership` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键，自增',
  `user_id` BIGINT NOT NULL COMMENT '用户ID',
  `monthly_vip_days` INT DEFAULT 0 COMMENT '剩余月度VIP天数',
  `quarterly_vip_days` INT DEFAULT 0 COMMENT '剩余季度VIP天数',
  `yearly_vip_days` INT DEFAULT 0 COMMENT '剩余年度VIP天数',
  `resume_optimize_count` INT DEFAULT 3 COMMENT '剩余简历优化次数（所有VIP共享叠加）',
  `total_optimized` INT DEFAULT 0 COMMENT '累计已使用优化次数',
  `is_author` TINYINT DEFAULT 0 COMMENT '是否作者（0-否 1-是，作者可发布攻略文章）',
  `last_consume_date` DATE DEFAULT NULL COMMENT '最后一次消费VIP天数的日期',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_user_id` (`user_id`),
  KEY `idx_is_author` (`is_author`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户会员信息表';


-- 会员变更历史表 (membership_change_log)
DROP TABLE IF EXISTS `membership_change_log`;
CREATE TABLE `membership_change_log` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键，自增',
  `user_id` BIGINT NOT NULL COMMENT '用户ID',
  `change_type` VARCHAR(50) NOT NULL COMMENT '变更类型（purchase-购买 gift-赠送 consume-消费 refund-退款 set_author-设置作者）',
  `membership_level` TINYINT DEFAULT NULL COMMENT '操作的会员等级（1-月度 2-季度 3-年度）',
  `days_change` INT DEFAULT 0 COMMENT '天数变化（正数增加，负数减少）',
  `optimize_count_change` INT DEFAULT 0 COMMENT '优化次数变化（正数增加，负数减少）',
  `monthly_vip_days_after` INT DEFAULT 0 COMMENT '变更后月度VIP剩余天数',
  `quarterly_vip_days_after` INT DEFAULT 0 COMMENT '变更后季度VIP剩余天数',
  `yearly_vip_days_after` INT DEFAULT 0 COMMENT '变更后年度VIP剩余天数',
  `optimize_count_after` INT DEFAULT 0 COMMENT '变更后剩余优化次数',
  `order_id` BIGINT DEFAULT NULL COMMENT '关联订单ID',
  `operator_id` BIGINT DEFAULT NULL COMMENT '操作人ID（管理员操作时记录）',
  `remark` VARCHAR(500) DEFAULT NULL COMMENT '备注说明',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '变更时间',
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_change_type` (`change_type`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_order_id` (`order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='会员变更历史表';


-- ================================================================
-- 六、邀请裂变模块
-- ================================================================

-- 邀请记录表 (invitation)
DROP TABLE IF EXISTS `invitation`;
CREATE TABLE `invitation` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键，自增',
  `inviter_id` BIGINT NOT NULL COMMENT '邀请者用户ID',
  `invitee_id` BIGINT DEFAULT NULL COMMENT '被邀请者用户ID',
  `invite_code` VARCHAR(50) DEFAULT NULL COMMENT '邀请码',
  `status` TINYINT DEFAULT 0 COMMENT '状态（0-未完成 1-已完成）被邀请者上传简历后标记为已完成',
  `reward_status` TINYINT DEFAULT 0 COMMENT '奖励发放状态（0-未发放 1-已发放）',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '邀请时间',
  `completed_at` DATETIME DEFAULT NULL COMMENT '完成时间',
  PRIMARY KEY (`id`),
  KEY `idx_inviter_id` (`inviter_id`),
  KEY `idx_invitee_id` (`invitee_id`),
  KEY `idx_invite_code` (`invite_code`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='邀请记录表';


-- 邀请奖励表 (invitation_reward)
DROP TABLE IF EXISTS `invitation_reward`;
CREATE TABLE `invitation_reward` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键，自增',
  `user_id` BIGINT NOT NULL COMMENT '用户ID（获奖者）',
  `invitation_id` BIGINT NOT NULL COMMENT '邀请记录ID',
  `reward_type` VARCHAR(50) DEFAULT NULL COMMENT '奖励类型（optimize_count-优化次数 vip_days-VIP天数）',
  `reward_value` INT DEFAULT NULL COMMENT '奖励数值（次数或天数）',
  `reward_desc` VARCHAR(200) DEFAULT NULL COMMENT '奖励描述',
  `status` TINYINT DEFAULT 0 COMMENT '状态（0-待发放 1-已发放）',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `granted_at` DATETIME DEFAULT NULL COMMENT '发放时间',
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_invitation_id` (`invitation_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='邀请奖励表';


-- ================================================================
-- 七、用户行为模块
-- ================================================================

-- 用户行为日志表 (user_behavior_log)
DROP TABLE IF EXISTS `user_behavior_log`;
CREATE TABLE `user_behavior_log` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键，自增',
  `user_id` BIGINT NOT NULL COMMENT '用户ID',
  `behavior_type` VARCHAR(50) DEFAULT NULL COMMENT '行为类型（upload_resume-上传简历/view_job-查看岗位/collect_job-收藏岗位/view_strategy-查看攻略/collect_strategy-收藏攻略/optimize_resume-优化简历）',
  `target_id` BIGINT DEFAULT NULL COMMENT '目标对象ID（如岗位ID、攻略ID）',
  `target_type` VARCHAR(50) DEFAULT NULL COMMENT '目标对象类型（job/strategy/resume）',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '行为时间',
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_behavior_type` (`behavior_type`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户行为日志表';


-- 简历优化记录表 (resume_optimization_log)
DROP TABLE IF EXISTS `resume_optimization_log`;
CREATE TABLE `resume_optimization_log` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键，自增',
  `user_id` BIGINT NOT NULL COMMENT '用户ID',
  `resume_id` BIGINT NOT NULL COMMENT '简历ID',
  `optimization_type` VARCHAR(50) DEFAULT 'ai_optimize' COMMENT '优化类型（ai_optimize-AI优化）',
  `optimization_result` TEXT DEFAULT NULL COMMENT '优化建议内容（JSON格式）',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '优化时间',
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_resume_id` (`resume_id`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='简历优化记录表';


-- ================================================================
-- 八、系统管理模块
-- ================================================================

-- 系统配置表 (system_config)
DROP TABLE IF EXISTS `system_config`;
CREATE TABLE `system_config` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键，自增',
  `config_key` VARCHAR(100) NOT NULL COMMENT '配置键（唯一）',
  `config_value` TEXT DEFAULT NULL COMMENT '配置值',
  `config_desc` VARCHAR(500) DEFAULT NULL COMMENT '配置描述',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_config_key` (`config_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统配置表';


-- 管理员表 (admin)
DROP TABLE IF EXISTS `admin`;
CREATE TABLE `admin` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键，自增',
  `username` VARCHAR(50) NOT NULL COMMENT '管理员账号',
  `password` VARCHAR(255) NOT NULL COMMENT '密码（加密）',
  `real_name` VARCHAR(50) DEFAULT NULL COMMENT '真实姓名',
  `phone` VARCHAR(20) DEFAULT NULL COMMENT '联系电话',
  `role` VARCHAR(50) DEFAULT 'admin' COMMENT '角色（super_admin-超级管理员 admin-普通管理员）',
  `status` TINYINT DEFAULT 1 COMMENT '状态（0-禁用 1-正常）',
  `last_login_time` DATETIME DEFAULT NULL COMMENT '最后登录时间',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='管理员表';

-- 插入管理员密码数据
INSERT INTO `admin` (`username`, `password`, `real_name`, `phone`, `role`, `status`) VALUES
    ('admin', '$2a$10$kyWBa6ldoe7DNdSPPFqki.DszhuHQf82G1sxmUAiWbbd7KP6JxuE2', '系统管理员', '13800138000',
     'super_admin', 1);
-- ================================================================
-- 九、AI对话模块
-- ================================================================

-- AI对话会话表 (chat_session)
DROP TABLE IF EXISTS `chat_session`;
CREATE TABLE `chat_session` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键，自增',
  `user_id` BIGINT NOT NULL COMMENT '用户ID',
  `session_type` VARCHAR(50) DEFAULT 'resume_diagnosis' COMMENT '会话类型（resume_diagnosis-简历诊断）',
  `resume_id` BIGINT DEFAULT NULL COMMENT '关联的简历ID',
  `title` VARCHAR(200) DEFAULT '简历诊断对话' COMMENT '会话标题',
  `status` TINYINT DEFAULT 1 COMMENT '状态（0-已结束 1-进行中）',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_resume_id` (`resume_id`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='AI对话会话表';


-- AI对话消息表 (chat_message)
DROP TABLE IF EXISTS `chat_message`;
CREATE TABLE `chat_message` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键，自增',
  `session_id` BIGINT NOT NULL COMMENT '会话ID',
  `role` VARCHAR(20) NOT NULL COMMENT '角色（user-用户 assistant-AI助手 system-系统）',
  `content` TEXT NOT NULL COMMENT '消息内容',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_session_id` (`session_id`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='AI对话消息表';


-- ================================================================
-- 建表脚本结束
-- ================================================================
