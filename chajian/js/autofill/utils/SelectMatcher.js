/**
 * 下拉框智能匹配器
 * 参考求职方舟的Z()函数实现多层次模糊匹配
 *
 * 支持的匹配策略：
 * 1. 精确匹配（value/text完全相同）
 * 2. 前缀匹配（选项以目标值开头）
 * 3. 包含匹配（互相包含）
 * 4. 数字匹配（智能处理数字）
 * 5. 优先级排序（优先选择叶子节点）
 * 6. 特殊字段处理（地区、手机号、薪资等）
 */

class SelectMatcher {
    /**
     * 智能选择下拉框选项
     * @param {HTMLSelectElement} selectElement - 下拉框元素
     * @param {string} targetValue - 目标值
     * @param {Object} context - 上下文信息（label、fieldType等）
     * @returns {Object|null} 匹配的选项 {option, score, method}
     */
    static findBestOption(selectElement, targetValue, context = {}) {
        if (!selectElement || selectElement.tagName !== 'SELECT') {
            console.warn('[SelectMatcher] 不是有效的SELECT元素');
            return null;
        }

        const options = Array.from(selectElement.options);
        if (options.length === 0) {
            console.warn('[SelectMatcher] SELECT元素没有选项');
            return null;
        }

        const target = String(targetValue).trim();
        if (!target) {
            console.warn('[SelectMatcher] 目标值为空');
            return null;
        }

        console.log(`[SelectMatcher] 开始匹配，目标值: "${target}"，选项数: ${options.length}`);

        // 提取选项信息
        const optionInfos = options.map((opt, index) => ({
            option: opt,
            index: index,
            value: opt.value.trim(),
            text: opt.textContent.trim(),
            isLeaf: this.isLeafOption(opt),  // 是否是叶子节点（更具体的选项）
            isDisabled: opt.disabled
        })).filter(info => !info.isDisabled);  // 过滤掉禁用的选项

        if (optionInfos.length === 0) {
            console.warn('[SelectMatcher] 所有选项都被禁用');
            return null;
        }

        // 策略1: 精确匹配（最高优先级）
        const exactMatch = this.exactMatch(optionInfos, target);
        if (exactMatch) {
            console.log('[SelectMatcher] ✅ 精确匹配成功:', exactMatch.text);
            return exactMatch;
        }

        // 策略2: 前缀匹配
        const prefixMatch = this.prefixMatch(optionInfos, target);
        if (prefixMatch) {
            console.log('[SelectMatcher] ✅ 前缀匹配成功:', prefixMatch.text);
            return prefixMatch;
        }

        // 策略3: 包含匹配
        const containsMatch = this.containsMatch(optionInfos, target);
        if (containsMatch) {
            console.log('[SelectMatcher] ✅ 包含匹配成功:', containsMatch.text);
            return containsMatch;
        }

        // 策略4: 数字匹配（特别针对数字选项）
        const numberMatch = this.numberMatch(optionInfos, target);
        if (numberMatch) {
            console.log('[SelectMatcher] ✅ 数字匹配成功:', numberMatch.text);
            return numberMatch;
        }

        // 策略5: 特殊字段处理
        if (context.fieldType || context.label) {
            const specialMatch = this.specialFieldMatch(optionInfos, target, context);
            if (specialMatch) {
                console.log('[SelectMatcher] ✅ 特殊字段匹配成功:', specialMatch.text);
                return specialMatch;
            }
        }

        // 策略6: 模糊匹配（编辑距离）
        const fuzzyMatch = this.fuzzyMatch(optionInfos, target);
        if (fuzzyMatch) {
            console.log('[SelectMatcher] ✅ 模糊匹配成功:', fuzzyMatch.text, '(相似度:', fuzzyMatch.score, ')');
            return fuzzyMatch;
        }

        console.warn('[SelectMatcher] ❌ 未找到匹配的选项');
        return null;
    }

