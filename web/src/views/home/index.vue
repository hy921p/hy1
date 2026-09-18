<script setup lang="ts">
// 首页：轮播图 + 三卡片一排（签到日历/今日任务/学习进度趋势）+ 今日推荐
import { onMounted, ref } from 'vue'
import { overview } from '../../api/home'
import BannerCarousel from '../../components/BannerCarousel.vue'
import CheckInCalendar from '../../components/CheckInCalendar.vue'
import TaskCard from '../../components/TaskCard.vue'
import TrendChart from '../../components/TrendChart.vue'
import RecommendationList from '../../components/RecommendationList.vue'

const loading = ref(true)
const ov = ref<any>(null)

async function loadAll() {
  loading.value = true
  try {
    ov.value = await overview()
  } catch {
    /* http 层已提示 */
  } finally {
    loading.value = false
  }
}

function onChecked() {
  loadAll()
}

/** 今日任务新增/完成自定义任务后重拉首页 */
function onTaskChanged() {
  loadAll()
}

onMounted(loadAll)
</script>

<template>
  <div v-loading="loading" class="home">
    <BannerCarousel />

    <div class="cards-row">
      <el-card class="cell" shadow="never">
        <CheckInCalendar
          :checked-in="!!ov?.checkin?.checkedIn"
          :streak="ov?.checkin?.streak || 0"
          :check-date="ov?.checkin?.checkDate"
          :calendar-list="ov?.calendar?.list || []"
          @checked="onChecked"
        />
      </el-card>

      <el-card class="cell" shadow="never">
        <TaskCard :tasks="ov?.tasks || []" @changed="onTaskChanged" />
      </el-card>

      <el-card class="cell" shadow="never">
        <TrendChart :trend="ov?.trend || []" />
      </el-card>
    </div>

    <el-card class="block" shadow="never">
      <template #header>🔥 今日推荐</template>
      <RecommendationList :items="ov?.recommendations || []" />
    </el-card>
  </div>
</template>

<style scoped>
.home {
  max-width: 1200px;
  margin: 0 auto;
}
.cards-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}
.cell {
  transition: box-shadow 0.25s, transform 0.25s;
}
.cell:hover {
  box-shadow: 0 8px 24px rgba(38, 64, 102, 0.05);
  transform: translateY(-2px);
}
.block {
  margin-bottom: 20px;
}
.block :deep(.el-card__header) {
  font-size: 16px;
  font-weight: 700;
  color: #17243b;
}
@media (max-width: 900px) {
  .cards-row {
    grid-template-columns: 1fr;
  }
}
</style>
