// 认证管理器实例
let authManager;

// DOM 元素
const loginView = document.getElementById('login-view')
const mainView = document.getElementById('main-view')
const logoutBtn = document.getElementById('logout-btn')
const statusElement = document.getElementById('status')

// 新的登录相关DOM元素
const emailLoginForm = document.getElementById('email-login')
const registerForm = document.getElementById('register-form')
const emailLoginBtn = document.getElementById('email-login-btn')
const registerBtn = document.getElementById('register-btn')
const showRegisterBtn = document.getElementById('show-register')
const showLoginBtn = document.getElementById('show-login')

// 表单输入元素
const loginEmailInput = document.getElementById('login-email')
const loginPasswordInput = document.getElementById('login-password')
const rememberMeInput = document.getElementById('remember-me')
const regEmailInput = document.getElementById('reg-email')
const regPasswordInput = document.getElementById('reg-password')
const regVerificationCodeInput = document.getElementById('reg-verification-code')
const regNicknameInput = document.getElementById('reg-nickname')
const sendCodeBtn = document.getElementById('send-code-btn')

// 用户信息元素
const userAvatar = document.getElementById('user-avatar')
const userNickname = document.getElementById('user-nickname')
const userVipBadge = document.getElementById('user-vip-badge')

// 功能按钮
const gotoJobsBtn = document.getElementById('goto-jobs')
const gotoStrategyBtn = document.getElementById('goto-strategy')
const gotoResumeBtn = document.getElementById('goto-resume')
const gotoProfileBtn = document.getElementById('goto-profile')

// 悬浮按钮控制
const floatingToggle = document.getElementById('floating-toggle')

/**
 * 初始化
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('插件已加载')

    // 初始化认证管理器
    initAuthManager()

    // 检查登录状态
    checkLoginStatus()

    // 加载悬浮按钮状态
    loadFloatingButtonState()

    // 绑定事件
    bindEvents()

    // 监听来自网页的消息（用于接收登录信息）
    setupMessageListener()

    // 监听Token刷新请求
    setupTokenRefreshListener()
})

/**
 * 初始化认证管理器
 */
function initAuthManager() {
    authManager = new AuthManager()
    console.log('认证管理器已初始化')
}

/**
 * 检查登录状态
 */
async function checkLoginStatus() {
    try {
        const isLoggedIn = await authManager.isLoggedIn()

        if (isLoggedIn) {
            const userInfo = await authManager.getStoredUserInfo()
            showMainView(userInfo)
            updateStatus('就绪', 'ready')
        } else {
            showLoginView()
            updateStatus('未登录', 'error')
        }
    } catch (error) {
        console.error('检查登录状态失败:', error)
        showLoginView()
        updateStatus('状态异常', 'error')
    }
}

/**
 * 显示登录视图
 */
function showLoginView() {
    loginView.style.display = 'block'
    mainView.style.display = 'none'

    // 重置表单
    resetForms()

    // 默认显示登录表单
    showEmailLoginForm()
}

/**
 * 显示主视图
 */
function showMainView(userInfo) {
    loginView.style.display = 'none'
    mainView.style.display = 'block'

    // 更新用户信息
    if (userInfo) {
        userNickname.textContent = userInfo.nickname || '用户'

        // 设置头像
        if (userInfo.avatar) {
            userAvatar.src = userInfo.avatar
        } else {
            // 默认头像
            userAvatar.src = 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png'
        }

        // 显示VIP徽章
        if (userInfo.isVip === 1 || userInfo.isVip === true) {
            userVipBadge.style.display = 'inline-block'
        } else {
            userVipBadge.style.display = 'none'
        }
    }
}

/**
 * 绑定事件
 */
function bindEvents() {
    // 退出登录按钮
    logoutBtn.addEventListener('click', handleLogout)

    // 邮箱登录按钮（验证码登录）
    emailLoginBtn.addEventListener('click', handleEmailCodeLogin)

    // 发送验证码按钮
    sendCodeBtn.addEventListener('click', handleSendVerificationCode)

    // 注册按钮
    registerBtn.addEventListener('click', handleRegister)

    // 切换表单按钮
    showRegisterBtn.addEventListener('click', showRegisterForm)
    showLoginBtn.addEventListener('click', showEmailLoginForm)

    // 回车键登录
    loginEmailInput.addEventListener('keypress', handleEnterKey)
    loginPasswordInput.addEventListener('keypress', handleEnterKey)

    // 功能按钮
    gotoJobsBtn.addEventListener('click', () => openWebPage('/jobs'))
    gotoStrategyBtn.addEventListener('click', () => openWebPage('/strategy'))
    gotoResumeBtn.addEventListener('click', () => openWebPage('/resume'))
    gotoProfileBtn.addEventListener('click', () => openWebPage('/profile'))

    // 悬浮按钮开关
    floatingToggle.addEventListener('change', handleFloatingToggle)

    // 表单验证
    setupFormValidation()
}

