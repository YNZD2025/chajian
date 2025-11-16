/**
 * 字段扫描器
 * 负责扫描页面所有表单字段，提取字段信息
 */

class FieldScanner {
    constructor() {
        this.fields = [];
        this.scannedAt = null;
        this.highlighter = new Highlighter(); // ⭐ 新增：高亮工具实例
    }

    /**
     * 扫描页面中的所有表单字段
     * @param {HTMLElement} root - 扫描的根元素，默认为 document.body
     * @returns {Array} 字段信息数组
     */
    async scan(root = document.body) {
        console.log('[FieldScanner] 开始扫描表单字段...');

        this.fields = [];
        this.scannedAt = Date.now();

        // 1. 先展开所有动态表单（点击所有"添加"按钮）
        await this.expandDynamicSections(root);

        // 2. 查找所有表单字段
        const allFields = DOMUtils.findAllFormFields(root);
        console.log(`[FieldScanner] 找到 ${allFields.length} 个字段`);

        // 3. 分析每个字段
        for (let i = 0; i < allFields.length; i++) {
            try {
                const element = allFields[i];
                const fieldInfo = this.analyzeField(element);

                if (fieldInfo && fieldInfo.visible) {
                    // ⭐ 添加字段索引（用于唯一标识）
                    fieldInfo.index = this.fields.length;
                    this.fields.push(fieldInfo);
                }
            } catch (error) {
                console.error('[FieldScanner] 分析字段失败:', allFields[i], error);
            }
        }

        // ⭐⭐⭐ 新增步骤4: 触发弹窗并收集动态选项（与求职方舟对齐）
        await this.collectDynamicOptions();

        console.log(`[FieldScanner] 扫描完成，有效字段: ${this.fields.length}`);
        return this.fields;
    }

    /**
     * 展开动态表单区域（点击所有"添加"按钮）
     * @param {HTMLElement} root
     */
    async expandDynamicSections(root) {
        console.log('[FieldScanner] 开始展开动态表单区域...');

        // 找到所有添加按钮
        const addButtons = DOMUtils.findAddButtons();
        if (addButtons.length === 0) {
            console.log('[FieldScanner] 没有找到添加按钮');
            return;
        }

        console.log(`[FieldScanner] 找到 ${addButtons.length} 个添加按钮，准备全部点击`);

        // 点击所有按钮
        let clickedCount = 0;
        for (const button of addButtons) {
            try {
                // 滚动到按钮位置
                button.scrollIntoView({ block: "center" });
                await DOMUtils.delay(100);

                // 点击按钮
                await EventSimulator.click(button);
                await DOMUtils.delay(300);

                clickedCount++;
                console.log(`[FieldScanner] ✓ 点击添加按钮 ${clickedCount}/${addButtons.length}`);
            } catch (error) {
                console.error('[FieldScanner] 点击按钮失败:', error);
            }
        }

        console.log(`[FieldScanner] 展开完成，共点击 ${clickedCount} 个按钮`);
        await DOMUtils.delay(500); // 等待所有DOM更新完成
    }


    /**
     * 分析单个字段
     * @param {HTMLElement} element
     * @returns {Object} 字段信息
     */
    analyzeField(element) {
        const tagName = element.tagName;
        const type = element.type || 'text';

        // 基础信息
        const fieldInfo = {
            element: element,
            tagName: tagName,
            type: type,
            name: element.name || '',
            id: element.id || '',
            className: element.className || '',

            // 提取文本信息
            label: DOMUtils.cleanText(DOMUtils.getLabel(element)),
            placeholder: DOMUtils.cleanText(DOMUtils.getPlaceholder(element)),

            // ✅ 新增：提取 section 和 context 信息
            section: this.extractSection(element),
            context: this.extractContext(element),

            // 属性
            required: element.required || element.hasAttribute('required'),
            readonly: element.readOnly || element.hasAttribute('readonly'),
            disabled: element.disabled || element.hasAttribute('disabled'),

            // 可见性
            visible: DOMUtils.isVisible(element),

            // 特殊属性
            maxLength: element.maxLength > 0 ? element.maxLength : null,
            pattern: element.pattern || null,

            // 位置信息
            rect: element.getBoundingClientRect(),

            // 选项（如果是 select/radio）
            options: this.extractOptions(element)
        };

        // ✅ 字段分类（使用增强的 context 信息）
        fieldInfo.fieldType = this.classifyField(fieldInfo);

        return fieldInfo;
    }

