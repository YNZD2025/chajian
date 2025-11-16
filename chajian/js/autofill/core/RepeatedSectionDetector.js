/**
 * 重复区块检测器
 * 用于识别教育经历、工作经历、项目经历等重复的表单区块
 * 参考求职方舟的实现
 */

class RepeatedSectionDetector {
    constructor() {
        this.groups = [];
    }

    /**
     * 检测和分组重复的表单区块
     * @param {Array} fields - 所有字段信息
     * @returns {Object} 分组结果
     */
    detectAndGroup(fields) {
        console.log('[RepeatedSectionDetector] 开始检测重复区块...');

        this.groups = [];

        // 1. 按section分组
        const sectionMap = this._groupBySection(fields);
        console.log('[RepeatedSectionDetector] 按section分组:', Object.keys(sectionMap));

        // 2. 识别重复区块
        for (const [sectionName, sectionFields] of Object.entries(sectionMap)) {
            const repeated = this._detectRepeatedPattern(sectionName, sectionFields);
            if (repeated) {
                this.groups.push(...repeated);
            }
        }

        console.log(`[RepeatedSectionDetector] 检测完成，找到 ${this.groups.length} 个重复区块组`);
        return this._buildGroupResult();
    }

    /**
     * 按section分组字段
     * @private
     */
    _groupBySection(fields) {
        const map = {};

        for (const field of fields) {
            const section = field.section || 'default';
            if (!map[section]) {
                map[section] = [];
            }
            map[section].push(field);
        }

        return map;
    }

    /**
     * 检测section是否包含重复模式
     * @private
     */
    _detectRepeatedPattern(sectionName, fields) {
        // 策略1: section名称包含数字（如"教育经历1", "教育经历2"）
        const numberMatch = sectionName.match(/^(.+?)(\d+)$/);
        if (numberMatch) {
            const baseName = numberMatch[1].trim();
            const index = parseInt(numberMatch[2]);

            return [{
                type: this._inferSectionType(baseName),
                baseName: baseName,
                index: index,
                fields: fields
            }];
        }

        // 策略2: 同一section下有多组相似字段结构
        const similarGroups = this._findSimilarFieldGroups(fields);
        if (similarGroups.length > 1) {
            return similarGroups.map((group, idx) => ({
                type: this._inferSectionType(sectionName),
                baseName: sectionName,
                index: idx + 1,
                fields: group
            }));
        }

        // 策略3: 通过DOM容器结构识别
        const containerGroups = this._groupByContainer(fields);
        if (containerGroups.length > 1) {
            return containerGroups.map((group, idx) => ({
                type: this._inferSectionType(sectionName),
                baseName: sectionName,
                index: idx + 1,
                fields: group
            }));
        }

        return null;
    }

    /**
     * 查找相似的字段组（同样的字段类型模式）
     * @private
     */
    _findSimilarFieldGroups(fields) {
        // 提取字段类型模式
        const patterns = [];
        let currentPattern = [];

        for (let i = 0; i < fields.length; i++) {
            currentPattern.push(fields[i]);

            // 当遇到相似的字段开始重复时，认为是新的一组
            if (i > 0 && this._isSimilarField(fields[i], fields[0])) {
                // 检查是否是重复模式的开始
                const possibleGroupSize = currentPattern.length - 1;
                if (possibleGroupSize > 0 && this._isRepeatingPattern(fields, possibleGroupSize)) {
                    // 分割成多个组
                    patterns.push(currentPattern.slice(0, -1));
                    currentPattern = [fields[i]];
                }
            }
        }

        // 添加最后一组
        if (currentPattern.length > 0) {
            patterns.push(currentPattern);
        }

        // 只有当找到多个模式时才返回
        return patterns.length > 1 ? patterns : [];
    }

    /**
     * 判断是否为重复模式
     * @private
     */
    _isRepeatingPattern(fields, groupSize) {
        if (fields.length % groupSize !== 0) return false;

        const numGroups = fields.length / groupSize;
        if (numGroups < 2) return false;

        // 检查每组的字段类型是否一致
        for (let groupIdx = 1; groupIdx < numGroups; groupIdx++) {
            for (let fieldIdx = 0; fieldIdx < groupSize; fieldIdx++) {
                const field1 = fields[fieldIdx];
                const field2 = fields[groupIdx * groupSize + fieldIdx];

                if (!this._isSimilarField(field1, field2)) {
                    return false;
                }
            }
        }

        return true;
    }

