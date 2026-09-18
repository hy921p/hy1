<script setup lang="ts">
// 年份真题/模拟试卷考：计时倒计时 + 答题卡 + 逐题作答 + 交卷自动判分（每题 1 分）
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { real, examSubmit, examReport } from '../../api/question'

interface ExamQuestion {
  id: number
  content: string
  category: string
  year: string
  reference_answer?: string
  detail?: string
  user_answer?: string
}

interface Option { letter: string; text: string }

const route = useRoute()
const router = useRouter()
const year = route.params.year as string
// 三种模式：模拟考（/questions/mock/:year）/ 真题考（/questions/real/:year）/ 成绩单回顾（/questions/score-report/:year）
const isReport = route.path.includes('/questions/score-report')
const sourceType = isReport
  ? route.query.source === 'mock'
    ? 'mock'
    : 'real'
  : route.path.includes('/questions/mock')
    ? 'mock'
    : 'real'
const isMock = sourceType === 'mock'
const paperLabel = isMock
  ? (route.query.label as string) || `${year} 年模拟试卷`
  : isReport
    ? `${year} 年中国移动真题`
    : ''

const PER_SEC = 60 // 每题 60 秒

const loading = ref(true)
const questions = ref<ExamQuestion[]>([])
const answers = ref<Record<number, string>>({}) // 题序 -> 所选字母
const current = ref(0)
const secondsLeft = ref(0)
const submitted = ref(false)
const saving = ref(false)
const savedInfo = ref<{ gainedPoints: number; newRecords: number } | null>(null)
const saveError = ref('')
// 本次做题开始时刻（进卷时记录，交卷随 exam-submit 上传 → 做题记录「做题时间」）
const startedAt = ref<number | null>(null)
let timer: number | null = null

/** 解析题干与选项（内容格式：题干\nA. xxx\nB. xxx\nC. xxx\nD. xxx，可含 E 选项） */
function parseContent(content: string): { stem: string; options: Option[] } {
  const lines = content.split('\n').map((l) => l.trim()).filter(Boolean)
  const optRe = /^([A-E])[\.．、]\s*(.*)$/
  const options: Option[] = []
  const pre: string[] = []
  for (const line of lines) {
    const m = line.match(optRe)
    if (m) options.push({ letter: m[1], text: m[2] })
    else if (options.length) options[options.length - 1].text += '\n' + line
    else pre.push(line)
  }
  return { stem: pre.join('\n'), options }
}

const parsed = computed(() =>
  questions.value.map((q) => ({ ...parseContent(q.content), detail: q.detail })),
)
const currentParsed = computed(() => parsed.value[current.value] || { stem: '', options: [], detail: '' })

const totalCount = computed(() => questions.value.length)
const answeredCount = computed(() => Object.keys(answers.value).length)

const refLetter = (i: number) => (questions.value[i]?.reference_answer || '').trim().toUpperCase()

const correctCount = computed(() =>
  questions.value.reduce((acc, _q, i) => acc + (answers.value[i] === refLetter(i) ? 1 : 0), 0),
)
const wrongCount = computed(() => answeredCount.value - correctCount.value)
const skipCount = computed(() => totalCount.value - answeredCount.value)
const score = computed(() => correctCount.value) // 每题 1 分
const progress = computed(() => (totalCount.value ? Math.round((answeredCount.value / totalCount.value) * 100) : 0))

const isCurrentCorrect = computed(() => answers.value[current.value] === refLetter(current.value))

function fmt(s: number) {
  const m = Math.floor(s / 60).toString().padStart(2, '0')
  const ss = (s % 60).toString().padStart(2, '0')
  return `${m}:${ss}`
}

function startTimer() {
  clearInterval(timer ?? undefined)
  timer = window.setInterval(() => {
    if (submitted.value) return
    secondsLeft.value -= 1
    if (secondsLeft.value <= 0) {
      secondsLeft.value = 0
      clearInterval(timer ?? undefined)
      finish(true)
    }
  }, 1000)
}

function pick(letter: string) {
  if (submitted.value) return
  answers.value[current.value] = letter
}

function sheetState(i: number) {
  if (submitted.value) {
    const a = answers.value[i]
    if (!a) return 'skip'
    return a === refLetter(i) ? 'correct' : 'wrong'
  }
  if (answers.value[i]) return 'answered'
  return 'idle'
}

function optClass(letter: string) {
  if (!submitted.value) return answers.value[current.value] === letter ? 'selected' : ''
  const ref = refLetter(current.value)
  const picked = answers.value[current.value]
  if (letter === ref) return 'right'
  if (picked && letter === picked && letter !== ref) return 'wrong'
  return ''
}

