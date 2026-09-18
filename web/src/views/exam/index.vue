<script setup lang="ts">
// 智考：AI 模拟面试入口 + 考试记录（参考「乾途国培」：筛选栏 + 大分数记录卡片）
// 顶栏已由 MainLayout 提供，此处只保留内容区
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  createInterview,
  listInterviews,
  deleteInterview,
  type InterviewRecord,
} from '../../api/interview'
import { usePreferenceStore } from '../../stores/preference'

const router = useRouter()
const pref = usePreferenceStore()

const creating = ref(false)
const records = ref<InterviewRecord[]>([])
const loadingList = ref(false)
const loadingMore = ref(false)
const page = ref(1)
const total = ref(0)
const hasMore = ref(false)
// 是否展示考试记录区：原始记录存在即展示；搜索/筛选无结果时仍保留筛选栏，仅下方显示空态提示
const hasRecords = ref(false)
// 统计展示用的分数区间（接口 stats 返回）
const minScore = ref<number | null>(null)
const maxScore = ref<number | null>(null)
// 筛选条件
const filterMin = ref<number | null>(null)
const filterMax = ref<number | null>(null)
const keyword = ref('')

const STATUS_TEXT: Record<number, string> = { 0: '未开始', 1: '进行中', 3: '已完成', 4: '已中断' }
const STATUS_TYPE: Record<number, 'info' | 'warning' | 'success' | 'danger'> = {
  0: 'info', 1: 'warning', 3: 'success', 4: 'danger',
}