    /**
     * 提取字段所属的 section（区块标题）
     * @param {HTMLElement} element
     * @returns {string}
     */
    extractSection(element) {
        let currentElement = element.parentElement;
        const maxDepth = 10; // 最多向上查找10层
        let depth = 0;

        while (currentElement && currentElement !== document.body && depth < maxDepth) {
            // 查找该层级的标题元素
            const headings = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
            for (const heading of headings) {
                const headingEl = currentElement.querySelector(heading);
                if (headingEl) {
                    const text = headingEl.textContent.trim();
                    if (text && text.length < 100) {
                        return text;
                    }
                }
            }

            // 查找带有 title、legend、label 等类名的元素
            const titleSelectors = [
                '.title', '.section-title', '.form-title',
                '.header', '.section-header',
                'legend', '.legend'
            ];

            for (const selector of titleSelectors) {
                const titleEl = currentElement.querySelector(selector);
                if (titleEl && DOMUtils.isVisible(titleEl)) {
                    const text = titleEl.textContent.trim();
                    if (text && text.length < 100) {
                        return text;
                    }
                }
            }

            // 检查当前元素自身是否有 data-title 等属性
            if (currentElement.dataset?.title) {
                return currentElement.dataset.title;
            }
            if (currentElement.dataset?.section) {
                return currentElement.dataset.section;
            }

            currentElement = currentElement.parentElement;
            depth++;
        }

        return '';
    }

    /**
     * 提取字段的上下文信息（周围的文本）
     * @param {HTMLElement} element
     * @returns {string}
     */
    extractContext(element) {
        const contextParts = [];

        // 1. 获取父容器的文本（不包括子元素的文本）
        const parent = element.parentElement;
        if (parent) {
            // 获取父元素的直接文本节点
            const textNodes = Array.from(parent.childNodes).filter(
                node => node.nodeType === Node.TEXT_NODE && node.textContent.trim()
            );
            textNodes.forEach(node => {
                const text = node.textContent.trim();
                if (text.length > 0 && text.length < 50) {
                    contextParts.push(text);
                }
            });
        }

        // 2. 获取相邻的前后兄弟元素的文本
        const prevSibling = element.previousElementSibling;
        if (prevSibling && DOMUtils.isVisible(prevSibling)) {
            const text = prevSibling.textContent.trim();
            if (text && text.length < 100) {
                contextParts.push(text);
            }
        }

        const nextSibling = element.nextElementSibling;
        if (nextSibling && DOMUtils.isVisible(nextSibling)) {
            const text = nextSibling.textContent.trim();
            if (text && text.length < 100) {
                contextParts.push(text);
            }
        }

        // 3. 检查是否在列表项中
        let listItem = element.closest('li, tr, .item, .row');
        if (listItem) {
            const itemText = Array.from(listItem.childNodes)
                .filter(node => node.nodeType === Node.TEXT_NODE)
                .map(node => node.textContent.trim())
                .filter(text => text.length > 0 && text.length < 50)
                .join(' ');

            if (itemText) {
                contextParts.push(itemText);
            }
        }

        return contextParts.join(' | ');
    }