function doSubmit() {
  if (submitted.value) return
  const left = totalCount.value - answeredCount.value
  ElMessageBox.confirm(
    left > 0 ? `还有 ${left} 题未作答，确定交卷？` : '全部题目已作答，确定交卷？',
    '交卷确认',
    { type: 'warning', confirmButtonText: '交卷', cancelButtonText: '继续作答' },
  )
    .then(() => finish(false))
    .catch(() => {})
}

async function finish(auto: boolean) {
  submitted.value = true
  if (timer) clearInterval(timer)
  if (auto) ElMessage.warning('时间到，已自动交卷')
  // 交卷即保存并直接返回题库页（不做成绩停留），保存失败不影响返回
  await persistResult()
  goBack()
}

/** 交卷后把作答批量落库（答对→答题记录+成长值，答错→错题本）；失败不阻断本地判分 */
async function persistResult() {
  const payload = {
    year,
    answers: questions.value
      .map((q, i) => ({ questionId: q.id, answer: answers.value[i] }))
      .filter((x) => x.answer),
    startedAt: startedAt.value ?? undefined,
  }
  if (!payload.answers.length) return
  saving.value = true
  saveError.value = ''
  try {
    const res = await examSubmit(payload)
    savedInfo.value = { gainedPoints: res.gainedPoints, newRecords: res.newRecords }
  } catch {
    saveError.value = '本次成绩未能保存，答题记录未同步（本地判分不受影响）'
  } finally {
    saving.value = false
  }
}

function restart() {
  answers.value = {}
  current.value = 0
  submitted.value = false
  saving.value = false
  savedInfo.value = null
  saveError.value = ''
  secondsLeft.value = totalCount.value * PER_SEC
  startedAt.value = Date.now() // 再练一次视为新一轮做题
  startTimer()
}

function goBack() {
  // 成绩单回顾 → 回历年真题；正常交卷 → 跳到做题记录 tab，让用户立即看到本次记录
  if (isReport) {
    router.push(isMock ? '/questions?tab=mock' : '/questions')
  } else {
    router.push('/questions?tab=records')
  }
}

/** 成绩单「再练一次」：进入该套试卷的全新模拟考 */
function retryPaper() {
  router.push({
    path: isMock ? `/questions/mock/${year}` : `/questions/real/${year}`,
    query: isMock ? { label: paperLabel } : {},
  })
}

async function load() {
  loading.value = true
  try {
    if (isReport) {
      // 成绩单回顾：拉全卷题目 + 我的答案 + 正确答案 + 解析，直接进入已交卷的回顾态
      const data = await examReport({ year, sourceType })
      questions.value = data.list.map((q) => ({
        id: q.id,
        content: q.content,
        category: q.category,
        year: String(year),
        reference_answer: q.reference_answer || undefined,
        detail: q.detail || undefined,
        user_answer: q.user_answer || undefined,
      }))
      answers.value = {}
      questions.value.forEach((q, i) => {
        if (q.user_answer) answers.value[i] = q.user_answer as string
      })
      submitted.value = true
      saving.value = false
      saveError.value = ''
    } else {
      const data = await real({ page: 1, pageSize: 500, year, sourceType })
      questions.value = data.list
      secondsLeft.value = data.list.length * PER_SEC
      startedAt.value = Date.now() // 记录本次做题开始时刻
    }
  } catch {
    /* http 层已提示 */
  } finally {
    loading.value = false
    if (!isReport) startTimer()
  }
}

onBeforeRouteLeave((_to, _from, next) => {
  if (submitted.value || answeredCount.value === 0) return next()
  ElMessageBox.confirm('考试尚未交卷，离开将丢失作答记录，确定离开？', '离开确认', {
    type: 'warning',
    confirmButtonText: '离开',
    cancelButtonText: '继续考试',
  })
    .then(() => next())
    .catch(() => next(false))
})

onMounted(load)
onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})
</script>

