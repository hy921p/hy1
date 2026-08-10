<script setup lang="ts">
// 今日推荐列表：点击进题库详情
import { useRouter } from 'vue-router'

const props = defineProps<{ items: any[] }>()
const router = useRouter()

function openQ(id: number) {
  router.push(`/questions/detail/${id}`)
}

function diffClass(d?: string) {
  return 'd-' + (d || '')
}
</script>

<template>
  <div class="rec-list">
    <div v-for="r in items" :key="r.id" class="rec-card" @click="openQ(r.id)">
      <div class="rec-cat">{{ r.category }}</div>
      <div class="rec-content">{{ r.content }}</div>
      <div class="rec-meta">
        <span class="rec-pos">{{ r.position }} · {{ r.region }}</span>
        <span class="diff" :class="diffClass(r.difficulty)">{{ r.difficulty }}</span>
      </div>
    </div>
    <el-empty v-if="!items.length" description="今日暂无推荐" :image-size="80" />
  </div>
</template>

<style scoped>
.rec-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 14px;
}
.rec-card {
  padding: 14px 16px;
  border: 1px solid #ebeef5;
  border-radius: 10px;
  background: #fafbfc;
  cursor: pointer;
  transition: all 0.2s;
}
.rec-card:hover {
  border-color: #409eff;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.12);
}
.rec-cat {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 999px;
  background: #ecf5ff;
  color: #409eff;
  font-size: 12px;
}
.rec-content {
  margin-top: 8px;
  color: #303133;
  line-height: 1.7;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.rec-meta {
  margin-top: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #909399;
}
.diff {
  padding: 1px 8px;
  border-radius: 999px;
  font-size: 12px;
}
.d-简单 { background: #f0f9eb; color: #67c23a; }
.d-中等 { background: #fdf6ec; color: #e6a23c; }
.d-困难 { background: #fef0f0; color: #f56c6c; }
</style>
