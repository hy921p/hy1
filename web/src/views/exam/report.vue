<script setup lang="ts">
// 面试报告页：总分 + 六维评分 + 亮点/改进 + 逐题回顾
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getReport } from '../../api/interview'

const route = useRoute()
const router = useRouter()
const sessionId = String(route.params.id)

const report = ref<any>(null)
const loading = ref(true)
const failed = ref('')

const DIM_COLORS = ['#409eff', '#67c23a', '#e6a23c', '#f56c6c', '#909399', '#9b59b6']
const DIM_LABELS: Record<string, string> = {
  综合分析能力: '综合分析',
  逻辑条理: '逻辑条理',
  语言表达: '语言表达',
  岗位匹配: '岗位匹配',
  应急应变: '应急应变',
  学习与改进: '学习与改进',
}

function dimEntries(dims: any): [string, number][] {
  if (!dims) return []
  return Object.entries(dims).map(([k, v]) => [k, Number(v)])
}

function scoreColor(score: number) {
  if (score >= 85) return '#67c23a'
  if (score >= 70) return '#e6a23c'
  return '#f56c6c'
}

onMounted(async () => {
  try {
    report.value = await getReport(sessionId)
  } catch (err: any) {
    failed.value = err.message || '报告加载失败'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="page">
    <header class="topbar">
      <el-button text @click="router.push('/exam')">← 返回</el-button>
      <div class="title">面试报告</div>
    </header>

    <div v-loading="loading" class="wrap">
      <el-empty v-if="failed" :description="failed" />

      <template v-else-if="report">
        <!-- 总分 -->
        <div class="score-hero">
          <div class="score-num" :style="{ color: scoreColor(report.totalScore) }">
            {{ report.totalScore }}
          </div>
          <div class="score-label">综合评分（满分 100）</div>
          <div class="score-tag">{{ report.totalScore >= 85 ? '优秀' : report.totalScore >= 70 ? '良好' : '待提升' }}</div>
        </div>

        <!-- 六维评分 -->
        <el-card class="card">
          <template #header>维度评分</template>
          <div class="dim-row" v-for="(d, i) in dimEntries(report.dimensions)" :key="d[0]">
            <span class="dim-name">{{ DIM_LABELS[d[0]] || d[0] }}</span>
            <el-progress
              :percentage="d[1]"
              :stroke-width="14"
              :color="DIM_COLORS[i % DIM_COLORS.length]"
              class="dim-bar"
            />
            <span class="dim-score">{{ d[1] }}</span>
          </div>
        </el-card>

        <!-- 亮点与改进 -->
        <div class="two-col">
          <el-card class="card col">
            <template #header><span class="green">💡 表现亮点</span></template>
            <ul class="list">
              <li v-for="(h, i) in report.highlights" :key="i">✓ {{ h }}</li>
            </ul>
          </el-card>
          <el-card class="card col">
            <template #header><span class="orange">📈 提升建议</span></template>
            <ul class="list">
              <li v-for="(im, i) in report.improvements" :key="i">▲ {{ im }}</li>
            </ul>
          </el-card>
        </div>

        <!-- 逐题回顾 -->
        <el-card class="card">
          <template #header>逐题回顾</template>
          <div v-for="pq in report.perQuestion" :key="pq.index" class="qa-item">
            <div class="qa-head">
              <el-tag size="small" type="info">第 {{ pq.index + 1 }} 题</el-tag>
              <span class="qa-cat">{{ pq.category || '' }}</span>
              <span class="qa-score" :style="{ color: scoreColor(pq.score) }">{{ pq.score }} 分</span>
            </div>
            <div class="qa-question">{{ pq.question }}</div>
            <div v-if="pq.answer" class="qa-answer">
              <b>你的作答：</b>{{ pq.answer }}
            </div>
            <div class="qa-comment"><b>AI 点评：</b>{{ pq.comment }}</div>
          </div>
        </el-card>
      </template>
    </div>
  </div>
</template>

<style scoped>
.page {
  max-width: 860px;
  margin: 0 auto;
  padding: 0 20px 40px;
}
.topbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 0;
  border-bottom: 1px solid #ebeef5;
}
.title {
  font-size: 16px;
  font-weight: 600;
}
.wrap {
  padding-top: 24px;
}
.score-hero {
  text-align: center;
  padding: 20px 0 28px;
}
.score-num {
  font-size: 72px;
  font-weight: 800;
  line-height: 1;
}
.score-label {
  margin-top: 8px;
  color: #909399;
  font-size: 13px;
}
.score-tag {
  display: inline-block;
  margin-top: 10px;
  padding: 4px 18px;
  border-radius: 999px;
  background: #ecf5ff;
  color: #409eff;
  font-size: 13px;
}
.card {
  margin-bottom: 20px;
}
.dim-row {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 14px;
}
.dim-name {
  width: 88px;
  text-align: right;
  font-size: 14px;
  color: #606266;
  flex-shrink: 0;
}
.dim-bar {
  flex: 1;
}
.dim-score {
  width: 36px;
  font-weight: 700;
  color: #303133;
}
.two-col {
  display: flex;
  gap: 20px;
}
.col {
  flex: 1;
}
.list {
  margin: 0;
  padding-left: 4px;
  list-style: none;
}
.list li {
  padding: 8px 0;
  line-height: 1.7;
  color: #606266;
  border-bottom: 1px dashed #f0f2f5;
}
.list li:last-child {
  border-bottom: none;
}
.green { color: #67c23a; }
.orange { color: #e6a23c; }
.qa-item {
  padding: 16px;
  margin-bottom: 14px;
  border: 1px solid #ebeef5;
  border-radius: 10px;
  background: #fafbfc;
}
.qa-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}
.qa-cat {
  font-size: 12px;
  color: #909399;
}
.qa-score {
  margin-left: auto;
  font-weight: 700;
}
.qa-question {
  font-weight: 600;
  line-height: 1.7;
}
.qa-answer {
  margin-top: 8px;
  padding: 10px 12px;
  background: #fff;
  border-radius: 8px;
  color: #606266;
  line-height: 1.7;
}
.qa-comment {
  margin-top: 8px;
  color: #303133;
  line-height: 1.7;
}
</style>
