<script setup lang="ts">
// 智能规划：规划总览 + 分阶段节点清单 + 推荐下一步
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { current } from '../../api/studyPlan'
import PlanPath from '../../components/PlanPath.vue'

const router = useRouter()

/** 节点类型 → 阶段名 + 图标 */
const PHASE_META: Record<string, { icon: string; name: string; to: string }> = {
  checkin: { icon: '🌱', name: '每日打卡', to: '/home' },
  reading: { icon: '📖', name: '晨读学习', to: '/learn/reading' },
  course: { icon: '📚', name: '基础课程', to: '/learn/courses' },
  question: { icon: '✍️', name: '专项刷题', to: '/questions' },
  interview: { icon: '🎤', name: '模拟面试', to: '/exam' },
  review: { icon: '🔁', name: '复盘整理', to: '/questions/wrong' },
}

const loading = ref(true)
const plan = ref<any>(null) // { plan, nodes, total, completed, progress }

/** 各节点补齐阶段信息 */
const nodesWithMeta = computed(() =>
  (plan.value?.nodes || []).map((n: any) => ({
    ...n,
    meta: PHASE_META[n.nodeType] || { icon: '📌', name: '学习任务', to: '/home' },
  })),
)

/** 未完成节点 → 按顺序取第一个做「推荐下一步」 */
const nextStep = computed(() => nodesWithMeta.value.find((n: any) => !n.completed) || null)

async function load() {
  loading.value = true
  try {
    plan.value = await current()
  } catch {
    /* http 层已提示 */
  } finally {
    loading.value = false
  }
}

function go(to: string) {
  router.push(to)
}

onMounted(load)
</script>

<template>
  <div class="page">
    <el-card v-loading="loading" class="card" shadow="never">
      <template #header>
        <div class="card-head">
          <span>🗺️ 智能规划路径</span>
          <span class="card-tip">按岗位 / 地区智能匹配的备考路线</span>
        </div>
      </template>

      <!-- 无匹配规划 -->
      <el-empty v-if="!loading && plan && !plan.nodes?.length" description="暂无匹配岗位/地区的学习规划，可在「账号设置」调整目标岗位与地区" />

      <template v-else-if="plan && plan.nodes?.length">
        <!-- 规划信息 + 进度条 -->
        <div class="plan-info">
          <div class="plan-name">{{ plan.plan?.name }}</div>
          <div class="plan-desc">{{ plan.plan?.description }}</div>
          <div class="plan-tags">
            <el-tag v-if="plan.plan?.position" size="small" type="warning" effect="plain">岗位：{{ plan.plan.position }}</el-tag>
            <el-tag v-if="plan.plan?.region" size="small" type="warning" effect="plain">地区：{{ plan.plan.region }}</el-tag>
          </div>
        </div>

        <PlanPath
          :plan="plan.plan"
          :nodes="plan.nodes"
          :total="plan.total"
          :completed="plan.completed"
          :progress="plan.progress"
          @refreshed="load"
        />

        <!-- 推荐下一步 -->
        <div v-if="nextStep" class="next-card" @click="go(nextStep.meta.to)">
          <div class="next-label">⏭️ 推荐下一步</div>
          <div class="next-title">{{ nextStep.meta.icon }} {{ nextStep.title }}</div>
          <div class="next-go">去完成 →</div>
        </div>
        <div v-else class="next-card done">
          <div class="next-label">🎉 全部完成</div>
          <div class="next-title">本阶段规划已全部完成，可前往「能力评估」查缺补漏</div>
          <div class="next-go" @click.stop="go('/profile/assessment')">去评估 →</div>
        </div>

        <!-- 分阶段节点清单 -->
        <div class="stage-list">
          <div v-for="n in nodesWithMeta" :key="n.id" class="stage-row" :class="{ done: n.completed }">
            <div class="stage-icon">{{ n.completed ? '✅' : n.meta.icon }}</div>
            <div class="stage-main">
              <div class="stage-title">{{ n.title }}</div>
              <div class="stage-meta">
                {{ n.meta.name }}
                <template v-if="n.estMinutes"> · {{ n.estMinutes }} 分钟</template>
              </div>
            </div>
            <el-button v-if="!n.completed" size="small" type="primary" text @click="go(n.meta.to)">
              去完成
            </el-button>
            <span v-else class="stage-done">已完成</span>
          </div>
        </div>
      </template>
    </el-card>
  </div>
</template>

<style scoped>
.page {
  max-width: 860px;
  margin: 0 auto;
}
.card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.card-tip {
  font-size: 12px;
  color: #909399;
  font-weight: normal;
}
.plan-info {
  margin-bottom: 16px;
}
.plan-name {
  font-size: 17px;
  font-weight: 700;
  color: #303133;
}
.plan-desc {
  margin-top: 4px;
  font-size: 13px;
  color: #909399;
}
.plan-tags {
  margin-top: 8px;
  display: flex;
  gap: 6px;
}
.next-card {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
  padding: 14px 16px;
  border-radius: 10px;
  background: #ecf5ff;
  border: 1px solid #d3e4fb;
  cursor: pointer;
  transition: all 0.2s;
}
.next-card:hover {
  border-color: #409eff;
}
.next-card.done {
  background: #f0f9eb;
  border-color: #d1edc4;
  cursor: default;
}
.next-label {
  flex-shrink: 0;
  font-size: 13px;
  font-weight: 700;
  color: #409eff;
}
.next-card.done .next-label {
  color: #67c23a;
}
.next-title {
  flex: 1;
  font-size: 14px;
  color: #303133;
}
.next-go {
  flex-shrink: 0;
  font-size: 13px;
  color: #409eff;
}
.stage-list {
  margin-top: 16px;
}
.stage-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 4px;
  border-bottom: 1px solid #f0f2f5;
}
.stage-row:last-child {
  border-bottom: none;
}
.stage-row.done {
  opacity: 0.6;
}
.stage-icon {
  flex-shrink: 0;
  font-size: 22px;
}
.stage-main {
  flex: 1;
}
.stage-title {
  font-size: 14px;
  color: #303133;
}
.stage-row.done .stage-title {
  text-decoration: line-through;
}
.stage-meta {
  margin-top: 3px;
  font-size: 12px;
  color: #909399;
}
.stage-done {
  font-size: 12px;
  color: #67c23a;
}
</style>
