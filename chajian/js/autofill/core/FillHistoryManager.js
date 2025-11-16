/**
 * 填写历史管理器
 * 实现填写历史记录、断点续填、智能跳过等功能
 * 
 */

class FillHistoryManager {
    constructor() {
        this.currentSession = null;
        this.storageKey = 'autofill_history';
    }

    /**
     * 开始新的填写会话
     * @param {Object} options
     * @returns {string} sessionId
     */
    async startSession(options = {}) {
        const sessionId = this._generateSessionId();

        this.currentSession = {
            sessionId: sessionId,
            url: window.location.href,
            hostname: window.location.hostname,
            startTime: Date.now(),
            status: 'in_progress',
            resumeId: options.resumeId || null,
            fields: [],
            stats: {
                total: 0,
                filled: 0,
                skipped: 0,
                failed: 0
            },
            metadata: {
                userAgent: navigator.userAgent,
                viewport: {
                    width: window.innerWidth,
                    height: window.innerHeight
                },
                ...options.metadata
            }
        };

        console.log(`[FillHistoryManager] 开始新会话: ${sessionId}`);
        return sessionId;
    }

    /**
     * 记录字段填写结果
     * @param {Object} fieldInfo
     * @param {string} value
     * @param {boolean} success
     * @param {string} reason - 失败原因
     */
    recordField(fieldInfo, value, success, reason = '') {
        if (!this.currentSession) {
            console.warn('[FillHistoryManager] 没有活动会话');
            return;
        }

        const record = {
            index: this.currentSession.fields.length,
            timestamp: Date.now(),
            fieldInfo: {
                label: fieldInfo.label,
                placeholder: fieldInfo.placeholder,
                fieldType: fieldInfo.fieldType,
                tagName: fieldInfo.tagName,
                type: fieldInfo.type,
                name: fieldInfo.name,
                id: fieldInfo.id,
                section: fieldInfo.section
            },
            value: value,
            success: success,
            reason: reason
        };

        this.currentSession.fields.push(record);

        // 更新统计
        if (success) {
            this.currentSession.stats.filled++;
        } else {
            if (reason === 'skipped') {
                this.currentSession.stats.skipped++;
            } else {
                this.currentSession.stats.failed++;
            }
        }

        this.currentSession.stats.total = this.currentSession.fields.length;

        console.log(`[FillHistoryManager] 记录字段: ${fieldInfo.label} = ${value} (${success ? '✓' : '✗'})`);
    }

    /**
     * 结束当前会话
     * @param {string} status - 'completed', 'interrupted', 'error'
     */
    async endSession(status = 'completed') {
        if (!this.currentSession) {
            console.warn('[FillHistoryManager] 没有活动会话');
            return;
        }

        this.currentSession.status = status;
        this.currentSession.endTime = Date.now();
        this.currentSession.duration = this.currentSession.endTime - this.currentSession.startTime;

        // 保存到存储
        await this._saveToStorage(this.currentSession);

        console.log(`[FillHistoryManager] 会话结束: ${this.currentSession.sessionId} (${status})`);
        console.log(`统计: 总计${this.currentSession.stats.total}, 成功${this.currentSession.stats.filled}, 跳过${this.currentSession.stats.skipped}, 失败${this.currentSession.stats.failed}`);

        this.currentSession = null;
    }

    /**
     * 获取指定URL的最近填写历史
     * @param {string} url
     * @param {number} limit
     * @returns {Promise<Array>}
     */
    async getHistoryByUrl(url, limit = 5) {
        const allHistory = await this._loadFromStorage();
        const hostname = new URL(url).hostname;

        return allHistory
            .filter(session => session.hostname === hostname)
            .sort((a, b) => b.startTime - a.startTime)
            .slice(0, limit);
    }

    /**
     * 获取最近的未完成会话（用于断点续填）
     * @param {string} url
     * @returns {Promise<Object|null>}
     */
    async getIncompleteSession(url) {
        const recentHistory = await this.getHistoryByUrl(url, 1);

        if (recentHistory.length === 0) {
            return null;
        }

        const lastSession = recentHistory[0];

        // 只有状态为interrupted且在24小时内的会话才考虑续填
        if (lastSession.status === 'interrupted') {
            const hoursSince = (Date.now() - lastSession.startTime) / 1000 / 3600;
            if (hoursSince < 24) {
                return lastSession;
            }
        }

        return null;
    }

