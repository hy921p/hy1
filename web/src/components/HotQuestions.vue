<script setup lang="ts">
// 热点推荐（内嵌 section）：裸数组，无分页
import { onMounted, ref } from 'vue'
import { hot } from '../api/question'
import QuestionCard from './QuestionCard.vue'

const items = ref<any[]>([])
const loading = ref(false)

async function load() {
  loading.value = true
  try {
    items.value = await hot()
  } catch {
    /* http 层已提示 */
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="hot-questions">
    <div class="sq-head">
      <span>🔥 热点推荐</span>
      <span class="sq-tip">每日精选高频热点题 · 共 {{ items.length }} 题</span>
    </div>
    <div v-loading="loading" class="list">
      <QuestionCard v-for="q in items" :key="q.id" :q="q" :footer="q.reference_answer" footer-type="success" />
      <el-empty v-if="!loading && !items.length" description="暂无热点题目" />
    </div>
  </div>
</template>

<style scoped>
.hot-questions {
  max-width: 860px;
  margin: 0 auto;
}
.sq-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 15px;
  font-weight: 700;
  color: #303133;
  margin-bottom: 12px;
}
.sq-tip {
  font-size: 12px;
  color: #909399;
  font-weight: normal;
}
.list {
  min-height: 60px;
}
</style>