    /**
     * 分类字段类型（用于后续AI匹配） - 增强版
     * @param {Object} fieldInfo - 字段信息对象（包含 element, label, placeholder, section, context, options）
     * @returns {string}
     */
    classifyField(fieldInfo) {
        const element = fieldInfo.element || fieldInfo;
        const label = (fieldInfo.label || DOMUtils.getLabel(element) || '').toLowerCase();
        const placeholder = (fieldInfo.placeholder || DOMUtils.getPlaceholder(element) || '').toLowerCase();
        const section = (fieldInfo.section || '').toLowerCase();
        const context = (fieldInfo.context || '').toLowerCase();
        const name = (element.name || '').toLowerCase();
        const id = (element.id || '').toLowerCase();

        // ✅ 组合所有文本信息进行匹配
        const combined = `${label} ${placeholder} ${section} ${context} ${name} ${id}`;

        // ✅ 如果是 select/search 类型，分析选项内容
        if (fieldInfo.options && fieldInfo.options.length > 0) {
            const optionsText = fieldInfo.options
                .map(opt => opt.text)
                .join(' ')
                .toLowerCase();

            const fieldTypeFromOptions = this.inferFieldTypeFromOptions(optionsText, combined);
            if (fieldTypeFromOptions !== 'unknown') {
                return fieldTypeFromOptions;
            }
        }

        // ✅ 使用 section 信息辅助判断
        const sectionHint = this.getFieldTypeFromSection(section);

        // 基本信息
        if (/姓名|name/i.test(combined)) return 'name';
        if (/性别|gender/i.test(combined)) return 'gender';
        if (/(手机|电话|联系方式|phone|mobile|tel)/i.test(combined)) return 'phone';
        if (/(邮箱|email|e-mail)/i.test(combined)) return 'email';
        if (/(出生|生日|birthday|birth)/i.test(combined)) return 'birthday';
        if (/(年龄|age)/i.test(combined)) return 'age';
        if (/(民族|ethnicity)/i.test(combined)) return 'ethnicity';
        if (/(政治面貌|党派|political)/i.test(combined)) return 'political';
        if (/(身份证|id card)/i.test(combined)) return 'idCard';

        // 地址相关
        if (/(居住|现居|所在地|address|location)/i.test(combined)) return 'address';
        if (/(籍贯|户籍|户口|native)/i.test(combined)) return 'hometown';
        if (/(省|province)/i.test(combined)) return 'province';
        if (/(市|city)/i.test(combined)) return 'city';
        if (/(区|县|district)/i.test(combined)) return 'district';

        // 教育经历
        if (/(学校|院校|university|college|school)/i.test(combined)) return 'school';
        if (/(专业|major)/i.test(combined)) return 'major';
        if (/(学历|education)/i.test(combined) && !/(学位|degree)/i.test(combined)) return 'education';
        if (/(学位|degree)/i.test(combined)) return 'degree';
        if (/(GPA|绩点|成绩)/i.test(combined)) return 'gpa';

        // ✅ 改进时间字段识别 - 结合 section 信息
        if (this.isTimeField(combined, section, element.type)) {
            if (sectionHint === 'education') {
                if (/(入学|开始|start)/i.test(combined)) return 'educationStartDate';
                if (/(毕业|结束|end|graduation)/i.test(combined)) return 'educationEndDate';
            } else if (sectionHint === 'work') {
                if (/(入职|开始|start)/i.test(combined)) return 'workStartDate';
                if (/(离职|结束|end)/i.test(combined)) return 'workEndDate';
            } else if (sectionHint === 'project') {
                if (/(开始|start)/i.test(combined)) return 'projectStartDate';
                if (/(结束|end)/i.test(combined)) return 'projectEndDate';
            } else {
                // 通用时间字段
                if (/(入学|开始|start)/i.test(combined)) return 'startDate';
                if (/(毕业|结束|end|graduation)/i.test(combined)) return 'endDate';
            }
        }

        // 工作经历
        if (/(公司|单位|企业|company|organization)/i.test(combined)) return 'company';
        if (/(职位|岗位|position|job title)/i.test(combined)) return 'position';
        if (/(工作内容|职责|responsibilities|description)/i.test(combined)) return 'jobDescription';

        // 项目经历
        if (/(项目名称|project name)/i.test(combined)) return 'projectName';
        if (/(项目描述|project description)/i.test(combined)) return 'projectDescription';
        if (/(项目角色|role)/i.test(combined)) return 'projectRole';

        // ✅ 技能、证书、语言
        if (/(技能|skill)/i.test(combined)) return 'skill';
        if (/(掌握程度|熟练度|proficiency)/i.test(combined)) return 'skillLevel';
        if (/(语言能力|外语|language)/i.test(combined)) return 'languageSkill';
        if (/(证书|资格|certificate)/i.test(combined)) return 'certificate';

        // 求职意向
        if (/(期望薪资|expected salary)/i.test(combined)) return 'expectedSalary';
        if (/(期望职位|desired position)/i.test(combined)) return 'desiredPosition';
        if (/(期望城市|desired city)/i.test(combined)) return 'desiredCity';
        if (/(到岗时间|available date)/i.test(combined)) return 'availableDate';

        // 其他
        if (/(附件|简历|resume|cv|upload)/i.test(combined)) return 'attachment';
        if (/(自我|介绍|评价|self introduction)/i.test(combined)) return 'selfIntroduction';
        if (/(特长|优势|strengths)/i.test(combined)) return 'strengths';

        // ✅ 如果还是无法识别，使用 section 提示
        if (sectionHint !== 'unknown') {
            return sectionHint;
        }

        return 'unknown';
    }

