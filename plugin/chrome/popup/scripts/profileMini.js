/**
 * ============================================================================
 * profileMini.js - 个人中心弹窗页面脚本
 * ============================================================================
 *
 * 处理 profileMini.html 中的所有功能
 * 包括：加载用户信息、简历数据、按钮操作等
 */

(function() {
    'use strict';

    // 立即输出日志，确认脚本已加载
    console.log('[profileMini] 脚本已加载，准备初始化...');
    console.log('[profileMini] document.readyState:', document.readyState);

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
                API_RESUME_URL: "http://192.168.1.144:8080/api/resume/",
                WEB_URL: "http://192.168.1.144:3000"
            },
            production: {
                API_RESUME_URL: "https://test.applymind.cn/api/resume/",
                WEB_URL: "https://test.applymind.cn"
            }
        }
    };

    // 获取当前环境的配置
    const getConfig = () => CONFIG.environments[CONFIG.currentEnv];

    // 简历数据
    let resumeList = [];
    let currentResumeIndex = 0;

    /**
     * 字段映射表
     */
    const FIELD_MAPPING = {
        school: '.info-cell:nth-child(1) .info-cell-value',
        educationDegreeText: '.info-cell:nth-child(2) .info-cell-value',
        major: '.info-cell:nth-child(3) .info-cell-value',
        graduationYear: '.info-cell:nth-child(4) .info-cell-value',
        phone: '.info-cell:nth-child(5) .info-cell-value',
        email: '.info-cell:nth-child(6) .info-cell-value',
        jobIntention: '.info-cell:nth-child(7) .info-cell-value',
        expectedCity: '.info-cell:nth-child(8) .info-cell-value',
        coreSkills: '.info-cell:nth-child(9) .info-cell-value'
    };

    /**
     * 发送带 JWT 的 API 请求（通过 background.js）
     */
    async function apiRequest(endpoint, method = 'GET', body = null) {
        try {
            const config = getConfig();
            const url = `${config.API_RESUME_URL}${endpoint}`;

            console.log(`[profileMini] 发送 API 请求: ${method} ${url}`);

            const options = {
                method
            };

            // 只有非 GET 请求且有 body 时才添加
            if (body && method !== 'GET') {
                options.headers = {
                    'Content-Type': 'application/json'
                };
                options.body = JSON.stringify(body);
            }

            // 通过 background.js 发送带 JWT 的请求
            const response = await chrome.runtime.sendMessage({
                type: 'fetchWithJwt',
                url: url,
                options: options
            });

            console.log('[profileMini] API 响应:', response);

            if (response && response.error) {
                throw new Error(response.error);
            }

            return response;
        } catch (error) {
            console.error('[profileMini] API 请求失败:', error);
            throw error;
        }
    }

    /**
     * 获取简历列表（从 chrome.storage.local 读取）
     * 不直接调用接口，而是读取智能填充页面缓存的数据
     */
    async function getResumeList() {
        try {
            console.log('[profileMini] 开始从 storage 获取简历列表...');

            // 从 chrome.storage.local 读取简历列表
            const { resumeList, resumeListUpdateTime } = await chrome.storage.local.get(['resumeList', 'resumeListUpdateTime']);

            if (!resumeList || !Array.isArray(resumeList)) {
                console.warn('[profileMini] storage 中没有简历列表数据');
                return [];
            }

            console.log('[profileMini] 从 storage 获取到简历列表:', {
                count: resumeList.length,
                updateTime: resumeListUpdateTime ? new Date(resumeListUpdateTime).toLocaleString() : '未知'
            });

            // 数据已经在智能填充页面处理过了，直接返回
            return resumeList;
        } catch (error) {
            console.error('[profileMini] 从 storage 获取简历列表失败:', error);
            return [];
        }
    }

    /**
     * 处理简历列表数据
     * 注意：数据已经在智能填充页面（resumeInterfaceTwo.js）处理过了
     * 这里保留此函数以防万一需要额外处理，但目前直接返回原数据
     */
    function processResumeList(list) {
        // 数据已在智能填充页面处理，直接返回
        return list;
    }

    /**
     * 加载用户信息（昵称和头像）
     */
    function loadUserInfo() {
        console.log('[profileMini] 开始加载用户信息...');
        chrome.storage.local.get(['auth'], function(result) {
            console.log('[profileMini] 获取到的 auth 数据:', result.auth);

            // 先检查是否有 auth 和 token
            if (!result.auth || !result.auth.token) {
                console.warn('[profileMini] 未找到认证信息，用户未登录');
                // 显示未登录状态
                const userNickname = document.querySelector('#user-nickname');
                if (userNickname) {
                    userNickname.textContent = '未登录';
                }

                const resumeNickname = document.querySelector('#resume-nickname');
                if (resumeNickname) {
                    resumeNickname.textContent = '未登录';
                }
                return;
            }

            if (result.auth && result.auth.userInfo) {
                const userInfo = result.auth.userInfo;
                const nickname = userInfo.nickname || '未设置昵称';
                const avatar = userInfo.avatar || 'logo-small.png';

                console.log('[profileMini] 用户昵称:', nickname);
                console.log('[profileMini] 用户头像:', avatar);

                // 更新个人信息头像下方的昵称
                const userNickname = document.querySelector('#user-nickname');
                if (userNickname) {
                    userNickname.textContent = nickname;
                    console.log('[profileMini] 用户昵称已更新');
                }

                // 更新简历卡片中的昵称
                const resumeNickname = document.querySelector('#resume-nickname');
                if (resumeNickname) {
                    resumeNickname.textContent = nickname;
                    console.log('[profileMini] 简历昵称已更新');
                }

                // 更新头像
                const userAvatar = document.querySelector('#user-avatar');
                if (userAvatar) {
                    userAvatar.src = avatar;
                    userAvatar.style.display = 'block';
                    console.log('[profileMini] 用户头像已更新');
                }
            } else {
                console.warn('[profileMini] 未找到用户信息');
            }
        });
    }

    /**
     * 渲染简历数据
     */
    function renderResumeData() {
        console.log('[profileMini] renderResumeData 被调用');

        if (resumeList.length === 0) {
            console.warn('[profileMini] 简历列表为空，显示提示信息');
            showNoResumeMessage();
            return;
        }

        const resume = resumeList[currentResumeIndex];
        console.log('[profileMini] 当前渲染的简历:', resume);

        if (!resume) {
            console.error('[profileMini] 当前索引的简历不存在');
            return;
        }

        // 更新简历名称和类型
        const resumeTypeElement = document.querySelector('.resume-type');
        if (resumeTypeElement) {
            resumeTypeElement.textContent = resume.resumeName || '简历名称';
            resumeTypeElement.style.color = ''; // 清除错误提示的颜色
            console.log('[profileMini] 简历名称已更新:', resume.resumeName);
        }

        // 更新各个字段
        Object.entries(FIELD_MAPPING).forEach(([field, selector]) => {
            const element = document.querySelector(selector);
            if (element) {
                const value = resume[field];
                if (value && value !== '' && value !== 'null' && value !== null) {
                    element.textContent = value;
                    console.log(`[profileMini] 字段 ${field} 已更新:`, value);
                } else {
                    element.textContent = '-';
                }
            } else {
                console.warn(`[profileMini] 未找到元素:`, selector);
            }
        });

        // 更新下一个简历的预览
        updateNextResumePreview();
        console.log('[profileMini] 简历数据渲染完成');
    }

    /**
     * 更新下一个简历的预览
     */
    function updateNextResumePreview() {
        // 更新切换提示文字
        const tooltip = document.querySelector('.switch-tooltip');
        if (tooltip) {
            tooltip.textContent = '切换下一份简历';
        }

        // 只有多个简历时才更新预览内容
        if (resumeList.length <= 1) return;

        const nextIndex = (currentResumeIndex + 1) % resumeList.length;
        const nextResume = resumeList[nextIndex];

        const nextPage = document.querySelector('.resume-page-next');
        if (nextPage && nextResume) {
            const nextTitle = nextPage.querySelector('div[style*="text-align:right"]');
            if (nextTitle) {
                nextTitle.textContent = nextResume.resumeName || '简历 B';
            }

            const nextName = nextPage.querySelector('div[style*="font-size:9px"]');
            if (nextName) {
                nextName.textContent = nextResume.name || '加载中...';
            }
        }
    }

    /**
     * 显示无简历数据提示信息
     */
    function showNoResumeMessage() {
        const resumeTypeElement = document.querySelector('.resume-type');
        if (resumeTypeElement) {
            resumeTypeElement.textContent = '请先上传简历';
            resumeTypeElement.style.color = '#ff9a9e';
        }

        // 清空所有信息单元格
        const infoCells = document.querySelectorAll('.info-cell-value');
        infoCells.forEach(cell => {
            cell.textContent = '-';
        });
    }

    /**
     * 显示未登录提示信息
     */
    function showNoAuthMessage() {
        const resumeTypeElement = document.querySelector('.resume-type');
        if (resumeTypeElement) {
            resumeTypeElement.textContent = '请先登录';
            resumeTypeElement.style.color = '#ff9a9e';
        }

        // 清空所有信息单元格
        const infoCells = document.querySelectorAll('.info-cell-value');
        infoCells.forEach(cell => {
            cell.textContent = '-';
        });

        // 更新用户昵称显示为"未登录"
        const userNickname = document.querySelector('#user-nickname');
        if (userNickname) {
            userNickname.textContent = '未登录';
        }

        const resumeNickname = document.querySelector('#resume-nickname');
        if (resumeNickname) {
            resumeNickname.textContent = '未登录';
        }
    }

    /**
     * 切换到下一份简历
     */
    function switchToNextResume() {
        if (resumeList.length <= 1) return;

        currentResumeIndex = (currentResumeIndex + 1) % resumeList.length;
        renderResumeData();
    }

    /**
     * 初始化简历数据（从 storage 读取）
     * 注意：此页面不调用接口，而是从 chrome.storage.local 读取
     * 数据由智能填充页面（resumeInterfaceTwo.js）负责更新
     */
    async function initResumeData() {
        try {
            console.log('[profileMini] 开始初始化简历数据（从 storage 读取）...');

            // 先检查 auth 是否存在
            const { auth } = await chrome.storage.local.get(['auth']);

            if (!auth || !auth.token) {
                console.warn('[profileMini] 未找到认证信息，跳过简历数据加载');
                showNoAuthMessage();
                return;
            }

            console.log('[profileMini] 认证信息已验证，开始从 storage 获取简历列表');

            // 从 storage 获取简历列表（不调用接口）
            resumeList = await getResumeList();
            console.log('[profileMini] 从 storage 获取到的简历列表数量:', resumeList.length);

            if (resumeList.length === 0) {
                console.warn('[profileMini] storage 中没有可用的简历数据');
                console.info('[profileMini] 提示：请先访问智能填充页面以加载简历数据');
                showNoResumeMessage();
                return;
            }

            // 重置索引
            currentResumeIndex = 0;

            // 渲染简历数据
            console.log('[profileMini] 开始渲染简历数据...');
            renderResumeData();

            // 绑定简历切换事件
            bindResumeSwitchEvents();

            console.log('[profileMini] ✓ 简历数据初始化完成');
        } catch (error) {
            console.error('[profileMini] 初始化简历数据失败:', error);
        }
    }

    /**
     * 绑定简历切换事件
     */
    function bindResumeSwitchEvents() {
        const bookWrapper = document.querySelector('.book-wrapper');
        if (bookWrapper) {
            bookWrapper.addEventListener('click', () => {
                // 只有在有多份简历时才切换
                if (resumeList.length > 1) {
                    switchToNextResume();
                }
            });
        }
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

        console.log('[profileMini] 关闭按钮已初始化');
    }

    /**
     * 初始化设置按钮
     */
    function initSettingsButton() {
        const settingsBtn = document.querySelector('.btn-settings');
        if (!settingsBtn) return;

        settingsBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();

            try {
                // 检查用户是否已登录
                const { auth } = await chrome.storage.local.get(['auth']);
                const config = getConfig();

                // 如果未登录，跳转到登录页面
                if (!auth || !auth.token) {
                    const loginUrl = `${config.WEB_URL}/login?from=plugin`;
                    await chrome.tabs.create({
                        url: loginUrl,
                        active: true
                    });
                    console.log('[profileMini] 用户未登录，已打开登录页面:', loginUrl);
                } else {
                    // 已登录，打开官网首页
                    const webUrl = config.WEB_URL;
                    await chrome.tabs.create({
                        url: webUrl,
                        active: true
                    });
                    console.log('[profileMini] 已打开官网:', webUrl);
                }

                // 关闭弹窗
                window.close();
            } catch (error) {
                console.error('[profileMini] 打开页面失败:', error);
                alert('打开页面失败，请重试');
            }
        });

        console.log('[profileMini] 设置按钮已初始化');
    }

    /**
     * 初始化退出登录按钮
     */
    function initLogoutButton() {
        const logoutBtn = document.querySelector('.btn-logout');
        if (!logoutBtn) return;

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
                    console.error('[profileMini] 退出登录失败:', response);
                    alert('退出登录失败，请重试');
                }
            } catch (error) {
                console.error('[profileMini] 退出登录异常:', error);
                alert('退出登录出错，请重试');
            }
        });

        console.log('[profileMini] 退出登录按钮已初始化');
    }

    /**
     * 初始化登录按钮
     */
    function initLoginButton() {
        const loginBtn = document.getElementById('btn-go-login');
        if (!loginBtn) return;

        loginBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();

            try {
                const config = getConfig();
                const loginUrl = `${config.WEB_URL}/login?from=plugin`;

                // 在新标签页打开登录页面
                await chrome.tabs.create({
                    url: loginUrl,
                    active: true
                });

                console.log('[profileMini] 已打开登录页面:', loginUrl);

                // 关闭弹窗
                window.close();
            } catch (error) {
                console.error('[profileMini] 打开登录页面失败:', error);
                alert('打开登录页面失败，请重试');
            }
        });

        console.log('[profileMini] 登录按钮已初始化');
    }

    /**
     * 根据登录状态更新UI
     */
    async function updateUIByAuthStatus() {
        const { auth } = await chrome.storage.local.get(['auth']);
        const logoutBtn = document.querySelector('.btn-logout');
        const notLoggedInUI = document.getElementById('not-logged-in');
        const loggedInUI = document.getElementById('logged-in');

        if (!auth || !auth.token) {
            console.log('[profileMini] 用户未登录，显示登录提示');

            // 显示未登录UI，隐藏已登录UI
            if (notLoggedInUI) {
                notLoggedInUI.style.display = 'flex';
            }
            if (loggedInUI) {
                loggedInUI.style.display = 'none';
            }

            // 禁用退出登录按钮
            if (logoutBtn) {
                logoutBtn.style.opacity = '0.5';
                logoutBtn.style.pointerEvents = 'none';
                logoutBtn.title = '请先登录';
            }
        } else {
            console.log('[profileMini] 用户已登录，显示个人信息');

            // 隐藏未登录UI，显示已登录UI
            if (notLoggedInUI) {
                notLoggedInUI.style.display = 'none';
            }
            if (loggedInUI) {
                loggedInUI.style.display = 'flex';
            }

            // 启用退出登录按钮
            if (logoutBtn) {
                logoutBtn.style.opacity = '1';
                logoutBtn.style.pointerEvents = 'auto';
                logoutBtn.title = '退出登录';
            }
        }
    }

    /**
     * 主初始化函数
     */
    async function initialize() {
        try {
            console.log('[profileMini] 页面加载完成，开始初始化...');
            console.log('[profileMini] Chrome API 可用性检查:', {
                storage: typeof chrome !== 'undefined' && typeof chrome.storage !== 'undefined',
                runtime: typeof chrome !== 'undefined' && typeof chrome.runtime !== 'undefined',
                tabs: typeof chrome !== 'undefined' && typeof chrome.tabs !== 'undefined'
            });

            // 初始化各个组件
            console.log('[profileMini] 初始化关闭按钮...');
            initCloseButton();

            console.log('[profileMini] 初始化设置按钮...');
            initSettingsButton();

            console.log('[profileMini] 初始化退出登录按钮...');
            initLogoutButton();

            console.log('[profileMini] 初始化登录按钮...');
            initLoginButton();

            // 根据登录状态更新UI
            console.log('[profileMini] 根据登录状态更新UI...');
            await updateUIByAuthStatus();

            // 加载数据
            console.log('[profileMini] 加载用户信息...');
            loadUserInfo();

            console.log('[profileMini] 初始化简历数据...');
            await initResumeData();

            console.log('[profileMini] ✓ 初始化完成');
        } catch (error) {
            console.error('[profileMini] ✗ 初始化失败:', error);
            console.error('[profileMini] 错误堆栈:', error.stack);

            // 显示错误提示给用户
            const userNickname = document.querySelector('#user-nickname');
            if (userNickname) {
                userNickname.textContent = '初始化失败';
                userNickname.style.color = '#ff0000';
            }
        }
    }

    /**
     * 页面加载完成后初始化
     * 使用更健壮的方式来确保初始化被执行
     */
    if (document.readyState === 'loading') {
        // DOM 还在加载中，等待 DOMContentLoaded 事件
        console.log('[profileMini] DOM 正在加载，等待 DOMContentLoaded 事件...');
        document.addEventListener('DOMContentLoaded', () => {
            console.log('[profileMini] DOMContentLoaded 事件触发');
            initialize();
        });
    } else {
        // DOM 已经加载完成，直接执行初始化
        console.log('[profileMini] DOM 已就绪 (readyState:', document.readyState, ')，立即执行初始化');
        initialize();
    }

    // 添加窗口加载完成事件，作为备用
    window.addEventListener('load', () => {
        console.log('[profileMini] window.onload 事件触发（作为备用检查）');
    });

})();
