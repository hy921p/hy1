<script setup lang="ts">
// 能力评估：六维得分
import { onMounted, ref } from 'vue'
import { abilityAssessment } from '../../api/user'

const dims = ref<{ dimension: string; score: number }[]>([])
const loading = ref(false)

const MAX = 100

async function load() {
  loading.value = true
  try {
    dims.value = (await abilityAssessment()) || []
  } catch {
    /* http 层已提示 */
  } finally {
    loading.value = false
  }
}

function pct(score: number) {
  return Math.max(2, Math.min(100, Math.round((score / MAX) * 100)))
}

function color(score: number) {
  if (score >= 80) return '#67c23a'
  if (score >= 60) return '#409eff'
  return '#e6a23c'
}

onMounted(load)
</script>

<template>
  <div class="page">
    <el-card v-loading="loading" class="card" shadow="never">
      <template #header>🧭 能力评估</template>
      <div v-if="dims.length" class="dims">
        <div v-for="d in dims" :key="d.dimension" class="dim">
          <div class="dim-head">
            <span class="dim-name">{{ d.dimension }}</span>
            <span class="dim-score" :style="{ color: color(d.score) }">{{ d.score }} 分</span>
          </div>
          <el-progress
            :percentage="pct(d.score)"
            :color="color(d.score)"
            :stroke-width="12"
            :show-text="false"
          />
        </div>
      </div>
      <el-empty v-else-if="!loading" description="暂无评估数据，先去完成几次模拟面试吧" />
      <div v-if="dims.length" class="avg">
        平均 <b>{{ Math.round(dims.reduce((s, d) => s + d.score, 0) / dims.length) }}</b> 分 · 依据近期模拟面试六维表现
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.page {
  max-width: 720px;
  margin: 0 auto;
}
.dim {
  margin-bottom: 18px;
}
.dim-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.dim-name {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}
.dim-score {
  font-size: 14px;
  font-weight: 700;
}
.avg {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid #ebeef5;
  text-align: center;
  font-size: 13px;
  color: #909399;
}
.avg b {
  color: #409eff;
  font-size: 16px;
}
</style>
