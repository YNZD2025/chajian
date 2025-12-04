/**
 * ============================================================================
 * settingsMini.js - 设置弹窗页面脚本
 * ============================================================================
 *
 * 处理 settingsMini.html 中的按钮操作
 * 包括退出登录和编辑简历功能
 */

(function() {
    'use strict';

    /**
     * 配置对象
     * 由于 popup 页面无法直接访问 configContent.js（那是 content script）
     * 这里硬编码配置，与 configContent.js 保持一致
     */
    const CONFIG = {
        // 当前环境: "development" | "production"
        currentEnv: "production",

        // 环境配置
        environments: {
            development: {
                WEB_URL: "http://192.168.1.144:3000/resume"
            },
            production: {
                WEB_URL: "https://test.applymind.cn/resume"
            }
        }
    };

    // 获取当前环境的配置
    const getWebUrl = () => CONFIG.environments[CONFIG.currentEnv].WEB_URL;

    /**
     * 初始化退出登录按钮
     */
    function initLogoutButton() {
        const logoutBtn = document.querySelector('.btn-danger');
        if (!logoutBtn) return;

        // 移除原有的内联 onclick 属性
        logoutBtn.removeAttribute('onclick');

        // 绑定点击事件
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();

            // 确认对话框
            if (!confirm('确定要退出登录吗？')) {
                return;
            }

            try {
                // 发送退出登录消息到 background.js
                const response = await chrome.runtime.sendMessage({
                    type: 'logout'
                });

                if (response?.status === 'success') {
                    alert('已成功退出登录');

                    // 关闭弹窗
                    window.close();
                } else {
                    console.error('[settingsMini] 退出登录失败:', response);
                    alert('退出登录失败，请重试');
                }
            } catch (error) {
                console.error('[settingsMini] 退出登录异常:', error);
                alert('退出登录出错，请重试');
            }
        });

        console.log('[settingsMini] 退出登录按钮已初始化');
    }

    /**
     * 初始化编辑简历按钮
     */
    function initEditResumeButton() {
        const editResumeLink = document.querySelector('a[href="edit-resume.html"]');
        if (!editResumeLink) return;

        // 移除原有的 href 属性
        editResumeLink.removeAttribute('href');
        editResumeLink.href = 'javascript:void(0)';
        editResumeLink.style.cursor = 'pointer';

        // 绑定点击事件
        editResumeLink.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();

            try {
                // 获取简历页面 URL
                const resumeUrl = getWebUrl();

                // 在新标签页中打开简历页面
                await chrome.tabs.create({
                    url: resumeUrl,
                    active: true
                });

                console.log('[settingsMini] 已打开简历页面:', resumeUrl);

                // 关闭弹窗（可选）
                window.close();
            } catch (error) {
                console.error('[settingsMini] 打开简历页面失败:', error);
                alert('打开简历页面失败，请重试');
            }
        });

        console.log('[settingsMini] 编辑简历按钮已初始化');
    }

    /**
     * 初始化关闭按钮
     */
    function initCloseButton() {
        const closeBtn = document.querySelector('.liquid-close');
        if (!closeBtn) return;

        closeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.close();
        });

        console.log('[settingsMini] 关闭按钮已初始化');
    }

    /**
     * 页面加载完成后初始化
     */
    document.addEventListener('DOMContentLoaded', () => {
        console.log('[settingsMini] 页面加载完成，开始初始化...');

        // 初始化各个按钮
        initLogoutButton();
        initEditResumeButton();
        initCloseButton();

        console.log('[settingsMini] 初始化完成');
    });

})();
