<template>
  <div class="login-container">
    <div class="login-box">
      <div class="login-header">
        <el-icon :size="50" color="#409EFF"><Promotion /></el-icon>
        <h1>一念职达</h1>
        <p class="slogan">AI赋能求职,一键直达理想Offer</p>
      </div>

      <div class="login-content">
        <el-card shadow="hover">
          <h2>微信扫码登录</h2>
          <div class="qrcode-container">
            <div v-if="loading" class="loading">
              <el-icon class="is-loading"><Loading /></el-icon>
              <p>加载中...</p>
            </div>
            <div v-else-if="qrcodeUrl" class="qrcode">
              <el-image
                :src="qrcodeUrl"
                style="width: 200px; height: 200px;"
                fit="contain"
              />
              <p class="scan-status" v-if="scanned && !confirmed">
                <el-icon color="#67C23A"><SuccessFilled /></el-icon>
                已扫描，请在手机上确认登录
              </p>
            </div>
            <div v-else class="error-box">
              <el-icon :size="40" color="#F56C6C"><WarningFilled /></el-icon>
              <p>{{ errorMessage }}</p>
              <el-button type="primary" size="small" @click="generateQrCode">
                重新生成
              </el-button>
            </div>
            <p class="qrcode-tip" v-if="qrcodeUrl && !scanned">
              <el-icon><Iphone /></el-icon>
              请使用微信扫描二维码登录
            </p>
          </div>

          <el-divider>或</el-divider>

          <div class="login-actions">
            <!-- <el-button type="default" size="large" class="email-login-btn" @click="goToEmailLogin">
              <el-icon><Message /></el-icon>
              邮箱登录
            </el-button> -->

            <el-button type="info" size="large" class="quick-login-btn" @click="quickLogin" :disabled="loading" style="width: 100%;">
              <el-icon><UserFilled /></el-icon>
              快速体验（跳过登录）
            </el-button>
          </div>
        </el-card>

        <div class="features">
          <div class="feature-item">
            <el-icon :size="30" color="#409EFF"><Document /></el-icon>
            <h3>AI简历优化</h3>
            <p>10秒解析，精准结构化</p>
          </div>
          <div class="feature-item">
            <el-icon :size="30" color="#67C23A"><Suitcase /></el-icon>
            <h3>智能岗位推荐</h3>
            <p>匹配度90%+</p>
          </div>
          <div class="feature-item">
            <el-icon :size="30" color="#E6A23C"><Reading /></el-icon>
            <h3>求职攻略赋能</h3>
            <p>一站式求职知识</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Message } from '@element-plus/icons-vue'
import request from '@/utils/request'

const router = useRouter()
const route = useRoute()

const loading = ref(false)
const qrcodeUrl = ref('')
const sceneId = ref('')
const scanned = ref(false)
const confirmed = ref(false)
const errorMessage = ref('')
const pollTimer = ref(null)

// 插件登录模式
const isPluginLogin = ref(false)

/**
 * 生成登录二维码
 */
const generateQrCode = async () => {
  loading.value = true
  errorMessage.value = ''

  try {
    // 检查是否有待处理的邀请码
    const pendingInviteCode = localStorage.getItem('pendingInviteCode')
    
    // 构建请求参数
    const params = {}
    if (pendingInviteCode) {
      params.inviteCode = pendingInviteCode
      console.log('检测到邀请码：', pendingInviteCode)
    }
    
    const response = await request.get('/auth/qrcode/generate', { params })

    if (response.success) {
      qrcodeUrl.value = response.qrcodeUrl
      sceneId.value = response.sceneId
      scanned.value = false
      confirmed.value = false

      // 如果有邀请码，显示提示
      if (pendingInviteCode) {
        ElMessage.info('检测到邀请码，登录后将自动绑定')
      }

      // 开始轮询登录状态
      startPolling()
    } else {
      errorMessage.value = response.message || '生成二维码失败'
    }
  } catch (error) {
    console.error('生成二维码失败:', error)
    errorMessage.value = '网络错误，请检查后端服务是否启动'
  } finally {
    loading.value = false
  }
}

/**
 * 开始轮询登录状态
 */