    /**
     * 智能跳过策略：判断字段是否应该跳过
     * @param {HTMLElement} element
     * @param {Object} fieldInfo
     * @param {Object} options
     * @returns {Promise<{skip: boolean, reason: string}>}
     */
    async shouldSkipField(element, fieldInfo, options = {}) {
        // 策略1: 字段已禁用或只读
        if (element.disabled || element.readOnly) {
            return { skip: true, reason: '字段不可编辑' };
        }

        // 策略2: 字段已有值且不强制覆盖
        if (!options.forceOverwrite && this._hasValidValue(element)) {
            return { skip: true, reason: '字段已有值' };
        }

        // 策略3: 字段类型为附件上传（不自动填写）
        if (fieldInfo.fieldType === 'attachment' || element.type === 'file') {
            return { skip: true, reason: '附件上传不自动填写' };
        }

        // 策略4: 验证码字段
        if (this._isCaptchaField(fieldInfo)) {
            return { skip: true, reason: '验证码不能自动填写' };
        }

        // 策略5: 根据历史记录判断（如果该字段之前总是失败，可以跳过）
        if (options.useHistory) {
            const fieldHistory = await this._getFieldHistory(fieldInfo);
            if (fieldHistory && fieldHistory.failureRate > 0.8) {
                return { skip: true, reason: '历史填写成功率过低' };
            }
        }

        // 策略6: 黑名单字段
        if (options.blacklist && this._isInBlacklist(fieldInfo, options.blacklist)) {
            return { skip: true, reason: '字段在黑名单中' };
        }

        return { skip: false, reason: '' };
    }

    /**
     * 判断字段是否已有有效值
     * @private
     */
    _hasValidValue(element) {
        let value = null;

        if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
            value = element.value;
        } else if (element.tagName === 'SELECT') {
            value = element.value;
        } else if (element.isContentEditable) {
            value = element.textContent;
        }

        if (!value) return false;

        // 排除占位符值
        const placeholderPatterns = [
            /^请选择$/,
            /^请输入$/,
            /^请填写$/,
            /^--$/,
            /^-请选择-$/,
            /^选择$/
        ];

        for (const pattern of placeholderPatterns) {
            if (pattern.test(value.trim())) {
                return false;
            }
        }

