<script setup lang="ts">
// 成长树：等级/进度 + 最近成长记录
import { onMounted, ref } from 'vue'
import { growthTree } from '../../api/user'

const tree = ref<any>(null)
const loading = ref(false)

async function load() {
  loading.value = true
  try {
    tree.value = await growthTree()
  } catch {
    /* http 层已提示 */
  } finally {
    loading.value = false
  }
}

function typeIcon(type: string) {
  switch (type) {
    case 'checkin': return '📅'
    case 'register': return '🎉'
    case 'answer': return '✍️'
    case 'interview': return '🎤'
    case 'ai': return '🤖'
    case 'badge': return '🏅'
    case 'study_plan': return '🗺️'
    default: return '✨'
  }
}

onMounted(load)
</script>

<template>
  <div class="page">
    <el-card v-loading="loading" class="card" shadow="never">
      <template #header>🌳 成长树</template>
      <div v-if="tree" class="lv">
        <div class="lv-name">{{ tree.levelName }} · Lv.{{ tree.level }}</div>
        <div class="lv-sub">
          当前 {{ tree.currentPoints }} 分
          <template v-if="tree.nextLevelPoints"> / 升级需 {{ tree.nextLevelPoints }} 分</template>
        </div>
        <el-progress :percentage="Math.min(100, tree.progress)" :stroke-width="14" />
      </div>
    </el-card>

    <el-card class="card" shadow="never">
      <template #header>🕘 最近成长记录</template>
      <div v-loading="loading" class="recs">
        <div v-for="(r, i) in (tree?.recent || [])" :key="i" class="rec">
          <span class="rec-icon">{{ typeIcon(r.type) }}</span>
          <span class="rec-remark">{{ r.remark }}</span>
          <span class="rec-points" :class="{ neg: r.points < 0 }">{{ r.points > 0 ? '+' : '' }}{{ r.points }}</span>
          <span class="rec-time">{{ (r.createdAt || '').replace('T', ' ').slice(0, 16) }}</span>
        </div>
        <el-empty v-if="!loading && !(tree?.recent || []).length" description="暂无成长记录，去完成学习任务吧" />
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.page {
  max-width: 720px;
  margin: 0 auto;
}
.lv-name {
  font-size: 16px;
  font-weight: 700;
  color: #303133;
}
.lv-sub {
  margin: 8px 0 12px;
  font-size: 13px;
  color: #909399;
}
.rec {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 4px;
  border-bottom: 1px dashed #ebeef5;
  font-size: 13px;
}
.rec:last-child {
  border-bottom: none;
}
.rec-icon {
  font-size: 16px;
}
.rec-remark {
  color: #303133;
  flex: 1;
}
.rec-points {
  font-weight: 700;
  color: #67c23a;
}
.rec-points.neg {
  color: #f56c6c;
}
.rec-time {
  font-size: 12px;
  color: #c0c4cc;
}
</style>
