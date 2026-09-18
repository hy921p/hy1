<script setup lang="ts">
// 管理员登录
import { ref } from 'vue'
import { message } from 'ant-design-vue'
import { useRouter } from 'vue-router'
import { useAdminStore } from '../../stores/admin'

const store = useAdminStore()
const router = useRouter()
const username = ref('admin')
const password = ref('admin123')
const loading = ref(false)

async function onSubmit() {
  if (!username.value.trim() || !password.value) {
    message.warning('请输入账号和密码')
    return
  }
  loading.value = true
  try {
    await store.login(username.value.trim(), password.value)
    message.success('登录成功')
    router.replace('/dashboard')
  } catch {
    /* request 层已提示 */
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-wrap">
    <a-card class="login-card" title="🎯 AI 智面 · 管理后台">
      <a-form layout="vertical" @submit.prevent="onSubmit">
        <a-form-item label="账号">
          <a-input v-model:value="username" placeholder="请输入管理员账号" />
        </a-form-item>
        <a-form-item label="密码">
          <a-input-password v-model:value="password" placeholder="请输入密码" @pressEnter="onSubmit" />
        </a-form-item>
        <a-button type="primary" block :loading="loading" html-type="submit">登 录</a-button>
        <div class="tip">默认账号 admin / admin123</div>
      </a-form>
    </a-card>
  </div>
</template>

<style scoped>
.login-wrap {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1677ff 0%, #0f1f3d 100%);
}
.login-card {
  width: 360px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
}
.tip {
  margin-top: 12px;
  text-align: center;
  color: #bbb;
  font-size: 12px;
}
</style>
