<script setup lang="ts">
// 社区首页：帖子列表（最新/热门）+ AI 答疑面板
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { posts } from '../../api/community'
import { ask, answers, deleteAnswer } from '../../api/ai'

const router = useRouter()

const sort = ref<'latest' | 'hot'>('latest')
const list = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 10
const loading = ref(false)

function parseTags(raw: unknown): string[] {
  // mysql2 对 JSON 列自动解析 → 可能是数组；老数据可能是 JSON 字符串
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'string') {
    try {
      const arr = JSON.parse(raw)
      return Array.isArray(arr) ? arr : []
    } catch {
      return []
    }
  }
  return []
}

async function load() {
  loading.value = true
  try {
    const data = await posts({ sort: sort.value, page: page.value, pageSize })
    list.value = data.list
    total.value = data.total
  } catch {
    /* http 层已提示 */
  } finally {
    loading.value = false
  }
}

function onSort(s: 'latest' | 'hot') {
  sort.value = s
  page.value = 1
  load()
}

function onPageChange(p: number) {
  page.value = p
  load()
}

function goDetail(id: number) {
  router.push(`/community/post/${id}`)
}

// ---- AI 答疑 ----
const q = ref('')
const asking = ref(false)
const aiResult = ref<any>(null)
const aiHistory = ref<any[]>([])
const loadingHistory = ref(false)
const deletingId = ref<number | null>(null)

async function doAsk() {
  if (!q.value.trim()) {
    ElMessage.warning('请输入你的问题')
    return
  }
  asking.value = true
  aiResult.value = null
  try {
    aiResult.value = await ask({ question: q.value.trim(), entry: 'community' })
  } catch {
    /* http 层已提示 */
  } finally {
    asking.value = false
  }
}

async function loadHistory() {
  loadingHistory.value = true
  try {
    const data = await answers({ page: 1, pageSize: 5 })
    aiHistory.value = data.list || []
  } catch {
    /* http 层已提示 */
  } finally {
    loadingHistory.value = false
  }
}

