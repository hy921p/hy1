<script setup lang="ts">
// 我的：用户信息卡 + 功能入口
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { profile } from '../../api/user'

const router = useRouter()
const user = ref<any>(null)
const loading = ref(false)

const entries = [
  { icon: '📊', label: '学习报告', path: '/profile/report' },
  { icon: '🧭', label: '能力评估', path: '/profile/assessment' },
  { icon: '🏅', label: '勋章墙', path: '/profile/badges' },
  { icon: '🌳', label: '成长树', path: '/profile/growth-tree' },
  { icon: '🔔', label: '消息通知', path: '/profile/notifications' },
  { icon: '⚙️', label: '账号设置', path: '/profile/settings' },
]

async function load() {
  loading.value = true
  try {
    user.value = await profile()
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
    <el-card v-loading="loading" class="card user-card" shadow="never">
      <div v-if="user" class="user">
        <div class="avatar">
          {{ user.avatar ? user.avatar : '🧑‍💼' }}
        </div>
        <div class="info">
          <div class="name">{{ user.nickname }}</div>
          <div class="phone">{{ user.phone }}</div>
          <div class="tags">
            <el-tag v-if="user.targetPosition" size="small" type="warning" effect="plain">目标：{{ user.targetPosition }}</el-tag>
            <el-tag v-if="user.preferredRegion" size="small" type="warning" effect="plain">地区：{{ user.preferredRegion }}</el-tag>
          </div>
        </div>
        <div class="stats">
          <div class="stat">
            <div class="num">{{ user.growthPoints }}</div>
            <div class="lbl">成长值</div>
          </div>
          <div class="stat">
            <div class="num">{{ user.checkInStreak }}</div>
            <div class="lbl">连续签到</div>
          </div>
          <div class="stat">
            <div class="num">{{ user.totalInterviews }}</div>
            <div class="lbl">面试次数</div>
          </div>
          <div class="stat">
            <div class="num">{{ user.avgScore ?? '-' }}</div>
            <div class="lbl">平均分</div>
          </div>
        </div>
      </div>
    </el-card>

    <el-card class="card" shadow="never">
      <div class="grid">
        <div v-for="e in entries" :key="e.path" class="entry" @click="router.push(e.path)">
          <div class="entry-icon">{{ e.icon }}</div>
          <div class="entry-label">{{ e.label }}</div>
        </div>
        <div class="entry soon">
          <div class="entry-icon">💎</div>
          <div class="entry-label">会员中心</div>
          <div class="soon-tag">敬请期待</div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.page {
  max-width: 860px;
  margin: 0 auto;
}
.user {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 8px 0;
}
.avatar {
  width: 64px;
  height: 64px;
  flex-shrink: 0;
  border-radius: 50%;
  background: #ecf5ff;
  font-size: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.name {
  font-size: 20px;
  font-weight: 700;
  color: #303133;
}
.phone {
  margin-top: 4px;
  font-size: 13px;
  color: #909399;
}
.tags {
  margin-top: 8px;
  display: flex;
  gap: 6px;
}
.stats {
  margin-left: auto;
  display: flex;
  gap: 28px;
}
.stat {
  text-align: center;
}
.stat .num {
  font-size: 22px;
  font-weight: 700;
  color: #409eff;
}
.stat .lbl {
  margin-top: 4px;
  font-size: 12px;
  color: #909399;
}
.grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
}
.entry {
  position: relative;
  padding: 24px 8px;
  border-radius: 10px;
  background: #f5f7fa;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
}
.entry:hover {
  background: #ecf5ff;
  transform: translateY(-2px);
}
.entry-icon {
  font-size: 30px;
}
.entry-label {
  margin-top: 10px;
  font-size: 14px;
  color: #303133;
}
.entry.soon {
  cursor: default;
}
.entry.soon:hover {
  background: #f5f7fa;
  transform: none;
}
.soon-tag {
  position: absolute;
  top: 6px;
  right: 6px;
  font-size: 11px;
  color: #c0c4cc;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  padding: 1px 5px;
}
</style>