/** 时间格式化：mysql2 的 Date 序列化成 ISO（UTC），转本地时区展示 */
function fmtTime(v: string | null) {
  if (!v) return '—'
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return String(v).replace('T', ' ').slice(0, 16)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

/** 大分数状态色：已完成 ≥60 绿 / <60 红；未完成灰 */
function scoreColor(r: InterviewRecord) {
  if (Number(r.status) !== 3) return '#94a3b8'
  return (Number(r.score) || 0) >= 60 ? '#10b981' : '#f87171'
}

async function start() {
  creating.value = true
  try {
    const data = await createInterview({
      position: pref.position,
      region: pref.region,
      totalQuestions: 3,
    })
    ElMessage.success(`已创建「${data.scenarioName}」，共 ${data.totalQuestions} 题`)
    router.push(`/exam/room/${data.sessionId}`)
  } catch (err: any) {
    ElMessage.error(err.message || '创建面试失败')
  } finally {
    creating.value = false
  }
}

async function loadHistory(append = false) {
  if (append) loadingMore.value = true
  else loadingList.value = true
  try {
    const data = await listInterviews(page.value, {
      minScore: filterMin.value ?? undefined,
      maxScore: filterMax.value ?? undefined,
      keyword: keyword.value.trim() || undefined,
    })
    records.value = append ? [...records.value, ...(data.list || [])] : data.list || []
    total.value = data.total
    hasMore.value = data.hasMore
    minScore.value = data.stats?.minScore ?? null
    maxScore.value = data.stats?.maxScore ?? null
    // 无筛选条件时按真实记录数决定是否展示；有筛选时一旦有记录就保留整块（避免搜不到结果导致筛选栏消失）
    const unfiltered = !keyword.value.trim() && filterMin.value == null && filterMax.value == null
    hasRecords.value = unfiltered ? data.total > 0 : hasRecords.value || data.total > 0
  } catch {
    /* http 层已提示 */
  } finally {
    loadingList.value = false
    loadingMore.value = false
  }
}

/** 筛选：重置到第 1 页重新加载 */
function applyFilter() {
  page.value = 1
  loadHistory()
}

function loadMore() {
  page.value += 1
  loadHistory(true)
}

/** 删除一条面试记录卡片（确认后调接口，本地移除） */
async function removeRecord(r: InterviewRecord) {
  try {
    await ElMessageBox.confirm(
      `确定删除「${r.scenario_name}」这场面试吗？删除后报告与对话记录不可恢复。`,
      '删除确认',
      { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning' },
    )
  } catch {
    return
  }
  try {
    await deleteInterview(r.id)
    records.value = records.value.filter((x) => x.id !== r.id)
    total.value -= 1
    // 无筛选条件下删空则整块隐藏（恢复为「从未做过面试」的初始态）
    if (!keyword.value.trim() && filterMin.value == null && filterMax.value == null && total.value <= 0) {
      hasRecords.value = false
    }
    ElMessage.success('记录已删除')
  } catch {
    /* http 层已提示 */
  }
}

onMounted(() => loadHistory())
</script>

<template>
  <div class="page">
    <!-- AI 模拟面试入口 -->
    <div class="hero">
      <div class="hero-text">
        <h2>🎤 AI 模拟面试</h2>
        <p>
          AI 面试官按
          <el-tag size="small">{{ pref.position }}</el-tag>
          <el-tag size="small" type="warning">{{ pref.region }}</el-tag>
          出题，一问一答流式点评，结束生成六维评分报告
        </p>
      </div>
      <el-button type="primary" size="large" :loading="creating" @click="start">
        开始面试 · 共 3 题
      </el-button>
    </div>

    <!-- 考试记录：原始记录存在即展示（有记录后搜索/筛选无结果也不隐藏筛选栏，下方只显示空态） -->
    <template v-if="hasRecords">
    <div class="filter-zone">
      <div class="filter-card">
        <!-- 搜索框放最左，分数区间筛选组在它右侧同一行 -->
        <el-input
          v-model="keyword"
          placeholder="搜索试卷名称..."
          clearable
          size="small"
          class="search-input"
          @keyup.enter="applyFilter"
          @clear="applyFilter"
        />
        <span class="range-label">分数区间</span>
        <el-input-number
          v-model="filterMin"
          :min="0"
          :max="100"
          :controls="false"
          size="small"
          placeholder="最低分"
          class="score-number-input"
        />
        <span class="range-dash">-</span>
        <el-input-number
          v-model="filterMax"
          :min="0"
          :max="100"
          :controls="false"
          size="small"
          placeholder="最高分"
          class="score-number-input"
        />
        <span class="range-unit">分</span>
        <el-button type="primary" size="small" @click="applyFilter">筛选</el-button>
      </div>
      <!-- 统计行：位于筛选框下方，与之同左对齐 -->
      <div class="filter-summary">
        总共 <b>{{ total }}</b> 条记录
        <span v-if="minScore != null" class="summary-range">现有 {{ minScore }} - {{ maxScore }} 分</span>
      </div>
    </div>

    <!-- 考试记录卡片（参考 .record-card） -->
    <div v-loading="loadingList" class="record-list">
      <div v-for="r in records" :key="r.id" class="record-card">
        <div class="card-header">
          <div class="paper-title">
            <span class="paper-icon">📄</span>
            <span class="paper-name">{{ r.scenario_name }}</span>
            <el-tag :type="STATUS_TYPE[r.status] || 'info'" size="small">{{ STATUS_TEXT[r.status] || '-' }}</el-tag>
          </div>
          <div class="card-actions">
            <el-button
              v-if="Number(r.status) === 3"
              type="primary"
              size="small"
              @click="router.push(`/exam/report/${r.id}`)"
            >面试报告</el-button>
            <el-button v-else type="primary" size="small" @click="router.push(`/exam/room/${r.id}`)">继续答题</el-button>
            <el-button type="danger" size="small" text @click="removeRecord(r)">删除</el-button>
          </div>
        </div>
        <div class="card-body">
          <div class="score-block">
            <span class="score-num" :style="{ color: scoreColor(r) }">
              {{ Number(r.status) === 3 ? (r.score ?? '—') : '—' }}
            </span>
            <span class="score-unit">分</span>
          </div>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">答对题数</span>
              <span class="info-value">
                {{ Number(r.status) === 3 && r.correctCount != null ? `${r.correctCount}/${r.totalCount} 题` : '—' }}
              </span>
            </div>
            <div class="info-item">
              <span class="info-label">正确率</span>
              <span class="info-value">{{ Number(r.status) === 3 && r.correctRate != null ? r.correctRate + '%' : '—' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">开考时间</span>
              <span class="info-value">{{ fmtTime(r.started_at) }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">交卷时间</span>
              <span class="info-value">{{ fmtTime(r.finished_at) }}</span>
            </div>
          </div>
        </div>
      </div>
      <!-- 搜索/筛选无结果：保留筛选栏，这里显示空态（清空关键词即恢复卡片） -->
      <el-empty
        v-if="!loadingList && !records.length"
        description="没有找到相应的试卷，换个关键词或清空筛选试试"
        :image-size="80"
      />
    </div>

    <div v-if="hasMore" class="more">
      <el-button text type="primary" :loading="loadingMore" @click="loadMore">加载更多</el-button>
    </div>
    </template>
  </div>
</template>

<style scoped>
.page {
  max-width: 1000px;
  margin: 0 auto;
}
.hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 36px 28px;
  margin-bottom: 24px;
  border-radius: 16px;
  background: linear-gradient(135deg, #ecf5ff, #f5f7fa);
  border: 1px solid #e4ecfb;
}
.hero h2 {
  margin: 0 0 10px;
  font-size: 24px;
}
.hero p {
  margin: 0;
  color: #909399;
  font-size: 13px;
  line-height: 1.8;
}
.hero .el-tag {
  margin: 0 2px;
}

/* 筛选区：紧凑单行（搜索放左 + 分数区间筛选组在右，同排不换行），整体收窄靠左 */
.filter-zone {
  width: 512px;
  max-width: 100%;
  margin-bottom: 12px;
}
.filter-card {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
}
.range-label {
  font-size: 12px;
  color: #64748b;
  white-space: nowrap;
}
.score-number-input {
  width: 76px;
  flex: 0 0 auto;
}
.score-number-input :deep(.el-input__inner) {
  font-size: 12px;
}
.range-dash {
  color: #94a3b8;
  font-size: 12px;
}
.range-unit {
  color: #64748b;
  font-size: 12px;
  white-space: nowrap;
}
.search-input {
  flex: 1;
  min-width: 110px;
}
.search-input :deep(.el-input__inner) {
  font-size: 12px;
}
/* 极窄屏回退：放不下时允许换行，避免挤出视口 */
@media (max-width: 620px) {
  .filter-zone {
    width: 100%;
  }
  .filter-card {
    flex-wrap: wrap;
  }
}
/* 统计行：与筛选框同左对齐 */
.filter-summary {
  font-size: 13px;
  color: #64748b;
  padding: 4px 6px;
}
.filter-summary b {
  color: #0f172a;
  font-size: 15px;
}
.summary-range {
  color: #94a3b8;
  font-size: 12px;
  margin-left: 6px;
}

/* 记录卡片（参考 .record-card，紧凑双列：一行放两个） */
.record-list {
  min-height: 120px;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
}
.record-list :deep(.el-empty) {
  grid-column: 1 / -1;
}
.record-card {
  padding: 16px 14px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.02);
  transition: border-color 0.2s, box-shadow 0.2s;
}
.record-card:hover {
  border-color: #cbd5e1;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.06);
}
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}
.paper-title {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}
.paper-icon {
  font-size: 15px;
  color: #2563eb;
  flex-shrink: 0;
}
.paper-name {
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.card-actions {
  flex-shrink: 0;
}
.card-body {
  display: flex;
  align-items: center;
  gap: 12px;
}
.score-block {
  display: flex;
  align-items: baseline;
  padding-right: 12px;
  border-right: 1px solid #e2e8f0;
  flex-shrink: 0;
}
.score-num {
  font-size: 28px;
  font-weight: 800;
  line-height: 1;
}
.score-unit {
  margin-left: 3px;
  color: #64748b;
  font-size: 11px;
  font-weight: 600;
}
.info-grid {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px 12px;
}
.info-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.info-label {
  font-size: 11px;
  color: #64748b;
}
.info-value {
  font-size: 12px;
  font-weight: 500;
  color: #0f172a;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.more {
  text-align: center;
  margin-top: 4px;
}
</style>
