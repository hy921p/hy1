<script setup lang="ts">
// AI 模拟面试房间：SSE 流式一问一答 + 逐字渲染
import { onMounted, ref, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getInterview, messageStream, endInterview } from '../../api/interview'

const route = useRoute()
const router = useRouter()
const sessionId = String(route.params.id)

interface Msg {
  role: 'ai' | 'user'
  content: string
}

const messages = ref<Msg[]>([])
const streamingText = ref('')
const streaming = ref(false)
const errorMsg = ref('')
const input = ref('')
const finished = ref(false)
const generating = ref(false)
const toolHint = ref('') // Agent 面试官工具提示

const session = ref<any>(null)
const currentIndex = ref(0)
const totalQuestions = ref(0)
const notice = ref('')
let lastAnswer = ''

const listRef = ref<HTMLElement>()

// Agent 工具名 → 中文提示
const TOOL_LABELS: Record<string, string> = {
  retrieve_knowledge: '检索知识库',
  score_answer: '评分',
  generate_followup: '生成追问',
  next_question: '准备下一题',
  finish_interview: '收尾',
}

function toolLabel(tool: any) {
  const base = TOOL_LABELS[tool?.tool_key] || '处理'
  return tool?.status === 'error' ? `面试官${base}遇到问题` : `面试官正在${base}…`
}

function scrollBottom() {
  nextTick(() => {
    listRef.value?.scrollTo({ top: listRef.value.scrollHeight, behavior: 'smooth' })
  })
}

/** 发起一轮流式对话 */
async function streamTurn(answer: string) {
  lastAnswer = answer
  streaming.value = true
  streamingText.value = ''
  errorMsg.value = ''
  toolHint.value = ''
  try {
    await messageStream(sessionId, answer, {
      onText: (t) => {
        streamingText.value += t
        scrollBottom()
      },
      onTool: (tool) => {
        toolHint.value = toolLabel(tool)
        scrollBottom()
      },
      onDone: (data) => {
        if (streamingText.value.trim()) {
          messages.value.push({ role: 'ai', content: streamingText.value })
          streamingText.value = ''
        }
        currentIndex.value = data.currentIndex
        totalQuestions.value = data.totalQuestions
        if (!data.hasNext) finished.value = true
        scrollBottom()
      },
    })
  } catch (err: any) {
    errorMsg.value = err.message || 'AI 服务异常，请重试'
  } finally {
    streaming.value = false
    scrollBottom()
  }
}

function send() {
  const answer = input.value.trim()
  if (!answer || streaming.value) return
  messages.value.push({ role: 'user', content: answer })
  input.value = ''
  streamTurn(answer)
}

function retry() {
  streamTurn(lastAnswer)
}

/** 结束并生成报告 */
async function finish() {
  generating.value = true
  try {
    await endInterview(sessionId)
    router.push(`/exam/report/${sessionId}`)
  } catch (err: any) {
    ElMessage.error(err.message || '报告生成失败')
  } finally {
    generating.value = false
  }
}

function back() {
  router.push('/exam')
}

onMounted(async () => {
  try {
    session.value = await getInterview(sessionId)
    totalQuestions.value = session.value.totalQuestions
    currentIndex.value = session.value.currentIndex
    if (session.value.status === 3) {
      router.replace(`/exam/report/${sessionId}`)
      return
    }
    if (currentIndex.value === 0) {
      streamTurn('') // 开场白 + 第 1 题
    } else {
      notice.value = `面试进行中（已完成 ${currentIndex.value} 题），请在下方继续作答`
    }
  } catch {
    /* http 层已提示 */
  }
})
</script>

