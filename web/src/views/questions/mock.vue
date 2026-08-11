<script setup lang="ts">
// 模拟试卷：非真题 · 全真模拟练习，分页列表，点击进详情
import { onMounted, ref } from 'vue'
import { list } from '../../api/question'
import QuestionCard from '../../components/QuestionCard.vue'

const items = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 10
const loading = ref(false)

async function load(p = page.value) {
  loading.value = true
  try {
    const data = await list({ sourceType: 'mock', page: p, pageSize })
    items.value = data.list
    total.value = data.total
    page.value = data.page
  } catch {
    /* http 层已提示 */
  } finally {
    loading.value = false
  }
}

function onPageChange(p: number) {
  load(p)
}

onMounted(() => load())
</script>

<template>
  <div class="page">
    <el-card class="card" shadow="never">
      <template #header>
        <div class="card-head">
          <span>🧪 模拟试卷</span>
          <span class="card-tip">非历年真题 · 全真模拟练习（共 {{ total }} 题）</span>
        </div>
      </template>
      <div v-loading="loading" class="list">
        <QuestionCard v-for="q in items" :key="q.id" :q="q" />
        <el-empty v-if="!loading && !items.length" description="暂无模拟题" />
      </div>
      <div class="pager">
        <el-pagination
          v-if="total > pageSize"
          :current-page="page"
          :page-size="pageSize"
          :total="total"
          layout="prev, pager, next, total"
          @current-change="onPageChange"
        />
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
.list {
  min-height: 60px;
}
.pager {
  display: flex;
  justify-content: center;
  margin-top: 8px;
}
</style>
