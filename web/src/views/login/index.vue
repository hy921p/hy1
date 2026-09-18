<script setup lang="ts">
// 登录页：手机号 + 验证码（开发验证码 123456）
// 参考「乾途国培」登录页：浅色渐变背景 + 玻璃拟态卡片
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { login } from '../../api/interview'
import { useAuthStore } from '../../stores/auth'
import { usePreferenceStore } from '../../stores/preference'

const router = useRouter()
const auth = useAuthStore()
const pref = usePreferenceStore()

const phone = ref('13800138000')
const code = ref('123456')
const loading = ref(false)

async function doLogin() {
  if (!/^1\d{10}$/.test(phone.value)) {
    ElMessage.warning('请输入正确的手机号')
    return
  }
  loading.value = true
  try {
    const data = await login(phone.value, code.value)
    auth.setAuth(data.token, data.user)
    await pref.init() // 以服务端偏好回填本地（默认 公务员/四川）
    ElMessage.success('登录成功，欢迎回来')
    router.push('/home')
  } catch (err: any) {
    ElMessage.error(err.message || '登录失败')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-card">
      <div class="logo">🎯</div>
      <h1>AI 智面</h1>
      <p class="sub">AI 模拟面试 · 你的上岸陪练</p>

      <el-form label-position="top" @submit.prevent>
        <el-form-item label="手机号">
          <el-input v-model="phone" placeholder="请输入手机号" size="large" maxlength="11" />
        </el-form-item>
        <el-form-item label="验证码">
          <el-input v-model="code" placeholder="开发验证码：123456" size="large" maxlength="6" />
        </el-form-item>
        <el-button type="primary" size="large" class="login-btn" :loading="loading" @click="doLogin">
          登录 / 注册
        </el-button>
      </el-form>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle at 20% 20%, #ffffff 0%, #e2e8f0 60%, #dce3ef 100%);
  position: relative;
  overflow: hidden;
}
/* 玻璃拟态卡片（参考 .login-card：blur 20px、半透明白底、大阴影） */
.login-card {
  width: 380px;
  padding: 40px 34px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.7);
  box-shadow: 0 20px 40px rgba(15, 23, 42, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.9);
  text-align: center;
  position: relative;
  z-index: 1;
}
.logo {
  font-size: 40px;
  line-height: 1;
}
h1 {
  margin: 10px 0 4px;
  font-size: 24px;
  letter-spacing: 2px;
  color: var(--app-primary-deep);
}
.sub {
  margin: 0 0 26px;
  color: #64748b;
  font-size: 13px;
}
.login-btn {
  width: 100%;
  margin-top: 8px;
}
/* 背景装饰光斑 */
.login-page::before,
.login-page::after {
  content: '';
  position: absolute;
  border-radius: 50%;
  filter: blur(60px);
  z-index: 0;
}
.login-page::before {
  width: 320px;
  height: 320px;
  background: rgba(35, 103, 209, 0.18);
  top: -80px;
  left: -60px;
}
.login-page::after {
  width: 280px;
  height: 280px;
  background: rgba(247, 87, 36, 0.14);
  bottom: -60px;
  right: -40px;
}
</style>
