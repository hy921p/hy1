<script setup lang="ts">
// 面试素材：金句 / 案例 / 名言 分类展示
import { onMounted, ref } from 'vue'
import { materials } from '../../api/learn'

const TYPES = [
  { value: '', label: '全部' },
  { value: '金句', label: '金句' },
  { value: '案例', label: '案例' },
  { value: '名言', label: '名言' },
]

const activeType = ref('')
const items = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 10
const loading = ref(false)

async function load(p = page.value) {
  loading.value = true
  try {
    const data = await materials({ type: activeType.value || undefined, page: p, pageSize })
    items.value = data.list
    total.value = data.total
    page.value = data.page
  } catch {
    /* http 层已提示 */
  } finally {
    loading.value = false
  }
}

function onType(t: string) {
  activeType.value = t
  page.value = 1
  load(1)
}

function onPageChange(p: number) {
  load(p)
}

onMounted(() => load())
</script>

<template>
  <div class="page">
    <el-card class="card" shadow="never">
      <template #header>🧩 面试素材积累</template>
      <div class="type-tabs">
        <button
          v-for="t in TYPES"
          :key="t.value"
          class="type-tab"
          :class="{ active: activeType === t.value }"
          @click="onType(t.value)"
        >{{ t.label }}</button>
      </div>
      <div v-loading="loading" class="list">
        <div v-for="m in items" :key="m.id" class="mat">
          <div class="mat-head">
            <span class="mat-title">{{ m.title }}</span>
            <el-tag v-if="m.type" size="small" :type="m.type === '金句' ? 'danger' : m.type === '案例' ? 'success' : 'info'">
              {{ m.type }}
            </el-tag>
          </div>
          <div class="mat-content">{{ m.content }}</div>
        </div>
        <el-empty v-if="!loading && !items.length" description="暂无素材" />
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
.type-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 14px;
}
.type-tab {
  padding: 6px 18px;
  border: 1px solid #dcdfe6;
  border-radius: 999px;
  background: #fff;
  font-size: 13px;
  color: #606266;
  cursor: pointer;
  transition: all 0.2s;
}
.type-tab:hover {
  color: #409eff;
  border-color: #409eff;
}
.type-tab.active {
  background: #409eff;
  border-color: #409eff;
  color: #fff;
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
  line-height: 1.8;
}
.pager {
  display: flex;
  justify-content: center;
  margin-top: 8px;
}
</style>