    /**
     * 从选项内容推断字段类型
     * @param {string} optionsText - 所有选项文本（小写）
     * @param {string} combined - 组合的字段信息
     * @returns {string}
     */
    inferFieldTypeFromOptions(optionsText, combined) {
        // 学历选项库
        if (/(大专|本科|硕士|博士|高中|中专|专科|undergraduate|master|phd|bachelor)/i.test(optionsText)) {
            return 'education';
        }

        // 学位选项库
        if (/(学士|硕士|博士|bachelor|master|doctor)/i.test(optionsText) && /(学位|degree)/i.test(combined)) {
            return 'degree';
        }

        // 性别选项
        if (/(男|女|male|female)/i.test(optionsText) && optionsText.split(' ').length <= 3) {
            return 'gender';
        }

        // 政治面貌
        if (/(党员|团员|群众|民主党派)/i.test(optionsText)) {
            return 'political';
        }

        // 语言能力等级
        if (/(流利|熟练|一般|基础|native|fluent|basic)/i.test(optionsText)) {
            return 'languageLevel';
        }

        // 技能水平
        if (/(精通|熟练|了解|expert|proficient|familiar)/i.test(optionsText)) {
            return 'skillLevel';
        }

        return 'unknown';
    }

    /**
     * 从 section 推断字段类型分类
     * @param {string} section - 区块名称
     * @returns {string}
     */
    getFieldTypeFromSection(section) {
        if (/(教育|学历|education)/i.test(section)) return 'education';
        if (/(工作|经历|experience)/i.test(section)) return 'work';
        if (/(项目|project)/i.test(section)) return 'project';
        if (/(技能|skill)/i.test(section)) return 'skill';
        if (/(证书|certificate)/i.test(section)) return 'certificate';
        if (/(语言|language)/i.test(section)) return 'language';
        return 'unknown';
    }

    /**
     * 判断是否为时间字段
     * @param {string} combined - 组合文本
     * @param {string} section - 区块名称
     * @param {string} type - 输入类型
     * @returns {boolean}
     */
    isTimeField(combined, section, type) {
        // type 是 date/month 则一定是时间字段
        if (type === 'date' || type === 'month') {
            return true;
        }

        // 包含时间相关关键词
        if (/(时间|日期|年月|date|time|year|month)/i.test(combined)) {
            return true;
        }

        // 在特定 section 中，包含开始/结束关键词也可能是时间
        if (/(教育|工作|项目|education|work|project)/i.test(section)) {
            if (/(开始|结束|入学|毕业|入职|离职|start|end)/i.test(combined)) {
                return true;
            }
        }

        return false;
    }

    /**
     * 提取选项（select/radio）
     * @param {HTMLElement} element
     * @returns {Array|null}
     */
    extractOptions(element) {
        // SELECT 元素
        if (element.tagName === 'SELECT') {
            const options = Array.from(element.options).map(opt => ({
                value: opt.value,
                text: opt.textContent.trim(),
                selected: opt.selected
            }));

            return options;
        }

        // RADIO 元素
        if (element.type === 'radio') {
            const name = element.name;
            if (!name) return null;

            // 查找同名的所有 radio
            const radios = document.querySelectorAll(`input[type="radio"][name="${name}"]`);

            const options = Array.from(radios).map(radio => {
                // 查找 radio 的标签
                let label = DOMUtils.getLabel(radio);

                // 如果没找到，尝试从父元素获取文本
                if (!label && radio.parentElement) {
                    label = radio.parentElement.textContent.trim();
                }

                return {
                    value: radio.value,
                    text: label,
                    checked: radio.checked,
                    element: radio
                };
            });

            return options;
        }

        return null;
    }

