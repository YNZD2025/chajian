// Content Script - 注入到网页中，用于桥接网页和插件的通信

console.log('✅ 一念职达插件 Content Script 已加载')

let authSent = false

// ==================== 初始化核心模块 ====================

// 等待页面加载完成后初始化动态弹窗检测
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        console.log('[核心模块] 页面加载完成，初始化动态弹窗检测...')
        if (typeof initDynamicPopupDetection === 'function') {
            initDynamicPopupDetection()
        }
    })
} else {
    // 页面已经加载完成
    console.log('[核心模块] 立即初始化动态弹窗检测...')
    if (typeof initDynamicPopupDetection === 'function') {
        initDynamicPopupDetection()
    }
}

// ==================== 全局错误处理 ====================

/**
 * 检查Chrome扩展上下文是否有效
 * 防止插件重新加载后的上下文失效错误
 */
function isChromeExtensionValid() {
    try {
        return !!(chrome && chrome.runtime && chrome.runtime.id)
    } catch (e) {
        return false
    }
}

/**
 * 安全地使用Chrome Storage API
 */
function safeChromeStorageSet(data, callback) {
    if (!isChromeExtensionValid()) {
        console.warn('Chrome扩展上下文已失效，跳过storage操作')
        return
    }

    try {
        chrome.storage.local.set(data, callback)
    } catch (error) {
        console.warn('Chrome storage操作失败:', error.message)
    }
}

/**
 * 安全地使用Chrome Storage API (Get)
 */
function safeChromeStorageGet(keys, callback) {
    if (!isChromeExtensionValid()) {
        console.warn('Chrome扩展上下文已失效，返回空数据')
        callback({})
        return
    }

    try {
        chrome.storage.local.get(keys, callback)
    } catch (error) {
        console.warn('Chrome storage获取失败:', error.message)
        callback({})
    }
}

/**
 * 安全地发送Chrome Runtime消息
 */
function safeChromeRuntimeSendMessage(message, callback) {
    if (!isChromeExtensionValid()) {
        console.warn('Chrome扩展上下文已失效，跳过消息发送')
        if (callback) callback({ success: false, message: '扩展已失效' })
        return
    }

    try {
        chrome.runtime.sendMessage(message, function(response) {
            if (chrome.runtime.lastError) {
                console.warn('Chrome消息发送失败:', chrome.runtime.lastError.message)
                if (callback) callback({ success: false, message: chrome.runtime.lastError.message })
            } else {
                if (callback) callback(response)
            }
        })
    } catch (error) {
        console.warn('Chrome消息发送异常:', error.message)
        if (callback) callback({ success: false, message: error.message })
    }
}

// 监听来自网页的消息
window.addEventListener('message', function(event) {
    // 只处理来自同源的消息
    if (event.source !== window) {
        return
    }

    const data = event.data
    console.log('Content Script 收到 postMessage:', data)

    // 处理来自 PluginCallback 页面的授权请求
    if (data && data.type === 'PAGE_TO_CONTENT_AUTH' && data.source === 'plugin-callback-page') {
        console.log('✅ 收到授权请求，准备转发给插件')

        if (authSent) {
            console.log('⚠️ 授权已发送，跳过重复请求')
            return
        }

        authSent = true
        forwardAuthToExtension(data.token, data.userInfo)
    }

    // 处理来自插件的状态通知（用于反馈给页面）
    if (data && data.type === 'PLUGIN_AUTH_STATUS') {
        console.log('📢 插件授权状态:', data.status, '-', data.message)
    }
})

/**
 * 转发授权信息给插件 Background
 */
function forwardAuthToExtension(token, userInfo) {
    console.log('===== 开始转发授权信息给插件 =====')

    if (!isChromeExtensionValid()) {
        console.error('❌ Chrome扩展上下文已失效')
        notifyPage('error', '插件未安装或已重新加载，请刷新页面')
        return
    }

    // 发送消息给 Background
    const message = {
        type: 'AUTH_SUCCESS',
        token: token,
        userInfo: userInfo
    }

    console.log('发送消息给 Background...', message.type)

    safeChromeRuntimeSendMessage(message, function(response) {
        if (response && response.success !== false) {
            console.log('✅ Background 响应成功:', response)
            notifyPage('success', '授权成功！')
        } else {
            console.error('❌ 发送消息失败:', response?.message)
            notifyPage('error', '无法连接到插件，请重新加载插件')
        }
    })
}

