<script setup lang="ts">
// 错题本（参考「乾途国培」/wrong-book）：来源分组 + 筛选栏 + 左列表 + 右详情
// 分组：历年真题 / 模拟试卷 / 今日推荐（服务层按今日推荐池 + source_type 归组并返回计数）
// 详情：题干在上、ABCD 选项各占一行，下方直接显示 我的答案/正确答案 与解析（无「查看解析」折叠）
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { wrong, markMastered } from '../api/question'
import type { WrongRow } from '../api/question'

const router = useRouter()

const items = ref<WrongRow[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 8
const loading = ref(false)
// 分组计数（服务端整组统计，不随分页/筛选变化）
const countsTotal = ref(0)
const groupCounts = ref<{ key: 'real' | 'mock' | 'today'; label: string; count: number }[]>([])

// 筛选条件：来源分组 + 出错频次 + 题干搜索
const group = ref<'' | 'real' | 'mock' | 'today'>('')
const filterWrongCount = ref<'' | 1 | 2 | 3>('')
const keyword = ref('')
const selectedId = ref<number | null>(null)
const mastering = ref(false)

/** 来源分组 Tab（全部 + 三组，均带数量角标） */
const GROUPS = computed(() => [
  { key: '' as const, label: '全部', count: countsTotal.value },
  ...groupCounts.value,
])

/** 当前详情题：优先选中项，失效时回退第一条 */
const current = computed(
  () => items.value.find((i) => i.question_id === selectedId.value) || items.value[0] || null,
)

/** 列表空文案：有筛选/分组说明是筛没结果，否则才是真没有错题 */
const emptyDesc = computed(() => {
  if (group.value !== '' || filterWrongCount.value !== '' || keyword.value !== '') return '当前筛选无结果'
  return '暂无错题，继续保持！'
})

/** 难度映射（与 QuestionCard 一致） */
const DIFF_MAP: Record<number, { text: string; type: 'success' | 'warning' | 'danger' }> = {
  1: { text: '简单', type: 'success' },
  2: { text: '中等', type: 'warning' },
  3: { text: '困难', type: 'danger' },
}
function diffText(d: string) {
  return DIFF_MAP[Number(d)]?.text || `Lv.${d}`
}
function diffType(d: string) {
  return DIFF_MAP[Number(d)]?.type || 'info'
}

/** YYYY-MM-DD → 2026/8/24（参考站格式，去掉前导零） */
function fmtDate(s: string) {
  if (!s) return ''
  const [y, m, d] = s.slice(0, 10).split('-')
  return `${y}/${Number(m)}/${Number(d)}`
}

/** 解析题干与选项（content 格式：题干\nA. xxx\nB. xxx\nC. xxx\nD. xxx，可含 E/F） */
interface WrongOption {
  letter: string
  text: string
}
function parseContent(content: string): { stem: string; options: WrongOption[] } {
  const lines = (content || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  const optRe = /^([A-F])[\.．、]\s*(.*)$/
  const options: WrongOption[] = []
  const pre: string[] = []
  for (const line of lines) {
    const m = line.match(optRe)
    if (m) options.push({ letter: m[1], text: m[2] })
    else if (options.length) options[options.length - 1].text += '\n' + line
    else pre.push(line)
  }
  return { stem: pre.join('\n'), options }
}

function optionText(letter: string) {
  if (!letter) return ''
  const opt = parsedCurrent.value.options.find((o) => o.letter === letter.toUpperCase())
  return opt ? opt.text : ''
}

/** 当前详情题题干拆分（列表缩略 + 右侧详情共用） */
const parsedCurrent = computed(() =>
  current.value ? parseContent(current.value.content) : { stem: '', options: [] },
)
const myLetter = computed(() =>
  current.value?.user_answer ? String(current.value.user_answer).trim().toUpperCase() : '',
)
const refLetter = computed(() =>
  current.value?.reference_answer ? String(current.value.reference_answer).trim().toUpperCase() : '',
)
/** 我的答案 / 正确答案展示：字母 + 对应选项文字 */
const myAnswerText = computed(() => myLetter.value + (optionText(myLetter.value) ? `  ${optionText(myLetter.value)}` : ''))
const refAnswerText = computed(() => refLetter.value + (optionText(refLetter.value) ? `  ${optionText(refLetter.value)}` : ''))

async function load(p = 1) {
  loading.value = true
  try {
    const data = await wrong({
      page: p,
      pageSize,
      group: group.value || undefined,
      wrongCount: filterWrongCount.value || undefined,
      keyword: keyword.value.trim() || undefined,
    })
    items.value = data.list
    total.value = data.total
    page.value = data.page
    if (data.counts?.length) {
      countsTotal.value = data.counts.reduce((s, c) => s + c.count, 0)
      groupCounts.value = data.counts
    }
    // 选中项失效时自动回到第一条
    if (!data.list.some((i) => i.question_id === selectedId.value)) {
      selectedId.value = data.list[0]?.question_id ?? null
    }
  } catch {
    /* http 层已提示 */
  } finally {
    loading.value = false
  }
}

/** 点击分组下拉 / 筛选按钮：回到第 1 页按当前条件重拉 */
function onSearch() {
  load(1)
}

async function doMastered() {
  const row = current.value
  if (!row) return
  mastering.value = true
  try {
    await markMastered(row.question_id)
    ElMessage.success('已标记掌握，已移出错题本')
    const nextKeep = items.value.filter((i) => i.question_id !== row.question_id)[0]?.question_id ?? null
    await load(page.value)
    // 保留下一项选中（load 内部会在失效时落到第一条）
    if (nextKeep && items.value.some((i) => i.question_id === nextKeep)) selectedId.value = nextKeep
  } catch {
    /* http 层已提示 */
  } finally {
    mastering.value = false
  }
}

function goDetail() {
  const row = current.value
  if (row) router.push(`/questions/detail/${row.question_id}`)
}

function onPageChange(p: number) {
  load(p)
}

onMounted(() => load())
</script>

<template>
  <!-- 无错题且未筛选时整块不显示；有筛选条件时保持显示（下方提示"当前筛选无结果"可重置） -->
  <div v-if="loading || total > 0 || filterWrongCount !== '' || keyword !== '' || group !== ''" class="wrong-questions">
    <div class="wb-body">
      <!-- 左：错题列表 -->
      <div class="wb-left">
        <div class="list-head">
          <span class="lh-title">错题列表</span>
          <span class="lh-count">{{ total }}</span>
          <!-- 分类 + 出错频次筛选：小尺寸，一起右对齐放在「错题列表」标题右侧同一行（选中/清空即刷新） -->
          <el-select
            v-model="group"
            size="small"
            class="lg-select"
            @change="onSearch"
          >
            <el-option
              v-for="g in GROUPS"
              :key="g.key || 'all'"
              :value="g.key"
              :label="`${g.label}（${g.count}）`"
            />
          </el-select>
          <el-select
            v-model="filterWrongCount"
            placeholder="出错频次"
            clearable
            size="small"
            class="wc-select"
            @change="onSearch"
          >
            <el-option label="1 次" :value="1" />
            <el-option label="2 次" :value="2" />
            <el-option label="3 次及以上" :value="3" />
          </el-select>
        </div>
        <div v-loading="loading" class="list-wrap">
          <div
            v-for="row in items"
            :key="row.id"
            class="list-item"
            :class="{ active: row.question_id === current?.question_id }"
            @click="selectedId = row.question_id"
          >
            <!-- 列表只显示题干（选项已剥离，另起行放在右侧详情里） -->
            <div class="li-stem">{{ parseContent(row.content).stem }}</div>
            <div class="li-meta">
              <span class="li-date">上次答错: {{ fmtDate(row.last_wrong_at) }}</span>
              <span class="li-wc">{{ row.wrong_count }} 次做错</span>
            </div>
          </div>
          <el-empty
            v-if="!loading && !items.length"
            :description="emptyDesc"
            :image-size="72"
          />
        </div>
        <!-- 题干搜索：置于错题列表正下方（回车/清空即筛，无搜索按钮） -->
        <div class="wb-search">
          <el-input
            v-model="keyword"
            placeholder="题干搜索..."
            clearable
            size="small"
            class="ws-input"
            @keyup.enter="onSearch"
            @clear="onSearch"
          />
        </div>
        <div class="pager">
          <el-pagination
            v-if="total > pageSize"
            small
            :current-page="page"
            :page-size="pageSize"
            :total="total"
            layout="prev, pager, next"
            @current-change="onPageChange"
          />
        </div>
      </div>

      <!-- 右：详情 -->
      <div class="wb-right">
        <template v-if="current">
          <!-- 题干（含选项单独成行） -->
          <div class="detail-stem">{{ parsedCurrent.stem || current.content }}</div>
          <div v-if="parsedCurrent.options.length" class="detail-options">
            <div
              v-for="opt in parsedCurrent.options"
              :key="opt.letter"
              class="opt"
              :class="{ mine: opt.letter === myLetter, correct: opt.letter === refLetter }"
            >
              <span class="opt-letter">{{ opt.letter }}</span>
              <span class="opt-text">{{ opt.text }}</span>
            </div>
          </div>
          <div class="detail-tags">
            <el-tag v-if="current.category" size="small" effect="plain">{{ current.category }}</el-tag>
            <el-tag v-if="current.position" size="small" effect="plain" type="warning">{{ current.position }}</el-tag>
            <el-tag v-if="current.region" size="small" effect="plain" type="warning">{{ current.region }}</el-tag>
            <el-tag v-if="current.difficulty" size="small" effect="plain" :type="diffType(current.difficulty)">{{ diffText(current.difficulty) }}</el-tag>
          </div>

          <!-- 我的答案 / 正确答案（直接展示，不再折叠） -->
          <div class="ans-row">
            <div class="ans-item">
              <span class="ans-label">我的答案</span>
              <span class="ans-val mine-val">{{ myLetter ? myAnswerText : '未作答' }}</span>
            </div>
            <div class="ans-item">
              <span class="ans-label">正确答案</span>
              <span class="ans-val ref-val">{{ refLetter || '暂未收录' }}</span>
            </div>
          </div>

          <!-- 解析（直接显示，无「查看解析」折叠） -->
          <div class="detail-analysis">
            <div class="analysis-label">📖 解析</div>
            <div v-if="current.detail" class="analysis-text">{{ current.detail }}</div>
            <div v-else class="analysis-text dim">该题暂未收录解析</div>
          </div>

          <div class="ai-box" v-if="current.ai_analysis">
            <div class="ai-label">🤖 AI 错题解析</div>
            <div class="ai-text">{{ current.ai_analysis }}</div>
          </div>

          <div class="detail-actions">
            <el-button type="primary" @click="goDetail">单题重练</el-button>
            <el-button :loading="mastering" @click="doMastered">标记掌握（移出本子）</el-button>
          </div>
        </template>
        <el-empty v-else-if="!loading && !items.length" description="左侧无错题" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.wrong-questions {
  width: 100%;
  /* 与上方入口卡片之间保持一点距离，避免列表/右侧题目贴得太紧 */
  margin-top: 25px;
}
/* 来源分类下拉：小尺寸，右对齐与「错题列表」标题同一行 */
.lg-select {
  width: 128px;
  flex: 0 0 auto;
  margin-left: auto;
}
/* 出错频次下拉：与分类下拉同排，靠右一组 */
.wc-select {
  width: 104px;
  flex: 0 0 auto;
}
/* 题干搜索：错题列表正下方一行（回车/清空即筛） */
.wb-search {
  display: flex;
  align-items: center;
  margin: 10px 2px 0;
}
.ws-input {
  flex: 1;
  min-width: 0;
}
.wb-body {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}
/* 左列表：宽栏（容纳标题右侧的分类 + 出错频次两个下拉），白底卡片 */
.wb-left {
  width: 390px;
  flex-shrink: 0;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 14px;
  display: flex;
  flex-direction: column;
}
.list-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  padding: 0 2px;
}
.lh-title {
  font-size: 15px;
  font-weight: 700;
  color: #17243b;
}
.lh-count {
  min-width: 22px;
  height: 22px;
  padding: 0 7px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 11px;
  background: #2367d1;
  color: #fff;
  font-size: 12px;
  font-weight: 600;
}
.list-wrap {
  flex: 1;
  min-height: 120px;
  overflow-y: auto;
  max-height: 560px;
}
.list-item {
  padding: 12px 12px;
  border: 1px solid transparent;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
  margin-bottom: 6px;
}
.list-item:hover {
  background: #f5f7fb;
}
.list-item.active {
  background: #ecf3ff;
  border-color: #2367d1;
}
.li-stem {
  font-size: 14px;
  color: #303133;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.list-item.active .li-stem {
  color: #1d4fae;
}
.li-meta {
  margin-top: 6px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.li-date {
  font-size: 12px;
  color: #909399;
}
.li-wc {
  font-size: 12px;
  color: #e8622d;
  background: #fdf0e8;
  border-radius: 4px;
  padding: 1px 6px;
  white-space: nowrap;
}
.pager {
  display: flex;
  justify-content: center;
  margin-top: 8px;
}
/* 右详情：弹性撑满 */
.wb-right {
  flex: 1;
  min-width: 0;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 22px 24px;
}
.detail-stem {
  font-size: 16px;
  font-weight: 500;
  color: #17243b;
  line-height: 1.8;
}
/* 选项：各自独立一行（与题干分开） */
.detail-options {
  margin-top: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.opt {
  display: flex;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid #e8ecf2;
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.7;
  color: #334155;
}
.opt .opt-letter {
  font-weight: 700;
  color: #64748b;
  flex-shrink: 0;
}
.opt.mine {
  border-color: #f3c1c1;
  background: #fef0f0;
}
.opt.mine .opt-letter {
  color: #f56c6c;
}
.opt.correct {
  border-color: #cfe9cf;
  background: #f0f9eb;
}
.opt.correct .opt-letter {
  color: #67c23a;
}
.opt-text {
  white-space: pre-wrap;
}
.detail-tags {
  margin: 14px 0 14px;
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
/* 我的答案 / 正确答案 */
.ans-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 14px;
}
.ans-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px;
  border-radius: 8px;
  background: #f8fafc;
  border: 1px solid #eef2f7;
}
.ans-label {
  font-size: 12px;
  color: #94a3b8;
}
.ans-val {
  font-size: 14px;
  font-weight: 600;
  word-break: break-word;
}
.mine-val {
  color: #ef4444;
}
.ref-val {
  color: #16a34a;
}
/* 解析直接展示 */
.detail-analysis {
  margin-bottom: 14px;
  padding: 12px 14px;
  border-radius: 10px;
  background: #fdf6ec;
  border: 1px solid #fae6c8;
}
.analysis-label {
  font-size: 13px;
  font-weight: 600;
  color: #b88230;
  margin-bottom: 6px;
}
.analysis-text {
  font-size: 13px;
  color: #606266;
  line-height: 1.8;
  white-space: pre-wrap;
}
.analysis-text.dim {
  color: #c0c4cc;
}
.ai-box {
  margin: 14px 0;
  padding: 14px 16px;
  border-radius: 10px;
  background: #f5f7fa;
  border: 1px solid #e4e7ed;
}
.ai-label {
  font-size: 13px;
  font-weight: 600;
  color: #475569;
  margin-bottom: 6px;
}
.ai-text {
  font-size: 13px;
  color: #606266;
  line-height: 1.8;
  white-space: pre-wrap;
}
.detail-actions {
  margin-top: 18px;
  display: flex;
  gap: 10px;
}
@media (max-width: 860px) {
  .wb-body {
    flex-direction: column;
  }
  .wb-left {
    width: 100%;
  }
  /* 窄屏标题行放不下两个下拉时允许折行（下拉仍靠右） */
  .list-head {
    flex-wrap: wrap;
    row-gap: 6px;
  }
  .ans-row {
    grid-template-columns: 1fr;
  }
}
</style>