    /**
     * 判断两个字段是否相似（类型、标签相似）
     * @private
     */
    _isSimilarField(field1, field2) {
        // 字段类型相同
        if (field1.fieldType === field2.fieldType) return true;

        // 标签文本相似（去除数字后比较）
        const label1 = (field1.label || '').replace(/\d+/g, '').trim();
        const label2 = (field2.label || '').replace(/\d+/g, '').trim();

        if (label1 && label2 && label1 === label2) return true;

        return false;
    }

    /**
     * 按DOM容器分组字段
     * @private
     */
    _groupByContainer(fields) {
        const containerMap = new Map();

        for (const field of fields) {
            // 查找共同的父容器
            const container = this._findRepeatedContainer(field.element);
            if (container) {
                if (!containerMap.has(container)) {
                    containerMap.set(container, []);
                }
                containerMap.get(container).push(field);
            }
        }

        return Array.from(containerMap.values());
    }

    /**
     * 查找重复区块的容器
     * @private
     */
    _findRepeatedContainer(element) {
        let current = element.parentElement;
        let depth = 0;
        const maxDepth = 8;

        while (current && current !== document.body && depth < maxDepth) {
            // 检查className是否包含重复模式标识
            const className = current.className || '';
            if (/(item|list-item|section-item|row|entry|record)/i.test(className)) {
                return current;
            }

            // 检查是否在列表中
            if (current.tagName === 'LI' || current.tagName === 'TR') {
                return current;
            }

            // 检查data属性
            if (current.dataset?.index || current.dataset?.id) {
                return current;
            }

            current = current.parentElement;
            depth++;
        }

        return null;
    }

    /**
     * 推断section类型
     * @private
     */
    _inferSectionType(sectionName) {
        const name = sectionName.toLowerCase();

        if (/(教育|学历|学校|education|school)/i.test(name)) {
            return 'education';
        }
        if (/(工作|经历|经验|work|experience|employment)/i.test(name)) {
            return 'work';
        }
        if (/(项目|project)/i.test(name)) {
            return 'project';
        }
        if (/(技能|skill)/i.test(name)) {
            return 'skill';
        }
        if (/(证书|资格|certificate)/i.test(name)) {
            return 'certificate';
        }
        if (/(语言|language)/i.test(name)) {
            return 'language';
        }

        return 'other';
    }

    /**
     * 构建分组结果
     * @private
     */
    _buildGroupResult() {
        // 按类型和索引组织
        const typeMap = {};

        for (const group of this.groups) {
            if (!typeMap[group.type]) {
                typeMap[group.type] = [];
            }
            typeMap[group.type].push(group);
        }

        // 排序（按索引）
        for (const type in typeMap) {
            typeMap[type].sort((a, b) => a.index - b.index);
        }

        return {
            hasRepeatedSections: this.groups.length > 0,
            typeMap: typeMap,
            groups: this.groups
        };
    }

    /**
     * 匹配重复区块与简历数据
     * @param {Object} groupResult - 分组结果
     * @param {Object} resumeData - 简历数据
     * @returns {Map} 字段 -> 值的映射
     */
    matchRepeatedSections(groupResult, resumeData) {
        const matches = new Map();

        if (!groupResult.hasRepeatedSections) {
            console.log('[RepeatedSectionDetector] 没有重复区块，使用常规匹配');
            return matches;
        }

        console.log('[RepeatedSectionDetector] 开始匹配重复区块...');

        // 遍历每种类型
        for (const [type, groups] of Object.entries(groupResult.typeMap)) {
            const resumeArray = this._getResumeArrayByType(type, resumeData);

            if (!resumeArray || resumeArray.length === 0) {
                console.log(`[RepeatedSectionDetector] 简历中没有${type}类型的数据`);
                continue;
            }

            console.log(`[RepeatedSectionDetector] ${type}: 表单有${groups.length}组，简历有${resumeArray.length}条`);

            // 匹配每组
            for (let i = 0; i < groups.length; i++) {
                const group = groups[i];
                const resumeItem = resumeArray[i]; // 可能为undefined

                if (!resumeItem) {
                    console.log(`[RepeatedSectionDetector] 第${i + 1}组没有对应的简历数据`);
                    continue;
                }

                // 匹配组内字段
                for (const field of group.fields) {
                    const value = this._extractValueFromResumeItem(field, resumeItem);
                    if (value !== null && value !== undefined) {
                        matches.set(field.element, value);
                        console.log(`[RepeatedSectionDetector] 匹配成功: ${field.label} (${type}第${i + 1}组) = ${value}`);
                    }
                }
            }
        }

        console.log(`[RepeatedSectionDetector] 匹配完成，共 ${matches.size} 个字段有值`);
        return matches;
    }

