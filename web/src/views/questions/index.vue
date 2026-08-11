<script setup lang="ts">
// 题库首页（§7.11）：搜索 + 四入口卡 + 九题型 Tabs + 专项练习列表
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { list, categories } from '../../api/question'
import QuestionCard from '../../components/QuestionCard.vue'

const router = useRouter()

const keyword = ref('')
const activeCategory = ref('')
const cats = ref<{ category: string; count: number }[]>([])
const listData = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 10
const loading = ref(false)
const searching = ref(false)

async function loadCats() {
  try {
    cats.value = await categories()
  } catch {
    /* http 层已提示 */
  }
}

async function load(opt: { category?: string; page?: number } = {}) {
  loading.value = true
  try {
    const kw = searching.value ? keyword.value.trim() : undefined
    const data = await list({
      category: opt.category ?? (activeCategory.value || undefined),
      keyword: kw,
      sort: 'latest',
      page: opt.page ?? page.value,
      pageSize,
    })
    listData.value = data.list
    total.value = data.total
    page.value = data.page
  } catch {
    /* http 层已提示 */
  } finally {
    loading.value = false
  }
}

function onTabChange(cat: string) {
  activeCategory.value = cat
  page.value = 1
  load({ category: cat })
}

function onSearch() {
  searching.value = true
  page.value = 1
  load()
}

function onClearSearch() {
  searching.value = false
  keyword.value = ''
  page.value = 1
  load()
}

function onPageChange(p: number) {
  page.value = p
  load({ page: p })
}

const ENTRIES = [
  { icon: '🔥', title: '热点推荐', desc: '每日精选高频热点题', to: '/questions/hot' },
  { icon: '📜', title: '历年真题', desc: '真实考场真题 · 按年份分类', to: '/questions/real' },
  { icon: '🧪', title: '模拟试卷', desc: '全真模拟练习 · 非真题', to: '/questions/mock' },
  { icon: '🎯', title: '专项练习', desc: '按题型分类专项训练', to: '', active: true },
]

onMounted(() => {
  loadCats()
  load()
})
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <el-input
        v-model="keyword"
        class="search"
        placeholder="搜索题目关键词…"
        clearable
        @clear="onClearSearch"
        @keyup.enter="onSearch"
      >
        <template #append>
          <el-button @click="onSearch">搜索</el-button>
        </template>
      </el-input>
      <el-button v-if="searching" type="primary" text @click="onClearSearch">退出搜索，返回专项练习</el-button>
    </div>

    <div class="entry-grid">
      <div
        v-for="e in ENTRIES"
        :key="e.title"
        class="entry"
        :class="{ active: e.active, soon: e.soon }"
        @click="e.to && router.push(e.to)"
      >
        <div class="entry-icon">{{ e.icon }}</div>
        <div class="entry-title">
          {{ e.title }}
          <el-tag v-if="e.soon" size="small" type="info">敬请期待</el-tag>
        </div>
        <div class="entry-desc">{{ e.desc }}</div>
      </div>
    </div>

    <el-card class="card" shadow="never">
      <template #header>
        <div class="card-head">
          <span>📚 专项练习</span>
          <span class="card-tip">点右上角可查看参考答案，作答后进入错题本</span>
        </div>
      </template>
      <div class="cat-tabs">
        <button
          class="cat-tab"
          :class="{ active: activeCategory === '' }"
          @click="onTabChange('')"
        >全部 ({{ cats.reduce((s, c) => s + c.count, 0) }})</button>
        <button
          v-for="c in cats"
          :key="c.category"
          class="cat-tab"
          :class="{ active: activeCategory === c.category }"
          @click="onTabChange(c.category)"
        >{{ c.category }} ({{ c.count }})</button>
      </div>

      <div v-loading="loading" class="list">
        <QuestionCard v-for="q in listData" :key="q.id" :q="q" />
        <el-empty v-if="!loading && !listData.length" description="暂无匹配题目，试试切换题型或关键词" />
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
.toolbar {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 16px;
}
.search {
  max-width: 480px;
}
.entry-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}
.entry {
  padding: 18px 12px;
  border: 1px solid #ebeef5;
  border-radius: 12px;
  text-align: center;
  cursor: pointer;
  background: #fff;
  transition: all 0.2s;
}
.entry:hover:not(.active) {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(31, 45, 61, 0.08);
  border-color: #c6e2ff;
}
.entry.active {
  border-color: #409eff;
  background: #ecf5ff;
}
.entry.soon {
  cursor: default;
  opacity: 0.75;
}
.entry-icon {
  font-size: 26px;
}
.entry-title {
  margin-top: 6px;
  font-size: 15px;
  font-weight: 700;
  color: #303133;
}
.entry-desc {
  margin-top: 4px;
  font-size: 12px;
  color: #909399;
}
.card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.card-tip {
  font-size: 12px;
  color: #909399;
  font-weight: normal;
}
.cat-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}
.cat-tab {
  padding: 6px 14px;
  border: 1px solid #dcdfe6;
  border-radius: 999px;
  background: #fff;
  font-size: 13px;
  color: #606266;
  cursor: pointer;
  transition: all 0.2s;
}
.cat-tab:hover {
  color: #409eff;
  border-color: #409eff;
}
.cat-tab.active {
  background: #409eff;
  border-color: #409eff;
  color: #fff;
}
.list {
  min-height: 60px;
}
.pager {
  display: flex;
  justify-content: center;
  margin-top: 8px;
}
</style>
