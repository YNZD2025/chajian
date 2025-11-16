-- ================================================================
-- 一念职达（ApplyMind）数据库初始化数据
-- ================================================================

USE applymind;

-- ================================================================
-- 一、会员系统配置数据
-- ================================================================

-- 插入会员产品配置
INSERT INTO `system_config` (`config_key`, `config_value`, `config_desc`) VALUES
('membership_price_monthly', '9.9', '月度VIP价格（元）'),
('membership_price_quarterly', '24.9', '季度VIP价格（元）'),
('membership_price_yearly', '79.9', '年度VIP价格（元）'),
('membership_days_monthly', '30', '月度VIP天数'),
('membership_days_quarterly', '90', '季度VIP天数'),
('membership_days_yearly', '365', '年度VIP天数'),
('membership_optimize_count_monthly', '0', '月度VIP赠送优化次数'),
('membership_optimize_count_quarterly', '3', '季度VIP赠送优化次数'),
('membership_optimize_count_yearly', '10', '年度VIP赠送优化次数'),
('free_optimize_count', '1', '普通用户免费优化次数');

-- ================================================================
-- 二、会员等级说明
-- ================================================================
-- membership_level 字段说明：
-- 1 - 月度VIP（30天，0次优化，9.9元）
-- 2 - 季度VIP（90天，3次优化，29.9元）
-- 3 - 年度VIP（365天，10次优化，79.9元）

-- is_author 字段说明：
-- 0 - 普通用户
-- 1 - 作者（可发布攻略文章，独立身份）

-- ================================================================
-- 三、VIP时长叠加机制说明
-- ================================================================

-- 【核心原理】：各等级VIP天数独立存储，按优先级消费

-- 1. 购买机制：
--    - 购买月度VIP：monthly_vip_days += 30，optimize_count += 30
--    - 购买季度VIP：quarterly_vip_days += 90，optimize_count += 100
--    - 购买年度VIP：yearly_vip_days += 365，optimize_count += 500
--    - 所有购买都是叠加，不限次数，不限等级

-- 2. 当前激活等级计算：
--    IF yearly_vip_days > 0 THEN 当前等级 = 年度VIP (3)
--    ELSE IF quarterly_vip_days > 0 THEN 当前等级 = 季度VIP (2)
--    ELSE IF monthly_vip_days > 0 THEN 当前等级 = 月度VIP (1)
--    ELSE 当前等级 = 普通用户 (0)

-- 3. 天数消费逻辑（每天凌晨执行）：
--    IF yearly_vip_days > 0 THEN yearly_vip_days -= 1
--    ELSE IF quarterly_vip_days > 0 THEN quarterly_vip_days -= 1
--    ELSE IF monthly_vip_days > 0 THEN monthly_vip_days -= 1

-- ================================================================
-- 四、使用场景示例
-- ================================================================

-- 【场景1：叠加购买】
-- 用户当前状态：月度VIP还剩10天
-- 操作：购买年度VIP
-- 结果：
--   monthly_vip_days = 10（保持不变）
--   yearly_vip_days = 365（新增）
--   当前等级 = 年度VIP（3）
--   从今天起享受年度VIP权益

-- 【场景2：自动降级】
-- 用户当前状态：月度10天、季度0天、年度365天
-- 使用365天后：
--   monthly_vip_days = 10
--   quarterly_vip_days = 0
--   yearly_vip_days = 0（用完了）
--   当前等级 = 月度VIP（1）
--   自动降级为月度VIP
-- 再使用10天后：
--   所有天数用完，自动降为普通用户

-- 【场景3：混合购买】
-- 用户先买月度VIP（30天），用了20天后（剩10天）
-- 再买季度VIP（90天），用了80天后（剩10天）
-- 再买年度VIP（365天）
-- 状态：
--   monthly_vip_days = 10
--   quarterly_vip_days = 10
--   yearly_vip_days = 365
--   当前等级 = 年度VIP（3）
-- 消费顺序：先消费365天年度 → 再消费10天季度 → 再消费10天月度
-- 总计可用VIP天数：385天

