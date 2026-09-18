<script setup lang="ts">
// AI 摘要悬浮球：智学页右下角固定圆形按钮，点击弹出面板做长文摘要
// 逻辑原为智学页内联卡片，现迁到此处；仅智学页挂载（组件卸载即消失）
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { aiSummary } from '../api/learn'

const open = ref(false)
const text = ref('')
const saveToNote = ref(true)
const sourceTitle = ref('')
const summarizing = ref(false)
const result = ref<any>(null)

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
</script>

<template>
  <button class="fab" aria-label="AI 摘要工具" @click="open = true">🤖</button>

  <el-dialog v-model="open" title="🤖 AI 摘要工具" :width="'min(600px, 94vw)'" append-to-body>
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
  </el-dialog>
</template>

<style scoped>
.fab {
  /* 固定在智学页右侧空白的中部（内容 860 居中，右侧空白水平中点为 75vw + 215px） */
  position: fixed;
  top: 50%;
  left: calc(75vw + 215px);
  transform: translate(-50%, -50%);
  z-index: 90;
  width: 52px;
  height: 52px;
  border: none;
  border-radius: 50%;
  background: #409eff;
  font-size: 24px;
  line-height: 52px;
  text-align: center;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(64, 158, 255, 0.4);
  transition: transform 0.2s;
}
.fab:hover {
  transform: translate(-50%, -50%) scale(1.08);
}
/* 窄屏右侧无空白：回退到右下角 */
@media (max-width: 1000px) {
  .fab {
    top: auto;
    left: auto;
    right: 24px;
    bottom: calc(24px + env(safe-area-inset-bottom));
    transform: none;
  }
  .fab:hover {
    transform: scale(1.08);
  }
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