    /**
     * 获取扫描结果
     * @returns {Array}
     */
    getFields() {
        return this.fields;
    }

    /**
     * 根据字段类型过滤
     * @param {string} fieldType
     * @returns {Array}
     */
    getFieldsByType(fieldType) {
        return this.fields.filter(f => f.fieldType === fieldType);
    }

    /**
     * 根据标签名过滤
     * @param {string} tagName
     * @returns {Array}
     */
    getFieldsByTagName(tagName) {
        return this.fields.filter(f => f.tagName === tagName.toUpperCase());
    }

    /**
     * 重新扫描（刷新字段信息）
     */
    async refresh() {
        console.log('[FieldScanner] 刷新字段信息...');
        return await this.scan();
    }

    /**
     * 清空扫描结果
     */
    clear() {
        this.fields = [];
        this.scannedAt = null;
        console.log('[FieldScanner] 已清空扫描结果');
    }

    // ==================== 新增：动态选项收集（与求职方舟对齐）====================

    /**
     * 收集动态选项（点击输入框触发日期选择器/下拉菜单）
     * ⭐ 这是与求职方舟对齐的核心功能
     */
    async collectDynamicOptions() {
        console.log('[FieldScanner] ========== 开始收集动态选项 ==========');

        const domObserver = new DOMObserver();
        let collectedCount = 0;
        let skippedCount = 0;
        const processedGroups = new Set(); // 记录已处理的日期字段组

        for (let i = 0; i < this.fields.length; i++) {
            const field = this.fields[i];
            const element = field.element;

            // 只处理 INPUT 和 TEXTAREA（SELECT/RADIO已经有静态options了）
            if (element.tagName !== 'INPUT' && element.tagName !== 'TEXTAREA') {
                skippedCount++;
                continue;
            }

            // 如果已经有 options，跳过
            if (field.options && field.options.length > 0) {
                skippedCount++;
                continue;
            }

            // ⭐ 检查是否是成对日期字段的第二个（已被处理）
            if (processedGroups.has(field)) {
                skippedCount++;
                console.log(`[FieldScanner] ⏭️ 跳过字段 "${field.label}"（已作为配对字段处理）`);
                continue;
            }

            try {
                // 高亮显示当前正在处理的字段
                this.highlighter.highlight(element, 'yellow', { pulse: true });
                element.scrollIntoView({ block: 'center', behavior: 'smooth' });
                await DOMUtils.delay(200);

                // 开始监听DOM变化
                domObserver.start();

                // 点击并聚焦输入框
                await EventSimulator.click(element);
                await EventSimulator.focus(element);
                await DOMUtils.delay(100);

                // 等待弹窗稳定（关键：等待日期选择器完全渲染）
                await domObserver.waitForStable(300);

                // 获取新增的元素
                const newElements = domObserver.getNewElements();

                // 如果检测到新元素，说明可能有弹窗
                if (newElements.length > 0) {
                    console.log(`[FieldScanner] 字段 "${field.label || field.placeholder}" 检测到 ${newElements.length} 个新元素`);

                    // 多等待一会儿，确保日期选择器完全展开
                    await DOMUtils.delay(500);

                    // 从弹窗中提取选项
                    const options = this.extractOptionsFromPopup(newElements);

                    if (options && options.length > 0) {
                        field.options = options.map(opt => ({
                            text: opt,
                            value: opt
                        }));
                        collectedCount++;

                        // 如果是特殊标记（如"(请填写年月)"），打印日志
                        if (options[0].startsWith('(请填写')) {
                            console.log(`[FieldScanner] ✓ 字段 "${field.label}" 识别为: ${options[0]}`);

                            // ⭐⭐⭐ 检测成对日期字段（开始/结束，入学/毕业等）
                            const pairedField = this.findPairedDateField(field, i);
                            if (pairedField) {
                                // 将相同的 options 赋给配对字段
                                pairedField.options = field.options;
                                processedGroups.add(pairedField);
                                collectedCount++;
                                console.log(`[FieldScanner] 🔗 找到配对字段 "${pairedField.label}"，共享选项: ${options[0]}`);
                            }
                        } else {
                            console.log(`[FieldScanner] ✓ 字段 "${field.label}" 发现选项:`, options.slice(0, 5).join(', '), options.length > 5 ? '...' : '');
                        }
                    }
                }

                // 停止监听
                domObserver.stop();

                // 关闭弹窗
                await this.closePopup(element);

                // 移除高亮
                this.highlighter.remove(element);

                // 短暂延迟，避免操作过快
                await DOMUtils.delay(200);

            } catch (error) {
                console.error(`[FieldScanner] 收集字段 "${field.label}" 的选项失败:`, error);
                domObserver.stop();
                this.highlighter.remove(element);
            }
        }

        console.log('[FieldScanner] ========== 动态选项收集完成 ==========');
        console.log(`[FieldScanner] 共收集 ${collectedCount} 个字段的动态选项`);
        console.log(`[FieldScanner] 跳过 ${skippedCount} 个字段（已有选项或非INPUT/TEXTAREA）`);
    }

