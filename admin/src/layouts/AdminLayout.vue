<script setup lang="ts">
// 管理端布局：侧边菜单 + 顶栏 + 内容区
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAdminStore } from '../stores/admin'

const store = useAdminStore()
const route = useRoute()
const router = useRouter()

const selectedKeys = computed(() => [route.path])
const openKeys = computed(() => (route.path.startsWith('/content') ? ['content'] : []))

function onMenuClick({ key }: { key: string }) {
  if (key.startsWith('/')) router.push(key)
}

function onLogout() {
  store.logout()
  router.replace('/login')
}

onMounted(() => {
  if (!store.admin) store.fetchProfile()
})
</script>

<template>
  <a-layout style="min-height: 100vh">
    <a-layout-sider theme="dark" :width="200">
      <div class="logo">🎯 AI 智面管理端</div>
      <a-menu theme="dark" mode="inline" :selected-keys="selectedKeys" :open-keys="openKeys" @click="onMenuClick">
        <a-menu-item key="/dashboard">📊 数据看板</a-menu-item>
        <a-menu-item key="/questions">📝 题库维护</a-menu-item>
        <a-sub-menu key="content" title="📚 内容管理">
          <a-menu-item key="/content/readings">晨读管理</a-menu-item>
          <a-menu-item key="/content/materials">面试素材</a-menu-item>
          <a-menu-item key="/content/basics">通识基础</a-menu-item>
          <a-menu-item key="/content/courses">课程管理</a-menu-item>
          <a-menu-item key="/content/hot-topics">热点管理</a-menu-item>
        </a-sub-menu>
        <a-menu-item key="/study-plans">🗺️ 学习规划</a-menu-item>
        <a-menu-item key="/badges">🏅 勋章管理</a-menu-item>
        <a-menu-item key="/notifications">🔔 通知推送</a-menu-item>
        <a-menu-item key="/agent-tools">🤖 Agent 工具</a-menu-item>
      </a-menu>
    </a-layout-sider>
    <a-layout>
      <a-layout-header class="header">
        <span class="page-title">{{ (route.meta.title as string) || 'AI 智面管理端' }}</span>
        <span class="user-box">
          <a-avatar class="avatar">{{ (store.admin?.nickname || store.admin?.username || '管')[0] }}</a-avatar>
          <span class="name">{{ store.admin?.nickname || store.admin?.username }}</span>
          <a-button size="small" @click="onLogout">退出</a-button>
        </span>
      </a-layout-header>
      <a-layout-content class="content">
        <router-view />
      </a-layout-content>
    </a-layout>
  </a-layout>
</template>

<style scoped>
.logo {
  height: 56px;
  line-height: 56px;
  color: #fff;
  text-align: center;
  font-weight: 600;
  font-size: 15px;
}
.header {
  background: #fff;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.page-title {
  font-size: 16px;
  font-weight: 600;
}
.user-box {
  display: flex;
  align-items: center;
  gap: 10px;
}
.avatar {
  background: #1677ff;
}
.name {
  font-size: 14px;
}
.content {
  padding: 20px;
  margin: 0;
}
</style>
