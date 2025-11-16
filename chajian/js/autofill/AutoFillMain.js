/**
 * 一念职达 AI自动填表引擎 - 主入口
 *
 * 使用方法：
 * const autoFill = new AutoFillMain();
 * await autoFill.start({ resumeId: 'xxx', companyName: '字节跳动', positionName: '前端工程师' });
 */

class AutoFillMain {
    constructor(config = {}) {
        console.log('[AutoFillMain] 初始化自动填表引擎...');

        this.config = {
            aiServiceURL: config.aiServiceURL || (window.CONFIG ? window.CONFIG.getApiBaseUrl() : 'http://localhost:8080'),
            ...config
        };

        // 创建主控制器
        this.controller = new FormFillController({
            aiServiceURL: this.config.aiServiceURL
        });

        // 状态
        this.isRunning = false;

        // 绑定回调
        this.setupCallbacks();

        console.log('[AutoFillMain] ✓ 初始化完成');
    }

    /**
     * 设置回调
     */
    setupCallbacks() {
        // 状态变化回调
        this.controller.onStateChange = (newState, oldState) => {
            console.log(`[AutoFillMain] 状态: ${oldState} -> ${newState}`);

            // 更新UI（如果有）
            this.updateUIState(newState);
        };

        // 进度回调
        this.controller.onProgress = (progress) => {
            console.log(`[AutoFillMain] 进度: ${progress.message} (${progress.percentage}%)`);

            // 更新UI进度
            this.updateUIProgress(progress);
        };

        // 完成回调
        this.controller.onComplete = (result) => {
            console.log('[AutoFillMain] ✅ 填写完成!');
            console.log(`成功: ${result.filled}/${result.total}`);

            this.isRunning = false;

            // 通知UI
            this.notifyUI('填写完成！', 'success');

            // 3秒后清除高亮
            setTimeout(() => {
                this.controller.highlighter.removeAll();
            }, 3000);
        };

        // 错误回调
        this.controller.onError = ({ field, error }) => {
            console.error('[AutoFillMain] ❌ 错误:', error);

            this.isRunning = false;

            // 通知UI
            this.notifyUI(`填写出错: ${error.message || error}`, 'error');
        };
    }

    /**
     * 开始自动填写
     * @param {Object} params
     * @param {string} params.resumeId - 简历ID
     * @param {string} params.companyName - 公司名称
     * @param {string} params.positionName - 职位名称
     * @returns {Promise<Object>}
     */
    async start(params = {}) {
        if (this.isRunning) {
            console.warn('[AutoFillMain] 已经在运行中...');
            return {
                success: false,
                message: '填写正在进行中'
            };
        }

        const {
            resumeId = null,
            companyName = '',
            positionName = ''
        } = params;

        // 验证参数
        if (!resumeId) {
            console.error('[AutoFillMain] 缺少简历ID');
            this.notifyUI('请先选择简历', 'error');
            return {
                success: false,
                message: '缺少简历ID'
            };
        }

        this.isRunning = true;

        try {
            // 启动主控制器
            const result = await this.controller.start({
                resumeId,
                companyName,
                positionName
            });

            return result;
        } catch (error) {
            console.error('[AutoFillMain] 启动失败:', error);
            this.isRunning = false;

            return {
                success: false,
                message: error.message
            };
        }
    }

    /**
     * 暂停
     */
    pause() {
        this.controller.pause();
        this.notifyUI('已暂停', 'info');
    }

    /**
     * 继续
     */
    resume() {
        this.controller.resume();
        this.notifyUI('继续填写...', 'info');
    }

    /**
     * 停止
     */
    stop() {
        this.controller.stop();
        this.isRunning = false;
        this.notifyUI('已停止', 'info');
    }

    /**
     * 重新开始
     */
    async restart(params) {
        await this.stop();
        await DOMUtils.delay(500);
        return await this.start(params);
    }

    /**
     * 获取状态
     */
    getState() {
        return {
            isRunning: this.isRunning,
            ...this.controller.getState()
        };
    }

    /**
     * 更新UI状态
     * @param {string} state
     */
    updateUIState(state) {
        // 更新聊天窗口的状态文字
        const stateMessages = {
            'idle': '就绪',
            'scanning': '正在扫描页面...',
            'analyzing': 'AI正在分析...',
            'filling': '正在填写...',
            'completed': '填写完成！',
            'error': '填写出错'
        };

        const message = stateMessages[state] || state;
        this.updateStatusText(message);
    }

    /**
     * 更新UI进度
     * @param {Object} progress
     */
    updateUIProgress(progress) {
        const { message, percentage, current, total } = progress;

        // 更新进度条（如果有）
        const progressBar = document.querySelector('.yinianzhida-progress-bar');
        if (progressBar) {
            progressBar.style.width = `${percentage}%`;
        }

        // 更新状态文字
        let statusText = message;
        if (current && total) {
            statusText += ` (${current}/${total})`;
        }

        this.updateStatusText(statusText);
    }

    /**
     * 更新状态文字
     * @param {string} text
     */
    updateStatusText(text) {
        // 更新聊天窗口的状态显示
        const usageCount = document.getElementById('yinianzhida-usage-count');
        if (usageCount && usageCount.parentElement) {
            usageCount.parentElement.innerHTML = `<p>${text}</p>`;
        }

        console.log(`[AutoFillMain] 状态: ${text}`);
    }

    /**
     * 通知UI
     * @param {string} message
     * @param {string} type - 'success' | 'error' | 'info'
     */
    notifyUI(message, type = 'info') {
        // 更新状态文字
        this.updateStatusText(message);

        // 添加消息到聊天窗口
        const messagesContainer = document.getElementById('yinianzhida-messages');
        if (messagesContainer) {
            const messageEl = document.createElement('div');
            messageEl.className = `yinianzhida-message system ${type}`;
            messageEl.textContent = message;
            messagesContainer.appendChild(messageEl);

            // 滚动到底部
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }

    /**
     * 销毁
     */
    destroy() {
        this.stop();
        this.controller.destroy();
        console.log('[AutoFillMain] 已销毁');
    }
}

// 全局实例（方便在 content.js 中使用）
window.AutoFillEngine = AutoFillMain;
window.AutoFillMain = AutoFillMain;

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AutoFillMain;
}
