<script setup lang="ts">
// 历年真题年份卡片：各年份真题卡片（题目总数 + 总分），点击进入该年份模拟考
// 用于题库首页默认区，也供 /questions/real 独立页复用
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { real } from '../api/question'

const router = useRouter()
const items = ref<any[]>([])
const loading = ref(false)

async function load() {
  loading.value = true
  try {
    const data = await real({ page: 1, pageSize: 500 })
    items.value = data.list
  } catch {
    /* http 层已提示 */
  } finally {
    loading.value = false
  }
}

/** 按年份聚合（年份降序，未标注放最后），每题 1 分 */
const years = computed(() => {
  const map = new Map<number, number>()
  for (const q of items.value) {
    const y = q.year ? Number(q.year) : -1
    map.set(y, (map.get(y) || 0) + 1)
  }
  return [...map.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([year, count]) => ({ year, count, score: count * 1 }))
})

function enter(y: { year: number }) {
  if (y.year === -1) return // 未标注年份不提供考试入口
  router.push(`/questions/real/${y.year}`)
}

onMounted(load)
</script>

<template>
  <div class="real-cards">
    <div class="rc-head">
      <span>📜 历年真题</span>
      <span class="rc-tip">中国移动真题 · 共 {{ items.length }} 题 · 点击年份卡片进入模拟考</span>
    </div>

    <div v-loading="loading" class="year-grid">
      <div
        v-for="y in years"
        :key="y.year"
        class="year-card"
        :class="{ disabled: y.year === -1 }"
        @click="enter(y)"
      >
        <div class="y-head">
          <span class="y-year">{{ y.year === -1 ? '未标注年份' : `${y.year} 年真题` }}</span>
          <span class="y-badge">中国移动</span>
        </div>
        <div class="y-stats">
          <div class="stat">
            <div class="num">{{ y.count }}</div>
            <div class="lab">题目总数</div>
          </div>
          <div class="stat-divider"></div>
          <div class="stat">
            <div class="num">{{ y.score }}</div>
            <div class="lab">总分（每题 1 分）</div>
          </div>
        </div>
        <div v-if="y.year !== -1" class="y-enter">进入练习 ›</div>
        <div v-else class="y-enter dim">暂无入口</div>
      </div>

      <el-empty v-if="!loading && !items.length" description="暂无真题" />
    </div>
  </div>
</template>

<style scoped>
.real-cards {
  max-width: 860px;
  margin: 0 auto;
}
.rc-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 15px;
  font-weight: 700;
  color: #303133;
  margin: 24px 0 12px;
}
.rc-tip {
  font-size: 12px;
  color: #909399;
  font-weight: normal;
}
.year-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 16px;
  min-height: 60px;
}
.year-card {
  padding: 18px 20px;
  border: 1px solid #ebeef5;
  border-radius: 12px;
  background: #fff;
  cursor: pointer;
  transition: all 0.2s;
}
.year-card:hover:not(.disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(31, 45, 61, 0.1);
  border-color: #c6e2ff;
}
.year-card.disabled {
  cursor: not-allowed;
  opacity: 0.6;
}
.y-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.y-year {
  font-size: 18px;
  font-weight: 700;
  color: #303133;
}
.y-badge {
  font-size: 12px;
  color: #409eff;
  background: #ecf5ff;
  padding: 2px 10px;
  border-radius: 999px;
}
.y-stats {
  margin: 16px 0 14px;
  display: flex;
  align-items: center;
  gap: 16px;
}
.stat {
  flex: 1;
  text-align: center;
}
.stat .num {
  font-size: 26px;
  font-weight: 700;
  color: #409eff;
  line-height: 1.2;
}
.stat .lab {
  margin-top: 4px;
  font-size: 12px;
  color: #909399;
}
.stat-divider {
  width: 1px;
  height: 36px;
  background: #ebeef5;
}
.y-enter {
  font-size: 13px;
  color: #409eff;
  text-align: right;
}
.y-enter.dim {
  color: #c0c4cc;
}
</style>