<template>
  <div class="room">
    <header class="topbar">
      <el-button text @click="back">← 返回</el-button>
      <div class="title">
        {{ session?.scenarioName || 'AI 模拟面试' }}
        <span class="pos">{{ session?.position || '' }} · {{ session?.region || '' }}</span>
      </div>
      <el-tag type="warning">第 {{ Math.min(currentIndex + 1, totalQuestions) }} / {{ totalQuestions }} 题</el-tag>
    </header>

    <div ref="listRef" class="chat-list">
      <div v-if="notice" class="system-line">{{ notice }}</div>

      <div v-for="(m, i) in messages" :key="i" class="msg-row" :class="m.role">
        <div class="avatar">{{ m.role === 'ai' ? '🤖' : '👤' }}</div>
        <div class="bubble">{{ m.content }}</div>
      </div>

      <!-- Agent 面试官工具状态轻提示 -->
      <div v-if="toolHint" class="system-line tool-hint">🤖 {{ toolHint }}</div>

      <!-- 流式输出中的 AI 文本（逐字渲染） -->
      <div v-if="streaming || streamingText" class="msg-row ai">
        <div class="avatar">🤖</div>
        <div class="bubble streaming">{{ streamingText }}<span class="cursor">▍</span></div>
      </div>

      <!-- 错误与重试 -->
      <div v-if="errorMsg" class="error-line">
        <span>⚠️ {{ errorMsg }}</span>
        <el-button type="primary" link @click="retry">重试</el-button>
      </div>

      <div v-if="finished" class="finished-line">
        <p>🎉 面试已结束，AI 正在为你的表现打分…</p>
        <el-button type="primary" size="large" :loading="generating" @click="finish">
          生成面试报告
        </el-button>
      </div>
    </div>

    <div class="input-bar">
      <el-input
        v-model="input"
        type="textarea"
        :rows="2"
        :placeholder="finished ? '面试已结束' : '输入你的回答，回车发送（Enter 发送，Shift+Enter 换行）'"
        :disabled="streaming || finished"
        resize="none"
        @keydown.enter.exact.prevent="send"
      />
      <el-button
        type="primary"
        :loading="streaming"
        :disabled="finished || !input.trim()"
        class="send-btn"
        @click="send"
      >
        发送
      </el-button>
    </div>
  </div>
</template>

<style scoped>
.room {
  height: 100vh;
  display: flex;
  flex-direction: column;
  max-width: 860px;
  margin: 0 auto;
  padding: 0 20px;
}
.topbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 0;
  border-bottom: 1px solid #ebeef5;
}
.title {
  flex: 1;
  font-size: 16px;
  font-weight: 600;
}
.pos {
  margin-left: 8px;
  font-size: 12px;
  color: #909399;
  font-weight: 400;
}
.chat-list {
  flex: 1;
  overflow-y: auto;
  padding: 20px 4px;
}
.msg-row {
  display: flex;
  gap: 10px;
  margin-bottom: 18px;
}
.msg-row.user {
  flex-direction: row-reverse;
}
.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #f0f2f5;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}
.bubble {
  max-width: 76%;
  padding: 12px 14px;
  border-radius: 12px;
  background: #f4f4f5;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
}
.msg-row.user .bubble {
  background: #409eff;
  color: #fff;
}
.bubble.streaming {
  background: #ecf5ff;
  color: #303133;
}
.cursor {
  color: #409eff;
  animation: blink 1s infinite;
}
@keyframes blink {
  50% { opacity: 0; }
}
.system-line,
.error-line,
.finished-line {
  text-align: center;
  margin: 16px 0;
  color: #909399;
  font-size: 13px;
}
.error-line span {
  color: #f56c6c;
  margin-right: 8px;
}
.tool-hint {
  color: #8f6ce0;
  font-size: 12px;
  margin: 4px 0;
}
.finished-line {
  padding: 20px 0 40px;
  color: #606266;
  font-size: 15px;
}
.input-bar {
  display: flex;
  gap: 10px;
  align-items: flex-end;
  padding: 14px 0 20px;
}
.send-btn {
  height: 56px;
  width: 88px;
}
</style>
