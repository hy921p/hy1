<script setup lang="ts">
// 主布局：固定顶部导航（品牌左 + 导航居中 + 偏好/通知/头像昵称右）+ 页脚
// 参考「乾途国培」风格：64px 白底导航、激活项底部下划线、内容 1200px
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

/** 头像：有则用用户头像，否则用昵称首字生成占位（白字/主题色底） */
const avatarUrl = computed(() => auth.user?.avatar || '')
const avatarText = computed(() => (auth.user?.nickname || '学员').slice(0, 1))

const NAVS = [
  { path: '/home', label: '首页' },
  { path: '/questions', label: '题库' },
  { path: '/learn', label: '智学' },
  { path: '/exam', label: '智考' },
  { path: '/community', label: '社区' },
  { path: '/profile', label: '我的' },
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
      <div class="topbar-inner">
        <div class="brand" @click="router.push('/home')">🎯 AI 智面</div>

        <nav class="nav">
          <div
            v-for="n in NAVS"
            :key="n.path"
            class="nav-link"
            :class="{ active: isActive(n.path) }"
            @click="router.push(n.path)"
          >
            {{ n.label }}
          </div>
        </nav>

        <div class="right">
          <el-select v-model="pref.position" size="small" class="pref pref-pos" @change="pref.set($event, pref.region)">
            <el-option v-for="p in POSITIONS" :key="p" :label="p" :value="p" />
          </el-select>
          <el-select v-model="pref.region" size="small" class="pref pref-region" @change="pref.set(pref.position, $event)">
            <el-option v-for="r in REGIONS" :key="r" :label="r" :value="r" />
          </el-select>

          <el-badge :value="noti.unread" :max="99" class="bell">
            <el-button text circle @click="router.push('/profile/notifications')">🔔</el-button>
          </el-badge>

          <el-dropdown>
            <div class="user">
              <img v-if="avatarUrl" :src="avatarUrl" class="avatar" alt="" />
              <span v-else class="avatar avatar-fallback">{{ avatarText }}</span>
              <span class="nickname">{{ auth.user?.nickname || '学员' }}</span>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="router.push('/profile')">个人中心</el-dropdown-item>
                <el-dropdown-item @click="router.push('/profile/settings')">偏好设置</el-dropdown-item>
                <el-dropdown-item divided @click="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>
    </header>

    <main class="content">
      <router-view :key="viewKey" />
    </main>

    <footer class="footer">
      <div class="footer-inner">
        <span>© 2026 AI 智面 · 你的上岸陪练</span>
        <span class="footer-links">服务协议 · 隐私政策</span>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--app-bg);
}
/* 固定顶部导航：白底 64px、细边 + 极淡阴影（参考 .app-header-nav） */
.topbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  height: 64px;
  background: #fff;
  border-bottom: 1px solid #e5eaf1;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
}
.topbar-inner {
  position: relative;
  max-width: 1200px;
  height: 100%;
  margin: 0 auto;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
/* 品牌：参考「乾途国培」书法 logo 的字体栈 + 深藏青 #17243b，粗体近书法观感 */
.brand {
  font-family: Inter, 'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif;
  font-size: 20px;
  font-weight: 800;
  letter-spacing: 2px;
  cursor: pointer;
  white-space: nowrap;
  color: #17243b;
}
/* 导航绝对居中：对准视口中心，不受左右两侧宽度影响 */
.nav {
  position: absolute;
  left: calc(50% - 20px);
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 32px;
  height: 100%;
}
.nav-link {
  display: inline-flex;
  align-items: center;
  height: 100%;
  padding: 0 4px;
  font-size: 16px;
  font-weight: 500;
  color: #4c5a70;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  transition: color 0.2s, border-color 0.2s;
}
.nav-link:hover {
  color: var(--app-primary);
}
.nav-link.active {
  color: var(--app-primary);
  border-bottom-color: var(--app-primary);
  font-weight: 700;
}
.right {
  display: flex;
  align-items: center;
  gap: 6px;
}
/* 下拉框宽度只够完整显示最长选项：岗位最长「国企央企面试」6 字，地区最长「内蒙古」3 字 */
.pref-pos {
  width: 114px;
}
.pref-region {
  width: 74px;
}
.bell {
  display: inline-flex;
  align-items: center;
}
.user {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 3px 4px;
  cursor: pointer;
  outline: none;
}
.avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}
.avatar-fallback {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--app-primary), var(--app-primary-mid));
  color: #fff;
  font-size: 14px;
  font-weight: 600;
}
.nickname {
  font-size: 14px;
  color: #303133;
  max-width: 84px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
/* 内容区：固定导航 64px 下移，容器 1200px 居中 */
.content {
  flex: 1;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 84px 24px 48px;
}
.footer {
  border-top: 1px solid #e5eaf1;
  background: #fff;
}
.footer-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 18px 24px;
  display: flex;
  justify-content: space-between;
  color: #6f7d92;
  font-size: 12px;
}
.footer-links {
  color: #93a0b3;
}
</style>