    /**
     * 精确匹配
     * @param {Array} optionInfos
     * @param {string} target
     * @returns {Object|null}
     */
    static exactMatch(optionInfos, target) {
        const targetLower = target.toLowerCase();

        // 优先匹配叶子节点
        for (const info of optionInfos) {
            if (info.isLeaf) {
                if (info.value.toLowerCase() === targetLower ||
                    info.text.toLowerCase() === targetLower) {
                    return { ...info, score: 100, method: 'exact' };
                }
            }
        }

        // 再匹配所有节点
        for (const info of optionInfos) {
            if (info.value.toLowerCase() === targetLower ||
                info.text.toLowerCase() === targetLower) {
                return { ...info, score: 95, method: 'exact' };
            }
        }

        return null;
    }

    /**
     * 前缀匹配（选项以目标值开头）
     * @param {Array} optionInfos
     * @param {string} target
     * @returns {Object|null}
     */
    static prefixMatch(optionInfos, target) {
        const targetLower = target.toLowerCase();

        // 优先匹配叶子节点
        for (const info of optionInfos) {
            if (info.isLeaf) {
                if (info.text.toLowerCase().startsWith(targetLower) ||
                    info.value.toLowerCase().startsWith(targetLower)) {
                    return { ...info, score: 90, method: 'prefix' };
                }
            }
        }

        // 再匹配所有节点
        for (const info of optionInfos) {
            if (info.text.toLowerCase().startsWith(targetLower) ||
                info.value.toLowerCase().startsWith(targetLower)) {
                return { ...info, score: 85, method: 'prefix' };
            }
        }

        return null;
    }

    /**
     * 包含匹配
     * @param {Array} optionInfos
     * @param {string} target
     * @returns {Object|null}
     */
    static containsMatch(optionInfos, target) {
        const targetLower = target.toLowerCase();

        // 双向包含：选项包含目标值 或 目标值包含选项
        const matches = [];

        for (const info of optionInfos) {
            const textLower = info.text.toLowerCase();
            const valueLower = info.value.toLowerCase();

            if (textLower.includes(targetLower) || targetLower.includes(textLower)) {
                matches.push({ ...info, score: info.isLeaf ? 80 : 75, method: 'contains' });
            } else if (valueLower.includes(targetLower) || targetLower.includes(valueLower)) {
                matches.push({ ...info, score: info.isLeaf ? 78 : 73, method: 'contains' });
            }
        }

        // 返回得分最高的
        if (matches.length > 0) {
            matches.sort((a, b) => b.score - a.score);
            return matches[0];
        }

        return null;
    }

    /**
     * 数字匹配（智能处理数字）
     * @param {Array} optionInfos
     * @param {string} target
     * @returns {Object|null}
     */
    static numberMatch(optionInfos, target) {
        // 提取目标值中的数字
        const targetNumbers = target.match(/\d+/g);
        if (!targetNumbers || targetNumbers.length === 0) {
            return null;
        }

        const targetNum = parseInt(targetNumbers[0]);

        // 查找包含相同数字的选项
        const matches = [];

        for (const info of optionInfos) {
            const optionNumbers = info.text.match(/\d+/g);
            if (!optionNumbers) continue;

            const optionNum = parseInt(optionNumbers[0]);

            if (optionNum === targetNum) {
                // 精确数字匹配
                matches.push({ ...info, score: info.isLeaf ? 88 : 83, method: 'number-exact' });
            } else if (Math.abs(optionNum - targetNum) <= 1) {
                // 近似数字匹配（±1）
                matches.push({ ...info, score: info.isLeaf ? 70 : 65, method: 'number-close' });
            }
        }

        if (matches.length > 0) {
            matches.sort((a, b) => b.score - a.score);
            return matches[0];
        }

        return null;
    }

