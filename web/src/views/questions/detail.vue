<script setup lang="ts">
// 题目详情：题干 + 作答（自评对错）→ 提交反馈（对+成长值 / 错进错题本+AI解析）+ 参考答案 + 收藏
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { detail, submit, favorite } from '../../api/question'

const route = useRoute()
const id = route.params.id as string

const q = ref<any>(null)
const loading = ref(true)
const answer = ref('')
const selfJudgement = ref<'correct' | 'wrong'>('correct')
const submitting = ref(false)
const result = ref<any>(null)
const showRef = ref(false)
const favoriting = ref(false)

async function load() {
  loading.value = true
  try {
    q.value = await detail(id)
  } catch {
    /* http 层已提示 */
  } finally {
    loading.value = false
  }
}

async function doSubmit() {
  if (!answer.value.trim()) {
    ElMessage.warning('请先写下你的回答')
    return
  }
  submitting.value = true
  try {
    result.value = await submit(id, {
      userAnswer: answer.value.trim(),
      isCorrect: selfJudgement.value === 'correct',
      answerTime: 0,
    })
    ElMessage.success(result.value.isCorrect ? `回答正确，+${result.value.gainedPoints} 成长值` : '已加入错题本')
  } catch {
    /* http 层已提示 */
  } finally {
    submitting.value = false
  }
}

async function toggleFavorite() {
  favoriting.value = true
  try {
    const data = await favorite(id)
    q.value.isFavorite = data.favorited
    ElMessage.success(data.favorited ? '已收藏' : '已取消收藏')
  } catch {
    /* http 层已提示 */
  } finally {
    favoriting.value = false
  }
}

function reset() {
  answer.value = ''
  result.value = null
  showRef.value = false
  selfJudgement.value = 'correct'
}

onMounted(load)
</script>

<template>
  <div v-loading="loading" class="page">
    <template v-if="q">
      <el-card class="card" shadow="never">
        <template #header>
          <div class="head">
            <div class="head-tags">
              <el-tag v-if="q.category" size="small" effect="plain">{{ q.category }}</el-tag>
              <el-tag v-if="q.position" size="small" type="warning" effect="plain">{{ q.position }}</el-tag>
              <el-tag v-if="q.region" size="small" type="warning" effect="plain">{{ q.region }}</el-tag>
              <el-tag v-if="q.sourceType" size="small" type="info" effect="plain">{{ q.sourceType }}</el-tag>
              <el-tag v-if="q.year" size="small" type="info" effect="plain">{{ q.year }}</el-tag>
            </div>
            <el-button :type="q.isFavorite ? 'warning' : 'default'" size="small" :loading="favoriting" @click="toggleFavorite">
              {{ q.isFavorite ? '★ 已收藏' : '☆ 收藏' }}
            </el-button>
          </div>
        </template>
        <div class="q-content">{{ q.content }}</div>
        <div v-if="q.detail" class="q-detail">{{ q.detail }}</div>
      </el-card>

      <el-card v-if="!result" class="card" shadow="never">
        <template #header>✍️ 我的作答</template>
        <el-input
          v-model="answer"
          type="textarea"
          :rows="6"
          placeholder="请按「观点 → 分析 → 对策」的结构化思路作答…"
        />
        <div class="self-judge">
          <span class="judge-label">自评：</span>
          <el-radio-group v-model="selfJudgement">
            <el-radio-button value="correct">回答正确</el-radio-button>
            <el-radio-button value="wrong">回答欠佳</el-radio-button>
          </el-radio-group>
          <span class="judge-tip">自评回答欠佳将进入错题本，AI 会生成专属解析</span>
        </div>
        <div class="actions">
          <el-button type="primary" :loading="submitting" @click="doSubmit">提交作答</el-button>
        </div>
      </el-card>

      <el-card v-else class="card" shadow="never">
        <template #header>📋 作答结果</template>
        <el-alert
          :type="result.isCorrect ? 'success' : 'warning'"
          :title="result.isCorrect ? `回答正确，+${result.gainedPoints} 成长值` : '已加入错题本，查看 AI 解析'"
          :closable="false"
          show-icon
        />
        <div v-if="result.wrong" class="analysis">
          <div class="analysis-label">🤖 AI 错题解析</div>
          <div v-if="result.wrong.aiAnalysis" class="analysis-text">{{ result.wrong.aiAnalysis }}</div>
          <div v-else class="analysis-text dim">解析生成中，稍后可在错题本查看</div>
        </div>
        <div class="actions">
          <el-button type="primary" plain @click="reset">再练一题</el-button>
        </div>
      </el-card>

      <el-card class="card" shadow="never">
        <template #header>
          <div class="ref-head">
            <span>💡 参考答案</span>
            <el-button size="small" text type="primary" @click="showRef = !showRef">
              {{ showRef ? '收起' : '查看' }}
            </el-button>
          </div>
        </template>
        <div v-if="showRef" class="ref-answer">
          <div v-if="q.referenceAnswer">{{ q.referenceAnswer }}</div>
          <el-empty v-else description="该题暂未收录参考答案" :image-size="60" />
        </div>
        <div v-else class="ref-hidden">点击「查看」展开参考答案，建议先作答再对照</div>
      </el-card>
    </template>
  </div>
</template>

<style scoped>
.page {
  max-width: 860px;
  margin: 0 auto;
}
.card {
  margin-bottom: 16px;
}
.head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.head-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.q-content {
  font-size: 16px;
  color: #303133;
  line-height: 1.8;
  font-weight: 500;
}
.q-detail {
  margin-top: 12px;
  padding: 12px 14px;
  border-radius: 8px;
  background: #f5f7fa;
  font-size: 13px;
  color: #606266;
  line-height: 1.8;
}
.self-judge {
  margin-top: 14px;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.judge-label {
  font-size: 14px;
  color: #606266;
}
.judge-tip {
  font-size: 12px;
  color: #c0c4cc;
}
.actions {
  margin-top: 14px;
  display: flex;
  gap: 10px;
}
.analysis {
  margin-top: 14px;
  padding: 14px 16px;
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
.ref-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.ref-answer {
  font-size: 14px;
  color: #303133;
  line-height: 1.9;
  white-space: pre-wrap;
}
.ref-hidden {
  font-size: 13px;
  color: #c0c4cc;
  text-align: center;
  padding: 8px 0;
}
</style>
