<script setup lang="ts">
// 每日晨读：阅读列表 + 已读统计
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { readings, readingStats } from '../../api/learn'

const router = useRouter()
const items = ref<any[]>([])
const stats = ref<any>(null)
const total = ref(0)
const page = ref(1)
const pageSize = 10
const loading = ref(false)

async function load() {
  loading.value = true
  try {
    const [data, st] = await Promise.all([readings({ page: page.value, pageSize }), readingStats()])
    items.value = data.list
    total.value = data.total
    stats.value = st
  } catch {
    /* http 层已提示 */
  } finally {
    loading.value = false
  }
}

function onPageChange(p: number) {
  page.value = p
  load()
}

onMounted(load)
</script>

<template>
  <div class="page">
    <el-card v-if="stats" class="stat" shadow="never">
      <div class="stat-item"><span class="num">{{ stats.totalRead }}</span><span class="label">已读篇数</span></div>
      <div class="stat-item"><span class="num">{{ stats.streak }}</span><span class="label">连续阅读天数</span></div>
      <div class="stat-tip">📖 打开晨读详情即自动记录已读</div>
    </el-card>

    <el-card class="block" shadow="never">
      <template #header>📰 每日晨读</template>
      <div v-loading="loading" class="list">
        <div v-for="r in items" :key="r.id" class="reading" @click="router.push(`/learn/reading/${r.id}`)">
          <div class="reading-head">
            <span class="reading-title">{{ r.title }}</span>
            <el-tag v-if="r.is_hot" size="small" type="danger">热门</el-tag>
          </div>
          <div class="reading-summary">{{ r.summary }}</div>
          <div class="reading-meta">
            <el-tag v-if="r.position" size="small" type="warning" effect="plain">{{ r.position }}</el-tag>
            <el-tag v-if="r.region" size="small" type="warning" effect="plain">{{ r.region }}</el-tag>
            <span class="date">{{ (r.publish_date || '').slice(0, 10) }}</span>
          </div>
        </div>
        <el-empty v-if="!loading && !items.length" description="暂无晨读内容" />
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
.stat {
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 40px;
  padding: 8px 4px;
}
.stat-item {
  display: flex;
  align-items: baseline;
  gap: 6px;
}
.stat-item .num {
  font-size: 30px;
  font-weight: 800;
  color: #409eff;
}
.stat-item .label {
  font-size: 13px;
  color: #909399;
}
.stat-tip {
  margin-left: auto;
  font-size: 12px;
  color: #c0c4cc;
}
.block {
  margin-bottom: 16px;
}
.reading {
  padding: 14px 4px;
  border-bottom: 1px dashed #ebeef5;
  cursor: pointer;
}
.reading:last-child {
  border-bottom: none;
}
.reading:hover .reading-title {
  color: #409eff;
}
.reading-head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.reading-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}
.reading-summary {
  margin-top: 6px;
  font-size: 13px;
  color: #606266;
  line-height: 1.7;
}
.reading-meta {
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.date {
  margin-left: auto;
  font-size: 12px;
  color: #c0c4cc;
}
.pager {
  display: flex;
  justify-content: center;
  margin-top: 8px;
}
</style>