    /**
     * 特殊字段匹配
     * @param {Array} optionInfos
     * @param {string} target
     * @param {Object} context
     * @returns {Object|null}
     */
    static specialFieldMatch(optionInfos, target, context) {
        const { fieldType, label } = context;
        const combined = `${fieldType} ${label}`.toLowerCase();

        // 学历字段特殊处理
        if (/学历|education/i.test(combined)) {
            return this.matchEducation(optionInfos, target);
        }

        // 学位字段
        if (/学位|degree/i.test(combined)) {
            return this.matchDegree(optionInfos, target);
        }

        // 薪资字段
        if (/薪资|工资|salary/i.test(combined)) {
            return this.matchSalary(optionInfos, target);
        }

        // 地区字段
        if (/省|市|区|地区|location|city|province/i.test(combined)) {
            return this.matchLocation(optionInfos, target);
        }

        // 工作经验字段
        if (/工作经验|经验|experience/i.test(combined)) {
            return this.matchExperience(optionInfos, target);
        }

        return null;
    }

    /**
     * 学历匹配
     * @param {Array} optionInfos
     * @param {string} target
     * @returns {Object|null}
     */
    static matchEducation(optionInfos, target) {
        const educationMap = {
            '高中': ['高中', '中学', 'high school'],
            '中专': ['中专', 'technical'],
            '大专': ['大专', '专科', 'college', 'associate'],
            '本科': ['本科', '大学', 'undergraduate', 'bachelor'],
            '硕士': ['硕士', '研究生', 'master', 'graduate'],
            '博士': ['博士', 'phd', 'doctor', 'doctorate']
        };

        const targetLower = target.toLowerCase();

        for (const [key, keywords] of Object.entries(educationMap)) {
            if (keywords.some(kw => targetLower.includes(kw))) {
                // 查找匹配的选项
                for (const info of optionInfos) {
                    const textLower = info.text.toLowerCase();
                    if (keywords.some(kw => textLower.includes(kw))) {
                        return { ...info, score: 92, method: 'education' };
                    }
                }
            }
        }

        return null;
    }

    /**
     * 学位匹配
     * @param {Array} optionInfos
     * @param {string} target
     * @returns {Object|null}
     */
    static matchDegree(optionInfos, target) {
        const degreeMap = {
            '学士': ['学士', 'bachelor'],
            '硕士': ['硕士', 'master'],
            '博士': ['博士', 'phd', 'doctor']
        };

        const targetLower = target.toLowerCase();

        for (const [key, keywords] of Object.entries(degreeMap)) {
            if (keywords.some(kw => targetLower.includes(kw))) {
                for (const info of optionInfos) {
                    const textLower = info.text.toLowerCase();
                    if (keywords.some(kw => textLower.includes(kw))) {
                        return { ...info, score: 92, method: 'degree' };
                    }
                }
            }
        }

        return null;
    }

    /**
     * 薪资匹配
     * @param {Array} optionInfos
     * @param {string} target
     * @returns {Object|null}
     */
    static matchSalary(optionInfos, target) {
        // 提取目标薪资数字
        const targetNumbers = target.match(/\d+/g);
        if (!targetNumbers || targetNumbers.length === 0) {
            return null;
        }

        const targetSalary = parseInt(targetNumbers[0]);

        // 查找薪资范围匹配的选项
        let bestMatch = null;
        let bestDistance = Infinity;

        for (const info of optionInfos) {
            const optionNumbers = info.text.match(/\d+/g);
            if (!optionNumbers || optionNumbers.length === 0) continue;

            const optionSalary = parseInt(optionNumbers[0]);
            const distance = Math.abs(optionSalary - targetSalary);

            if (distance < bestDistance) {
                bestDistance = distance;
                bestMatch = { ...info, score: 85, method: 'salary' };
            }
        }

        return bestMatch;
    }

    /**
     * 地区匹配
     * @param {Array} optionInfos
     * @param {string} target
     * @returns {Object|null}
     */
    static matchLocation(optionInfos, target) {
        // 移除常见的后缀（省、市、区、县）
        const cleanTarget = target.replace(/(省|市|区|县)$/g, '');

        // 先尝试精确匹配
        for (const info of optionInfos) {
            const cleanText = info.text.replace(/(省|市|区|县)$/g, '');
            if (cleanText === cleanTarget) {
                return { ...info, score: 95, method: 'location-exact' };
            }
        }

        // 再尝试包含匹配
        for (const info of optionInfos) {
            if (info.text.includes(cleanTarget) || cleanTarget.includes(info.text)) {
                return { ...info, score: 85, method: 'location-contains' };
            }
        }

        return null;
    }

