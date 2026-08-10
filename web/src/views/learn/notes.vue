<script setup lang="ts">
// 我的笔记：CRUD + 单条 AI 摘要回写
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { notes, createNote, updateNote, deleteNote, summarizeNote } from '../../api/learn'

const items = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 10
const loading = ref(false)

const dialogOpen = ref(false)
const editingId = ref<number | null>(null)
const form = ref({ title: '', content: '' })
const saving = ref(false)

const summarizingId = ref<number | null>(null)
const deletingId = ref<number | null>(null)

async function load(p = page.value) {
  loading.value = true
  try {
    const data = await notes({ page: p, pageSize })
    items.value = data.list
    total.value = data.total
    page.value = data.page
  } catch {
    /* http 层已提示 */
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editingId.value = null
  form.value = { title: '', content: '' }
  dialogOpen.value = true
}

function openEdit(n: any) {
  editingId.value = n.id
  form.value = { title: n.title, content: n.content }
  dialogOpen.value = true
}

async function save() {
  if (!form.value.content.trim()) {
    ElMessage.warning('笔记内容不能为空')
    return
  }
  saving.value = true
  try {
    if (editingId.value) {
      await updateNote(editingId.value, form.value)
      ElMessage.success('笔记已更新')
    } else {
      await createNote(form.value)
      ElMessage.success('笔记已创建')
    }
    dialogOpen.value = false
    load(page.value)
  } catch {
    /* http 层已提示 */
  } finally {
    saving.value = false
  }
}

async function doDelete(n: any) {
  try {
    await ElMessageBox.confirm(`确定删除笔记「${n.title}」吗？`, '删除确认', { type: 'warning' })
  } catch {
    return
  }
  deletingId.value = n.id
  try {
    await deleteNote(n.id)
    ElMessage.success('笔记已删除')
    load(page.value)
  } catch {
    /* http 层已提示 */
  } finally {
    deletingId.value = null
  }
}

async function doSummarize(n: any) {
  summarizingId.value = n.id
  try {
    const data = await summarizeNote(n.id)
    ElMessage.success('AI 摘要已回写')
    load(page.value)
  } catch {
    /* http 层已提示 */
  } finally {
    summarizingId.value = null
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
          <span>📝 我的笔记</span>
          <el-button type="primary" size="small" @click="openCreate">＋ 新建笔记</el-button>
        </div>
      </template>
      <div v-loading="loading" class="list">
        <div v-for="n in items" :key="n.id" class="note">
          <div class="note-head">
            <span class="note-title">{{ n.title || '无标题笔记' }}</span>
            <el-tag v-if="n.is_ai_summary" size="small" type="success">AI 摘要</el-tag>
            <span class="note-time">{{ (n.updated_at || n.created_at || '').replace('T', ' ').slice(0, 16) }}</span>
          </div>
          <div class="note-content">{{ n.content }}</div>
          <div class="note-source" v-if="n.source_title">来源：{{ n.source_title }}</div>
          <div class="note-actions">
            <el-button type="primary" link :loading="summarizingId === n.id" @click="doSummarize(n)">🤖 AI 摘要</el-button>
            <el-button type="primary" link @click="openEdit(n)">编辑</el-button>
            <el-button type="danger" link :loading="deletingId === n.id" @click="doDelete(n)">删除</el-button>
          </div>
        </div>
        <el-empty v-if="!loading && !items.length" description="暂无笔记，点击右上角新建" />
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

    <el-dialog v-model="dialogOpen" :title="editingId ? '编辑笔记' : '新建笔记'" width="560px">
      <el-form label-position="top">
        <el-form-item label="标题">
          <el-input v-model="form.title" placeholder="可选，默认「无标题笔记」" />
        </el-form-item>
        <el-form-item label="内容">
          <el-input v-model="form.content" type="textarea" :rows="6" placeholder="记录今日所学、面试要点…" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogOpen = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="save">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.page {
  max-width: 860px;
  margin: 0 auto;
}
.head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.note {
  padding: 14px 4px;
  border-bottom: 1px dashed #ebeef5;
}
.note:last-child {
  border-bottom: none;
}
.note-head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.note-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}
.note-time {
  margin-left: auto;
  font-size: 12px;
  color: #c0c4cc;
}
.note-content {
  margin-top: 8px;
  font-size: 13px;
  color: #606266;
  line-height: 1.8;
  white-space: pre-wrap;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.note-source {
  margin-top: 6px;
  font-size: 12px;
  color: #909399;
}
.note-actions {
  margin-top: 8px;
  display: flex;
  justify-content: flex-end;
  gap: 2px;
}
.pager {
  display: flex;
  justify-content: center;
  margin-top: 8px;
}
</style>
