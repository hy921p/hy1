<script setup lang="ts">
// 题目详情：题干 + 单选选项作答（选字母，自动判分）→ 提交后展示参考答案 + 答案解析 + 收藏
// 「再练一题」会请求今日推荐池内的新题并跳转，保证与本次会话练过的题不重复
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { detail, submit, favorite, nextQuestion } from '../../api/question'

interface Option {
  letter: string
  text: string
}

const route = useRoute()
const router = useRouter()

// 单题练习入口可能直连 /questions/detail/:id（今日推荐/错题本单题重练），题目 id 以路由参数为准
const qid = computed(() => String(route.params.id))

const q = ref<any>(null)
const loading = ref(true)
const selected = ref('') // 所选选项字母
const answer = ref('') // 无选项时的手输兜底
const submitting = ref(false)
const result = ref<any>(null)
const favoriting = ref(false)
const nexting = ref(false)

// 模块级会话去重集合：连续点「再练一题」全程不重复（跨路由跳转/组件重挂也保留）
const sessionSeen = new Set<number>()

/** 我的作答（结果横幅展示用：选项字母或手输答案） */
const myAnswer = computed(() => (selected.value || answer.value.trim()) || '未作答')

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

const parsed = computed(() => (q.value ? parseContent(q.value.content) : { stem: '', options: [] }))
const refLetter = computed(() => (q.value?.referenceAnswer || '').trim().toUpperCase())

/** 参考答案展示：字母 + 对应选项文字 */
const refText = computed(() => {
  if (!q.value) return ''
  const letter = refLetter.value
  const opt = parsed.value.options.find((o) => o.letter === letter)
  return opt ? `${letter}. ${opt.text}` : (q.value.referenceAnswer || '')
})

function reset() {
  selected.value = ''
  answer.value = ''
  result.value = null
}

async function load() {
  loading.value = true
  try {
    q.value = await detail(qid.value)
    sessionSeen.add(Number(qid.value))
  } catch {
    /* http 层已提示 */
  } finally {
    loading.value = false
  }
}

// 路由参数变化（再练一题跳转/外部切换题目）→ 清空作答并重新加载，不依赖组件重挂
watch(qid, () => {
  reset()
  load()
})

async function doSubmit() {
  const final = selected.value || answer.value.trim()
  if (!final) {
    ElMessage.warning('请先选择答案')
    return
  }
  submitting.value = true
  try {
    // 自动判分：所选字母（或手输答案）与参考答案字母比对
    const isCorrect = final.trim().toUpperCase() === refLetter.value
    result.value = await submit(qid.value, {
      userAnswer: final,
      isCorrect,
      answerTime: 0,
    })
    ElMessage.success(result.value.isCorrect ? `回答正确，+${result.value.gainedPoints} 成长值` : '已加入错题本')
  } catch {
    /* http 层已提示 */
  } finally {
    submitting.value = false
  }
}

async function toggleFavorite() {
  favoriting.value = true
  try {
    const data = await favorite(qid.value)
    q.value.isFavorite = data.favorited
    ElMessage.success(data.favorited ? '已收藏' : '已取消收藏')
  } catch {
    /* http 层已提示 */
  } finally {
    favoriting.value = false
  }
}

/** 再练一题：从今日推荐池取一道没练过的新题（排除会话已练），跳转过去继续 */
async function nextPractice() {
  nexting.value = true
  try {
    const data = await nextQuestion([...sessionSeen])
    if (data.id == null) {
      ElMessage.info('今日可刷的新题都练完啦，明天再来继续～')
      return
    }
    sessionSeen.add(data.id)
    // 跳同路由不同参数：watch(qid) 会自动清空作答并重新加载
    router.replace(`/questions/detail/${data.id}`)
  } catch {
    /* http 层已提示 */
  } finally {
    nexting.value = false
  }
}

onMounted(load)
</script>

