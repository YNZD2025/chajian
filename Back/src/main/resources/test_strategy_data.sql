-- 攻略文章测试数据
-- 请在MySQL中执行此脚本来创建测试数据

USE applymind;

-- 插入测试文章
INSERT INTO strategy (title, category, summary, content, author, is_vip_only, read_count, collect_count, status, publish_time) VALUES
('如何写出让HR眼前一亮的简历', '简历技巧', '从HR视角解读简历优化技巧,帮你提升面试邀约率',
'<h2>简历的重要性</h2><p>简历是你的第一张名片,一份优秀的简历能让你在众多求职者中脱颖而出。</p><h2>核心要点</h2><ul><li>突出项目经验</li><li>量化工作成果</li><li>使用STAR法则</li></ul>',
'张HR', 0, 1280, 45, 1, NOW()),

('面试中的STAR法则详解', '面试攻略', '掌握STAR法则,让你的面试回答更有说服力',
'<h2>什么是STAR法则</h2><p>STAR法则是一种结构化的回答方式。</p><ul><li>S - Situation 情境</li><li>T - Task 任务</li><li>A - Action 行动</li><li>R - Result 结果</li></ul>',
'李老师', 0, 890, 32, 1, NOW()),

('谈薪资的5个黄金技巧', '谈薪技巧', '薪资谈判不是博弈,而是双赢的艺术',
'<h2>准备工作</h2><p>在谈薪之前,你需要做好充分的准备。</p><h2>核心技巧</h2><ol><li>了解市场行情</li><li>展示自己的价值</li><li>给出合理范围</li><li>谈判时机很重要</li><li>不要急于答应</li></ol>',
'王顾问', 0, 1520, 78, 1, NOW()),

('互联网行业求职全攻略', '行业求职', '2024年互联网行业求职趋势分析和应对策略',
'<h2>行业现状</h2><p>互联网行业正在经历深刻变革...</p><h2>求职建议</h2><p>1. 提升核心竞争力<br>2. 关注新兴领域<br>3. 注重软实力培养</p>',
'行业专家', 0, 2100, 95, 1, NOW()),

('零基础转行程序员指南', '转行攻略', '给想转行做程序员的人的完整学习路径',
'<h2>转行可行性分析</h2><p>程序员是一个相对容易转行的职业...</p><h2>学习路径</h2><ul><li>第一阶段:基础语法(2-3个月)</li><li>第二阶段:项目实战(3-6个月)</li><li>第三阶段:求职准备(1-2个月)</li></ul>',
'技术大牛', 1, 3500, 156, 1, NOW()),

('简历中的自我评价怎么写', '简历技巧', '避免千篇一律的自我评价,展现你的独特性',
'<h2>常见误区</h2><p>很多人的自我评价都是"吃苦耐劳、责任心强"...</p><h2>正确写法</h2><p>用具体事例支撑你的评价,让HR看到真实的你。</p>',
'职场导师', 0, 980, 41, 1, NOW()),

('行为面试题的应对策略', '面试攻略', '如何回答"请举例说明..."类型的面试题',
'<h2>什么是行为面试</h2><p>行为面试是基于"过去的行为能预测未来表现"的理论。</p><h2>应对技巧</h2><p>准备3-5个核心故事,涵盖不同场景...</p>',
'面试官', 0, 1650, 68, 1, NOW()),

('大厂 vs 小公司,如何选择', '行业求职', '分析不同规模公司的优劣势,帮你做出明智选择',
'<h2>大公司的优势</h2><ul><li>完善的培训体系</li><li>规范的流程</li><li>品牌背书</li></ul><h2>小公司的优势</h2><ul><li>快速成长</li><li>多元化锻炼</li><li>更大的发挥空间</li></ul>',
'职业规划师', 0, 1890, 72, 1, NOW());

-- 再插入几篇草稿状态的文章(用于测试管理端)
INSERT INTO strategy (title, category, summary, content, author, is_vip_only, read_count, collect_count, status, publish_time) VALUES
('如何准备技术面试(草稿)', '面试攻略', '技术面试的准备要点', '<p>内容待完善...</p>', '编辑中', 0, 0, 0, 0, NULL),
('产品经理求职指南(草稿)', '行业求职', '产品经理的职业发展路径', '<p>大纲已完成,待补充内容...</p>', '编辑中', 0, 0, 0, 0, NULL);

-- 插入测试图片数据（为前3篇文章添加多张图片）
INSERT INTO strategy_image (strategy_id, image_url, image_title, is_cover, sort_order) VALUES
-- 第1篇文章的图片
(1, 'https://picsum.photos/600/800?random=1', '简历模板示例', 1, 0),
(1, 'https://picsum.photos/600/800?random=2', '简历布局对比', 0, 1),
(1, 'https://picsum.photos/600/800?random=3', 'HR评审要点', 0, 2),

-- 第2篇文章的图片
(2, 'https://picsum.photos/600/800?random=4', 'STAR法则示意图', 1, 0),
(2, 'https://picsum.photos/600/800?random=5', '回答框架模板', 0, 1),

-- 第3篇文章的图片
(3, 'https://picsum.photos/600/800?random=6', '薪资谈判场景', 1, 0),
(3, 'https://picsum.photos/600/800?random=7', '市场薪资范围', 0, 1),
(3, 'https://picsum.photos/600/800?random=8', '谈判技巧总结', 0, 2),
(3, 'https://picsum.photos/600/800?random=9', '成功案例分享', 0, 3);

SELECT 'Test data inserted successfully! Total strategy records:', COUNT(*) FROM strategy;
SELECT 'Test image records:', COUNT(*) FROM strategy_image;
