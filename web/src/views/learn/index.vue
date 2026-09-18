<script setup lang="ts">
// 智学首页：四入口卡，点击后在下方内嵌显示对应模块（每日晨读/通识理论/视频课程/我的笔记），不再跳独立页
// AI 摘要工具改为右下角悬浮球（AiSummaryFab），点击弹出面板做摘要
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ReadingPanel from './reading.vue'
import BasicsPanel from './basics.vue'
import CoursesPanel from './courses.vue'
import NotesPanel from './notes.vue'
import AiSummaryFab from '../../components/AiSummaryFab.vue'

const router = useRouter()
// 下面展示区：reading=每日晨读（默认）/ basics=通识理论 / courses=视频课程 / notes=我的笔记
const section = ref<'reading' | 'basics' | 'courses' | 'notes'>(
  (useRoute().query.tab as 'reading' | 'basics' | 'courses' | 'notes') || 'reading',
)

const ENTRIES: { icon: string; title: string; desc: string; key: 'reading' | 'basics' | 'courses' | 'notes' }[] = [
  { icon: '📰', title: '每日晨读', desc: '时政精读 + 金句/案例/名言素材积累', key: 'reading' },
  { icon: '📘', title: '通识理论', desc: '结构化面试基础方法论', key: 'basics' },
  { icon: '🎬', title: '视频课程', desc: '名师精讲，体系化学习', key: 'courses' },
  { icon: '📝', title: '我的笔记', desc: '随手记，AI 一键摘要', key: 'notes' },
]

function switchSection(key: (typeof ENTRIES)[number]['key']) {
  section.value = key
  window.scrollTo({ top: 0 })
  // 同步 query.tab，离开页面再返回（router-view 按 key 重挂）时能恢复当前模块
  router.replace({ query: { tab: key } })
}
</script>

<template>
  <div class="page">
    <div class="entry-grid">
      <div
        v-for="e in ENTRIES"
        :key="e.key"
        class="entry"
        :class="{ active: section === e.key }"
        @click="switchSection(e.key)"
      >
        <div class="entry-icon">{{ e.icon }}</div>
        <div class="entry-title">{{ e.title }}</div>
        <div class="entry-desc">{{ e.desc }}</div>
      </div>
    </div>

    <!-- 模块区：点击入口卡在下方内嵌显示，懒挂载（首次点击才取数） -->
    <ReadingPanel v-if="section === 'reading'" />
    <BasicsPanel v-if="section === 'basics'" />
    <CoursesPanel v-if="section === 'courses'" />
    <NotesPanel v-if="section === 'notes'" />

    <AiSummaryFab />
  </div>
</template>

<style scoped>
.page {
  max-width: 860px;
  margin: 0 auto;
  /* 底部留白，避免悬浮球遮挡分页器 */
  padding-bottom: 88px;
}
.entry-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}
.entry {
  padding: 18px 12px;
  border: 1px solid #ebeef5;
  border-radius: 12px;
  text-align: center;
  cursor: pointer;
  background: #fff;
  transition: all 0.2s;
}
.entry:hover:not(.active) {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(31, 45, 61, 0.08);
  border-color: #c6e2ff;
}
.entry.active {
  border-color: #409eff;
  background: #ecf5ff;
}
.entry-icon {
  font-size: 26px;
}
.entry-title {
  margin-top: 6px;
  font-size: 14px;
  font-weight: 700;
  color: #303133;
}
.entry-desc {
  margin-top: 4px;
  font-size: 12px;
  color: #909399;
}
</style>
