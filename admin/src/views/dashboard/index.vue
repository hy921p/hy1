<script setup lang="ts">
// 数据看板：核心指标卡片 + 近 7 日打卡柱状
import { computed, onMounted, ref } from 'vue'
import { getDashboardStats, type DashboardStats } from '../../api/admin'

const stats = ref<DashboardStats | null>(null)
const loading = ref(false)

const cards = computed(() => {
  const s = stats.value
  if (!s) return []
  return [
    { label: '总用户', value: s.totalUsers, color: '#1677ff' },
    { label: '题库题目', value: s.totalQuestions, color: '#722ed1' },
    { label: '面试总数', value: s.totalInterviews, color: '#13c2c2' },
    { label: '已完成面试', value: s.completedInterviews, color: '#52c41a' },
    { label: '平均得分', value: s.avgScore, suffix: ' 分', color: '#eb2f96' },
    { label: '社区帖子', value: s.totalPosts, color: '#fa8c16' },
    { label: '今日打卡', value: s.todayCheckIns, color: '#f5222d' },
    { label: 'AI 答疑', value: s.totalAiAnswers, color: '#2f54eb' },
    { label: '已发勋章', value: s.totalBadgesIssued, color: '#faad14' },
    { label: '激活规划', value: s.activePlans, color: '#a0d911' },
  ]
})

const weekMax = computed(() =>
  Math.max(1, ...(stats.value?.weekCheckIns || []).map((w) => w.count)),
)

function fmtDate(d: string) {
  const dt = new Date(d)
  return `${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

async function load() {
  loading.value = true
  try {
    stats.value = await getDashboardStats()
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <a-spin :spinning="loading">
    <a-row :gutter="[16, 16]">
      <a-col v-for="c in cards" :key="c.label" :xs="12" :sm="8" :md="6" :lg="4">
        <a-card class="stat-card">
          <a-statistic :title="c.label" :value="c.value" :value-style="{ color: c.color }" />
        </a-card>
      </a-col>
    </a-row>

    <a-card v-if="stats && stats.weekCheckIns?.length" title="近 7 日打卡" class="week-card">
      <div class="week">
        <div v-for="w in stats.weekCheckIns" :key="w.date" class="day">
          <div class="bar-wrap">
            <div class="bar" :style="{ height: `${Math.round((w.count / weekMax) * 100)}px` }" />
          </div>
          <div class="count">{{ w.count }}</div>
          <div class="date">{{ fmtDate(w.date) }}</div>
        </div>
      </div>
    </a-card>
    <a-empty v-else-if="stats && !stats.weekCheckIns?.length" description="近 7 日暂无打卡数据" style="margin-top: 24px" />
  </a-spin>
</template>

<style scoped>
.stat-card {
  text-align: center;
}
.week-card {
  margin-top: 16px;
}
.week {
  display: flex;
  justify-content: space-around;
  align-items: flex-end;
  height: 160px;
}
.day {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.bar-wrap {
  height: 120px;
  display: flex;
  align-items: flex-end;
}
.bar {
  width: 28px;
  min-height: 4px;
  background: linear-gradient(180deg, #69b1ff, #1677ff);
  border-radius: 4px 4px 0 0;
}
.count {
  font-weight: 600;
  color: #1677ff;
}
.date {
  font-size: 12px;
  color: #999;
}
</style>
