<script setup lang="ts">
// 题库首页：入口卡片，下面切换显示对应模块（历年真题/模拟试卷/错题本/做题记录）
// 做题记录与历年真题一样是入口卡（放错题本右侧），点击后下方显示；无记录时内容区不显示占位
import { computed, onActivated, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import RealYearCards from '../../components/RealYearCards.vue'
import PracticeRecords from '../../components/PracticeRecords.vue'
import MockQuestions from '../../components/MockQuestions.vue'
import WrongQuestions from '../../components/WrongQuestions.vue'
import { wrong, practiceRecords } from '../../api/question'

const route = useRoute()
const router = useRouter()

// 下面展示区：real=历年真题（默认）/ mock=模拟试卷 / wrong=错题本 / records=做题记录
const section = ref<'real' | 'mock' | 'wrong' | 'records'>(
  (route.query.tab as 'real' | 'mock' | 'wrong' | 'records') || 'real',
)

const ENTRIES: { icon: string; title: string; desc: string; key: 'real' | 'mock' | 'wrong' | 'records' }[] = [
  { icon: '📜', title: '历年真题', desc: '真实考场真题 · 按年份分类', key: 'real' },
  { icon: '🧪', title: '模拟试卷', desc: '全真模拟练习 · 非真题', key: 'mock' },
  { icon: '📕', title: '错题本', desc: '答错题目 · AI 智能解析', key: 'wrong' },
  { icon: '📝', title: '做题记录', desc: '我做过的真题 / 模拟卷 · 成绩单', key: 'records' },
]

// 错题数（0 时隐藏错题本入口与内容，避免默认占位）
const wrongTotal = ref(0)
// 是否做过题（做题记录入口卡只在有记录后出现，与错题本同理：默认没有，做了才有）
const hasRecords = ref(false)

// PracticeRecords 组件引用，用于主动刷新
const practiceRecordsRef = ref<{ refresh: () => void } | null>(null)

const visibleEntries = computed(() =>
  ENTRIES.filter(
    (e) =>
      (e.key !== 'wrong' || wrongTotal.value > 0) &&
      (e.key !== 'records' || hasRecords.value),
  ),
)

async function loadWrongTotal() {
  try {
    const data = await wrong({ page: 1, pageSize: 1 })
    wrongTotal.value = data.total || 0
  } catch {
    /* http 层已提示 */
  }
}

async function loadRecords() {
  try {
    const data = await practiceRecords()
    hasRecords.value = (data.list || []).length > 0
  } catch {
    /* http 层已提示 */
  }
}

function switchSection(key: (typeof ENTRIES)[number]['key']) {
  section.value = key
  // 切到做题记录 tab 时主动刷新列表，保证数据最新
  if (key === 'records') {
    practiceRecordsRef.value?.refresh()
  }
}

/** 同步路由 query.tab 到当前 section（从外部跳转带参数进来时使用） */
function syncTabFromRoute() {
  const tab = route.query.tab as string | undefined
  if (tab && ['real', 'mock', 'wrong', 'records'].includes(tab)) {
    section.value = tab as typeof section.value
    if (tab === 'records') {
      // 重拉 hasRecords 保证入口卡显示，再刷新记录列表
      loadRecords().then(() => {
        practiceRecordsRef.value?.refresh()
      })
    }
  }
}

onMounted(() => {
  loadWrongTotal()
  loadRecords()
  syncTabFromRoute()
})

// keep-alive 激活时重新拉数据（从考场页交卷返回时触发）
onActivated(() => {
  loadWrongTotal()
  loadRecords()
  syncTabFromRoute()
})
</script>


<template>
  <div class="page">
    <div class="entry-grid">
      <div
        v-for="e in visibleEntries"
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

    <!-- 模块区：内嵌显示，不跳独立页；做题记录点击入口卡后显示 -->
    <RealYearCards v-show="section === 'real'" />
    <MockQuestions v-show="section === 'mock'" />
    <WrongQuestions v-if="section === 'wrong' && wrongTotal > 0" />
    <PracticeRecords ref="practiceRecordsRef" v-show="section === 'records'" @changed="loadRecords" />
  </div>
</template>

<style scoped>
.page {
  max-width: 1200px;
  margin: 0 auto;
}
.entry-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 4px;
  max-width: 860px;
  margin-left: auto;
  margin-right: auto;
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
  font-size: 15px;
  font-weight: 700;
  color: #303133;
}
.entry-desc {
  margin-top: 4px;
  font-size: 12px;
  color: #909399;
}
</style>
