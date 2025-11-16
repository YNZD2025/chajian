// Background Service Worker - 持久化运行，用于接收来自 content script 的消息

console.log('一念职达插件 Background Service Worker 已启动')

// 监听来自 content script 的消息
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    console.log('Background 收到消息:', message, 'from', sender.tab ? `tab ${sender.tab.id}` : 'extension')

    if (message.type === 'AUTH_SUCCESS') {
        console.log('收到登录授权信息')

        const token = message.token
        const userInfo = message.userInfo

        // 保存到 chrome.storage.local
        chrome.storage.local.set({
            'access_token': token,
            'user_info': userInfo
        }, function() {
            if (chrome.runtime.lastError) {
                console.error('保存登录信息失败:', chrome.runtime.lastError)
                sendResponse({ success: false, message: '保存失败' })
            } else {
                console.log('✅ 登录信息已保存到 chrome.storage')
                sendResponse({ success: true, message: '登录信息已保存' })

                // 尝试关闭授权标签页（如果是从 content script 发送的）
                if (sender.tab && sender.tab.id) {
                    console.log('尝试关闭标签页:', sender.tab.id)
                    chrome.tabs.remove(sender.tab.id, function() {
                        if (chrome.runtime.lastError) {
                            console.log('无法关闭标签页:', chrome.runtime.lastError.message)
                        } else {
                            console.log('✅ 授权标签页已关闭')
                        }
                    })
                }
            }
        })

        // 返回 true 表示异步发送响应
        return true
    }

    // 其他类型的消息
    return false
})

// 监听存储变化（用于调试）
chrome.storage.onChanged.addListener(function(changes, namespace) {
    if (namespace === 'local') {
        console.log('Storage 变化:', changes)

        if (changes.access_token) {
            if (changes.access_token.newValue) {
                console.log('✅ 用户已登录')
            } else {
                console.log('❌ 用户已退出登录')
            }
        }
    }
})

// 监听插件安装和更新
chrome.runtime.onInstalled.addListener(function(details) {
    console.log('插件已安装/更新:', details.reason)

    if (details.reason === 'install') {
        console.log('首次安装，版本:', chrome.runtime.getManifest().version)
    } else if (details.reason === 'update') {
        console.log('更新到版本:', chrome.runtime.getManifest().version)
    }
})

console.log('✅ Background Service Worker 初始化完成')
