<script setup lang="ts">
// 帖子详情：内容 + 点赞切换
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { postDetail, toggleLike } from '../../api/community'

const route = useRoute()
const id = Number(route.params.id)

const post = ref<any>(null)
const loading = ref(false)
const liking = ref(false)

async function load() {
  loading.value = true
  try {
    post.value = await postDetail(id)
  } catch {
    /* http 层已提示 */
  } finally {
    loading.value = false
  }
}

async function like() {
  if (!post.value) return
  liking.value = true
  try {
    const data = await toggleLike(id)
    post.value.liked = data.liked
    post.value.likeCount = data.likeCount
    ElMessage.success(data.liked ? '已点赞' : '已取消点赞')
  } catch {
    /* http 层已提示 */
  } finally {
    liking.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="page">
    <el-card v-loading="loading" class="card" shadow="never">
      <div v-if="post">
        <div class="title">{{ post.title }}</div>
        <div class="meta">
          <span class="author">👤 {{ post.authorName }}</span>
          <span class="time">{{ (post.createdAt || '').replace('T', ' ').slice(0, 16) }}</span>
        </div>
        <div class="tags">
          <el-tag v-if="post.position" size="small" type="warning" effect="plain">{{ post.position }}</el-tag>
          <el-tag v-if="post.region" size="small" type="warning" effect="plain">{{ post.region }}</el-tag>
          <el-tag v-if="post.interviewType" size="small" effect="plain">{{ post.interviewType }}</el-tag>
          <el-tag v-if="post.result" size="small" :type="post.result === '过' ? 'success' : 'danger'" effect="plain">
            {{ post.result }}
          </el-tag>
          <el-tag v-for="t in (post.tags || [])" :key="t" size="small" effect="plain">{{ t }}</el-tag>
        </div>
        <div class="content">{{ post.content }}</div>
        <div class="footer">
          <el-button
            type="primary"
            :plain="!post.liked"
            :loading="liking"
            @click="like"
          >
            {{ post.liked ? '👍 已点赞' : '👍 点赞' }} {{ post.likeCount }}
          </el-button>
          <div class="stats">
            <span>👁 {{ post.viewCount }}</span>
            <span>💬 {{ post.commentCount }}</span>
          </div>
        </div>
      </div>
      <el-empty v-else-if="!loading" description="帖子不存在或已删除" />
    </el-card>
  </div>
</template>

<style scoped>
.page {
  max-width: 860px;
  margin: 0 auto;
}
.title {
  font-size: 20px;
  font-weight: 700;
  color: #303133;
  line-height: 1.5;
}
.meta {
  margin-top: 10px;
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 13px;
  color: #909399;
}
.meta .time {
  margin-left: auto;
  color: #c0c4cc;
}
.tags {
  margin-top: 12px;
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.content {
  margin-top: 16px;
  font-size: 14px;
  color: #303133;
  line-height: 2;
  white-space: pre-wrap;
}
.footer {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #ebeef5;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.stats {
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: #909399;
}
</style>
