<script setup lang="ts">
// 我的：用户信息卡 + 成长树（删功能入口卡，独立页仍可由旧链接直达）
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { profile } from '../../api/user'
import ProfileGrowthTree from '../../components/ProfileGrowthTree.vue'

const router = useRouter()
const user = ref<any>(null)
const loading = ref(false)

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
      <!-- 右上角：账号设置入口图标（不再单独占用功能卡片） -->
      <button class="corner-settings" type="button" @click="router.push('/profile/settings')" aria-label="账号设置">⚙️</button>
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

    <!-- 成长树：内嵌爬树可视化，成长值驱动角色从树根爬到树冠 -->
    <ProfileGrowthTree />
  </div>
</template>

<style scoped>
.page {
  max-width: 860px;
  margin: 0 auto;
  padding-bottom: 24px;
}
/* 用户卡定位基准 + 右上角账号设置图标 */
.user-card {
  position: relative;
}
.corner-settings {
  position: absolute;
  top: 10px;
  right: 16px;
  border: none;
  background: transparent;
  font-size: 18px;
  line-height: 1;
  padding: 6px;
  border-radius: 8px;
  cursor: pointer;
  opacity: 0.6;
  transition: opacity 0.15s, background 0.15s;
}
.corner-settings:hover {
  opacity: 1;
  background: #f0f4fb;
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
</style>
