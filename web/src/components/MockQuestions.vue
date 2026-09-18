<script setup lang="ts">
// 模拟试卷（内嵌 section）：两套模拟试卷卡片（模拟试卷1/2），点击进入该套试卷模拟考
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { real } from '../api/question'

const router = useRouter()
const items = ref<any[]>([])
const loading = ref(false)

async function load() {
  loading.value = true
  try {
    const data = await real({ page: 1, pageSize: 500, sourceType: 'mock' })
    items.value = data.list
  } catch {
    /* http 层已提示 */
  } finally {
    loading.value = false
  }
}

/** 按年份聚合（年份升序 → 模拟试卷1/2/…），每题 1 分 */
const papers = computed(() => {
  const map = new Map<number, number>()
  for (const q of items.value) {
    const y = q.year ? Number(q.year) : -1
    map.set(y, (map.get(y) || 0) + 1)
  }
  return [...map.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([year], idx) => {
      const count = map.get(year) || 0
      return { year, no: idx + 1, count, score: count * 1 }
    })
})

function enter(p: { year: number; no: number }) {
  router.push({ path: `/questions/mock/${p.year}`, query: { label: `模拟试卷${p.no}` } })
}

onMounted(load)
</script>

<template>
  <div class="mock-cards">
    <div class="mc-head">
      <span>🧪 模拟试卷</span>
      <span class="mc-tip">中国移动笔试模拟 · 共 {{ items.length }} 题 · 点击卡片进入模拟考</span>
    </div>

    <div v-loading="loading" class="paper-grid">
      <div v-for="p in papers" :key="p.year" class="paper-card" @click="enter(p)">
        <div class="p-head">
          <span class="p-title">模拟试卷{{ p.no }}</span>
          <span class="p-badge">中国移动</span>
        </div>
        <div class="p-stats">
          <div class="stat">
            <div class="num">{{ p.count }}</div>
            <div class="lab">题目总数</div>
          </div>
          <div class="stat-divider"></div>
          <div class="stat">
            <div class="num">{{ p.score }}</div>
            <div class="lab">总分（每题 1 分）</div>
          </div>
        </div>
        <div class="p-enter">进入练习 ›</div>
      </div>

      <el-empty v-if="!loading && !papers.length" description="暂无模拟试卷" />
    </div>
  </div>
</template>

<style scoped>
.mock-cards {
  max-width: 860px;
  margin: 0 auto;
}
.mc-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 15px;
  font-weight: 700;
  color: #303133;
  margin: 24px 0 12px;
}
.mc-tip {
  font-size: 12px;
  color: #909399;
  font-weight: normal;
}
.paper-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 16px;
  min-height: 60px;
}
.paper-card {
  padding: 18px 20px;
  border: 1px solid #ebeef5;
  border-radius: 12px;
  background: #fff;
  cursor: pointer;
  transition: all 0.2s;
}
.paper-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(31, 45, 61, 0.1);
  border-color: #f3d19e;
}
.p-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.p-title {
  font-size: 18px;
  font-weight: 700;
  color: #303133;
}
.p-badge {
  font-size: 12px;
  color: #e6a23c;
  background: #fdf6ec;
  padding: 2px 10px;
  border-radius: 999px;
}
.p-stats {
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
  color: #e6a23c;
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
.p-enter {
  font-size: 13px;
  color: #e6a23c;
  text-align: right;
}
</style>
