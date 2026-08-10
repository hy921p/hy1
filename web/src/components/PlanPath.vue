<script setup lang="ts">
// 智能规划路径：节点横向步骤条，点击未完成节点标记完成
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { completeNode } from '../api/studyPlan'

const props = defineProps<{
  plan: any
  nodes: any[]
  total: number
  completed: number
  progress: number
}>()
const emit = defineEmits<{ (e: 'refreshed'): void }>()

const loadingId = ref<number | null>(null)

async function doComplete(node: any) {
  loadingId.value = node.id
  try {
    const data = await completeNode(node.id)
    ElMessage.success(`已完成「${node.title}」，规划进度 ${data.progress}%`)
    emit('refreshed')
  } catch {
    /* http 层已提示 */
  } finally {
    loadingId.value = null
  }
}
</script>

<template>
  <div class="plan">
    <div class="plan-head">
      <span class="plan-name">{{ plan?.name || '我的学习规划' }}</span>
      <span class="plan-count">{{ completed }} / {{ total }}</span>
    </div>
    <el-progress :percentage="progress" :stroke-width="10" class="plan-bar" />

    <div class="node-row">
      <div
        v-for="(n, i) in nodes"
        :key="n.id"
        class="node"
        :class="{ done: n.completed }"
        :title="n.completed ? '已完成' : '点击标记完成'"
        @click="!n.completed && !loadingId && doComplete(n)"
      >
        <div class="node-dot">{{ n.completed ? '✓' : i + 1 }}</div>
        <div class="node-title">{{ n.title }}</div>
        <div class="node-min">{{ n.estMinutes ? n.estMinutes + ' 分钟' : '' }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.plan-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}
.plan-name {
  font-weight: 600;
  color: #303133;
}
.plan-count {
  font-size: 12px;
  color: #909399;
}
.plan-bar {
  margin-bottom: 18px;
}
.node-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
.node {
  flex: 1 1 150px;
  max-width: 200px;
  padding: 14px 12px;
  border: 1px solid #ebeef5;
  border-radius: 10px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  background: #fafbfc;
}
.node:hover:not(.done) {
  border-color: #e6a23c;
  box-shadow: 0 4px 12px rgba(230, 162, 60, 0.15);
}
.node.done {
  border-color: #67c23a;
  background: #f0f9eb;
  cursor: default;
}
.node-dot {
  width: 26px;
  height: 26px;
  margin: 0 auto 8px;
  border-radius: 50%;
  background: #ecf5ff;
  color: #409eff;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}
.node.done .node-dot {
  background: #67c23a;
  color: #fff;
}
.node-title {
  font-size: 14px;
  color: #303133;
  line-height: 1.5;
}
.node-min {
  margin-top: 4px;
  font-size: 12px;
  color: #909399;
}
</style>
