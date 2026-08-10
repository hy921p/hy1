<script setup lang="ts">
// 题库列表卡片：题目内容 + 标签行，点击进详情
import { useRouter } from 'vue-router'

const props = defineProps<{
  q: any
  /** 是否展示题目下方摘要（热点的 detail / 错题的 AI 解析） */
  footer?: string
  footerType?: 'success' | 'warning' | 'info' | 'danger'
}>()

const router = useRouter()

const DIFF_MAP: Record<number, { text: string; type: 'success' | 'warning' | 'danger' }> = {
  1: { text: '简单', type: 'success' },
  2: { text: '中等', type: 'warning' },
  3: { text: '困难', type: 'danger' },
}

const SRC_MAP: Record<string, string> = {
  hot: '热点',
  real: '真题',
  mock: '模拟',
  normal: '专项',
}

function diffTag() {
  return DIFF_MAP[props.q?.difficulty] || { text: `Lv.${props.q?.difficulty}`, type: 'info' }
}

function go() {
  const id = props.q?.id ?? props.q?.question_id
  if (id) router.push(`/questions/detail/${id}`)
}
</script>

<template>
  <div class="q-card" @click="go">
    <div class="q-content">{{ q?.content }}</div>
    <div class="q-tags">
      <el-tag v-if="q?.category" size="small" effect="plain">{{ q.category }}</el-tag>
      <el-tag v-if="q?.source_type" size="small" type="info" effect="plain">{{ SRC_MAP[q.source_type] || q.source_type }}</el-tag>
      <el-tag v-if="q?.position" size="small" type="warning" effect="plain">{{ q.position }}</el-tag>
      <el-tag v-if="q?.region" size="small" type="warning" effect="plain">{{ q.region }}</el-tag>
      <el-tag v-if="q?.year" size="small" type="info" effect="plain">{{ q.year }}</el-tag>
      <el-tag v-if="q?.difficulty" size="small" :type="diffTag().type" effect="plain">{{ diffTag().text }}</el-tag>
      <el-tag v-if="q?.wrong_count" size="small" type="danger" effect="dark">错 {{ q.wrong_count }} 次</el-tag>
      <span v-if="q?.mastered" class="mastered">✓ 已掌握</span>
    </div>
    <div v-if="footer" class="q-footer" :class="footerType ? `is-${footerType}` : ''">{{ footer }}</div>
  </div>
</template>

<style scoped>
.q-card {
  padding: 16px 18px;
  border: 1px solid #ebeef5;
  border-radius: 12px;
  background: #fff;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 12px;
}
.q-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(31, 45, 61, 0.08);
  border-color: #c6e2ff;
}
.q-content {
  font-size: 15px;
  color: #303133;
  line-height: 1.7;
}
.q-tags {
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}
.mastered {
  margin-left: auto;
  font-size: 12px;
  color: #67c23a;
}
.q-footer {
  margin-top: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  background: #f5f7fa;
  font-size: 13px;
  color: #606266;
  line-height: 1.7;
  white-space: pre-wrap;
}
.q-footer.is-success {
  background: #f0f9eb;
  color: #529b2e;
}
.q-footer.is-warning {
  background: #fdf6ec;
  color: #b88230;
}
.q-footer.is-danger {
  background: #fef0f0;
  color: #c45656;
}
</style>
