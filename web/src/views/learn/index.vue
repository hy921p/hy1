<script setup lang="ts">
// 智学首页：五入口卡 + 热点话题 + AI 摘要工具
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { aiSummary } from '../../api/learn'
import { hot } from '../../api/recommendation'

const router = useRouter()

const topics = ref<any[]>([])
const loadingTopics = ref(false)

const text = ref('')
const saveToNote = ref(true)
const sourceTitle = ref('')
const summarizing = ref(false)
const result = ref<any>(null)

const ENTRIES = [
  { icon: '📰', title: '每日晨读', desc: '时政热点精读，积累答题素材', to: '/learn/reading' },
  { icon: '🧩', title: '面试素材', desc: '金句 / 案例 / 名言积累', to: '/learn/material' },
  { icon: '📘', title: '通识理论', desc: '结构化面试基础方法论', to: '/learn/basics' },
  { icon: '🎬', title: '视频课程', desc: '名师精讲，体系化学习', to: '/learn/courses' },
  { icon: '📝', title: '我的笔记', desc: '随手记，AI 一键摘要', to: '/learn/notes' },
]

async function loadTopics() {
  loadingTopics.value = true
  try {
    topics.value = await hot()
  } catch {
    /* http 层已提示 */
  } finally {
    loadingTopics.value = false
  }
}

async function doSummary() {
  if (!text.value.trim()) {
    ElMessage.warning('请先粘贴或输入要摘录的内容')
    return
  }
  summarizing.value = true
  result.value = null
  try {
    const data = await aiSummary({
      content: text.value.trim(),
      sourceTitle: sourceTitle.value.trim() || undefined,
      saveToNote: saveToNote.value,
    })
    result.value = data
    ElMessage.success(data.noteId ? '摘要已生成并保存到笔记' : '摘要已生成')
  } catch {
    /* http 层已提示 */
  } finally {
    summarizing.value = false
  }
}

onMounted(loadTopics)
</script>

<template>
  <div class="page">
    <div class="entry-grid">
      <div v-for="e in ENTRIES" :key="e.title" class="entry" @click="router.push(e.to)">
        <div class="entry-icon">{{ e.icon }}</div>
        <div class="entry-title">{{ e.title }}</div>
        <div class="entry-desc">{{ e.desc }}</div>
      </div>
    </div>

    <el-card class="block" shadow="never">
      <template #header>🔥 热点话题</template>
      <div v-loading="loadingTopics" class="topic-list">
        <div v-for="t in topics" :key="t.id" class="topic">
          <div class="topic-title">{{ t.title }}</div>
          <div class="topic-summary">{{ t.summary }}</div>
          <div class="topic-meta">
            <el-tag v-if="t.position" size="small" type="warning" effect="plain">{{ t.position }}</el-tag>
            <el-tag v-if="t.region" size="small" type="warning" effect="plain">{{ t.region }}</el-tag>
            <span class="views">👁 {{ t.views }}</span>
            <span class="date">{{ (t.publishDate || '').slice(0, 10) }}</span>
          </div>
        </div>
        <el-empty v-if="!loadingTopics && !topics.length" description="暂无热点话题" />
      </div>
    </el-card>

    <el-card class="block" shadow="never">
      <template #header>🤖 AI 摘要工具（粘贴长文，一键提炼 + 存笔记）</template>
      <el-input
        v-model="text"
        type="textarea"
        :rows="6"
        placeholder="粘贴时政新闻、文章、面试解析等长文本，AI 将提炼核心要点…（生成约需 10-30 秒）"
      />
      <div class="opt-row">
        <el-input v-model="sourceTitle" class="src-input" placeholder="来源标题（可选，如：人民日报评论）" />
        <el-checkbox v-model="saveToNote">同时保存到我的笔记</el-checkbox>
      </div>
      <div class="actions">
        <el-button type="primary" :loading="summarizing" @click="doSummary">生成 AI 摘要</el-button>
      </div>
      <div v-if="result" class="result">
        <div class="result-label">✨ 摘要结果</div>
        <div class="result-text">{{ result.summary }}</div>
        <div v-if="result.noteId" class="result-tip">已保存到笔记（ID {{ result.noteId }}）</div>
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.page {
  max-width: 860px;
  margin: 0 auto;
}
.entry-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}
.entry {
  padding: 18px 12px;
  border: 1px solid #ebeef5;
  border-radius: 12px;
  text-align: center;
  cursor: pointer;
  background: #fff;
  transition: all 0.2s;
}
.entry:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(31, 45, 61, 0.08);
  border-color: #c6e2ff;
}
.entry-icon {
  font-size: 26px;
}
.entry-title {
  margin-top: 6px;
  font-size: 14px;
  font-weight: 700;
  color: #303133;
}
.entry-desc {
  margin-top: 4px;
  font-size: 12px;
  color: #909399;
}
.block {
  margin-bottom: 16px;
}
.topic {
  padding: 12px 0;
  border-bottom: 1px dashed #ebeef5;
}
.topic:last-child {
  border-bottom: none;
}
.topic-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}
.topic-summary {
  margin-top: 6px;
  font-size: 13px;
  color: #606266;
  line-height: 1.7;
}
.topic-meta {
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.views {
  margin-left: auto;
  font-size: 12px;
  color: #909399;
}
.date {
  font-size: 12px;
  color: #c0c4cc;
}
.opt-row {
  margin-top: 12px;
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}
.src-input {
  max-width: 320px;
}
.actions {
  margin-top: 12px;
}
.result {
  margin-top: 14px;
  padding: 14px 16px;
  border-radius: 8px;
  background: #f0f9eb;
}
.result-label {
  font-size: 13px;
  font-weight: 600;
  color: #529b2e;
  margin-bottom: 6px;
}
.result-text {
  font-size: 13px;
  color: #606266;
  line-height: 1.8;
  white-space: pre-wrap;
}
.result-tip {
  margin-top: 8px;
  font-size: 12px;
  color: #67c23a;
}
</style>