    /**
     * 从弹窗中提取选项（识别日期选择器等特殊控件）
     * ⭐ 完全复刻求职方舟的识别逻辑
     * @param {Array} newElements - 新增的DOM元素
     * @returns {Array} 选项数组
     */
    extractOptionsFromPopup(newElements) {
        let options = [];

        for (const element of newElements) {
            // 收集所有可见的文本选项
            const optionList = this.getAllVisibleOptions(element);

            if (optionList.length === 0) continue;

            // ⭐⭐⭐ 检测日期选择器（日期：1-28 + "一二三四五六"）
            if (optionList.length >= 40) {
                const datePattern = "1;2;3;4;5;6;7;8;9;10;11;12;13;14;15;16;17;18;19;20;21;22;23;24;25;26;27;28";
                const chineseNumbers = "一;二;三;四;五;六";
                const joined = optionList.join(";");

                if (joined.includes(datePattern) && joined.includes(chineseNumbers)) {
                    console.log('[FieldScanner] 🗓️ 识别到日期选择器（1-28 + 一二三四五六）');
                    return ["(请填写日期)"];
                }
            }

            // ⭐⭐⭐ 检测年月选择器（12个月份）
            if (optionList.length >= 12) {
                const monthPattern = "1月;2月;3月;4月;5月;6月;7月;8月;9月;10月;11月;12月";
                if (optionList.join(";").includes(monthPattern)) {
                    console.log('[FieldScanner] 📅 识别到年月选择器（1-12月）');
                    return ["(请填写年月)"];
                }
            }

            // ⭐⭐⭐ 检测省份选择器（30+个省份）
            if (optionList.length >= 30) {
                const provinces = ["北京", "天津", "上海", "重庆", "河北", "山西", "辽宁", "吉林", "黑龙江",
                    "江苏", "浙江", "安徽", "福建", "江西", "山东", "河南", "湖北", "湖南", "广东", "海南",
                    "四川", "贵州", "云南", "陕西", "甘肃", "青海", "台湾", "内蒙古", "广西", "西藏",
                    "宁夏", "新疆", "香港", "澳门"];

                let matchCount = 0;
                for (const province of provinces) {
                    if (optionList.some(opt => opt.includes(province))) {
                        matchCount++;
                    }
                }

                if (matchCount >= 30) {
                    console.log('[FieldScanner] 🗺️ 识别到省份选择器');
                    return ["(请填写省份)"];
                }
            }

            // ⭐⭐⭐ 检测民族选择器
            if (optionList.length >= 30) {
                const nations = ["汉族", "蒙古族", "回族", "藏族", "维吾尔族", "苗族", "彝族", "壮族",
                    "布依族", "朝鲜族", "满族", "侗族", "瑶族", "白族", "土家族", "哈尼族", "哈萨克族",
                    "傣族", "黎族", "傈僳族", "佤族", "畲族", "高山族", "拉祜族", "水族"];

                let matchCount = 0;
                for (const nation of nations) {
                    if (optionList.some(opt => opt.includes(nation))) {
                        matchCount++;
                    }
                }

                if (matchCount >= 15) {
                    console.log('[FieldScanner] 👥 识别到民族选择器');
                    return ["(请填写民族)"];
                }
            }

            // ⭐⭐⭐ 检测国家选择器
            if (optionList.length >= 30) {
                const countries = ["中国", "美国", "日本", "德国", "英国", "法国", "意大利", "加拿大",
                    "澳大利亚", "俄罗斯", "印度", "巴西", "韩国", "西班牙", "墨西哥", "印度尼西亚",
                    "土耳其", "沙特阿拉伯", "瑞士", "波兰"];

                let matchCount = 0;
                for (const country of countries) {
                    if (optionList.some(opt => opt.includes(country))) {
                        matchCount++;
                    }
                }

                if (matchCount >= 15) {
                    console.log('[FieldScanner] 🌏 识别到国家选择器');
                    return ["(请填写国家)"];
                }
            }

            // ⭐⭐⭐ 检测连续数字序列（如年份选择器 1950-2025）
            if (optionList.length >= 10) {
                const numbers = [];
                for (const opt of optionList) {
                    const num = parseInt(opt.trim());
                    if (!isNaN(num)) {
                        numbers.push(num);
                    }
                }

                // 如果80%以上是数字
                if (numbers.length >= optionList.length * 0.8) {
                    numbers.sort((a, b) => a - b);

                    // 检查是否连续
                    let isContinuous = true;
                    for (let i = 1; i < numbers.length; i++) {
                        if (numbers[i] !== numbers[i - 1] + 1) {
                            isContinuous = false;
                            break;
                        }
                    }

                    if (isContinuous && numbers.length > 0) {
                        const min = numbers[0];
                        const max = numbers[numbers.length - 1];
                        if (max - min >= 10) {
                            console.log(`[FieldScanner] 🔢 识别到数字序列选择器 (${min}-${max})`);
                            return [`(请填写${min}-${max}中的一个数字)`];
                        }
                    }
                }
            }

            // 如果不是特殊选择器，返回实际选项（限制数量避免过长）
            if (optionList.length >= 2) {
                options = optionList.join(";").length > 1000 ?
                    optionList.slice(0, 100) :
                    optionList;
                break;
            }
        }

        return options;
    }