// ================ 新的登录处理函数 ================

/**
 * 处理邮箱登录（密码登录）
 */
async function handleEmailLogin() {
    const email = loginEmailInput.value.trim()
    const password = loginPasswordInput.value
    const rememberMe = rememberMeInput.checked

    if (!email || !password) {
        updateStatus('请填写完整信息', 'error')
        return
    }

    updateStatus('登录中...', 'loading')
    emailLoginBtn.disabled = true

    try {
        const result = await authManager.emailLogin(email, password, rememberMe)
        console.log('登录成功:', result.user)

        showMainView(result.user)
        updateStatus('登录成功', 'ready')

    } catch (error) {
        console.error('登录失败:', error)
        updateStatus(`登录失败: ${error.message}`, 'error')
    } finally {
        emailLoginBtn.disabled = false
    }
}

/**
 * 处理邮箱验证码登录
 */
async function handleEmailCodeLogin() {
    const email = loginEmailInput.value.trim()
    const verificationCode = loginPasswordInput.value.trim() // 临时使用密码输入框作为验证码输入

    if (!email || !verificationCode) {
        updateStatus('请输入邮箱和验证码', 'error')
        return
    }

    emailLoginBtn.disabled = true
    updateStatus('登录中...', 'loading')

    try {
        const result = await authManager.emailLoginWithCode(email, verificationCode)
        console.log('邮箱验证码登录成功:', result)
        
        // 保存用户信息
        const userInfo = result.userInfo
        updateUserInfo(userInfo)
        
        // 显示主界面
        showMainView()
        updateStatus('登录成功！', 'ready')
        
    } catch (error) {
        console.error('邮箱验证码登录失败:', error)
        updateStatus(`登录失败: ${error.message}`, 'error')
    } finally {
        emailLoginBtn.disabled = false
    }
}

/**
 * 发送邮箱验证码
 */
async function handleSendVerificationCode() {
    const email = regEmailInput.value.trim()

    if (!email) {
        updateStatus('请输入邮箱地址', 'error')
        return
    }

    updateStatus('发送验证码中...', 'loading')
    sendCodeBtn.disabled = true

    try {
        await authManager.sendEmailCode(email, 'register')
        updateStatus('验证码已发送，请查收邮箱', 'ready')
        
        // 60秒倒计时
        let countdown = 60
        sendCodeBtn.textContent = `${countdown}秒后重试`
        const timer = setInterval(() => {
            countdown--
            if (countdown > 0) {
                sendCodeBtn.textContent = `${countdown}秒后重试`
            } else {
                clearInterval(timer)
                sendCodeBtn.textContent = '发送验证码'
                sendCodeBtn.disabled = false
            }
        }, 1000)
        
    } catch (error) {
        console.error('发送验证码失败:', error)
        updateStatus(`发送验证码失败: ${error.message}`, 'error')
        sendCodeBtn.disabled = false
    }
}

/**
 * 处理用户注册
 */
async function handleRegister() {
    const email = regEmailInput.value.trim()
    const password = regPasswordInput.value
    const verificationCode = regVerificationCodeInput.value.trim()
    const nickname = regNicknameInput.value.trim()

    // 基本验证
    if (!email || !password || !verificationCode) {
        updateStatus('请填写完整信息', 'error')
        return
    }

    if (password.length < 6) {
        updateStatus('密码长度不能少于6位', 'error')
        return
    }

    updateStatus('注册中...', 'loading')
    registerBtn.disabled = true

    try {
        const userData = {
            email,
            password,
            verificationCode,
            nickname: nickname || email.split('@')[0]
        }

        const result = await authManager.emailRegister(userData)
        console.log('注册成功:', result.user)

        showMainView(result.user)
        updateStatus('注册成功！', 'ready')

    } catch (error) {
        console.error('注册失败:', error)
        updateStatus(`注册失败: ${error.message}`, 'error')
    } finally {
        registerBtn.disabled = false
    }
}