function parseCitations(row: any): any[] {
  try {
    const arr = JSON.parse(row.citations || '[]')
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

async function doDelete(id: number) {
  deletingId.value = id
  try {
    await deleteAnswer(id)
    ElMessage.success('已删除')
    loadHistory()
  } catch {
    /* http 层已提示 */
  } finally {
    deletingId.value = null
  }
}

onMounted(() => {
  load()
  loadHistory()
})
</script>

<template>
  <div class="page">
    <div class="cols">
      <div class="col-main">
        <el-card class="card" shadow="never">
          <template #header>
            <div class="head">
              <div class="tabs">
                <button class="tab" :class="{ active: sort === 'latest' }" @click="onSort('latest')">最新</button>
                <button class="tab" :class="{ active: sort === 'hot' }" @click="onSort('hot')">热门</button>
              </div>
              <el-button type="primary" size="small" @click="router.push('/community/post/create')">＋ 发布帖子</el-button>
            </div>
          </template>
          <div v-loading="loading" class="posts">
            <div v-for="p in list" :key="p.id" class="post" @click="goDetail(p.id)">
              <div class="post-title">{{ p.title }}</div>
              <div class="post-content">{{ p.content }}</div>
              <div class="post-tags">
                <el-tag v-if="p.position" size="small" type="warning" effect="plain">{{ p.position }}</el-tag>
                <el-tag v-if="p.region" size="small" type="warning" effect="plain">{{ p.region }}</el-tag>
                <el-tag v-for="t in parseTags(p.tags)" :key="t" size="small" effect="plain">{{ t }}</el-tag>
              </div>
              <div class="post-meta">
                <span class="author">👤 {{ p.author_name }}</span>
                <span class="stat">👁 {{ p.view_count }}</span>
                <span class="stat">👍 {{ p.like_count }}</span>
                <span class="stat">💬 {{ p.comment_count }}</span>
                <span class="time">{{ (p.created_at || '').replace('T', ' ').slice(0, 16) }}</span>
              </div>
            </div>
            <el-empty v-if="!loading && !list.length" description="暂无帖子，快来发布第一篇吧" />
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

      <div class="col-side">
        <el-card class="card" shadow="never">
          <template #header>🤖 AI 答疑</template>
          <el-input
            v-model="q"
            type="textarea"
            :rows="3"
            placeholder="问问结构化面试、答题思路、职场问题…（约需 10-30 秒）"
          />
          <div class="ask-actions">
            <el-button type="primary" size="small" :loading="asking" @click="doAsk">提问</el-button>
          </div>
          <div v-if="aiResult" class="ai-result">
            <div class="ai-answer">{{ aiResult.answer }}</div>
            <div v-if="aiResult.citations && aiResult.citations.length" class="citations">
              <div class="cite-label">📎 参考了 {{ aiResult.citations.length }} 条资料</div>
              <div v-for="(c, i) in aiResult.citations" :key="i" class="cite">
                <div class="cite-title">{{ c.title }}</div>
                <div class="cite-snippet">{{ c.snippet }}</div>
              </div>
            </div>
            <div v-else class="cite-label">（未命中资料库，AI 直接作答）</div>
          </div>
        </el-card>

        <el-card class="card" shadow="never">
          <template #header>🕘 最近提问</template>
          <div v-loading="loadingHistory" class="history">
            <div v-for="h in aiHistory" :key="h.id" class="his-item">
              <div class="his-q">{{ h.question }}</div>
              <div class="his-a">{{ h.answer }}</div>
              <div class="his-meta">
                <span class="his-time">{{ (h.created_at || '').replace('T', ' ').slice(0, 16) }}</span>
                <el-button type="danger" link size="small" :loading="deletingId === h.id" @click="doDelete(h.id)">删除</el-button>
              </div>
            </div>
            <el-empty v-if="!loadingHistory && !aiHistory.length" description="暂无提问记录" :image-size="50" />
          </div>
        </el-card>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page {
  max-width: 1100px;
  margin: 0 auto;
}
.cols {
  display: grid;
  grid-template-columns: 1fr 340px;
  gap: 16px;
  align-items: start;
}
.head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.tabs {
  display: flex;
  gap: 4px;
}
.tab {
  padding: 6px 16px;
  border: 1px solid #dcdfe6;
  border-radius: 999px;
  background: #fff;
  font-size: 13px;
  color: #606266;
  cursor: pointer;
  transition: all 0.2s;
}
.tab.active {
  background: #409eff;
  border-color: #409eff;
  color: #fff;
}
.post {
  padding: 14px 4px;
  border-bottom: 1px dashed #ebeef5;
  cursor: pointer;
}
.post:last-child {
  border-bottom: none;
}
.post-title {
  font-size: 15px;
  font-weight: 700;
  color: #303133;
}
.post:hover .post-title {
  color: #409eff;
}
.post-content {
  margin-top: 6px;
  font-size: 13px;
  color: #606266;
  line-height: 1.7;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.post-tags {
  margin-top: 8px;
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.post-meta {
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  color: #909399;
}
.post-meta .time {
  margin-left: auto;
  color: #c0c4cc;
}
.pager {
  display: flex;
  justify-content: center;
  margin-top: 8px;
}
.ask-actions {
  margin-top: 10px;
}
.ai-result {
  margin-top: 12px;
  padding: 12px 14px;
  border-radius: 8px;
  background: #f0f9eb;
}
.ai-answer {
  font-size: 13px;
  color: #303133;
  line-height: 1.8;
  white-space: pre-wrap;
  max-height: 220px;
  overflow: auto;
}
.citations {
  margin-top: 10px;
}
.cite-label {
  font-size: 12px;
  color: #67c23a;
  margin-bottom: 6px;
}
.cite {
  padding: 8px 10px;
  border-radius: 6px;
  background: #fff;
  margin-bottom: 6px;
}
.cite-title {
  font-size: 12px;
  font-weight: 600;
  color: #303133;
}
.cite-snippet {
  margin-top: 4px;
  font-size: 12px;
  color: #909399;
  line-height: 1.6;
}
.his-item {
  padding: 10px 0;
  border-bottom: 1px dashed #ebeef5;
}
.his-item:last-child {
  border-bottom: none;
}
.his-q {
  font-size: 13px;
  font-weight: 600;
  color: #303133;
}
.his-a {
  margin-top: 4px;
  font-size: 12px;
  color: #606266;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.his-meta {
  margin-top: 6px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.his-time {
  font-size: 12px;
  color: #c0c4cc;
}
</style>