        return true;
    }

    /**
     * 判断是否为验证码字段
     * @private
     */
    _isCaptchaField(fieldInfo) {
        const combined = `${fieldInfo.label} ${fieldInfo.placeholder} ${fieldInfo.name} ${fieldInfo.id}`.toLowerCase();

        const captchaPatterns = [
            /验证码/,
            /captcha/i,
            /verify/i,
            /code/i
        ];

        return captchaPatterns.some(pattern => pattern.test(combined));
    }

    /**
     * 获取字段的历史统计
     * @private
     */
    async _getFieldHistory(fieldInfo) {
        const allHistory = await this._loadFromStorage();
        const hostname = new URL(window.location.href).hostname;

        let totalAttempts = 0;
        let successCount = 0;

        for (const session of allHistory) {
            if (session.hostname !== hostname) continue;

            for (const field of session.fields) {
                // 通过label和fieldType匹配同一个字段
                if (this._isSameField(field.fieldInfo, fieldInfo)) {
                    totalAttempts++;
                    if (field.success) {
                        successCount++;
                    }
                }
            }
        }

        if (totalAttempts === 0) return null;

        return {
            totalAttempts: totalAttempts,
            successCount: successCount,
            failureCount: totalAttempts - successCount,
            successRate: successCount / totalAttempts,
            failureRate: (totalAttempts - successCount) / totalAttempts
        };
    }

    /**
     * 判断是否为同一个字段
     * @private
     */
    _isSameField(field1, field2) {
        // 优先比较name/id
        if (field1.name && field2.name && field1.name === field2.name) return true;
        if (field1.id && field2.id && field1.id === field2.id) return true;

        // 比较label和fieldType
        if (field1.label === field2.label && field1.fieldType === field2.fieldType) return true;

        return false;
    }

    /**
     * 判断字段是否在黑名单中
     * @private
     */
    _isInBlacklist(fieldInfo, blacklist) {
        for (const item of blacklist) {
            if (typeof item === 'string') {
                // 字符串匹配（label/name/id）
                if (fieldInfo.label === item || fieldInfo.name === item || fieldInfo.id === item) {
                    return true;
                }
            } else if (typeof item === 'object') {
                // 对象匹配（多个条件）
                let match = true;
                for (const [key, value] of Object.entries(item)) {
                    if (fieldInfo[key] !== value) {
                        match = false;
                        break;
                    }
                }
                if (match) return true;
            }
        }

        return false;
    }

    /**
     * 生成会话ID
     * @private
     */
    _generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * 保存历史到存储
     * @private
     */
    async _saveToStorage(session) {
        try {
            const allHistory = await this._loadFromStorage();
            allHistory.unshift(session);

            // 只保留最近100条
            const limited = allHistory.slice(0, 100);

            await chrome.storage.local.set({
                [this.storageKey]: limited
            });

            console.log('[FillHistoryManager] 历史已保存');
        } catch (error) {
            console.error('[FillHistoryManager] 保存历史失败:', error);
        }
    }

    /**
     * 从存储加载历史
     * @private
     */
    async _loadFromStorage() {
        try {
            const result = await chrome.storage.local.get(this.storageKey);
            return result[this.storageKey] || [];
        } catch (error) {
            console.error('[FillHistoryManager] 加载历史失败:', error);
            return [];
        }
    }

    /**
     * 清除所有历史
     */
    async clearHistory() {
        try {
            await chrome.storage.local.remove(this.storageKey);
            console.log('[FillHistoryManager] 历史已清除');
        } catch (error) {
            console.error('[FillHistoryManager] 清除历史失败:', error);
        }
    }

    /**
     * 获取统计信息
     */
    async getStats() {
        const allHistory = await this._loadFromStorage();

        const stats = {
            totalSessions: allHistory.length,
            completedSessions: allHistory.filter(s => s.status === 'completed').length,
            interruptedSessions: allHistory.filter(s => s.status === 'interrupted').length,
            totalFields: 0,
            filledFields: 0,
            skippedFields: 0,
            failedFields: 0,
            averageDuration: 0,
            averageSuccessRate: 0
        };

        let totalDuration = 0;
        let totalSuccessRate = 0;

        for (const session of allHistory) {
            stats.totalFields += session.stats.total;
            stats.filledFields += session.stats.filled;
            stats.skippedFields += session.stats.skipped;
            stats.failedFields += session.stats.failed;

            if (session.duration) {
                totalDuration += session.duration;
            }

            if (session.stats.total > 0) {
                totalSuccessRate += session.stats.filled / session.stats.total;
            }
        }

        if (allHistory.length > 0) {
            stats.averageDuration = Math.round(totalDuration / allHistory.length / 1000); // 秒
            stats.averageSuccessRate = Math.round(totalSuccessRate / allHistory.length * 100); // 百分比
        }

        return stats;
    }

    /**
     * 调试：打印历史记录
     */
    async debugPrintHistory(limit = 10) {
        const allHistory = await this._loadFromStorage();
        console.log('\n=== 填写历史记录 ===');
        console.log(`总会话数: ${allHistory.length}`);

        const recent = allHistory.slice(0, limit);
        recent.forEach((session, idx) => {
            console.log(`\n[${idx + 1}] ${session.sessionId}`);
            console.log(`  URL: ${session.url}`);
            console.log(`  状态: ${session.status}`);
            console.log(`  时间: ${new Date(session.startTime).toLocaleString()}`);
            console.log(`  统计: 总${session.stats.total}, 成功${session.stats.filled}, 跳过${session.stats.skipped}, 失败${session.stats.failed}`);
        });

        console.log('\n统计信息:');
        console.log(await this.getStats());
    }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FillHistoryManager;
}
