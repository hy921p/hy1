<script setup lang="ts">
// 热点推荐：裸数组，无分页
import { onMounted, ref } from 'vue'
import { hot } from '../../api/question'
import QuestionCard from '../../components/QuestionCard.vue'

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
  <div class="page">
    <el-card class="card" shadow="never">
      <template #header>🔥 热点推荐（每日精选）</template>
      <div v-loading="loading" class="list">
        <QuestionCard v-for="q in items" :key="q.id" :q="q" :footer="q.reference_answer" footer-type="success" />
        <el-empty v-if="!loading && !items.length" description="暂无热点题目" />
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.page {
  max-width: 860px;
  margin: 0 auto;
}
.list {
  min-height: 60px;
}
</style>
