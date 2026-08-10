<script setup lang="ts">
// 登录页：手机号 + 验证码（开发验证码 123456）
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
  background: linear-gradient(160deg, #eef4ff 0%, #f6f7fb 60%, #eefaf3 100%);
}
.login-card {
  width: 360px;
  padding: 40px 36px;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 12px 40px rgba(31, 45, 61, 0.12);
  text-align: center;
}
.logo {
  font-size: 40px;
}
h1 {
  margin: 8px 0 4px;
  font-size: 24px;
  letter-spacing: 2px;
}
.sub {
  margin: 0 0 24px;
  color: #909399;
  font-size: 13px;
}
.login-btn {
  width: 100%;
  margin-top: 8px;
}
</style>
