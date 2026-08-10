<script setup lang="ts">
// 消息通知：列表 + 单读/全读/删除
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { list, markRead, markAllRead, remove } from '../../api/notification'
import { useNotificationStore } from '../../stores/notification'

const store = useNotificationStore()

const items = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 10
const loading = ref(false)
const type = ref('')
const opId = ref<number | null>(null)

function parsePayload(row: any): any {
  if (!row.payload) return null
  try {
    return typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload
  } catch {
    return null
  }
}

function typeTag(t: string) {
  switch (t) {
    case 'like': return { label: '点赞', type: 'warning' }
    case 'comment': return { label: '评论', type: 'success' }
    case 'ai_answer': return { label: 'AI', type: 'primary' }
    case 'achievement': return { label: '勋章', type: 'danger' }
    default: return { label: t || '通知', type: 'info' }
  }
}

async function load(p = page.value) {
  loading.value = true
  try {
    const data = await list({ type: type.value || undefined, page: p, pageSize })
    items.value = data.list
    total.value = data.total
    page.value = data.page
  } catch {
    /* http 层已提示 */
  } finally {
    loading.value = false
  }
}

function onType(t: string) {
  type.value = t
  load(1)
}

async function doRead(n: any) {
  if (n.is_read) return
  opId.value = n.id
  try {
    await markRead(n.id)
    n.is_read = 1
    store.refresh()
  } catch {
    /* http 层已提示 */
  } finally {
    opId.value = null
  }
}

async function readAll() {
  try {
    await markAllRead()
    ElMessage.success('已全部标记为已读')
    store.refresh()
    load(page.value)
  } catch {
    /* http 层已提示 */
  }
}

async function doDelete(n: any) {
  try {
    await ElMessageBox.confirm('确定删除这条通知吗？', '删除确认', { type: 'warning' })
  } catch {
    return
  }
  opId.value = n.id
  try {
    await remove(n.id)
    ElMessage.success('已删除')
    store.refresh()
    load(page.value)
  } catch {
    /* http 层已提示 */
  } finally {
    opId.value = null
  }
}

function onPageChange(p: number) {
  load(p)
}

onMounted(() => load())
</script>

<template>
  <div class="page">
    <el-card class="card" shadow="never">
      <template #header>
        <div class="head">
          <span>🔔 消息通知</span>
          <el-button type="primary" link @click="readAll">全部已读</el-button>
        </div>
      </template>
      <div class="filters">
        <button class="chip" :class="{ active: type === '' }" @click="onType('')">全部</button>
        <button class="chip" :class="{ active: type === 'like' }" @click="onType('like')">点赞</button>
        <button class="chip" :class="{ active: type === 'ai_answer' }" @click="onType('ai_answer')">AI 答疑</button>
        <button class="chip" :class="{ active: type === 'achievement' }" @click="onType('achievement')">勋章</button>
      </div>
      <div v-loading="loading" class="list">
        <div v-for="n in items" :key="n.id" class="item" :class="{ unread: !n.is_read }" @click="doRead(n)">
          <div class="row1">
            <el-tag :type="(typeTag(n.type).type as any)" size="small" effect="dark">{{ typeTag(n.type).label }}</el-tag>
            <span class="title">{{ n.title }}</span>
            <span v-if="!n.is_read" class="dot">●</span>
            <span class="time">{{ (n.created_at || '').replace('T', ' ').slice(0, 16) }}</span>
          </div>
          <div class="row2">{{ n.content }}</div>
          <div class="row2 payload" v-if="parsePayload(n) && parsePayload(n).postTitle">
            关联：{{ parsePayload(n).postTitle }}
          </div>
          <div class="ops" v-if="!n.is_read || true">
            <el-button type="danger" link size="small" :loading="opId === n.id" @click.stop="doDelete(n)">删除</el-button>
          </div>
        </div>
        <el-empty v-if="!loading && !items.length" description="暂无通知" />
      </div>
      <div class="pager">
        <el-pagination
          v-if="total > pageSize"
          :current-page="page"
          :page-size="pageSize"
          :total="total"
          layout="prev, pager, next, total"
          @current-change="onPageChange"
        />
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.page {
  max-width: 720px;
  margin: 0 auto;
}
.head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.filters {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}
.chip {
  padding: 4px 14px;
  border: 1px solid #dcdfe6;
  border-radius: 999px;
  background: #fff;
  font-size: 12px;
  color: #606266;
  cursor: pointer;
}
.chip.active {
  background: #409eff;
  border-color: #409eff;
  color: #fff;
}
.item {
  position: relative;
  padding: 12px 4px;
  border-bottom: 1px solid #f0f2f5;
  cursor: pointer;
}
.item.unread {
  background: #f5f9ff;
}
.row1 {
  display: flex;
  align-items: center;
  gap: 8px;
}
.title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}
.dot {
  color: #f56c6c;
  font-size: 10px;
}
.time {
  margin-left: auto;
  font-size: 12px;
  color: #c0c4cc;
}
.row2 {
  margin-top: 6px;
  font-size: 13px;
  color: #606266;
  line-height: 1.6;
}
.row2.payload {
  color: #909399;
}
.ops {
  position: absolute;
  right: 4px;
  bottom: 8px;
}
.pager {
  display: flex;
  justify-content: center;
  margin-top: 8px;
}
</style>