    /**
     * 根据类型获取简历中的数组数据
     * @private
     */
    _getResumeArrayByType(type, resumeData) {
        const typeMapping = {
            'education': ['educations', 'educationList', 'education'],
            'work': ['workExperiences', 'workList', 'work'],
            'project': ['projects', 'projectList', 'projectExperiences'],
            'skill': ['skills', 'skillList'],
            'certificate': ['certificates', 'certList'],
            'language': ['languages', 'languageList']
        };

        const possibleKeys = typeMapping[type] || [];

        for (const key of possibleKeys) {
            if (resumeData[key] && Array.isArray(resumeData[key])) {
                return resumeData[key];
            }
        }

        return null;
    }

    /**
     * 从简历项中提取字段值
     * @private
     */
    _extractValueFromResumeItem(field, resumeItem) {
        const fieldType = field.fieldType;

        // 字段类型到简历键的映射
        const keyMappings = {
            // 教育经历
            'school': ['school', 'schoolName', 'university'],
            'major': ['major', 'majorName'],
            'education': ['education', 'degree'],
            'degree': ['degree', 'degreeType'],
            'educationStartDate': ['startDate', 'startTime', 'enrollmentDate'],
            'educationEndDate': ['endDate', 'endTime', 'graduationDate'],
            'gpa': ['gpa', 'score'],

            // 工作经历
            'company': ['company', 'companyName'],
            'position': ['position', 'jobTitle', 'title'],
            'workStartDate': ['startDate', 'startTime'],
            'workEndDate': ['endDate', 'endTime'],
            'jobDescription': ['description', 'jobDescription', 'responsibilities'],

            // 项目经历
            'projectName': ['name', 'projectName'],
            'projectDescription': ['description', 'projectDescription'],
            'projectRole': ['role', 'position'],
            'projectStartDate': ['startDate', 'startTime'],
            'projectEndDate': ['endDate', 'endTime'],

            // 技能
            'skill': ['name', 'skillName'],
            'skillLevel': ['level', 'proficiency'],

            // 证书
            'certificate': ['name', 'certificateName'],

            // 语言
            'languageSkill': ['language', 'languageName'],
            'languageLevel': ['level', 'proficiency']
        };

        const possibleKeys = keyMappings[fieldType] || [fieldType];

        for (const key of possibleKeys) {
            if (resumeItem[key] !== undefined && resumeItem[key] !== null) {
                return resumeItem[key];
            }
        }

        // 降级：尝试使用label匹配
        const label = (field.label || '').toLowerCase();
        for (const [key, value] of Object.entries(resumeItem)) {
            if (key.toLowerCase().includes(label) || label.includes(key.toLowerCase())) {
                return value;
            }
        }

        return null;
    }

    /**
     * 调试：打印分组信息
     */
    debugPrint(groupResult) {
        console.log('\n=== 重复区块检测结果 ===');
        console.log(`是否有重复区块: ${groupResult.hasRepeatedSections}`);

        if (!groupResult.hasRepeatedSections) {
            console.log('没有检测到重复区块');
            return;
        }

        console.log(`\n总共 ${groupResult.groups.length} 个区块组：`);

        for (const [type, groups] of Object.entries(groupResult.typeMap)) {
            console.log(`\n【${type}】类型，共 ${groups.length} 组：`);

            for (const group of groups) {
                console.log(`  - 第${group.index}组 (${group.baseName}):`);
                console.log(`    字段数量: ${group.fields.length}`);
                group.fields.forEach(f => {
                    console.log(`      - ${f.label || f.placeholder} [${f.fieldType}]`);
                });
            }
        }
    }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RepeatedSectionDetector;
}
