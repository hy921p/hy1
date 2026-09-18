<script setup lang="ts">
// 做题记录：只显示做过的历年真题/模拟试卷（按年份+试卷类型聚合），无记录整块不显示
// 每张卡片带「成绩单」入口 → 该套试卷全卷回顾（题目/答题卡/我的答案/正确答案/解析）
import { computed, onActivated, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { practiceRecords, deletePracticeRecord } from '../api/question'

const emit = defineEmits<{ (e: 'changed'): void }>()

interface RecordRow {
  year: number | string | null
  source_type: string
  total: number
  correct: number
  /** 做题时间（进卷时刻；老数据为空用结束时间兜底） */
  started: string | null
  /** 结束时间（交卷时刻） */
  ended: string | null
}

const router = useRouter()
const items = ref<RecordRow[]>([])
const loading = ref(false)

/** 模拟试卷序号（按年份固定：2011=模拟试卷1，2012=模拟试卷2） */
const MOCK_NO: Record<string, number> = { '2011': 1, '2012': 2 }

const totalAnswered = computed(() => items.value.reduce((s, r) => s + Number(r.total), 0))

/** 正确率（百分数整数） */
function rate(r: RecordRow) {
  const total = Number(r.total)
  if (!total) return 0
  return Math.round((Number(r.correct) / total) * 100)
}

/** 时间 → 2026/8/31 15:40（本地时区；后端 DATETIME 经 mysql2 读回为 UTC ISO 串，须转本地显示） */
function fmtTime(s: string | null | undefined) {
  if (!s) return '—'
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return String(s).slice(0, 16)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${hh}:${mm}`
}

/** 卡片标题：真题 → 「2018 年中国移动真题」；模拟试卷 → 「模拟试卷1」 */
function label(r: RecordRow) {
  if (r.source_type === 'mock') {
    const no = MOCK_NO[String(r.year)]
    return no ? `模拟试卷${no}` : `${r.year} 年模拟试卷`
  }
  return `${r.year} 年中国移动真题`
}

/** 打开该套试卷成绩单 */
function openReport(r: RecordRow) {
  router.push({
    path: `/questions/score-report/${r.year}`,
    query: { source: r.source_type, label: label(r) },
  })
}

async function load() {
  loading.value = true
  try {
    const data = await practiceRecords()
    items.value = (data.list || []).map((r) => ({
      year: r.year,
      source_type: r.source_type === 'mock' ? 'mock' : 'real',
      total: Number(r.total),
      correct: Number(r.correct),
      started: r.started ?? null,
      ended: r.ended ?? null,
    }))
  } catch {
    /* http 层已提示 */
  } finally {
    loading.value = false
  }
}

/** 删除某套（年+试卷类型）做题记录：确认后调接口，成功后重拉列表并通知父级刷新入口卡 */
const deletingKey = ref<string | null>(null)
async function doDelete(r: RecordRow) {
  const key = 'yr-' + String(r.year) + '-' + r.source_type
  try {
    await ElMessageBox.confirm(
      `确定删除「${label(r)}」的做题记录吗？删除后该套的成绩单与答题记录将一并清除，不可恢复。`,
      '删除确认',
      { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning' },
    )
  } catch {
    return
  }
  deletingKey.value = key
  try {
    await deletePracticeRecord({ year: String(r.year), sourceType: r.source_type as 'real' | 'mock' })
    ElMessage.success('做题记录已删除')
    await load()
    emit('changed')
  } catch {
    /* http 层已提示 */
  } finally {
    deletingKey.value = null
  }
}

onMounted(load)

// keep-alive 激活时自动刷新（切换 tab 或从考场页返回时触发）
onActivated(load)

// 暴露 refresh 方法给父组件（questions/index.vue）主动调用
defineExpose({ refresh: load })
</script>


<template>
  <div v-if="!loading && items.length" class="pr-cards">
    <div class="pr-head">
      <span>📝 做题记录</span>
      <span class="pr-tip">我做过的历年真题 / 模拟试卷 · 共 {{ totalAnswered }} 道</span>
    </div>

    <div class="pr-grid">
      <div v-for="r in items" :key="'yr-' + String(r.year) + '-' + r.source_type" class="pr-card">
        <div class="pr-row">
          <span class="pr-year">{{ label(r) }}</span>
          <span class="pr-badge" :class="r.source_type === 'mock' ? 'mock' : 'real'">
            {{ r.source_type === 'mock' ? '模拟试卷' : '真题' }}
          </span>
        </div>
        <div class="pr-stats">
          <div class="stat">
            <div class="num">{{ r.total }}</div>
            <div class="lab">做题数量</div>
          </div>
          <div class="stat-divider"></div>
          <div class="stat">
            <div class="num">{{ r.correct }}</div>
            <div class="lab">答对题目</div>
          </div>
          <div class="stat-divider"></div>
          <div class="stat">
            <div class="num">{{ rate(r) }}%</div>
            <div class="lab">正确率</div>
          </div>
        </div>
        <div class="pr-times">
          <span>🕐 做题时间 {{ fmtTime(r.started || r.ended) }}</span>
          <span>🏁 结束时间 {{ fmtTime(r.ended) }}</span>
        </div>
        <div class="pr-actions">
          <el-button size="small" @click="openReport(r)">📄 成绩单</el-button>
          <el-button
            size="small"
            type="danger"
            plain
            :loading="deletingKey === 'yr-' + String(r.year) + '-' + r.source_type"
            @click="doDelete(r)"
          >删除</el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pr-cards {
  /* 与「历年真题」区同宽居中，卡片宽度一致 */
  max-width: 860px;
  margin: 0 auto;
}
.pr-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 15px;
  font-weight: 700;
  color: #303133;
  margin: 24px 0 12px;
}
.pr-tip {
  font-size: 12px;
  color: #909399;
  font-weight: normal;
}
.pr-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 16px;
}
.pr-card {
  padding: 18px 20px;
  border: 1px solid #ebeef5;
  border-radius: 12px;
  background: #fff;
  transition: all 0.2s;
}
.pr-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(31, 45, 61, 0.1);
  border-color: #c6e2ff;
}
.pr-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.pr-year {
  font-size: 18px;
  font-weight: 700;
  color: #303133;
}
.pr-badge {
  font-size: 12px;
  color: #409eff;
  background: #ecf5ff;
  padding: 2px 10px;
  border-radius: 999px;
}
.pr-badge.mock {
  color: #e6a23c;
  background: #fdf6ec;
}
.pr-stats {
  margin: 16px 0 10px;
  display: flex;
  align-items: center;
  gap: 16px;
}
.stat {
  flex: 1;
  text-align: center;
}
.stat .num {
  font-size: 24px;
  font-weight: 700;
  color: #409eff;
  line-height: 1.2;
}
.stat .lab {
  margin-top: 4px;
  font-size: 12px;
  color: #909399;
}
.stat-divider {
  width: 1px;
  height: 36px;
  background: #ebeef5;
}
.pr-times {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 10px 0 4px;
  padding: 8px 10px;
  background: #f5f7fa;
  border-radius: 8px;
  font-size: 12px;
  color: #606266;
}
.pr-actions {
  display: flex;
  justify-content: flex-end;
}
</style>
