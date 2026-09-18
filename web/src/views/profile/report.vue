<script setup lang="ts">
// 学习分析
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { learningReport } from '../../api/user'

const router = useRouter()
const report = ref<any>(null)
const loading = ref(false)

async function load() {
  loading.value = true
  try {
    report.value = await learningReport()
  } catch {
    /* http 层已提示 */
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="page">
    <el-card v-loading="loading" class="card" shadow="never">
      <template #header>📊 学习分析</template>
      <div v-if="report" class="stats">
        <div class="stat">
          <div class="num">{{ report.totalCheckins }}</div>
          <div class="lbl">累计签到</div>
        </div>
        <div class="stat">
          <div class="num">{{ report.totalInterviews }}</div>
          <div class="lbl">模拟面试</div>
        </div>
        <div class="stat">
          <div class="num">{{ report.avgScore ?? '-' }}</div>
          <div class="lbl">平均得分</div>
        </div>
        <div class="stat">
          <div class="num">{{ report.completedNodes }}</div>
          <div class="lbl">已完成节点</div>
        </div>
      </div>
      <div class="actions">
        <el-button type="primary" @click="router.push('/exam')">去模拟面试 →</el-button>
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.page {
  max-width: 720px;
  margin: 0 auto;
}
.stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}
.stat {
  padding: 20px 8px;
  border-radius: 10px;
  background: #f5f7fa;
  text-align: center;
}
.stat .num {
  font-size: 26px;
  font-weight: 700;
  color: #409eff;
}
.stat .lbl {
  margin-top: 6px;
  font-size: 12px;
  color: #909399;
}
.actions {
  margin-top: 20px;
  display: flex;
  justify-content: center;
  gap: 10px;
}
</style>
