<script setup lang="ts">
// 学习数据：本周学习时长(分钟) / 刷题数 / 面试数 折线图（ECharts 按需引入）
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as echarts from 'echarts/core'
import { LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { EChartsCoreOption } from 'echarts/core'

echarts.use([LineChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer])

const props = defineProps<{
  trend: { date: string; label: string; minutes: number; answers: number; interviews: number }[]
}>()

const chartEl = ref<HTMLDivElement | null>(null)
let chart: echarts.ECharts | null = null

const hasData = computed(() =>
  props.trend.some((t) => t.minutes > 0 || t.answers > 0 || t.interviews > 0),
)

function render() {
  if (!chartEl.value || !hasData.value) return
  if (!chart) chart = echarts.init(chartEl.value)
  const option: EChartsCoreOption = {
    tooltip: { trigger: 'axis' },
    legend: { data: ['学习时长', '刷题数', '面试数'], bottom: 0, itemWidth: 14, itemHeight: 8 },
    grid: { left: 8, right: 8, top: 24, bottom: 30, containLabel: true },
    xAxis: { type: 'category', boundaryGap: false, data: props.trend.map((t) => t.label) },
    yAxis: [
      { type: 'value', name: '分钟', minInterval: 1, axisLabel: { fontSize: 11 } },
      { type: 'value', name: '次数', minInterval: 1, axisLabel: { fontSize: 11 } },
    ],
    series: [
      { name: '学习时长', type: 'line', smooth: true, showSymbol: false, data: props.trend.map((t) => t.minutes), itemStyle: { color: '#2367d1' }, lineStyle: { width: 2 } },
      { name: '刷题数', type: 'line', smooth: true, showSymbol: false, yAxisIndex: 1, data: props.trend.map((t) => t.answers), itemStyle: { color: '#10b981' }, lineStyle: { width: 2 } },
      { name: '面试数', type: 'line', smooth: true, showSymbol: false, yAxisIndex: 1, data: props.trend.map((t) => t.interviews), itemStyle: { color: '#f7ba2a' }, lineStyle: { width: 2 } },
    ],
  }
  chart.setOption(option)
}

function onResize() {
  chart?.resize()
}

onMounted(() => {
  render()
  window.addEventListener('resize', onResize)
})

watch(
  () => props.trend,
  () => {
    // 数据从空变有 → 容器 v-if 才渲染，需在 DOM 更新后 init，故 flush:'post'
    render()
  },
  { deep: true, flush: 'post' },
)

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  chart?.dispose()
  chart = null
})
</script>

<template>
  <div class="trend-chart">
    <div class="tc-head">
      <span>📊 学习数据</span>
      <span class="tc-tip">本周学习时长 / 刷题数 / 面试数</span>
    </div>
    <div v-if="hasData" ref="chartEl" class="chart-box" />
    <el-empty v-else description="本周暂无学习数据" :image-size="70" />
  </div>
</template>

<style scoped>
.trend-chart {
  padding: 2px 0;
}
.tc-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 15px;
  font-weight: 700;
  color: #303133;
  margin-bottom: 10px;
}
.tc-tip {
  font-size: 11px;
  color: #909399;
  font-weight: normal;
}
.chart-box {
  height: 220px;
  width: 100%;
}
</style>