    /**
     * 获取元素内所有可见的文本选项
     * @param {HTMLElement} container
     * @returns {Array<string>}
     */
    getAllVisibleOptions(container) {
        const options = [];
        const elements = container.querySelectorAll('*');
        let processedParents = new Set(); // 避免重复处理父子元素

        for (const element of elements) {
            if (!DOMUtils.isVisible(element)) continue;

            // 跳过已处理元素的子元素
            let hasProcessedParent = false;
            let parent = element.parentElement;
            while (parent && parent !== container) {
                if (processedParents.has(parent)) {
                    hasProcessedParent = true;
                    break;
                }
                parent = parent.parentElement;
            }
            if (hasProcessedParent) continue;

            // 只取叶子节点的文本（没有子元素，或子元素都是非文本节点）
            let isLeafNode = true;
            for (const child of element.childNodes) {
                if (child.nodeType === Node.ELEMENT_NODE) {
                    // 如果子元素是图标、SVG等，忽略
                    const tagName = child.tagName.toLowerCase();
                    if (['svg', 'i', 'span'].includes(tagName) && child.textContent.trim() === '') {
                        continue;
                    }
                    isLeafNode = false;
                    break;
                }
            }

            if (isLeafNode && element.childNodes.length > 0) {
                const text = element.textContent.trim();
                // 过滤掉过长或过短的文本
                if (text && text.length > 0 && text.length < 50) {
                    // 避免重复添加
                    if (!options.includes(text)) {
                        options.push(text);
                        processedParents.add(element);
                    }
                }
            }
        }

        return options;
    }