const startPolling = () => {
  // 清除之前的定时器
  if (pollTimer.value) {
    clearInterval(pollTimer.value)
  }

  // 每4秒轮询一次
  pollTimer.value = setInterval(async () => {
    try {
      const response = await request.get(`/auth/qrcode/status/${sceneId.value}`)

      if (response.success) {
        if (response.confirmed) {
          // 登录成功
          confirmed.value = true
          stopPolling()

          // 保存Token和用户信息
          const token = response.token
          const userInfo = response.userInfo

          localStorage.setItem('token', token)
          localStorage.setItem('userInfo', JSON.stringify(userInfo))

          // 处理邀请码结果
          const pendingInviteCode = localStorage.getItem('pendingInviteCode')
          if (pendingInviteCode) {
            localStorage.removeItem('pendingInviteCode')
            
            // 显示邀请码处理结果
            if (response.inviteMessage) {
              if (response.inviteSuccess) {
                ElMessage.success(response.inviteMessage)
              } else {
                ElMessage.warning(response.inviteMessage)
              }
            }
          }

          // 判断是否是插件登录
          if (isPluginLogin.value) {
            await handlePluginLoginSuccess(token, userInfo)
          } else {
            // 正常Web登录流程
            ElMessage.success('登录成功！')
            
            // 获取 redirect 参数，默认跳转到首页
            const redirectPath = route.query.redirect || '/home'

            // 跳转到目标页面
            setTimeout(() => {
              router.push(redirectPath)
            }, 500)
          }
        } else if (response.scanned) {
          // 已扫描但未确认
          scanned.value = true
        }
      } else {
        // 二维码过期或其他错误
        stopPolling()
        errorMessage.value = response.message || '二维码已过期'
        qrcodeUrl.value = ''
      }
    } catch (error) {
      console.error('轮询登录状态失败:', error)
    }
  }, 4000)
}

/**
 * 停止轮询
 */
const stopPolling = () => {
  if (pollTimer.value) {
    clearInterval(pollTimer.value)
    pollTimer.value = null
  }
}

/**
 * 处理插件登录成功
 */
