<script setup lang="ts">
// 每日晨读：最新 2 篇阅读 + 素材积累（金句/案例/名言，原「面试素材」并入此处）
// 按需求移除「已读篇数/连续阅读天数」统计模块；晨读区只展示最新 2 篇（无分页）
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { readings, materials } from '../../api/learn'

const router = useRouter()
const items = ref<any[]>([])
const pageSize = 2
const loading = ref(false)

async function load() {
  loading.value = true
  try {
    const data = await readings({ page: 1, pageSize })
    items.value = data.list
  } catch {
    /* http 层已提示 */
  } finally {
    loading.value = false
  }
}

/** 晨读发布日期本地化显示（mysql2 按 UTC 序列化 DATE，需转本地日期避免早一天） */
function fmtDate(s: string) {
  if (!s) return ''
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return (s || '').slice(0, 10)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

// —— 素材积累（金句/案例/名言）——
const MAT_TYPES = [
  { value: '', label: '全部' },
  { value: '金句', label: '金句' },
  { value: '案例', label: '案例' },
  { value: '名言', label: '名言' },
]
const matType = ref('')
const matItems = ref<any[]>([])
const matTotal = ref(0)
const matPage = ref(1)
const matPageSize = 10
const matLoading = ref(false)

async function matLoad(p = matPage.value) {
  matLoading.value = true
  try {
    const data = await materials({ type: matType.value || undefined, page: p, pageSize: matPageSize })
    matItems.value = data.list
    matTotal.value = data.total
    matPage.value = data.page
  } catch {
    /* http 层已提示 */
  } finally {
    matLoading.value = false
  }
}

function onMatType(t: string) {
  matType.value = t
  matPage.value = 1
  matLoad(1)
}

function onMatPageChange(p: number) {
  matLoad(p)
}

onMounted(() => {
  load()
  matLoad()
})
</script>

<template>
  <div class="page">
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
            <span class="date">{{ fmtDate(r.publish_date) }}</span>
          </div>
        </div>
        <el-empty v-if="!loading && !items.length" description="暂无晨读内容" />
      </div>
    </el-card>

    <el-card class="block" shadow="never">
      <template #header>🧩 素材积累（金句 / 案例 / 名言）</template>
      <div class="type-tabs">
        <button
          v-for="t in MAT_TYPES"
          :key="t.value"
          class="type-tab"
          :class="{ active: matType === t.value }"
          @click="onMatType(t.value)"
        >
          {{ t.label }}
        </button>
      </div>
      <div v-loading="matLoading" class="list">
        <div v-for="m in matItems" :key="m.id" class="mat">
          <div class="mat-head">
            <span class="mat-title">{{ m.title }}</span>
            <el-tag v-if="m.type" size="small" :type="m.type === '金句' ? 'danger' : m.type === '案例' ? 'success' : 'info'">
              {{ m.type }}
            </el-tag>
          </div>
          <div class="mat-content">{{ m.content }}</div>
        </div>
        <el-empty v-if="!matLoading && !matItems.length" description="暂无素材" />
      </div>
      <div class="pager">
        <el-pagination
          v-if="matTotal > matPageSize"
          :current-page="matPage"
          :page-size="matPageSize"
          :total="matTotal"
          layout="prev, pager, next, total"
          @current-change="onMatPageChange"
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
.type-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}
.type-tab {
  border: 1px solid #ebeef5;
  background: #fff;
  color: #606266;
  font-size: 13px;
  padding: 6px 16px;
  border-radius: 999px;
  cursor: pointer;
  transition: all 0.2s;
}
.type-tab.active {
  color: #fff;
  background: #409eff;
  border-color: #409eff;
}
.mat {
  padding: 14px 4px;
  border-bottom: 1px dashed #ebeef5;
}
.mat:last-child {
  border-bottom: none;
}
.mat-head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.mat-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}
.mat-content {
  margin-top: 6px;
  font-size: 13px;
  color: #606266;
  line-height: 1.7;
  white-space: pre-wrap;
}
</style>
