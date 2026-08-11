<script setup lang="ts">
// 历年真题：按年份分类展示 + 年份筛选，点击进详情
import { computed, onMounted, ref } from 'vue'
import { real } from '../../api/question'
import QuestionCard from '../../components/QuestionCard.vue'

const items = ref<any[]>([])
const loading = ref(false)
const activeYear = ref('') // '' 全部

async function load() {
  loading.value = true
  try {
    const data = await real({ page: 1, pageSize: 100 })
    items.value = data.list
  } catch {
    /* http 层已提示 */
  } finally {
    loading.value = false
  }
}

/** 题库中出现的年份（去重降序） */
const years = computed(() => {
  const s = new Set<number>()
  for (const q of items.value) if (q.year) s.add(Number(q.year))
  return [...s].sort((a, b) => b - a)
})

/** 按年份分组（含筛选，年份降序，未标注放最后） */
const groups = computed(() => {
  const shown = activeYear.value
    ? items.value.filter((q) => Number(q.year) === Number(activeYear.value))
    : items.value
  const map = new Map<number, any[]>()
  for (const q of shown) {
    const y = q.year ? Number(q.year) : -1 // -1 = 未标注年份
    if (!map.has(y)) map.set(y, [])
    map.get(y)!.push(q)
  }
  return [...map.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([year, list]) => ({
      title: year === -1 ? '未标注年份' : `${year} 年真题`,
      list,
    }))
})

onMounted(() => load())
</script>

<template>
  <div class="page">
    <el-card class="card" shadow="never">
      <template #header>
        <div class="card-head">
          <span>📜 历年真题</span>
          <span class="card-tip">真实考场真题 · 按年份分类（共 {{ items.length }} 题）</span>
        </div>
      </template>

      <div v-if="years.length" class="year-tabs">
        <button
          class="year-tab"
          :class="{ active: activeYear === '' }"
          @click="activeYear = ''"
        >全部 ({{ items.length }})</button>
        <button
          v-for="y in years"
          :key="y"
          class="year-tab"
          :class="{ active: activeYear === String(y) }"
          @click="activeYear = String(y)"
        >{{ y }} 年 ({{ items.filter((q) => Number(q.year) === y).length }})</button>
      </div>

      <div v-loading="loading" class="list">
        <template v-for="g in groups" :key="g.title">
          <div class="group-head">📅 {{ g.title }}</div>
          <QuestionCard v-for="q in g.list" :key="q.id" :q="q" />
        </template>
        <el-empty v-if="!loading && !items.length" description="暂无真题" />
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.page {
  max-width: 860px;
  margin: 0 auto;
}
.card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.card-tip {
  font-size: 12px;
  color: #909399;
  font-weight: normal;
}
.year-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}
.year-tab {
  padding: 6px 14px;
  border: 1px solid #dcdfe6;
  border-radius: 999px;
  background: #fff;
  font-size: 13px;
  color: #606266;
  cursor: pointer;
  transition: all 0.2s;
}
.year-tab:hover {
  color: #409eff;
  border-color: #409eff;
}
.year-tab.active {
  background: #409eff;
  border-color: #409eff;
  color: #fff;
}
.list {
  min-height: 60px;
}
.group-head {
  margin: 14px 0 10px;
  font-size: 14px;
  font-weight: 700;
  color: #303133;
}
.group-head:first-child {
  margin-top: 0;
}
</style>