<template>
  <div v-loading="loading" class="page">
    <template v-if="q">
      <el-card class="card" shadow="never">
        <template #header>
          <div class="head">
            <div class="head-tags">
              <el-tag v-if="q.category" size="small" effect="plain">{{ q.category }}</el-tag>
              <el-tag v-if="q.position" size="small" type="warning" effect="plain">{{ q.position }}</el-tag>
              <el-tag v-if="q.region" size="small" type="warning" effect="plain">{{ q.region }}</el-tag>
              <el-tag v-if="q.sourceType" size="small" type="info" effect="plain">{{ q.sourceType }}</el-tag>
              <el-tag v-if="q.year" size="small" type="info" effect="plain">{{ q.year }}</el-tag>
            </div>
            <el-button :type="q.isFavorite ? 'warning' : 'default'" size="small" :loading="favoriting" @click="toggleFavorite">
              {{ q.isFavorite ? '★ 已收藏' : '☆ 收藏' }}
            </el-button>
          </div>
        </template>
        <div class="q-content">{{ parsed.stem || q.content }}</div>
      </el-card>

      <el-card v-if="!result" class="card" shadow="never">
        <template #header>✍️ 我的作答</template>
        <div v-if="parsed.options.length" class="options">
          <div
            v-for="opt in parsed.options"
            :key="opt.letter"
            class="option"
            :class="{ selected: selected === opt.letter }"
            @click="selected = opt.letter"
          >
            <span class="opt-letter">{{ opt.letter }}</span>
            <span class="opt-text">{{ opt.text }}</span>
          </div>
        </div>
        <el-input
          v-else
          v-model="answer"
          type="textarea"
          :rows="6"
          placeholder="本题暂未收录选项，请直接输入你的答案…"
        />
        <div class="actions">
          <el-button type="primary" :loading="submitting" @click="doSubmit">提交作答</el-button>
        </div>
      </el-card>

      <el-card v-else class="card" shadow="never">
        <template #header>📋 作答结果</template>
        <div class="result-banner" :class="result.isCorrect ? 'ok' : 'bad'">
          <span class="mark">{{ result.isCorrect ? '√' : '×' }}</span>
          <span class="mine">我的作答：{{ myAnswer }}</span>
        </div>
        <div class="ref-block">
          <div class="ref-label">💡 参考答案</div>
          <div class="ref-answer">{{ refText || '该题暂未收录参考答案' }}</div>
        </div>
        <div class="analysis">
          <div class="analysis-label">📖 答案解析</div>
          <div v-if="q.detail" class="analysis-text">{{ q.detail }}</div>
          <div v-else class="analysis-text dim">该题暂未收录解析</div>
        </div>
        <div v-if="result.wrong" class="ai-box">
          <div class="analysis-label">🤖 AI 错题解析</div>
          <div v-if="result.wrong.aiAnalysis" class="analysis-text">{{ result.wrong.aiAnalysis }}</div>
          <div v-else class="analysis-text dim">解析生成中，稍后可在错题本查看</div>
        </div>
        <div class="actions">
          <el-button type="primary" :loading="nexting" @click="nextPractice">再练一题（换新题）</el-button>
        </div>
      </el-card>
    </template>
  </div>
</template>

<style scoped>
.page {
  max-width: 860px;
  margin: 0 auto;
}
.card {
  margin-bottom: 16px;
}
.head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.head-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.q-content {
  font-size: 16px;
  color: #303133;
  line-height: 1.8;
  font-weight: 500;
  white-space: pre-wrap;
}
/* 单选选项 */
.options {
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
.actions {
  margin-top: 14px;
  display: flex;
  gap: 10px;
}
/* 作答结果横幅：正确绿 / 错误红，√× + 我的作答 */
.result-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
}
.result-banner.ok {
  background: #f0f9eb;
  border: 1px solid #e1f3d8;
  color: #529b2e;
}
.result-banner.bad {
  background: #fef0f0;
  border: 1px solid #fde2e2;
  color: #f56c6c;
}
.result-banner .mark {
  font-size: 22px;
  font-weight: 700;
  line-height: 1;
  flex-shrink: 0;
}
.result-banner .mine {
  font-size: 14px;
  color: #303133;
}
/* 作答结果：参考答案 + 答案解析 + AI 错题解析 */
.ref-block {
  margin-top: 14px;
  padding: 12px 14px;
  border-radius: 8px;
  background: #f0f6ff;
  border: 1px solid #dbe7ff;
}
.ref-label {
  font-size: 13px;
  font-weight: 600;
  color: #2367d1;
  margin-bottom: 6px;
}
.ref-answer {
  font-size: 14px;
  color: #303133;
  line-height: 1.9;
  white-space: pre-wrap;
}
.analysis {
  margin-top: 14px;
  padding: 12px 14px;
  border-radius: 8px;
  background: #fdf6ec;
  border: 1px solid #fae6c8;
}
.ai-box {
  margin-top: 14px;
  padding: 12px 14px;
  border-radius: 8px;
  background: #f5f7fa;
  border: 1px solid #e4e7ed;
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
</style>