    /**
     * 工作经验匹配
     * @param {Array} optionInfos
     * @param {string} target
     * @returns {Object|null}
     */
    static matchExperience(optionInfos, target) {
        // 提取年数
        const targetYears = target.match(/\d+/g);
        if (!targetYears || targetYears.length === 0) {
            // 如果没有数字，尝试文字匹配
            if (/无|没有|应届|fresh/i.test(target)) {
                for (const info of optionInfos) {
                    if (/无|没有|应届|fresh|0/i.test(info.text)) {
                        return { ...info, score: 90, method: 'experience-text' };
                    }
                }
            }
            return null;
        }

        const targetYear = parseInt(targetYears[0]);

        // 查找匹配的年限
        for (const info of optionInfos) {
            const optionYears = info.text.match(/\d+/g);
            if (!optionYears) continue;

            const optionYear = parseInt(optionYears[0]);

            // 如果是范围，检查目标值是否在范围内
            if (optionYears.length === 2) {
                const min = parseInt(optionYears[0]);
                const max = parseInt(optionYears[1]);
                if (targetYear >= min && targetYear <= max) {
                    return { ...info, score: 90, method: 'experience-range' };
                }
            } else if (optionYear === targetYear) {
                return { ...info, score: 90, method: 'experience-exact' };
            }
        }

        return null;
    }

    /**
     * 模糊匹配（编辑距离）
     * @param {Array} optionInfos
     * @param {string} target
     * @returns {Object|null}
     */
    static fuzzyMatch(optionInfos, target) {
        let bestMatch = null;
        let bestScore = 0;

        for (const info of optionInfos) {
            // 计算与text的相似度
            const textScore = this.calculateSimilarity(info.text, target);
            const valueScore = this.calculateSimilarity(info.value, target);

            const score = Math.max(textScore, valueScore);

            // 如果相似度大于50%且是当前最佳匹配
            if (score > 0.5 && score > bestScore) {
                bestScore = score;
                bestMatch = { ...info, score: score * 100, method: 'fuzzy' };
            }
        }

        // 只有相似度超过60%才返回
        return bestScore > 0.6 ? bestMatch : null;
    }

    /**
     * 计算字符串相似度（0-1之间）
     * @param {string} str1
     * @param {string} str2
     * @returns {number}
     */
    static calculateSimilarity(str1, str2) {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;

        if (longer.length === 0) {
            return 1.0;
        }

        const editDistance = this.levenshteinDistance(
            longer.toLowerCase(),
            shorter.toLowerCase()
        );

        return (longer.length - editDistance) / longer.length;
    }

    /**
     * 计算编辑距离
     * @param {string} str1
     * @param {string} str2
     * @returns {number}
     */
    static levenshteinDistance(str1, str2) {
        const matrix = [];

        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }

        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }

        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1, // 替换
                        matrix[i][j - 1] + 1,     // 插入
                        matrix[i - 1][j] + 1      // 删除
                    );
                }
            }
        }

        return matrix[str2.length][str1.length];
    }

    /**
     * 判断是否是叶子选项（更具体的选项）
     * @param {HTMLOptionElement} option
     * @returns {boolean}
     */
    static isLeafOption(option) {
        // 如果text比value长，通常是更具体的选项
        if (option.textContent.trim().length > option.value.length) {
            return true;
        }

        // 如果有optgroup，且是optgroup的最后一个选项
        const optgroup = option.parentElement;
        if (optgroup && optgroup.tagName === 'OPTGROUP') {
            const siblings = Array.from(optgroup.querySelectorAll('option'));
            const index = siblings.indexOf(option);
            return index === siblings.length - 1;
        }

        return false;
    }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SelectMatcher;
}