/**
 * 通知页面状态变化
 */
function notifyPage(status, message) {
    console.log('📢 通知页面:', status, '-', message)

    // 向页面发送自定义事件
    window.postMessage({
        type: 'PLUGIN_AUTH_STATUS',
        status: status,
        message: message
    }, '*')
}

console.log('✅ Content Script 初始化完成，等待页面消息...')

// 监听来自插件 popup 的消息
if (isChromeExtensionValid()) {
    try {
        chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
            console.log('Content Script 收到插件消息:', message)

            if (message.type === 'TOGGLE_FLOATING_BUTTON') {
                const enabled = message.enabled
                console.log('收到悬浮按钮控制指令:', enabled ? '显示' : '隐藏')

                if (enabled) {
                    showFloatingButton()
                } else {
                    hideFloatingButtonPermanently()
                }

                sendResponse({ success: true })
            }

            return true
        })
    } catch (error) {
        console.warn('监听插件消息失败:', error.message)
    }
}

// ==================== 悬浮组件功能 ====================

// 悬浮组件状态
let floatingState = {
    isPinned: false,  // 是否常驻
    isChatOpen: false, // 对话窗口是否打开
    isMenuOpen: false  // 设置菜单是否打开
}

// 创建悬浮组件
function createFloatingWidget() {
    console.log('🎯 开始创建悬浮组件...')

    // 创建容器
    const container = document.createElement('div')
    container.className = 'yinianzhida-floating-container'
    container.innerHTML = `
        <!-- 悬浮按钮 -->
        <div class="yinianzhida-floating-button" id="yinianzhida-float-btn">
            <div class="yinianzhida-floating-button-icon">🎯</div>
        </div>

        <!-- 设置菜单 -->
        <div class="yinianzhida-settings-menu" id="yinianzhida-settings-menu">
            <div class="yinianzhida-menu-item" id="yinianzhida-toggle-pin">
                <span class="yinianzhida-menu-item-icon">📌</span>
                <span class="yinianzhida-menu-item-text">常驻</span>
            </div>
            <div class="yinianzhida-menu-item" id="yinianzhida-hide">
                <span class="yinianzhida-menu-item-icon">👁️</span>
                <span class="yinianzhida-menu-item-text">隐藏</span>
            </div>
        </div>

        <!-- 对话窗口 -->
        <div class="yinianzhida-chat-window" id="yinianzhida-chat-window">
            <!-- 窗口头部 -->
            <div class="yinianzhida-chat-header">
                <div class="yinianzhida-chat-title">
                    <div class="yinianzhida-chat-logo">🎯</div>
                    <div class="yinianzhida-chat-title-text">
                        <h3>一念直达</h3>
                        <p>特使用：<span id="yinianzhida-usage-count">0</span>次</p>
                    </div>
                </div>
                <div class="yinianzhida-chat-actions">
                    <button class="yinianzhida-action-btn" id="yinianzhida-share-btn" title="分享">
                        🔗
                    </button>
                    <button class="yinianzhida-action-btn" id="yinianzhida-close-chat" title="关闭">
                        ❌
                    </button>
                </div>
            </div>

            <!-- 消息区域 -->
            <div class="yinianzhida-chat-messages" id="yinianzhida-messages">
                <div class="yinianzhida-message system">
                    👋 您好！我是一念职达AI助手，可以帮您智能填写网申表单
                </div>
            </div>

            <!-- 输入区域 -->
            <div class="yinianzhida-chat-input-area">
                <div class="yinianzhida-chat-input-container">
                    <textarea
                        class="yinianzhida-chat-input"
                        id="yinianzhida-input"
                        placeholder="开始填写..."
                        rows="1"
                    ></textarea>
                    <button class="yinianzhida-send-btn" id="yinianzhida-send-btn">
                        ➤
                    </button>
                </div>
            </div>
        </div>
    `

    // 添加到页面
    document.body.appendChild(container)
    console.log('✅ 悬浮组件 DOM 创建完成')

    // 绑定事件
    bindFloatingEvents()

    // 从存储中恢复状态
    restoreFloatingState()
}