-- 【场景4：优化次数叠加】
-- 购买月度VIP：optimize_count += 30
-- 购买季度VIP：optimize_count += 100
-- 购买年度VIP：optimize_count += 500
-- 所有次数累加，共享使用，不区分等级
-- 示例：买了1次月度+1次季度+1次年度 = 630次优化

-- ================================================================
-- 五、作者身份说明
-- ================================================================

-- 作者是独立的身份标识，与VIP无关
-- 设置方式：
--   UPDATE user_membership SET is_author = 1 WHERE user_id = ?;
-- 
-- 作者权限：
--   1. 发布攻略文章（strategy表）
--   2. 编辑自己的文章
--   3. 查看文章数据统计
-- 
-- 作者与VIP：
--   - 作者可以同时拥有VIP身份
--   - 作者不拥有VIP时，按普通用户权益
--   - 作者拥有VIP时，享受对应VIP权益
--   - 作者身份不会过期

-- ================================================================
-- 六、SQL示例
-- ================================================================

-- 【查询用户当前会员等级】
SELECT 
  user_id,
  CASE 
    WHEN yearly_vip_days > 0 THEN 3
    WHEN quarterly_vip_days > 0 THEN 2
    WHEN monthly_vip_days > 0 THEN 1
    ELSE 0
  END AS current_level,
  CASE 
    WHEN yearly_vip_days > 0 THEN '年度VIP'
    WHEN quarterly_vip_days > 0 THEN '季度VIP'
    WHEN monthly_vip_days > 0 THEN '月度VIP'
    ELSE '普通用户'
  END AS level_name,
  monthly_vip_days + quarterly_vip_days + yearly_vip_days AS total_vip_days,
  resume_optimize_count,
  is_author
FROM user_membership
WHERE user_id = 1;

-- 【购买月度VIP】
UPDATE user_membership
SET monthly_vip_days = monthly_vip_days + 30,
    resume_optimize_count = resume_optimize_count + 30,
    updated_at = NOW()
WHERE user_id = 1;

-- 【购买年度VIP】
UPDATE user_membership
SET yearly_vip_days = yearly_vip_days + 365,
    resume_optimize_count = resume_optimize_count + 500,
    updated_at = NOW()
WHERE user_id = 1;

-- 【每日消费VIP天数（定时任务）】
UPDATE user_membership
SET yearly_vip_days = CASE 
    WHEN yearly_vip_days > 0 THEN yearly_vip_days - 1
    ELSE 0
  END,
  quarterly_vip_days = CASE 
    WHEN yearly_vip_days = 0 AND quarterly_vip_days > 0 THEN quarterly_vip_days - 1
    ELSE quarterly_vip_days
  END,
  monthly_vip_days = CASE 
    WHEN yearly_vip_days = 0 AND quarterly_vip_days = 0 AND monthly_vip_days > 0 THEN monthly_vip_days - 1
    ELSE monthly_vip_days
  END,
  last_consume_date = CURDATE(),
  updated_at = NOW()
WHERE user_id = 1
  AND (yearly_vip_days > 0 OR quarterly_vip_days > 0 OR monthly_vip_days > 0)
  AND (last_consume_date IS NULL OR last_consume_date < CURDATE());

-- 【使用优化次数】
UPDATE user_membership
SET resume_optimize_count = resume_optimize_count - 1,
    total_optimized = total_optimized + 1,
    updated_at = NOW()
WHERE user_id = 1 AND resume_optimize_count > 0;

-- 【设置作者身份】
UPDATE user_membership
SET is_author = 1,
    updated_at = NOW()
WHERE user_id = 1;

-- ================================================================
-- 七、定时任务说明
-- ================================================================

-- 任务1：每天凌晨1点消费VIP天数
-- Cron: 0 0 1 * * ?
-- 逻辑：按优先级（年度→季度→月度）消费1天
-- 注意：使用 last_consume_date 避免重复消费

-- 任务2：每天上午9点发送VIP到期提醒
-- Cron: 0 0 9 * * ?
-- 逻辑：
--   1. 计算总剩余天数 = monthly + quarterly + yearly
--   2. 如果总天数 <= 3，发送提醒
--   3. 提醒内容：您的VIP还剩X天，即将到期

-- ================================================================
-- 初始化数据结束
-- ================================================================
