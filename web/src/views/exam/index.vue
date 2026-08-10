<script setup lang="ts">
// 智考首页：AI 模拟面试（岗位/地区取偏好 store）+ 历史考试列表
// 顶栏已由 MainLayout 提供，此处只保留内容区
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { createInterview, listInterviews } from '../../api/interview'
import { usePreferenceStore } from '../../stores/preference'

const router = useRouter()
const pref = usePreferenceStore()

const creating = ref(false)
const history = ref<any[]>([])
const loadingList = ref(false)

const STATUS_TEXT: Record<number, string> = { 0: '未开始', 1: '进行中', 3: '已完成', 4: '已中断' }
const STATUS_TYPE: Record<number, 'info' | 'warning' | 'success' | 'danger'> = {
  0: 'info', 1: 'warning', 3: 'success', 4: 'danger',
}

async function start() {
  creating.value = true
  try {
    const data = await createInterview({
      position: pref.position,
      region: pref.region,
      totalQuestions: 3,
    })
    ElMessage.success(`已创建「${data.scenarioName}」，共 ${data.totalQuestions} 题`)
    router.push(`/exam/room/${data.sessionId}`)
  } catch (err: any) {
    ElMessage.error(err.message || '创建面试失败')
  } finally {
    creating.value = false
  }
}

async function loadHistory() {
  loadingList.value = true
  try {
    const data = await listInterviews()
    history.value = data.list || []
  } catch {
    /* http 层已提示 */
  } finally {
    loadingList.value = false
  }
}

function openSession(row: any) {
  if (row.status === 3) router.push(`/exam/report/${row.id}`)
  else router.push(`/exam/room/${row.id}`)
}

onMounted(loadHistory)
</script>

<template>
  <div class="page">
    <div class="hero">
      <h2>开始一场 AI 模拟面试</h2>
      <p>
        当前偏好：<el-tag size="small">{{ pref.position }}</el-tag>
        <el-tag size="small" type="warning">{{ pref.region }}</el-tag>
        ，可在顶栏切换岗位与地区后开始
      </p>
    </div>

    <div class="entry-grid">
      <el-card class="entry" shadow="never">
        <div class="entry-icon">🎤</div>
        <div class="entry-title">AI 模拟面试</div>
        <div class="entry-desc">AI 面试官按「{{ pref.position }} · {{ pref.region }}」题型出题，一问一答流式点评，结束生成六维评分报告</div>
        <el-button type="primary" size="large" :loading="creating" @click="start">
          开始面试 · 共 3 题
        </el-button>
      </el-card>

      <el-card class="entry" shadow="never">
        <div class="entry-icon">📝</div>
        <div class="entry-title">真题练习</div>
        <div class="entry-desc">按岗位/地区筛选真题、九大题型分类刷题、错题本 AI 解析，配合面试室系统备考</div>
        <el-button type="success" size="large" plain @click="router.push('/questions')">去题库练习</el-button>
      </el-card>
    </div>

    <el-card class="card" shadow="never">
      <template #header>历史考试</template>
      <el-table v-loading="loadingList" :data="history" empty-text="暂无考试记录">
        <el-table-column prop="scenario_name" label="场景" min-width="180" />
        <el-table-column label="岗位 / 地区" min-width="140">
          <template #default="{ row }">{{ row.position || '-' }} / {{ row.region || '-' }}</template>
        </el-table-column>
        <el-table-column label="进度" width="120">
          <template #default="{ row }">{{ row.current_index }} / {{ row.total_questions }}</template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="STATUS_TYPE[row.status] || 'info'" size="small">{{ STATUS_TEXT[row.status] || '-' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="得分" width="80">
          <template #default="{ row }">{{ row.score ?? '-' }}</template>
        </el-table-column>
        <el-table-column label="时间" width="170">
          <template #default="{ row }">{{ (row.created_at || '').replace('T', ' ').slice(0, 16) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="110">
          <template #default="{ row }">
            <el-button type="primary" link @click="openSession(row)">
              {{ row.status === 3 ? '查看报告' : '继续' }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<style scoped>
.page {
  max-width: 860px;
  margin: 0 auto;
}
.hero {
  padding: 8px 0 20px;
}
.hero h2 {
  margin: 0 0 8px;
  font-size: 26px;
}
.hero p {
  margin: 0;
  color: #909399;
}
.hero .el-tag {
  margin: 0 2px;
}
.entry-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}
.entry {
  text-align: center;
  padding: 8px 0 4px;
}
.entry-icon {
  font-size: 40px;
}
.entry-title {
  margin-top: 10px;
  font-size: 18px;
  font-weight: 700;
  color: #303133;
}
.entry-desc {
  margin: 8px auto 16px;
  max-width: 320px;
  font-size: 13px;
  color: #909399;
  line-height: 1.7;
}
.card {
  margin-bottom: 20px;
}
</style>
