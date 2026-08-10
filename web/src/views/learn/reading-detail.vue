<script setup lang="ts">
// 晨读详情：打开即自动记录已读（服务端幂等）
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { readingDetail } from '../../api/learn'

const route = useRoute()
const r = ref<any>(null)
const loading = ref(true)

async function load() {
  loading.value = true
  try {
    r.value = await readingDetail(route.params.id as string)
  } catch {
    /* http 层已提示 */
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div v-loading="loading" class="page">
    <template v-if="r">
      <div class="head">
        <h2>{{ r.title }}</h2>
        <div class="meta">
          <el-tag v-if="r.position" size="small" type="warning" effect="plain">{{ r.position }}</el-tag>
          <el-tag v-if="r.region" size="small" type="warning" effect="plain">{{ r.region }}</el-tag>
          <span class="date">{{ (r.publishDate || '').slice(0, 10) }}</span>
        </div>
      </div>
      <el-card class="card" shadow="never">
        <div class="summary">{{ r.summary }}</div>
        <el-divider />
        <div class="content">{{ r.content }}</div>
      </el-card>
      <div class="tip">✅ 已自动记录本次阅读</div>
    </template>
  </div>
</template>

<style scoped>
.page {
  max-width: 760px;
  margin: 0 auto;
}
.head h2 {
  margin: 0 0 10px;
  font-size: 22px;
  color: #303133;
}
.meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 14px;
}
.date {
  margin-left: auto;
  font-size: 12px;
  color: #c0c4cc;
}
.card {
  margin-bottom: 12px;
}
.summary {
  font-size: 14px;
  color: #606266;
  line-height: 1.8;
  background: #f5f7fa;
  border-radius: 8px;
  padding: 12px 14px;
}
.content {
  font-size: 15px;
  color: #303133;
  line-height: 2;
  white-space: pre-wrap;
}
.tip {
  text-align: center;
  font-size: 12px;
  color: #67c23a;
}
</style>
