<script setup lang="ts">
// 每日签到日历：自绘 7 列月历，已签到日期高亮 ✓，今天外框高亮，底部签到按钮
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { checkIn } from '../api/checkin'

const props = defineProps<{
  checkedIn: boolean
  streak: number
  checkDate?: string
  calendarList?: { date: string; points: number }[]
}>()
const emit = defineEmits<{ (e: 'checked', data: any): void }>()

const loading = ref(false)
const WEEK = ['一', '二', '三', '四', '五', '六', '日']
const today = (props.checkDate || new Date().toISOString().slice(0, 10)).slice(0, 10)
const [curY, curM] = today.split('-').map(Number)

// 当月格子：周一开头的空位 + 1..当月天数
const cells = computed<number[]>(() => {
  const lead = (new Date(curY, curM - 1, 1).getDay() + 6) % 7
  const days = new Date(curY, curM, 0).getDate()
  return [...Array.from({ length: lead }, () => 0), ...Array.from({ length: days }, (_, i) => i + 1)]
})

function cellDate(day: number) {
  return `${curY}-${String(curM).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

const checkedSet = computed(() => new Set((props.calendarList || []).map((c) => c.date)))

async function doCheckin() {
  loading.value = true
  try {
    const data = await checkIn()
    ElMessage.success(`签到成功，+${data.points} 成长值（连续 ${data.streak} 天）`)
    emit('checked', data)
  } catch {
    /* http 层已提示（3001 重复签到） */
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="checkin-cal">
    <div class="cc-head">
      <span>📅 每日签到</span>
      <span class="cc-month">{{ curY }}年{{ curM }}月</span>
    </div>
    <div class="cal-grid">
      <div v-for="w in WEEK" :key="w" class="cal-week">{{ w }}</div>
      <template v-for="(d, i) in cells" :key="i">
        <div
          v-if="d"
          class="cal-cell"
          :class="{
            checked: checkedSet.has(cellDate(d)),
            today: cellDate(d) === today,
          }"
        >{{ d }}</div>
        <div v-else class="cal-cell empty" />
      </template>
    </div>
    <div class="cc-foot">
      <el-button v-if="!checkedIn" type="primary" round size="small" :loading="loading" @click="doCheckin">
        今日签到
      </el-button>
      <el-tag v-else type="success" size="small" effect="light" round>今日已签到</el-tag>
      <span class="cc-streak">🔥 连续 {{ streak }} 天</span>
    </div>
  </div>
</template>

<style scoped>
.checkin-cal {
  padding: 2px 0;
}
.cc-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 15px;
  font-weight: 700;
  color: #303133;
  margin-bottom: 10px;
}
.cc-month {
  font-size: 12px;
  color: #909399;
  font-weight: normal;
}
.cal-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}
.cal-week {
  text-align: center;
  font-size: 12px;
  color: #c0c4cc;
  padding: 2px 0;
}
.cal-cell {
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  font-size: 12px;
  color: #606266;
}
.cal-cell.checked {
  background: var(--app-primary);
  color: #fff;
  font-weight: 700;
}
.cal-cell.today:not(.checked) {
  outline: 1.5px solid var(--app-gold);
  outline-offset: -1px;
}
.cal-cell.empty {
  visibility: hidden;
}
.cc-foot {
  margin-top: 12px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.cc-streak {
  font-size: 12px;
  color: var(--app-gold);
}
</style>
