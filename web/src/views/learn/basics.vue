<script setup lang="ts">
// 通识理论：结构化面试基础方法论（列表内展开内容）
import { onMounted, ref } from 'vue'
import { basics } from '../../api/learn'

const items = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 10
const loading = ref(false)
const openId = ref<number | null>(null)

async function load(p = page.value) {
  loading.value = true
  try {
    const data = await basics({ page: p, pageSize })
    items.value = data.list
    total.value = data.total
    page.value = data.page
  } catch {
    /* http 层已提示 */
  } finally {
    loading.value = false
  }
}

function toggle(id: number) {
  openId.value = openId.value === id ? null : id
}

function onPageChange(p: number) {
  load(p)
}

onMounted(() => load())
</script>

<template>
  <div class="page">
    <el-card class="card" shadow="never">
      <template #header>📘 通识理论</template>
      <div v-loading="loading" class="list">
        <div v-for="b in items" :key="b.id" class="basic">
          <div class="basic-head" @click="toggle(b.id)">
            <span class="basic-title">{{ b.title }}</span>
            <el-tag v-if="b.category" size="small" effect="plain">{{ b.category }}</el-tag>
            <span class="arrow">{{ openId === b.id ? '▾' : '▸' }}</span>
          </div>
          <div v-if="openId === b.id" class="basic-content">{{ b.content }}</div>
        </div>
        <el-empty v-if="!loading && !items.length" description="暂无通识内容" />
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
.basic {
  border-bottom: 1px dashed #ebeef5;
}
.basic:last-child {
  border-bottom: none;
}
.basic-head {
  padding: 14px 4px;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}
.basic-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}
.arrow {
  margin-left: auto;
  color: #c0c4cc;
  font-size: 14px;
}
.basic-content {
  padding: 0 4px 16px;
  font-size: 13px;
  color: #606266;
  line-height: 1.9;
  white-space: pre-wrap;
  background: #fafbfc;
  border-radius: 8px;
  padding: 12px 14px;
  margin-bottom: 12px;
}
.pager {
  display: flex;
  justify-content: center;
  margin-top: 8px;
}
</style>