<template>
  <div v-loading="loading" class="exam-page">
    <template v-if="!loading && questions.length">
      <!-- 顶栏 -->
      <div class="topbar">
        <el-button text @click="goBack">← 返回题库</el-button>
        <span class="title">{{ isReport ? `${paperLabel} · 成绩单` : isMock ? `${paperLabel} · 中国移动` : `${year} 年中国移动真题` }}</span>
        <div v-if="!isReport" class="timer" :class="{ warn: secondsLeft <= 60 }">⏱ {{ fmt(secondsLeft) }}</div>
        <el-button v-if="!submitted" type="primary" @click="doSubmit">交卷</el-button>
        <el-button v-else type="primary" plain @click="goBack">返回题库</el-button>
      </div>

      <div class="progress-bar"><div class="bar" :style="{ width: progress + '%' }"></div></div>

      <div class="body">
        <!-- 题目区 -->
        <div class="question-area">
          <div class="q-meta">
            <span class="q-no">第 {{ current + 1 }} / {{ totalCount }} 题</span>
            <el-tag v-if="questions[current].category" size="small" effect="plain">{{ questions[current].category }}</el-tag>
            <el-tag v-if="submitted" size="small" :type="isCurrentCorrect ? 'success' : 'danger'" effect="dark">
              {{ isCurrentCorrect ? '答对' : answers[current] ? '答错' : '未作答' }}
            </el-tag>
          </div>

          <div class="stem">{{ currentParsed.stem }}</div>

          <div class="options">
            <div
              v-for="opt in currentParsed.options"
              :key="opt.letter"
              class="option"
              :class="optClass(opt.letter)"
              @click="pick(opt.letter)"
            >
              <span class="opt-letter">{{ opt.letter }}</span>
              <span class="opt-text">{{ opt.text }}</span>
            </div>
          </div>

          <div v-if="submitted" class="review">
            <span class="rv-item">你的答案：<b :class="isCurrentCorrect ? 'ok' : 'bad'">{{ answers[current] || '未作答' }}</b></span>
            <span class="rv-item">正确答案：<b class="ok">{{ refLetter(current) }}</b></span>
          </div>

          <div v-if="submitted && currentParsed.detail" class="detail-box">
            <div class="db-label">📖 答案解析</div>
            <div class="db-text">{{ currentParsed.detail }}</div>
          </div>
        </div>

        <!-- 答题卡 -->
        <div class="sheet">
          <div class="sheet-head">
            <span>答题卡</span>
            <span class="legend">
              <i class="dot now"></i>当前
              <i class="dot ok"></i>已答 {{ answeredCount }}
              <template v-if="submitted">
                <i class="dot right"></i>对
                <i class="dot wrong"></i>错
                <i class="dot skip"></i>空
              </template>
            </span>
          </div>
          <div class="sheet-grid">
            <button
              v-for="(q, i) in questions"
              :key="q.id"
              class="cell"
              :class="[sheetState(i), { now: i === current }]"
              @click="current = i"
            >{{ i + 1 }}</button>
          </div>

          <div v-if="submitted" class="score-box">
            <div class="score-num">{{ score }}<span>分</span></div>
            <div class="score-detail">
              共 {{ totalCount }} 题 · 答对 {{ correctCount }} · 答错 {{ wrongCount }} · 未答 {{ skipCount }}
            </div>
            <div v-if="!isReport && saving" class="score-sync"><span class="spinner"></span>正在同步答题记录…</div>
            <div v-else-if="!isReport && savedInfo" class="score-sync ok">
              ✓ 已保存：答题记录 {{ savedInfo.newRecords }} 条，答对题累计 +{{ savedInfo.gainedPoints }} 成长值
            </div>
            <div v-else-if="!isReport && saveError" class="score-sync bad">⚠ {{ saveError }}</div>
            <div class="score-actions">
              <el-button @click="isReport ? retryPaper() : restart()">再练一次</el-button>
              <el-button type="primary" @click="goBack">返回题库</el-button>
            </div>
          </div>
        </div>
      </div>

      <!-- 底部导航 -->
      <div v-if="!submitted" class="nav-bar">
        <el-button :disabled="current === 0" @click="current--">上一题</el-button>
        <span class="cur">{{ current + 1 }} / {{ totalCount }}</span>
        <el-button v-if="current < totalCount - 1" type="primary" @click="current++">下一题</el-button>
        <el-button v-else type="primary" @click="doSubmit">交卷</el-button>
      </div>
    </template>

    <el-empty v-else-if="!loading" description="该年份暂无题目" />
  </div>
</template>

