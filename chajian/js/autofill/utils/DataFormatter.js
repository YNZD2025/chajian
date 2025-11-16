/**
 * 数据格式转换器
 * 处理手机号、日期、薪资等各种数据格式的自动转换
 * 参考求职方舟的实现
 */

class DataFormatter {
    /**
     * 智能格式化数据
     * @param {any} value - 原始值
     * @param {Object} fieldInfo - 字段信息
     * @param {HTMLElement} element - 目标元素
     * @returns {string} 格式化后的值
     */
    static smartFormat(value, fieldInfo, element) {
        if (value === null || value === undefined || value === '') {
            return '';
        }

        const fieldType = fieldInfo.fieldType || '';
        const placeholder = (fieldInfo.placeholder || '').toLowerCase();
        const label = (fieldInfo.label || '').toLowerCase();

        // 根据字段类型选择格式化方法
        switch (fieldType) {
            case 'phone':
            case 'mobile':
            case 'tel':
                return this.formatPhone(value, placeholder);

            case 'email':
                return this.formatEmail(value);

            case 'birthday':
            case 'educationStartDate':
            case 'educationEndDate':
            case 'workStartDate':
            case 'workEndDate':
            case 'projectStartDate':
            case 'projectEndDate':
            case 'startDate':
            case 'endDate':
                return this.formatDate(value, element, placeholder);

            case 'expectedSalary':
            case 'salary':
                return this.formatSalary(value, placeholder, label);

            case 'idCard':
                return this.formatIdCard(value);

            case 'education':
            case 'degree':
                return this.formatEducation(value);

            case 'gender':
                return this.formatGender(value);

            case 'workExperience':
                return this.formatWorkExperience(value);

            default:
                return String(value);
        }
    }

    /**
     * 格式化手机号
     * @param {string} phone
     * @param {string} format - 期望格式 (从placeholder推断)
     * @returns {string}
     */
    static formatPhone(phone, format = '') {
        // 移除所有非数字字符
        const digits = String(phone).replace(/\D/g, '');

        if (digits.length !== 11) {
            // 不是有效手机号，返回原值
            return String(phone);
        }

        // 根据格式要求转换
        if (/\d{3}-\d{4}-\d{4}/.test(format)) {
            // 格式: 138-0013-8000
            return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
        } else if (/\d{3}\s\d{4}\s\d{4}/.test(format)) {
            // 格式: 138 0013 8000
            return `${digits.slice(0, 3)} ${digits.slice(3, 7)} ${digits.slice(7)}`;
        } else {
            // 默认无分隔符
            return digits;
        }
    }

    /**
     * 格式化邮箱
     * @param {string} email
     * @returns {string}
     */
    static formatEmail(email) {
        return String(email).trim().toLowerCase();
    }

    /**
     * 格式化日期
     * @param {string} date - 原始日期（可能是各种格式）
     * @param {HTMLElement} element - 目标元素
     * @param {string} placeholder
     * @returns {string}
     */
    static formatDate(date, element, placeholder = '') {
        if (!date || date === '至今' || date === '现在') {
            return date; // 保持原样
        }

        // 解析日期
        const parsed = this._parseDate(date);
        if (!parsed) {
            return String(date);
        }

        // 根据输入框类型决定格式
        if (element && element.type) {
            switch (element.type) {
                case 'date':
                    // HTML5 date input 需要 YYYY-MM-DD
                    return this._formatDateAs(parsed, 'YYYY-MM-DD');

                case 'month':
                    // HTML5 month input 需要 YYYY-MM
                    return this._formatDateAs(parsed, 'YYYY-MM');

                case 'year':
                    // 年份输入
                    return this._formatDateAs(parsed, 'YYYY');
            }
        }

        // 根据placeholder推断格式
        if (/YYYY年MM月/.test(placeholder)) {
            return this._formatDateAs(parsed, 'YYYY年MM月');
        } else if (/YYYY-MM-DD/.test(placeholder)) {
            return this._formatDateAs(parsed, 'YYYY-MM-DD');
        } else if (/YYYY\/MM/.test(placeholder)) {
            return this._formatDateAs(parsed, 'YYYY/MM');
        } else if (/MM\/YYYY/.test(placeholder)) {
            return this._formatDateAs(parsed, 'MM/YYYY');
        } else if (/YYYY\.MM/.test(placeholder)) {
            return this._formatDateAs(parsed, 'YYYY.MM');
        } else if (/YYYY-MM/.test(placeholder)) {
            return this._formatDateAs(parsed, 'YYYY-MM');
        } else {
            // 默认格式: YYYY-MM
            return this._formatDateAs(parsed, 'YYYY-MM');
        }
    }