    /**
     * 关闭弹窗（点击取消按钮或按ESC键）
     * @param {HTMLElement} inputElement
     */
    async closePopup(inputElement) {
        try {
            // 方法1: 查找取消/关闭按钮（多种模式）
            const cancelSelectors = [
                '[class*="cancel"]', '[class*="close"]', '[class*="取消"]', '[class*="关闭"]',
                '[class*="Cancel"]', '[class*="Close"]',
                '[aria-label*="取消"]', '[aria-label*="关闭"]', '[aria-label*="close"]',
                'button:contains("取消")', 'button:contains("关闭")', 'button:contains("Close")'
            ];

            for (const selector of cancelSelectors) {
                try {
                    const buttons = document.querySelectorAll(selector);
                    for (const button of buttons) {
                        if (DOMUtils.isVisible(button)) {
                            await EventSimulator.click(button);
                            await DOMUtils.delay(100);
                            return;
                        }
                    }
                } catch (e) {
                    // 某些选择器可能不支持，跳过
                    continue;
                }
            }

            // 方法2: 失焦输入框
            await EventSimulator.blur(inputElement);
            await DOMUtils.delay(100);

            // 方法3: 按ESC键
            const escEvent = new KeyboardEvent('keydown', {
                key: 'Escape',
                keyCode: 27,
                code: 'Escape',
                bubbles: true,
                cancelable: true
            });
            document.dispatchEvent(escEvent);
            inputElement.dispatchEvent(escEvent);
            await DOMUtils.delay(100);

            // 方法4: 点击页面其他位置（模拟点击遮罩层）
            const bodyRect = document.body.getBoundingClientRect();
            await EventSimulator.click(document.body, {
                clientX: bodyRect.width / 2,
                clientY: 10
            });
            await DOMUtils.delay(100);

        } catch (error) {
            console.error('[FieldScanner] 关闭弹窗失败:', error);
        }
    }

    /**
     * 查找成对的日期字段（开始/结束、入学/毕业等）
     * @param {Object} currentField - 当前字段对象
     * @param {number} currentIndex - 当前字段在 this.fields 中的索引
     * @returns {Object|null} 配对的字段对象，如果没有找到则返回 null
     */
    findPairedDateField(currentField, currentIndex) {
        if (!currentField.label) return null;

        const label = currentField.label;

        // 常见的日期字段配对模式
        const pairPatterns = [
            { first: '开始', second: '结束' },
            { first: '起始', second: '结束' },
            { first: '入学', second: '毕业' },
            { first: '入职', second: '离职' },
            { first: '起', second: '止' },
            { first: '从', second: '至' },
            { first: 'start', second: 'end' },
            { first: 'begin', second: 'end' },
            { first: 'from', second: 'to' }
        ];

        // 检测当前字段是第一个还是第二个
        let matchedPattern = null;
        let isFirst = false;

        for (const pattern of pairPatterns) {
            if (label.includes(pattern.first)) {
                matchedPattern = pattern;
                isFirst = true;
                break;
            }
            if (label.includes(pattern.second)) {
                matchedPattern = pattern;
                isFirst = false;
                break;
            }
        }

        if (!matchedPattern) return null;

        // 在附近的字段中查找配对字段（搜索范围：当前字段后的5个字段）
        const searchRange = 5;
        const searchStart = currentIndex + 1;
        const searchEnd = Math.min(this.fields.length, searchStart + searchRange);

        for (let i = searchStart; i < searchEnd; i++) {
            const candidateField = this.fields[i];

            if (!candidateField.label) continue;

            // 检查是否包含配对关键词
            const targetKeyword = isFirst ? matchedPattern.second : matchedPattern.first;
            if (!candidateField.label.includes(targetKeyword)) continue;

            // 验证类型相似（都是 INPUT，type 相同或都为空）
            if (currentField.element.tagName !== candidateField.element.tagName) continue;

            const currentType = currentField.element.getAttribute('type') || 'text';
            const candidateType = candidateField.element.getAttribute('type') || 'text';

            if (currentType === candidateType) {
                console.log(`[FieldScanner] 🔍 检测到配对字段: "${currentField.label}" ↔️ "${candidateField.label}"`);
                return candidateField;
            }
        }

        return null;
    }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FieldScanner;
}