// ================ 表单管理函数 ================

/**
 * 显示邮箱登录表单
 */
function showEmailLoginForm() {
    emailLoginForm.style.display = 'block'
    registerForm.style.display = 'none'
    showRegisterBtn.style.display = 'block'
    showLoginBtn.style.display = 'none'
}

/**
 * 显示注册表单
 */
function showRegisterForm() {
    emailLoginForm.style.display = 'none'
    registerForm.style.display = 'block'
    showRegisterBtn.style.display = 'none'
    showLoginBtn.style.display = 'block'
}

/**
 * 重置所有表单
 */
function resetForms() {
    // 清空登录表单
    loginEmailInput.value = ''
    loginPasswordInput.value = ''
    rememberMeInput.checked = false

    // 清空注册表单
    regEmailInput.value = ''
    regPasswordInput.value = ''
    regVerificationCodeInput.value = ''
    regNicknameInput.value = ''

    // 移除错误状态
    clearValidationErrors()
}

/**
 * 处理回车键登录
 */
function handleEnterKey(event) {
    if (event.key === 'Enter') {
        if (emailLoginForm.style.display !== 'none') {
            handleEmailLogin()
        }
    }
}

/**
 * 设置表单验证
 */
function setupFormValidation() {
    // 邮箱验证
    regEmailInput.addEventListener('blur', validateEmail)

    // 密码强度验证
    regPasswordInput.addEventListener('input', validatePassword)

    // 确认密码验证
    regConfirmPasswordInput.addEventListener('input', validateConfirmPassword)

    // 用户名验证
    regUsernameInput.addEventListener('blur', validateUsername)
}

/**
 * 验证邮箱格式
 */
function validateEmail() {
    const email = regEmailInput.value.trim()
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    if (email && !emailRegex.test(email)) {
        showFieldError(regEmailInput, '邮箱格式不正确')
        return false
    }

    clearFieldError(regEmailInput)
    return true
}

/**
 * 验证密码强度
 */
function validatePassword() {
    const password = regPasswordInput.value

    if (password.length > 0 && password.length < 6) {
        showFieldError(regPasswordInput, '密码长度不能少于6位')
        return false
    }

    clearFieldError(regPasswordInput)

    // 如果确认密码已输入，重新验证确认密码
    if (regConfirmPasswordInput.value) {
        validateConfirmPassword()
    }

    return true
}

/**
 * 验证确认密码
 */
function validateConfirmPassword() {
    const password = regPasswordInput.value
    const confirmPassword = regConfirmPasswordInput.value

    if (confirmPassword && password !== confirmPassword) {
        showFieldError(regConfirmPasswordInput, '两次密码输入不一致')
        return false
    }

    clearFieldError(regConfirmPasswordInput)
    return true
}

/**
 * 验证用户名
 */
function validateUsername() {
    const username = regUsernameInput.value.trim()
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/

    if (username && !usernameRegex.test(username)) {
        showFieldError(regUsernameInput, '用户名只能包含字母、数字、下划线，3-20位')
        return false
    }

    clearFieldError(regUsernameInput)
    return true
}

/**
 * 显示字段错误
 */
function showFieldError(input, message) {
    clearFieldError(input)

    input.classList.add('error')

    const errorDiv = document.createElement('div')
    errorDiv.className = 'field-error'
    errorDiv.textContent = message

    input.parentNode.appendChild(errorDiv)
}

/**
 * 清除字段错误
 */
function clearFieldError(input) {
    input.classList.remove('error')

    const errorDiv = input.parentNode.querySelector('.field-error')
    if (errorDiv) {
        errorDiv.remove()
    }
}

/**
 * 清除所有验证错误
 */
function clearValidationErrors() {
    const errorInputs = document.querySelectorAll('.login-input.error')
    errorInputs.forEach(input => clearFieldError(input))
}

/**
 * 处理退出登录
 */
async function handleLogout() {
    if (confirm('确定要退出登录吗？')) {
        updateStatus('退出中...', 'loading')

        try {
            await authManager.logout()
            showLoginView()
            updateStatus('已退出登录', 'error')
        } catch (error) {
            console.error('退出登录失败:', error)
            // 即使错误也要显示登录页面
            showLoginView()
            updateStatus('退出完成', 'error')
        }
    }
}

/**
 * 打开网页
 */