    /**
     * 解析日期字符串
     * @private
     */
    static _parseDate(dateStr) {
        const str = String(dateStr).trim();

        // 格式1: YYYY-MM-DD
        let match = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
        if (match) {
            return { year: match[1], month: match[2].padStart(2, '0'), day: match[3].padStart(2, '0') };
        }

        // 格式2: YYYY-MM
        match = str.match(/^(\d{4})-(\d{1,2})$/);
        if (match) {
            return { year: match[1], month: match[2].padStart(2, '0'), day: null };
        }

        // 格式3: YYYY年MM月DD日
        match = str.match(/^(\d{4})年(\d{1,2})月(\d{1,2})日?$/);
        if (match) {
            return { year: match[1], month: match[2].padStart(2, '0'), day: match[3].padStart(2, '0') };
        }

        // 格式4: YYYY年MM月
        match = str.match(/^(\d{4})年(\d{1,2})月$/);
        if (match) {
            return { year: match[1], month: match[2].padStart(2, '0'), day: null };
        }

        // 格式5: YYYY/MM/DD
        match = str.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
        if (match) {
            return { year: match[1], month: match[2].padStart(2, '0'), day: match[3].padStart(2, '0') };
        }

        // 格式6: YYYY/MM
        match = str.match(/^(\d{4})\/(\d{1,2})$/);
        if (match) {
            return { year: match[1], month: match[2].padStart(2, '0'), day: null };
        }

        // 格式7: MM/YYYY
        match = str.match(/^(\d{1,2})\/(\d{4})$/);
        if (match) {
            return { year: match[2], month: match[1].padStart(2, '0'), day: null };
        }

        // 格式8: 只有年份
        match = str.match(/^(\d{4})$/);
        if (match) {
            return { year: match[1], month: null, day: null };
        }

        return null;
    }

    /**
     * 格式化日期为指定格式
     * @private
     */
    static _formatDateAs(parsed, format) {
        let result = format;

        result = result.replace('YYYY', parsed.year || '');

        if (parsed.month) {
            result = result.replace('MM', parsed.month);
        } else {
            result = result.replace('MM', '01'); // 默认1月
        }

        if (parsed.day) {
            result = result.replace('DD', parsed.day);
        } else {
            result = result.replace('DD', '01'); // 默认1日
        }

        return result;
    }

    /**
     * 格式化薪资
     * @param {number|string} salary
     * @param {string} placeholder
     * @param {string} label
     * @returns {string}
     */
    static formatSalary(salary, placeholder = '', label = '') {
        const num = parseFloat(String(salary).replace(/[^\d.]/g, ''));

        if (isNaN(num)) {
            return String(salary);
        }

        // 推断格式
        const combined = `${placeholder} ${label}`.toLowerCase();

        if (/k/.test(combined)) {
            // 单位: K (千)
            if (num >= 1000) {
                return (num / 1000).toFixed(0) + 'K';
            } else {
                return num.toFixed(0) + 'K';
            }
        } else if (/万/.test(combined)) {
            // 单位: 万
            if (num >= 10000) {
                return (num / 10000).toFixed(1) + '万';
            } else {
                return (num / 10000).toFixed(2) + '万';
            }
        } else {
            // 数字
            return num.toFixed(0);
        }
    }

    /**
     * 格式化身份证号
     * @param {string} idCard
     * @returns {string}
     */
    static formatIdCard(idCard) {
        // 移除空格和分隔符
        const cleaned = String(idCard).replace(/[\s-]/g, '');

        if (cleaned.length === 18) {
            return cleaned.toUpperCase();
        } else if (cleaned.length === 15) {
            // 15位升级到18位（如果需要）
            return cleaned;
        } else {
            return String(idCard);
        }
    }

