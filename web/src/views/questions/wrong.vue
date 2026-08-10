<script setup lang="ts">
// 错题本：答错记录 + AI 解析 + 标记掌握
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { wrong, markMastered } from '../../api/question'
import QuestionCard from '../../components/QuestionCard.vue'

const router = useRouter()
const items = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 10
const loading = ref(false)
const mastering = ref<number | null>(null)

async function load(p = page.value) {
  loading.value = true
  try {
    const data = await wrong({ page: p, pageSize })
    items.value = data.list
    total.value = data.total
    page.value = data.page
  } catch {
    /* http 层已提示 */
  } finally {
    loading.value = false
  }
}

async function doMastered(row: any) {
  mastering.value = row.question_id
  try {
    await markMastered(row.question_id)
    ElMessage.success('已标记为掌握，将从错题本移除')
    load(page.value)
  } catch {
    /* http 层已提示 */
  } finally {
    mastering.value = null
  }
}

function goDetail(id: number) {
  router.push(`/questions/detail/${id}`)
}

function onPageChange(p: number) {
  load(p)
}

onMounted(() => load())
</script>

<template>
  <div class="page">
    <el-card class="card" shadow="never">
      <template #header>📕 错题本（AI 智能解析）</template>
      <div v-loading="loading" class="list">
        <div v-for="row in items" :key="row.id" class="wrong-card">
          <div class="wrong-head">
            <el-tag size="small" type="danger" effect="dark">错 {{ row.wrong_count }} 次</el-tag>
            <span v-if="row.mastered" class="mastered-tag">已掌握</span>
            <span class="wrong-time">{{ (row.last_wrong_at || '').replace('T', ' ').slice(0, 16) }}</span>
          </div>
          <div class="wrong-content">{{ row.content }}</div>
          <div class="wrong-tags">
            <el-tag v-if="row.category" size="small" effect="plain">{{ row.category }}</el-tag>
            <el-tag v-if="row.position" size="small" type="warning" effect="plain">{{ row.position }}</el-tag>
            <el-tag v-if="row.region" size="small" type="warning" effect="plain">{{ row.region }}</el-tag>
          </div>
          <div class="analysis">
            <div class="analysis-label">🤖 AI 错题解析</div>
            <div v-if="row.ai_analysis" class="analysis-text">{{ row.ai_analysis }}</div>
            <div v-else class="analysis-text dim">解析生成中，稍后刷新可见</div>
          </div>
          <div class="wrong-actions">
            <el-button type="primary" link @click="goDetail(row.question_id)">查看原题</el-button>
            <el-button
              v-if="!row.mastered"
              type="success"
              link
              :loading="mastering === row.question_id"
              @click="doMastered(row)"
            >标记已掌握</el-button>
          </div>
        </div>
        <el-empty v-if="!loading && !items.length" description="暂无错题，继续保持！" />
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
  max-width: 860px;
  margin: 0 auto;
}
.list {
  min-height: 60px;
}
.wrong-card {
  padding: 16px 18px;
  border: 1px solid #ebeef5;
  border-radius: 12px;
  margin-bottom: 12px;
  background: #fff;
}
.wrong-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.wrong-time {
  margin-left: auto;
  font-size: 12px;
  color: #c0c4cc;
}
.mastered-tag {
  font-size: 12px;
  color: #67c23a;
}
.wrong-content {
  font-size: 15px;
  color: #303133;
  line-height: 1.7;
}
.wrong-tags {
  margin-top: 8px;
  display: flex;
  gap: 6px;
}
.analysis {
  margin-top: 12px;
  padding: 12px 14px;
  border-radius: 8px;
  background: #fdf6ec;
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
.wrong-actions {
  margin-top: 10px;
  display: flex;
  justify-content: flex-end;
  gap: 4px;
}
.pager {
  display: flex;
  justify-content: center;
  margin-top: 8px;
}
</style>