// 绑定事件监听
function bindFloatingEvents() {
    console.log('🎯 绑定悬浮组件事件...')

    const floatBtn = document.getElementById('yinianzhida-float-btn')
    const settingsMenu = document.getElementById('yinianzhida-settings-menu')
    const chatWindow = document.getElementById('yinianzhida-chat-window')
    const togglePinBtn = document.getElementById('yinianzhida-toggle-pin')
    const hideBtn = document.getElementById('yinianzhida-hide')
    const closeChatBtn = document.getElementById('yinianzhida-close-chat')
    const sendBtn = document.getElementById('yinianzhida-send-btn')
    const inputArea = document.getElementById('yinianzhida-input')

    // 悬浮按钮点击 - 打开对话窗口
    floatBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        toggleChatWindow()
    })

    // 悬浮按钮长按 - 打开设置菜单
    let longPressTimer
    floatBtn.addEventListener('mousedown', () => {
        longPressTimer = setTimeout(() => {
            toggleSettingsMenu()
        }, 500)
    })

    floatBtn.addEventListener('mouseup', () => {
        clearTimeout(longPressTimer)
    })

    floatBtn.addEventListener('mouseleave', () => {
        clearTimeout(longPressTimer)
    })

    // 悬浮按钮右键 - 打开设置菜单
    floatBtn.addEventListener('contextmenu', (e) => {
        e.preventDefault()
        e.stopPropagation()
        toggleSettingsMenu()
    })

    // 常驻/取消常驻
    togglePinBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        togglePin()
        closeSettingsMenu()
    })

    // 隐藏按钮
    hideBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        hideFloatingButton()
        closeSettingsMenu()
    })

    // 关闭对话窗口
    closeChatBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        closeChatWindow()
    })

    // 发送消息
    sendBtn.addEventListener('click', () => {
        sendMessage()
    })

    // 输入框回车发送
    inputArea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            sendMessage()
        }
    })

    // 输入框自动调整高度
    inputArea.addEventListener('input', () => {
        inputArea.style.height = 'auto'
        inputArea.style.height = Math.min(inputArea.scrollHeight, 100) + 'px'
    })

    // 点击其他地方关闭菜单
    document.addEventListener('click', () => {
        closeSettingsMenu()
    })

    console.log('✅ 悬浮组件事件绑定完成')
}

// 切换对话窗口
function toggleChatWindow() {
    floatingState.isChatOpen = !floatingState.isChatOpen
    const chatWindow = document.getElementById('yinianzhida-chat-window')

    if (floatingState.isChatOpen) {
        chatWindow.classList.add('show')
        console.log('💬 对话窗口已打开')

        // 滚动到底部
        setTimeout(() => {
            const messages = document.getElementById('yinianzhida-messages')
            messages.scrollTop = messages.scrollHeight
        }, 100)

        // 聚焦输入框
        document.getElementById('yinianzhida-input').focus()
    } else {
        chatWindow.classList.remove('show')
        console.log('💬 对话窗口已关闭')
    }
}

// 关闭对话窗口
function closeChatWindow() {
    floatingState.isChatOpen = false
    const chatWindow = document.getElementById('yinianzhida-chat-window')
    chatWindow.classList.remove('show')
    console.log('💬 对话窗口已关闭')
}

// 切换设置菜单
function toggleSettingsMenu() {
    floatingState.isMenuOpen = !floatingState.isMenuOpen
    const menu = document.getElementById('yinianzhida-settings-menu')

    if (floatingState.isMenuOpen) {
        menu.classList.add('show')
        console.log('⚙️ 设置菜单已打开')
    } else {
        menu.classList.remove('show')
        console.log('⚙️ 设置菜单已关闭')
    }
}

// 关闭设置菜单
function closeSettingsMenu() {
    floatingState.isMenuOpen = false
    const menu = document.getElementById('yinianzhida-settings-menu')
    menu.classList.remove('show')
}

// 切换常驻状态
function togglePin() {
    floatingState.isPinned = !floatingState.isPinned
    const floatBtn = document.getElementById('yinianzhida-float-btn')
    const togglePinBtn = document.getElementById('yinianzhida-toggle-pin')

    if (floatingState.isPinned) {
        floatBtn.classList.add('pinned')
        togglePinBtn.querySelector('.yinianzhida-menu-item-text').textContent = '取消常驻'
        console.log('📌 已设置为常驻')
    } else {
        floatBtn.classList.remove('pinned')
        togglePinBtn.querySelector('.yinianzhida-menu-item-text').textContent = '常驻'
        console.log('📌 已取消常驻')
    }

    // 保存状态
    saveFloatingState()
}