    /**
     * 格式化学历
     * @param {string} education
     * @returns {string}
     */
    static formatEducation(education) {
        const mapping = {
            '本科': ['本科', '大学本科', '学士', 'undergraduate', 'bachelor'],
            '硕士': ['硕士', '研究生', 'master', 'postgraduate'],
            '博士': ['博士', 'phd', 'doctor', 'doctoral'],
            '大专': ['大专', '专科', 'college', 'associate'],
            '高中': ['高中', '中专', 'high school'],
            '初中': ['初中', 'middle school'],
            '小学': ['小学', 'primary school']
        };

        const educationLower = String(education).toLowerCase();

        for (const [standard, variants] of Object.entries(mapping)) {
            for (const variant of variants) {
                if (educationLower.includes(variant.toLowerCase())) {
                    return standard;
                }
            }
        }

        return String(education);
    }

    /**
     * 格式化性别
     * @param {string} gender
     * @returns {string}
     */
    static formatGender(gender) {
        const genderLower = String(gender).toLowerCase();

        if (/^(男|male|m)$/i.test(genderLower)) {
            return '男';
        } else if (/^(女|female|f)$/i.test(genderLower)) {
            return '女';
        } else {
            return String(gender);
        }
    }

    /**
     * 格式化工作经验年限
     * @param {number|string} years
     * @returns {string}
     */
    static formatWorkExperience(years) {
        const num = parseFloat(String(years).replace(/[^\d.]/g, ''));

        if (isNaN(num)) {
            return String(years);
        }

        if (num === 0) {
            return '应届生';
        } else if (num < 1) {
            return '1年以下';
        } else if (num >= 10) {
            return '10年以上';
        } else {
            return Math.round(num) + '年';
        }
    }

    /**
     * 验证手机号
     * @param {string} phone
     * @returns {boolean}
     */
    static isValidPhone(phone) {
        const digits = String(phone).replace(/\D/g, '');
        return /^1[3-9]\d{9}$/.test(digits);
    }

    /**
     * 验证邮箱
     * @param {string} email
     * @returns {boolean}
     */
    static isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email));
    }

    /**
     * 验证身份证号
     * @param {string} idCard
     * @returns {boolean}
     */
    static isValidIdCard(idCard) {
        const cleaned = String(idCard).replace(/[\s-]/g, '');

        if (!/^\d{17}[\dXx]$/.test(cleaned)) {
            return false;
        }

        // 验证校验位
        const factors = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
        const checkCodes = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2'];

        let sum = 0;
        for (let i = 0; i < 17; i++) {
            sum += parseInt(cleaned[i]) * factors[i];
        }

        const expectedCheck = checkCodes[sum % 11];
        const actualCheck = cleaned[17].toUpperCase();

        return expectedCheck === actualCheck;
    }

    /**
     * 调试：测试格式化函数
     */
    static debugTest() {
        console.log('\n=== 数据格式转换测试 ===');

        console.log('\n手机号:');
        console.log('13800138000 →', this.formatPhone('13800138000', '138-0013-8000'));
        console.log('13800138000 →', this.formatPhone('13800138000', '138 0013 8000'));

        console.log('\n日期:');
        console.log('2023-05 →', this.formatDate('2023-05', { type: 'month' }, ''));
        console.log('2023年5月 →', this.formatDate('2023年5月', { type: 'text' }, 'YYYY-MM'));
        console.log('05/2023 →', this.formatDate('05/2023', { type: 'text' }, 'YYYY-MM'));

        console.log('\n薪资:');
        console.log('15000 →', this.formatSalary(15000, '15K', ''));
        console.log('15000 →', this.formatSalary(15000, '1.5万', ''));

        console.log('\n学历:');
        console.log('大学本科 →', this.formatEducation('大学本科'));
        console.log('研究生 →', this.formatEducation('研究生'));

        console.log('\n性别:');
        console.log('male →', this.formatGender('male'));
        console.log('女 →', this.formatGender('女'));
    }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataFormatter;
}
