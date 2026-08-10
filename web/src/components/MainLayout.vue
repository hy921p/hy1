<script setup lang="ts">
// 主布局：顶栏（品牌 + 六模块导航 + 偏好筛选 + 通知铃铛 + 用户）
// 偏好变化 → 内容区 :key 重挂，各页重新取数（面试房间/报告除外，保持稳定）
import { computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { usePreferenceStore, POSITIONS, REGIONS } from '../stores/preference'
import { useNotificationStore } from '../stores/notification'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const pref = usePreferenceStore()
const noti = useNotificationStore()

const NAVS = [
  { path: '/home', label: '首页', icon: '🏠' },
  { path: '/questions', label: '题库', icon: '📚' },
  { path: '/learn', label: '智学', icon: '📖' },
  { path: '/exam', label: '智考', icon: '🎤' },
  { path: '/community', label: '社区', icon: '💬' },
  { path: '/profile', label: '我的', icon: '👤' },
]

function isActive(path: string) {
  if (path === '/home') return route.path === '/home'
  return route.path.startsWith(path)
}

const isRoom = computed(
  () => route.path.startsWith('/exam/room') || route.path.startsWith('/exam/report'),
)
const viewKey = computed(() =>
  isRoom.value ? `room-${route.path}` : `${route.path}|${pref.position}|${pref.region}`,
)

function logout() {
  noti.stopPolling()
  auth.logout()
  router.push('/login')
}

onMounted(() => noti.startPolling())
onUnmounted(() => noti.stopPolling())
</script>

<template>
  <div class="layout">
    <header class="topbar">
      <div class="brand" @click="router.push('/home')">🎯 AI 智面</div>

      <nav class="nav">
        <div
          v-for="n in NAVS"
          :key="n.path"
          class="nav-item"
          :class="{ active: isActive(n.path) }"
          @click="router.push(n.path)"
        >
          <span class="nav-icon">{{ n.icon }}</span>{{ n.label }}
        </div>
      </nav>

      <div class="right">
        <el-select v-model="pref.position" size="small" class="pref" @change="(v: any) => pref.set(v, pref.region)">
          <el-option v-for="p in POSITIONS" :key="p" :label="p" :value="p" />
        </el-select>
        <el-select v-model="pref.region" size="small" class="pref" @change="(v: any) => pref.set(pref.position, v)">
          <el-option v-for="r in REGIONS" :key="r" :label="r" :value="r" />
        </el-select>

        <el-badge :value="noti.unread" :max="99" class="bell">
          <el-button text circle @click="router.push('/profile/notifications')">🔔</el-button>
        </el-badge>

        <el-dropdown>
          <span class="user">{{ auth.user?.nickname || '学员' }}</span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item @click="router.push('/profile')">个人中心</el-dropdown-item>
              <el-dropdown-item @click="router.push('/profile/settings')">偏好设置</el-dropdown-item>
              <el-dropdown-item divided @click="logout">退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </header>

    <main class="content">
      <router-view :key="viewKey" />
    </main>
  </div>
</template>

<style scoped>
.layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
.topbar {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 0 24px;
  height: 56px;
  background: #fff;
  border-bottom: 1px solid #ebeef5;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.06);
}
.brand {
  font-size: 17px;
  font-weight: 700;
  letter-spacing: 1px;
  cursor: pointer;
  white-space: nowrap;
}
.nav {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1;
}
.nav-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 14px;
  border-radius: 8px;
  font-size: 14px;
  color: #606266;
  cursor: pointer;
  transition: all 0.2s;
}
.nav-item:hover {
  background: #f0f2f5;
}
.nav-item.active {
  background: #ecf5ff;
  color: #409eff;
  font-weight: 600;
}
.nav-icon {
  font-size: 15px;
}
.right {
  display: flex;
  align-items: center;
  gap: 10px;
}
.pref {
  width: 118px;
}
.bell {
  display: inline-flex;
  align-items: center;
}
.user {
  padding: 4px 8px;
  font-size: 14px;
  color: #303133;
  cursor: pointer;
  outline: none;
}
.content {
  flex: 1;
  width: 100%;
  max-width: 1100px;
  margin: 0 auto;
  padding: 20px 24px 48px;
}
</style>
