<script setup lang="ts">
// 视频课程列表
import { onMounted, ref } from 'vue'
import { courses } from '../../api/learn'

const items = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 10
const loading = ref(false)

async function load(p = page.value) {
  loading.value = true
  try {
    const data = await courses({ page: p, pageSize })
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
      <template #header>🎬 视频课程</template>
      <div v-loading="loading" class="list">
        <div v-for="c in items" :key="c.id" class="course">
          <div class="course-cover">🎞</div>
          <div class="course-info">
            <div class="course-title">{{ c.title }}</div>
            <div class="course-desc">{{ c.description }}</div>
            <div class="course-meta">
              <el-tag v-if="c.teacher" size="small" effect="plain">{{ c.teacher }}</el-tag>
              <el-tag v-if="c.position" size="small" type="warning" effect="plain">{{ c.position }}</el-tag>
              <span v-if="c.duration" class="duration">时长 {{ c.duration }} 分钟</span>
            </div>
          </div>
        </div>
        <el-empty v-if="!loading && !items.length" description="暂无课程" />
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
.course {
  display: flex;
  gap: 14px;
  padding: 14px 4px;
  border-bottom: 1px dashed #ebeef5;
}
.course:last-child {
  border-bottom: none;
}
.course-cover {
  width: 120px;
  height: 76px;
  flex-shrink: 0;
  border-radius: 8px;
  background: #ecf5ff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30px;
}
.course-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}
.course-desc {
  margin-top: 6px;
  font-size: 13px;
  color: #606266;
  line-height: 1.7;
}
.course-meta {
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.duration {
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
