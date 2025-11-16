-- 测试用户数据
-- 用于测试用户列表管理功能
-- 使用方法：在MySQL中执行此脚本

USE applymind;

-- 插入10个测试用户
INSERT INTO `user` (`openid`, `nickname`, `avatar`, `phone`, `email`, `gender`, `tags`, `is_vip`, `vip_expire_time`, `resume_optimize_count`, `status`, `created_at`, `updated_at`, `last_login_time`) VALUES
('test_openid_001', '张三', 'https://thirdwx.qlogo.cn/mmopen/vi_32/Q0j4TwGTfTJxiaP9VIiahcQJkDgVYPQCLgU4oS1KibWibJMxOvz4lfkiclK2YsL0GE0qhfWXr8H9S2t3dibibZMDxribg/132', '13800138001', 'zhangsan@example.com', 1, '["应届生","求职中"]', 0, NULL, 3, 1, '2024-01-15 10:00:00', NOW(), '2024-10-30 15:30:00'),
('test_openid_002', '李四', 'https://thirdwx.qlogo.cn/mmopen/vi_32/Q0j4TwGTfTJxiaP9VIiahcQJkDgVYPQCLgU4oS1KibWibJMxOvz4lfkiclK2YsL0GE0qhfWXr8H9S2t3dibibZMDxribg/132', '13800138002', 'lisi@example.com', 2, '["VIP用户","简历优化"]', 1, '2025-12-31 23:59:59', 10, 1, '2024-02-20 11:20:00', NOW(), '2024-10-31 09:15:00'),
('test_openid_003', '王五', 'https://thirdwx.qlogo.cn/mmopen/vi_32/Q0j4TwGTfTJxiaP9VIiahcQJkDgVYPQCLgU4oS1KibWibJMxOvz4lfkiclK2YsL0GE0qhfWXr8H9S2t3dibibZMDxribg/132', '13800138003', 'wangwu@example.com', 1, '["在职跳槽"]', 0, NULL, 2, 1, '2024-03-10 14:30:00', NOW(), '2024-10-29 16:45:00'),
('test_openid_004', '赵六', NULL, '13800138004', NULL, 0, NULL, 0, NULL, 3, 0, '2024-04-05 09:00:00', NOW(), '2024-10-28 10:00:00'),
('test_openid_005', '孙七', 'https://thirdwx.qlogo.cn/mmopen/vi_32/Q0j4TwGTfTJxiaP9VIiahcQJkDgVYPQCLgU4oS1KibWibJMxOvz4lfkiclK2YsL0GE0qhfWXr8H9S2t3dibibZMDxribg/132', '13800138005', 'sunqi@example.com', 2, '["VIP用户","高频使用"]', 1, '2026-06-30 23:59:59', 20, 1, '2024-05-12 13:15:00', NOW(), '2024-10-31 08:20:00'),
('test_openid_006', '周八', 'https://thirdwx.qlogo.cn/mmopen/vi_32/Q0j4TwGTfTJxiaP9VIiahcQJkDgVYPQCLgU4oS1KibWibJMxOvz4lfkiclK2YsL0GE0qhfWXr8H9S2t3dibibZMDxribg/132', '13800138006', 'zhouba@example.com', 1, '["应届生"]', 0, NULL, 1, 1, '2024-06-18 16:40:00', NOW(), '2024-10-30 14:30:00'),
('test_openid_007', '吴九', NULL, '13800138007', 'wujiu@example.com', 2, NULL, 0, NULL, 3, 1, '2024-07-22 10:10:00', NOW(), '2024-10-27 11:00:00'),
('test_openid_008', '郑十', 'https://thirdwx.qlogo.cn/mmopen/vi_32/Q0j4TwGTfTJxiaP9VIiahcQJkDgVYPQCLgU4oS1KibWibJMxOvz4lfkiclK2YsL0GE0qhfWXr8H9S2t3dibibZMDxribg/132', '13800138008', NULL, 1, '["VIP用户"]', 1, '2025-03-31 23:59:59', 5, 1, '2024-08-15 12:25:00', NOW(), '2024-10-31 07:50:00'),
('test_openid_009', '冯十一', 'https://thirdwx.qlogo.cn/mmopen/vi_32/Q0j4TwGTfTJxiaP9VIiahcQJkDgVYPQCLgU4oS1KibWibJMxOvz4lfkiclK2YsL0GE0qhfWXr8H9S2t3dibibZMDxribg/132', '13800138009', 'feng11@example.com', 2, '["在职跳槽","简历优化"]', 0, NULL, 0, 1, '2024-09-05 15:35:00', NOW(), '2024-10-26 13:20:00'),
('test_openid_010', '陈十二', NULL, '13800138010', 'chen12@example.com', 1, NULL, 0, NULL, 3, 0, '2024-10-01 08:50:00', NOW(), '2024-10-25 09:30:00');

-- 查询验证
SELECT id, nickname, phone, is_vip, status, created_at FROM user ORDER BY created_at DESC LIMIT 10;