<style scoped>
.exam-page {
  max-width: 980px;
  margin: 0 auto;
}
.topbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 4px 12px;
}
.topbar .title {
  flex: 1;
  font-size: 16px;
  font-weight: 700;
  color: #303133;
}
.timer {
  font-size: 15px;
  font-weight: 600;
  color: #409eff;
  font-variant-numeric: tabular-nums;
}
.timer.warn {
  color: #f56c6c;
  animation: blink 1s step-start infinite;
}
@keyframes blink {
  50% { opacity: 0.35; }
}
.progress-bar {
  height: 4px;
  border-radius: 2px;
  background: #ebeef5;
  overflow: hidden;
  margin-bottom: 14px;
}
.progress-bar .bar {
  height: 100%;
  background: linear-gradient(90deg, #409eff, #67c23a);
  transition: width 0.3s;
}
.body {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}
.question-area {
  flex: 1;
  min-width: 0;
  padding: 18px 20px;
  border: 1px solid #ebeef5;
  border-radius: 12px;
  background: #fff;
}
.q-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}
.q-no {
  font-size: 13px;
  color: #909399;
}
.stem {
  font-size: 15px;
  color: #303133;
  line-height: 1.8;
  white-space: pre-wrap;
}
.options {
  margin-top: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.option {
  display: flex;
  gap: 10px;
  padding: 12px 14px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;
  font-size: 14px;
  line-height: 1.6;
  color: #303133;
}
.option:hover {
  border-color: #409eff;
  background: #f0f7ff;
}
.option.selected {
  border-color: #409eff;
  background: #ecf5ff;
  box-shadow: 0 0 0 1px #409eff inset;
}
.option .opt-letter {
  font-weight: 700;
  color: #409eff;
  flex-shrink: 0;
}
.option.right {
  border-color: #67c23a;
  background: #f0f9eb;
}
.option.right .opt-letter {
  color: #67c23a;
}
.option.wrong {
  border-color: #f56c6c;
  background: #fef0f0;
}
.option.wrong .opt-letter {
  color: #f56c6c;
}
.review {
  margin-top: 14px;
  padding: 12px 14px;
  border-radius: 8px;
  background: #f5f7fa;
  display: flex;
  gap: 20px;
  font-size: 13px;
}
.rv-item b.ok { color: #67c23a; }
.rv-item b.bad { color: #f56c6c; }
.detail-box {
  margin-top: 12px;
  padding: 12px 14px;
  border-radius: 8px;
  background: #fdf6ec;
  border: 1px solid #fae6c8;
}
.db-label {
  font-size: 13px;
  font-weight: 600;
  color: #b88230;
  margin-bottom: 6px;
}
.db-text {
  font-size: 13px;
  color: #606266;
  line-height: 1.8;
  white-space: pre-wrap;
}
.sheet {
  width: 260px;
  flex-shrink: 0;
  padding: 16px;
  border: 1px solid #ebeef5;
  border-radius: 12px;
  background: #fff;
  position: sticky;
  top: 12px;
}
.sheet-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 12px;
}
.legend {
  font-size: 11px;
  font-weight: normal;
  color: #909399;
  display: flex;
  align-items: center;
  gap: 5px;
}
.legend .dot {
  width: 10px;
  height: 10px;
  border-radius: 3px;
  display: inline-block;
  margin-left: 3px;
}
.legend .dot.now { background: #409eff; }
.legend .dot.ok { background: #67c23a; }
.legend .dot.right { background: #67c23a; }
.legend .dot.wrong { background: #f56c6c; }
.legend .dot.skip { background: #dcdfe6; }
.sheet-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 6px;
}
.cell {
  height: 32px;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  background: #fff;
  font-size: 13px;
  color: #606266;
  cursor: pointer;
  transition: all 0.15s;
}
.cell:hover {
  border-color: #409eff;
}
.cell.answered {
  background: #67c23a;
  border-color: #67c23a;
  color: #fff;
}
.cell.now {
  border-color: #409eff;
  box-shadow: 0 0 0 1px #409eff inset;
}
.cell.correct {
  background: #67c23a;
  border-color: #67c23a;
  color: #fff;
}
.cell.wrong {
  background: #f56c6c;
  border-color: #f56c6c;
  color: #fff;
}
.cell.skip {
  background: #f4f4f5;
  border-color: #dcdfe6;
  color: #c0c4cc;
}
.score-box {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px dashed #ebeef5;
  text-align: center;
}
.score-num {
  font-size: 40px;
  font-weight: 700;
  color: #409eff;
  line-height: 1.1;
}
.score-num span {
  font-size: 14px;
  color: #909399;
  margin-left: 4px;
}
.score-detail {
  margin: 8px 0 12px;
  font-size: 12px;
  color: #909399;
}
.score-sync {
  margin: 0 0 12px;
  font-size: 12px;
  color: #909399;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}
.score-sync.ok {
  color: #67c23a;
}
.score-sync.bad {
  color: #e6a23c;
}
.score-sync .spinner {
  width: 12px;
  height: 12px;
  border: 2px solid #c6e2ff;
  border-top-color: #409eff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
.score-actions {
  display: flex;
  gap: 8px;
}
.score-actions .el-button {
  flex: 1;
  margin-left: 0;
}
.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 14px;
  padding: 10px 4px;
}
.nav-bar .cur {
  font-size: 14px;
  color: #909399;
}
@media (max-width: 760px) {
  .body {
    flex-direction: column;
  }
  .sheet {
    width: 100%;
    position: static;
  }
}
</style>
