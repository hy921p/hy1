<script setup lang="ts">
// 签到卡：未签到显示签到按钮，已签到显示连续天数
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { checkIn } from '../api/checkin'

const props = defineProps<{ checkedIn: boolean; streak: number; checkDate?: string }>()
const emit = defineEmits<{ (e: 'checked', data: any): void }>()

const loading = ref(false)

async function doCheckin() {
  loading.value = true
  try {
    const data = await checkIn()
    ElMessage.success(`签到成功，+${data.points} 成长值（连续 ${data.streak} 天）`)
    emit('checked', data)
  } catch {
    /* http 层已提示（如 3001 重复签到） */
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="checkin" :class="{ done: checkedIn }">
    <div class="emoji">{{ checkedIn ? '✅' : '📅' }}</div>
    <div class="date">{{ checkDate || '今天' }}</div>
    <div class="streak">
      <span class="num">{{ streak }}</span> 天连续签到
    </div>
    <el-button v-if="!checkedIn" type="primary" round size="large" :loading="loading" @click="doCheckin">
      今日签到
    </el-button>
    <el-tag v-else type="success" size="large" effect="light" round>今日已签到</el-tag>
  </div>
</template>

<style scoped>
.checkin {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 12px 0 16px;
  text-align: center;
}
.emoji {
  font-size: 34px;
}
.date {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}
.streak {
  color: #909399;
  font-size: 13px;
  margin-bottom: 6px;
}
.streak .num {
  font-size: 20px;
  font-weight: 700;
  color: #e6a23c;
}
</style>
