<script setup lang="ts">
// 勋章墙：列表 + 刷新
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { badges, refreshBadges } from '../../api/user'

const items = ref<any[]>([])
const loading = ref(false)
const refreshing = ref(false)

async function load() {
  loading.value = true
  try {
    items.value = (await badges()) || []
  } catch {
    /* http 层已提示 */
  } finally {
    loading.value = false
  }
}

async function refresh() {
  refreshing.value = true
  try {
    const data = await refreshBadges()
    if (data.granted && data.granted.length) {
      ElMessage.success(`获得 ${data.granted.length} 个新勋章 🎉`)
    } else {
      ElMessage.success('已刷新，暂无新勋章')
    }
    load()
  } catch {
    /* http 层已提示 */
  } finally {
    refreshing.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="page">
    <el-card class="card" shadow="never">
      <template #header>
        <div class="head">
          <span>🏅 勋章墙</span>
          <el-button type="primary" size="small" :loading="refreshing" @click="refresh">刷新勋章</el-button>
        </div>
      </template>
      <div v-loading="loading" class="grid">
        <div v-for="b in items" :key="b.id" class="badge" :class="{ locked: !b.earned }">
          <div class="icon">{{ b.icon }}</div>
          <div class="name">{{ b.name }}</div>
          <div class="desc">{{ b.description }}</div>
          <div v-if="b.earned" class="state earned">已获得</div>
          <div v-else class="state">
            {{ b.currentValue }} / {{ b.conditionValue }}
          </div>
        </div>
        <el-empty v-if="!loading && !items.length" description="暂无勋章" style="grid-column: 1/-1" />
      </div>
    </el-card>
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
.grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
}
.badge {
  padding: 20px 12px;
  border-radius: 12px;
  background: #f5f7fa;
  text-align: center;
  transition: all 0.2s;
}
.badge.locked {
  opacity: 0.55;
}
.badge .icon {
  font-size: 34px;
}
.badge .name {
  margin-top: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}
.badge .desc {
  margin-top: 6px;
  font-size: 12px;
  color: #909399;
  line-height: 1.5;
  min-height: 36px;
}
.state {
  margin-top: 8px;
  font-size: 12px;
  color: #c0c4cc;
}
.state.earned {
  color: #67c23a;
  font-weight: 600;
}
</style>
