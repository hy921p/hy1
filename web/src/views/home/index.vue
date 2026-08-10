<script setup lang="ts">
// 首页：签到卡 + 学习进度 + 今日推荐 + 智能规划路径（四区并行取数）
import { onMounted, ref } from 'vue'
import { overview } from '../../api/home'
import { progress } from '../../api/learn'
import { current } from '../../api/studyPlan'
import CheckInCard from '../../components/CheckInCard.vue'
import RecommendationList from '../../components/RecommendationList.vue'
import PlanPath from '../../components/PlanPath.vue'

const PROG_LABELS: Record<string, string> = {
  reading: '晨读',
  question: '刷题',
  course: '课程',
  interview: '面试',
  studyPlan: '规划',
}

const loading = ref(true)
const ov = ref<any>(null)
const prog = ref<any>(null)
const plan = ref<any>(null)

async function loadAll() {
  loading.value = true
  try {
    const [o, p, pl] = await Promise.all([overview(), progress(), current()])
    ov.value = o
    prog.value = p
    plan.value = pl
  } catch {
    /* http 层已提示 */
  } finally {
    loading.value = false
  }
}

function onChecked() {
  loadAll()
}

onMounted(loadAll)
</script>

<template>
  <div v-loading="loading" class="home">
    <div class="row">
      <el-card class="col col-checkin" shadow="never">
        <template #header>📅 每日签到</template>
        <CheckInCard
          :checked-in="!!ov?.checkin?.checkedIn"
          :streak="ov?.checkin?.streak || 0"
          :check-date="ov?.checkin?.checkDate"
          @checked="onChecked"
        />
      </el-card>

      <el-card class="col col-progress" shadow="never">
        <template #header>📊 学习进度</template>
        <div class="prog-grid">
          <div v-for="(label, key) in PROG_LABELS" :key="key" class="prog-item">
            <div class="prog-num">{{ prog?.[key] ?? 0 }}</div>
            <div class="prog-label">{{ label }}</div>
          </div>
          <div class="prog-item highlight">
            <div class="prog-num">{{ prog?.totalPoints ?? 0 }}</div>
            <div class="prog-label">⭐ 成长值</div>
          </div>
        </div>
      </el-card>
    </div>

    <el-card class="block" shadow="never">
      <template #header>🔥 今日推荐</template>
      <RecommendationList :items="ov?.recommendations || []" />
    </el-card>

    <el-card class="block" shadow="never">
      <template #header>🗺️ 智能规划路径</template>
      <PlanPath
        v-if="plan && plan.nodes?.length"
        :plan="plan.plan"
        :nodes="plan.nodes"
        :total="plan.total"
        :completed="plan.completed"
        :progress="plan.progress"
        @refreshed="loadAll"
      />
      <el-empty v-else-if="!loading" description="暂无匹配岗位/地区的学习规划，可切换偏好试试" />
    </el-card>
  </div>
</template>

<style scoped>
.row {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 16px;
  margin-bottom: 16px;
}
.block {
  margin-bottom: 16px;
}
.prog-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  padding: 4px 0;
}
.prog-item {
  text-align: center;
  padding: 14px 8px;
  border-radius: 10px;
  background: #f5f7fa;
}
.prog-num {
  font-size: 26px;
  font-weight: 800;
  color: #409eff;
}
.prog-label {
  margin-top: 4px;
  font-size: 12px;
  color: #909399;
}
.prog-item.highlight {
  background: #fdf6ec;
}
.prog-item.highlight .prog-num {
  color: #e6a23c;
}
</style>