// 隐藏悬浮按钮
function hideFloatingButton() {
    const floatBtn = document.getElementById('yinianzhida-float-btn')
    floatBtn.style.display = 'none'
    console.log('👁️ 悬浮按钮已隐藏')

    // 添加提示消息
    addSystemMessage('悬浮按钮已隐藏，刷新页面后会重新显示')

    // 如果对话窗口是打开的，也关闭它
    if (floatingState.isChatOpen) {
        closeChatWindow()
    }
}

// 发送消息
function sendMessage() {
    const inputArea = document.getElementById('yinianzhida-input')
    const message = inputArea.value.trim()

    if (!message) {
        return
    }

    console.log('📤 发送消息:', message)

    // 添加用户消息
    addMessage('user', message)

    // 清空输入框
    inputArea.value = ''
    inputArea.style.height = 'auto'

    // 检测用户意图
    if (/开始|启动|填写|填表|自动|填充/i.test(message)) {
        // 启动自动填表
        startAutoFill()
    } else if (/暂停|停止/i.test(message)) {
        // 暂停填表
        pauseAutoFill()
    } else if (/继续|恢复/i.test(message)) {
        // 继续填表
        resumeAutoFill()
    } else {
        // 普通对话
        setTimeout(() => {
            addTypingIndicator()

            setTimeout(() => {
                removeTypingIndicator()

                // 生成回复
                const reply = generateAIReply(message)
                addMessage('assistant', reply)

                // 更新使用次数
                updateUsageCount()
            }, 1500)
        }, 500)
    }
}

// 添加消息
function addMessage(type, content) {
    const messagesContainer = document.getElementById('yinianzhida-messages')
    const messageDiv = document.createElement('div')
    messageDiv.className = `yinianzhida-message ${type}`
    messageDiv.textContent = content

    messagesContainer.appendChild(messageDiv)

    // 滚动到底部
    messagesContainer.scrollTop = messagesContainer.scrollHeight
}

// 添加系统消息
function addSystemMessage(content) {
    const messagesContainer = document.getElementById('yinianzhida-messages')
    const messageDiv = document.createElement('div')
    messageDiv.className = 'yinianzhida-message system'
    messageDiv.textContent = content

    messagesContainer.appendChild(messageDiv)
    messagesContainer.scrollTop = messagesContainer.scrollHeight
}

// 添加输入中指示器
function addTypingIndicator() {
    const messagesContainer = document.getElementById('yinianzhida-messages')
    const typingDiv = document.createElement('div')
    typingDiv.className = 'yinianzhida-message assistant'
    typingDiv.id = 'yinianzhida-typing'
    typingDiv.innerHTML = `
        <div class="yinianzhida-typing-indicator">
            <div class="yinianzhida-typing-dot"></div>
            <div class="yinianzhida-typing-dot"></div>
            <div class="yinianzhida-typing-dot"></div>
        </div>
    `

    messagesContainer.appendChild(typingDiv)
    messagesContainer.scrollTop = messagesContainer.scrollHeight
}

// 移除输入中指示器
function removeTypingIndicator() {
    const typingDiv = document.getElementById('yinianzhida-typing')
    if (typingDiv) {
        typingDiv.remove()
    }
}

// 生成 AI 回复（模拟）
function generateAIReply(userMessage) {
    // 这里可以接入实际的 AI API
    // 目前返回模拟回复
    const replies = [
        '我已经识别到当前页面的表单结构，正在为您智能填写...',
        '好的，让我帮您检查一下简历信息是否完整。',
        '网页结构识别已完成，正在获取简历列表...',
        '正在根据您的简历自动填充表单字段...',
        '我会帮您优化填写内容，确保信息准确无误。'
    ]

    return replies[Math.floor(Math.random() * replies.length)]
}

// 更新使用次数
function updateUsageCount() {
    const countSpan = document.getElementById('yinianzhida-usage-count')
    if (!countSpan) return

    let count = parseInt(countSpan.textContent) || 0
    count++
    countSpan.textContent = count

    // 保存到存储（使用安全函数）
    safeChromeStorageSet({ usageCount: count })
}

// 保存悬浮组件状态
function saveFloatingState() {
    safeChromeStorageSet({
        floatingState: {
            isPinned: floatingState.isPinned
        }
    })
}