function openWebPage(path) {
    const url = `${window.CONFIG.getWebBaseUrl()}${path}`

    chrome.tabs.create({
        url: url,
        active: true
    }, function(tab) {
        console.log('已打开页面:', url)
    })
}

/**
 * 更新状态显示
 */
function updateStatus(text, type) {
    statusElement.textContent = text
    statusElement.className = 'status-' + type
}

/**
 * 设置消息监听器（接收来自网页的登录信息）
 */
function setupMessageListener() {
    // 监听来自内容脚本或其他扩展页面的消息
    chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
        console.log('收到消息:', message)

        if (message.type === 'AUTH_SUCCESS') {
            // 登录成功，保存token和用户信息
            const token = message.token
            const userInfo = message.userInfo

            chrome.storage.local.set({
                'access_token': token,
                'user_info': userInfo
            }, function() {
                console.log('登录信息已保存')
                showMainView(userInfo)
                updateStatus('登录成功！', 'ready')

                // 发送响应
                sendResponse({ success: true, message: '登录信息已保存' })
            })

            // 返回 true 表示异步发送响应
            return true
        }
    })

    // 监听来自网页的 postMessage（备用方案）
    window.addEventListener('message', function(event) {
        console.log('收到 postMessage:', event.data)

        if (event.data && event.data.type === 'AUTH_SUCCESS') {
            const token = event.data.token
            const userInfo = event.data.userInfo

            chrome.storage.local.set({
                'access_token': token,
                'user_info': userInfo
            }, function() {
                console.log('登录信息已保存（postMessage）')
                showMainView(userInfo)
                updateStatus('登录成功！', 'ready')
            })
        }
    })
}

/**
 * 监听存储变化（用于多个插件窗口同步状态）
 */
chrome.storage.onChanged.addListener(function(changes, namespace) {
    if (namespace === 'local') {
        // 如果 access_token 被移除，切换到登录视图
        if (changes.access_token && !changes.access_token.newValue) {
            showLoginView()
            updateStatus('未登录', 'error')
        }

        // 如果 access_token 被添加，切换到主视图
        if (changes.access_token && changes.access_token.newValue) {
            chrome.storage.local.get(['user_info'], function(result) {
                showMainView(result.user_info)
                updateStatus('就绪', 'ready')
            })
        }
    }
})

/**
 * 加载悬浮按钮状态
 */
function loadFloatingButtonState() {
    chrome.storage.local.get(['floating_button_enabled'], function(result) {
        const enabled = result.floating_button_enabled !== false // 默认开启
        floatingToggle.checked = enabled
        console.log('悬浮按钮状态:', enabled ? '开启' : '关闭')
    })
}

/**
 * 处理悬浮按钮开关切换
 */
function handleFloatingToggle(event) {
    const enabled = event.target.checked
    console.log('悬浮按钮切换为:', enabled ? '开启' : '关闭')

    // 保存状态到 storage
    chrome.storage.local.set({
        floating_button_enabled: enabled
    }, function() {
        console.log('悬浮按钮状态已保存')
    })

    // 发送消息到所有标签页的 content script
    chrome.tabs.query({}, function(tabs) {
        tabs.forEach(function(tab) {
            chrome.tabs.sendMessage(tab.id, {
                type: 'TOGGLE_FLOATING_BUTTON',
                enabled: enabled
            }, function(response) {
                if (chrome.runtime.lastError) {
                    // 某些标签页可能没有注入 content script，忽略错误
                    console.log('标签页', tab.id, '没有响应')
                } else {
                    console.log('已通知标签页', tab.id)
                }
            })
        })
    })

    // 更新状态提示
    if (enabled) {
        updateStatus('悬浮按钮已开启', 'ready')
    } else {
        updateStatus('悬浮按钮已关闭', 'ready')
    }

    // 2秒后恢复状态显示
    setTimeout(() => {
        updateStatus('就绪', 'ready')
    }, 2000)
}

/**
 * 设置Token刷新监听器
 */
function setupTokenRefreshListener() {
    // 监听来自content script的Token刷新请求
    chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
        if (message.type === 'REFRESH_TOKEN') {
            try {
                console.log('[Popup] 收到Token刷新请求')
                await authManager.refreshToken()
                sendResponse({ success: true })
                return true
            } catch (error) {
                console.error('[Popup] Token刷新失败:', error)
                sendResponse({ success: false, error: error.message })
            }
        }
    })
}

console.log('popup.js 已加载完成')
