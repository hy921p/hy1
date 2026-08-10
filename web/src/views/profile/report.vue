<script setup lang="ts">
// 学习报告
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
      <template #header>📊 学习报告</template>
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
      <el-divider>智能规划进度</el-divider>
      <div v-if="report?.planProgress" class="plan">
        <div class="plan-name">{{ report.planProgress.planName }}</div>
        <el-progress :percentage="report.planProgress.progress" :stroke-width="10" />
        <div class="plan-sub">已完成 {{ report.planProgress.completed }} / {{ report.planProgress.total }} 个节点</div>
      </div>
      <el-empty v-else-if="!loading" description="尚未选择学习规划" />
      <div class="actions">
        <el-button type="primary" @click="router.push('/profile/assessment')">查看能力评估 →</el-button>
        <el-button @click="router.push('/exam')">去模拟面试 →</el-button>
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
.plan {
  padding: 4px 8px;
}
.plan-name {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 10px;
}
.plan-sub {
  margin-top: 8px;
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