// 恢复悬浮组件状态
function restoreFloatingState() {
    safeChromeStorageGet(['floatingState', 'usageCount', 'floating_button_enabled'], (result) => {
        // 检查悬浮按钮是否启用（默认启用）
        const enabled = result.floating_button_enabled !== false
        console.log('从存储恢复状态 - 悬浮按钮启用:', enabled)

        if (!enabled) {
            // 如果被禁用，隐藏悬浮按钮
            hideFloatingButtonPermanently()
            return
        }

        // 恢复常驻状态
        if (result.floatingState) {
            if (result.floatingState.isPinned) {
                floatingState.isPinned = true
                const floatBtn = document.getElementById('yinianzhida-float-btn')
                const togglePin = document.getElementById('yinianzhida-toggle-pin')
                if (floatBtn) floatBtn.classList.add('pinned')
                if (togglePin) {
                    const textEl = togglePin.querySelector('.yinianzhida-menu-item-text')
                    if (textEl) textEl.textContent = '取消常驻'
                }
            }
        }

        // 恢复使用次数
        if (result.usageCount) {
            const countEl = document.getElementById('yinianzhida-usage-count')
            if (countEl) countEl.textContent = result.usageCount
        }
    })
}

// 显示悬浮按钮（由插件控制）
function showFloatingButton() {
    const floatBtn = document.getElementById('yinianzhida-float-btn')
    if (floatBtn) {
        floatBtn.style.display = 'flex'
        console.log('✅ 悬浮按钮已显示')
    }
}

// 永久隐藏悬浮按钮（由插件控制）
function hideFloatingButtonPermanently() {
    const floatBtn = document.getElementById('yinianzhida-float-btn')
    if (floatBtn) {
        floatBtn.style.display = 'none'
        console.log('❌ 悬浮按钮已隐藏')
    }

    // 如果对话窗口是打开的，也关闭它
    if (floatingState.isChatOpen) {
        closeChatWindow()
    }
}

// 页面加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createFloatingWidget)
} else {
    createFloatingWidget()
}

console.log('✅ 悬浮组件脚本加载完成')

// FormExecutor 保留在 content.js:2307 处，某些辅助函数可能被其他代码引用

console.log('✅ 智能填表模块加载完成')

// ==================== 全局错误监听 ====================