const handlePluginLoginSuccess = async (token, userInfo) => {
  try {
    ElMessage.info('正在为插件生成登录凭证...')
    
    // 步骤1: 调用后端生成短期 loginToken
    const generateResponse = await request.post('/api/plugin/generate-login-token', {}, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    
    if (!generateResponse.success || !generateResponse.data) {
      ElMessage.error('生成登录凭证失败')
      return
    }
    
    const loginToken = generateResponse.data.loginToken
    console.log('✅ 已生成 loginToken:', loginToken)
    
    // 步骤2: 使用 loginToken 换取正式的 accessToken 和 refreshToken
    ElMessage.info('正在换取正式凭证...')
    
    const exchangeResponse = await request.post('/api/plugin/exchange-token', {
      loginToken: loginToken
    })
    
    if (!exchangeResponse.success || !exchangeResponse.data) {
      ElMessage.error('换取凭证失败')
      return
    }
    
    const { accessToken, refreshToken, userInfo: exchangedUserInfo } = exchangeResponse.data
    console.log('✅ 已换取正式 token:', { accessToken, refreshToken, userInfo: exchangedUserInfo })
    
    // 构建完整的 auth 数据（插件格式）
    const authData = {
      accessToken: accessToken,           // 插件使用的 accessToken
      refreshToken: refreshToken,         // 插件使用的 refreshToken
      userInfo: {
        id: exchangedUserInfo.id,
        nickname: exchangedUserInfo.nickname,
        avatar: exchangedUserInfo.avatar,
        phone: exchangedUserInfo.email || userInfo.phone || userInfo.email
      },
      type: "login"
    }
    
    // 存储到 Web 端 localStorage（这样 Web 端也能看到登录状态）
    localStorage.setItem('auth', JSON.stringify(authData))
    console.log('✅ Web端 auth 已存储:', authData)
    
    // 检测是否从插件打开
    const isFromPlugin = window.opener || route.query.from === 'plugin'
    
    if (isFromPlugin) {
      // 通过 window.postMessage 发送消息给插件（content script 会监听）
      window.postMessage({
        source: 'YINIAN_WEB',
        type: 'PLUGIN_LOGIN_SUCCESS',
        auth: authData
      }, '*')
      
      console.log('✅ 已通过 postMessage 发送登录消息给插件:', authData)
      ElMessage.success('登录成功！插件已同步登录状态')
      
      // 跳转到首页
      setTimeout(() => {
        router.push('/')
      }, 1500)
    } else {
      // 不是从插件打开的，直接跳转
      ElMessage.success('登录成功！')
      setTimeout(() => {
        router.push('/')
      }, 1500)
    }
  } catch (error) {
    console.error('❌ 插件登录失败:', error)
    ElMessage.error('插件登录失败：' + (error.message || '未知错误'))
  }
}

/**
 * 跳转到邮箱登录
 */
const goToEmailLogin = () => {
  router.push({
    path: '/email-login',
    query: route.query
  })
}

/**
 * 快速体验（跳过登录）
 */
const quickLogin = () => {
  // 设置一个临时的token和用户信息
  const mockToken = 'mock_token_' + Date.now()
  const mockUserInfo = {
    id: 0,
    nickname: '游客用户',
    avatar: 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png',
    isVip: 0
  }

  localStorage.setItem('token', mockToken)
  localStorage.setItem('userInfo', JSON.stringify(mockUserInfo))

  ElMessage.success('快速体验模式登录成功！')

  // 获取 redirect 参数，默认跳转到首页
  const redirectPath = route.query.redirect || '/home'

  setTimeout(() => {
    router.push(redirectPath)
  }, 500)
}

/**
 * 页面加载时生成二维码
 */
onMounted(() => {
  // 检测是否来自插件
  const fromPlugin = route.query.from === 'plugin'
  isPluginLogin.value = fromPlugin
  
  if (fromPlugin) {
    ElMessage.info('插件登录模式：登录后将自动返回插件')
  }
  
  // 检查是否是插件授权流程且用户已登录
  const redirectPath = route.query.redirect
  const token = localStorage.getItem('token')

  if (redirectPath === '/plugin-callback' && token) {
    // 用户已登录，直接跳转到插件回调页面进行授权
    ElMessage.success('检测到已登录，正在授权插件...')
    setTimeout(() => {
      router.push(redirectPath)
    }, 500)
  } else {
    // 正常生成二维码
    generateQrCode()
  }
})

/**
 * 页面卸载时清除定时器
 */
onUnmounted(() => {
  stopPolling()
})
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.login-box {
  max-width: 1000px;
  width: 100%;
}

.login-header {
  text-align: center;
  color: #fff;
  margin-bottom: 40px;
}

.login-header h1 {
  font-size: 48px;
  margin: 20px 0 10px;
  font-weight: bold;
}

.slogan {
  font-size: 18px;
  opacity: 0.9;
}

.login-content {
  max-width: 450px;
  margin: 0 auto;
}

.login-content h2 {
  text-align: center;
  color: #333;
  margin-bottom: 30px;
  font-size: 24px;
}

.qrcode-container {
  text-align: center;
  padding: 20px 0;
  min-height: 280px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.loading {
  text-align: center;
}

.loading .el-icon {
  font-size: 40px;
  color: #409EFF;
  margin-bottom: 10px;
}

.loading p {
  color: #909399;
  font-size: 14px;
}

.qrcode {
  display: inline-block;
  padding: 20px;
  background: #f5f7fa;
  border-radius: 8px;
  margin-bottom: 15px;
}

.scan-status {
  margin-top: 10px;
  color: #67C23A;
  font-size: 14px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
}

.error-box {
  text-align: center;
  padding: 20px;
}

.error-box p {
  color: #F56C6C;
  margin: 15px 0;
  font-size: 14px;
}

.qrcode-tip {
  color: #909399;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
}

.login-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 10px;
}

.email-login-btn,
.quick-login-btn {
  width: 100%;
}

.features {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-top: 40px;
}

.feature-item {
  background: rgba(255, 255, 255, 0.95);
  padding: 30px 20px;
  border-radius: 8px;
  text-align: center;
  transition: transform 0.3s;
}

.feature-item:hover {
  transform: translateY(-5px);
}

.feature-item h3 {
  margin: 15px 0 10px;
  color: #333;
  font-size: 16px;
}

.feature-item p {
  color: #909399;
  font-size: 14px;
  margin: 0;
}

@media (max-width: 768px) {
  .login-container {
    padding: 15px;
  }

  .login-header h1 {
    font-size: 32px;
    margin: 15px 0 8px;
  }

  .slogan {
    font-size: 14px;
  }

  .login-content h2 {
    font-size: 20px;
    margin-bottom: 20px;
  }

  .qrcode-container {
    padding: 15px 0;
    min-height: 250px;
  }

  .qrcode {
    padding: 15px;
  }

  .qrcode-tip {
    font-size: 13px;
  }

  .features {
    grid-template-columns: 1fr;
    gap: 15px;
    margin-top: 30px;
  }

  .feature-item {
    padding: 20px 15px;
  }

  .feature-item h3 {
    font-size: 15px;
  }

  .feature-item p {
    font-size: 13px;
  }
}
</style>