// 监听全局错误，捕获Extension context invalidated
window.addEventListener('error', function(event) {
    if (event.message && event.message.includes('Extension context invalidated')) {
        console.warn('⚠️ 检测到扩展上下文失效，建议刷新页面')

        // 显示一次性提示
        if (!window.__yinianzhida_context_invalidated_notified) {
            window.__yinianzhida_context_invalidated_notified = true

            // 在页面顶部显示提示条
            const notificationBar = document.createElement('div')
            notificationBar.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                background: #ff9800;
                color: white;
                padding: 12px 20px;
                text-align: center;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Microsoft YaHei', sans-serif;
                font-size: 14px;
                z-index: 10000000;
                box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            `
            notificationBar.innerHTML = `
                <span>⚠️ 一念职达插件已更新，请刷新页面以使用最新功能</span>
                <button style="
                    background: white;
                    color: #ff9800;
                    border: none;
                    padding: 6px 16px;
                    margin-left: 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-weight: 600;
                " onclick="location.reload()">立即刷新</button>
                <button style="
                    background: transparent;
                    color: white;
                    border: 1px solid white;
                    padding: 6px 16px;
                    margin-left: 8px;
                    border-radius: 4px;
                    cursor: pointer;
                " onclick="this.parentElement.remove()">关闭</button>
            `
            document.body.insertBefore(notificationBar, document.body.firstChild)
        }

        // 阻止错误继续传播
        event.preventDefault()
        return true
    }
})

console.log('✅ 全局错误监听已启动')

// ==================== AI自动填表引擎集成 ====================

let autoFillEngine = null; // 自动填表引擎实例

/**
 * 初始化自动填表引擎
 */
function initAutoFillEngine() {
    try {
        if (typeof window.AutoFillEngine !== 'undefined') {
            autoFillEngine = new window.AutoFillEngine({
                aiServiceURL: window.CONFIG ? window.CONFIG.getApiBaseUrl() : 'http://localhost:8080'
            });
            console.log('[AutoFill] ✅ 自动填表引擎初始化成功');
        } else {
            console.error('[AutoFill] ❌ AutoFillEngine 未加载');
        }
    } catch (error) {
        console.error('[AutoFill] ❌ 初始化失败:', error);
    }
}

/**
 * 启动自动填表
 */
async function startAutoFill() {
    console.log('[AutoFill] 🚀 启动自动填表...');

    // 显示加载状态
    addTypingIndicator();

    try {
        // 初始化引擎（如果未初始化）
        if (!autoFillEngine) {
            initAutoFillEngine();
        }

        if (!autoFillEngine) {
            throw new Error('自动填表引擎未初始化');
        }

        // 检查登录状态
        const authData = await getAuthData();

        if (!authData || !authData.token) {
            removeTypingIndicator();
            addMessage('assistant', '请先登录一念职达账号');
            return;
        }

        // 获取用户简历信息
        const resumeId = await getResumeId();

        if (!resumeId) {
            removeTypingIndicator();
            addMessage('assistant', '未找到简历，请先上传简历');
            return;
        }

        // 获取公司和职位信息（可选）
        const companyName = '';
        const positionName = '';

        removeTypingIndicator();
        addMessage('assistant', '开始扫描页面表单字段...');

        // 启动自动填表
        const result = await autoFillEngine.start({
            resumeId: resumeId,
            companyName: companyName,
            positionName: positionName
        });

        if (result.success) {
            addMessage('assistant', `✅ 填写完成！成功填写 ${result.filled}/${result.total} 个字段`);

            // 更新使用次数
            updateUsageCount();
        } else {
            addMessage('assistant', `❌ 填写失败: ${result.message || result.error}`);
        }
    } catch (error) {
        console.error('[AutoFill] 错误:', error);
        removeTypingIndicator();
        addMessage('assistant', `❌ 出错了: ${error.message}`);
    }
}

/**
 * 暂停自动填表
 */
function pauseAutoFill() {
    if (autoFillEngine) {
        autoFillEngine.pause();
        addMessage('assistant', '⏸️ 已暂停填写');
    } else {
        addMessage('assistant', '没有正在进行的填写任务');
    }
}

/**
 * 继续自动填表
 */
function resumeAutoFill() {
    if (autoFillEngine) {
        autoFillEngine.resume();
        addMessage('assistant', '▶️ 继续填写...');
    } else {
        addMessage('assistant', '没有可以继续的任务');
    }
}

/**
 * 停止自动填表
 */
function stopAutoFill() {
    if (autoFillEngine) {
        autoFillEngine.stop();
        addMessage('assistant', '⏹️ 已停止填写');
    }
}

/**
 * 获取认证数据
 */
function getAuthData() {
    return new Promise((resolve) => {
        safeChromeStorageGet(['access_token', 'user_info'], (result) => {
            resolve({
                token: result.access_token,
                userInfo: result.user_info
            });
        });
    });
}

/**
 * 获取简历ID
 */
async function getResumeId() {
    // 从 storage 获取用户的简历列表
    return new Promise((resolve) => {
        safeChromeStorageGet(['resume_id'], (result) => {
            // 如果有缓存的简历ID，直接返回
            if (result.resume_id) {
                resolve(result.resume_id);
                return;
            }

            // 否则，调用API获取用户的简历列表，取第一个
            // TODO: 这里应该调用后端API获取简历列表
            // 暂时返回一个测试ID
            resolve('test-resume-id-123');
        });
    });
}

// 页面加载时初始化自动填表引擎
setTimeout(() => {
    initAutoFillEngine();
}, 1000);

console.log('✅ AI自动填表引擎集成完成')

// ==================== 调试工具 ====================

/**
 * 调试：查看扫描到的字段
 */
window.debugScanFields = async function() {
    console.log('[Debug] 开始扫描字段...');

    const scanner = new FieldScanner();
    const fields = await scanner.scan();

    console.group('📊 扫描到的字段');
    console.log(`总数: ${fields.length}`);
    console.table(fields.map(f => ({
        类型: f.fieldType,
        标签: f.label,
        占位符: f.placeholder,
        元素: f.tagName,
        inputType: f.type,
        必填: f.required
    })));
    console.groupEnd();

    return fields;
};

/**
 * 调试：测试单个字段填写
 */
window.debugFillField = async function(fieldIndex, value) {
    console.log(`[Debug] 测试填写第 ${fieldIndex} 个字段，值: ${value}`);

    const scanner = new FieldScanner();
    const fields = await scanner.scan();

    if (fieldIndex >= fields.length) {
        console.error('❌ 字段索引超出范围，总字段数:', fields.length);
        return false;
    }

    const field = fields[fieldIndex];
    console.log('[Debug] 目标字段:', field);

    const filler = new ProgressiveFiller();
    const data = {};
    data[field.fieldType] = value;

    const success = await filler.fillSingleField(field, data);

    console.log('填写结果:', success ? '✅ 成功' : '❌ 失败');
    return success;
};

/**
 * 调试：查看引擎状态
 */
window.debugGetState = function() {
    if (autoFillEngine) {
        const state = autoFillEngine.getState();
        console.log('🔍 引擎状态:', state);
        return state;
    } else {
        console.warn('⚠️ 引擎未初始化');
        return null;
    }
};

/**
 * 调试：清除所有缓存
 */
window.debugClearCache = function() {
    safeChromeStorageSet({ resume_id: null, resume_data: null });
    console.log('✅ 缓存已清除');
};

/**
 * 调试：查看当前缓存的简历数据
 */
window.debugShowResumeData = function() {
    safeChromeStorageGet(['resume_id', 'resume_data'], (result) => {
        console.group('📄 缓存的简历数据');
        console.log('简历ID:', result.resume_id);
        console.log('简历数据:', result.resume_data);
        console.groupEnd();
    });
};

/**
 * 调试：测试弹窗检测
 */
window.debugCheckPopups = function() {
    if (typeof dynamicPopups !== 'undefined') {
        console.group('🔍 检测到的弹窗');
        console.log('数量:', dynamicPopups.length);
        console.table(dynamicPopups.map(p => ({
            类型: p.type,
            时间: new Date(p.timestamp).toLocaleTimeString()
        })));
        console.groupEnd();
        return dynamicPopups;
    } else {
        console.warn('⚠️ popupDetector 未加载或未检测到弹窗');
        return [];
    }
};

/**
 * 调试：模拟简历数据（用于测试）
 */
window.debugSetMockResumeData = function() {
    const mockData = {
        // 基本信息
        name: '李四',
        gender: '女',
        phone: '13900139000',
        email: 'lisi@test.com',
        birthday: '1998-05-20',
        age: '26',

        // 教育
        school: '北京大学',
        major: '软件工程',
        education: '硕士',
        degree: '硕士',

        // 工作
        company: '腾讯',
        position: 'Java工程师',

        // 求职意向
        expectedSalary: '25-35K',
        desiredPosition: '后端工程师',
        desiredCity: '深圳'
    };

    safeChromeStorageSet({
        resume_id: 'mock-resume-123',
        resume_data: mockData
    });

    console.log('✅ 模拟简历数据已设置:', mockData);
n// 设置模拟认证数据
window.debugSetMockAuthData = function() {
    const mockAuthData = {
        access_token: "mock-token-123456",
        user_info: {
            id: "mock-user-123",
            nickname: "测试用户",
            avatar: "",
            isVip: false
        }
    };
    safeChromeStorageSet(mockAuthData);
    console.log("✅ 模拟认证数据已设置:", mockAuthData);
};
};

console.log('');
console.log('='.repeat(60));
console.log('✅ 调试工具已加载！');
console.log('='.repeat(60));
console.log('');
console.log('📚 可用调试命令：');
console.log('');
console.log('  debugScanFields()           - 查看扫描到的字段');
console.log('  debugFillField(0, "张三")   - 测试填写第0个字段');
console.log('  debugGetState()             - 查看引擎状态');
console.log('  debugClearCache()           - 清除缓存');
console.log('  debugShowResumeData()       - 查看缓存的简历数据');
console.log('  debugCheckPopups()          - 查看检测到的弹窗');
console.log('  debugSetMockResumeData()    - 设置模拟简历数据');
console.log('  debugSetMockAuthData()      - 设置模拟认证数据');
console.log('');
console.log('💡 使用提示：');
console.log('  1. 先运行 debugSetMockAuthData() 设置认证数据，再运行 debugSetMockResumeData() 设置简历数据');
console.log('  2. 在对话窗口输入"开始填写"启动自动填表');
console.log('  3. 观察控制台日志和页面字段高亮');
console.log('');
console.log('='.repeat(60));
console.log('');
