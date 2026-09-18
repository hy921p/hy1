<script setup lang="ts">
// 发布帖子
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { createPost } from '../../api/community'

const router = useRouter()
const saving = ref(false)
const form = ref({
  title: '',
  content: '',
  position: '',
  region: '',
  tags: '',
  interviewType: '',
  result: '',
})

async function submit() {
  if (!form.value.title.trim()) {
    ElMessage.warning('标题不能为空')
    return
  }
  if (!form.value.content.trim()) {
    ElMessage.warning('内容不能为空')
    return
  }
  saving.value = true
  try {
    const tags = form.value.tags
      .split(/[,，]/)
      .map((t) => t.trim())
      .filter(Boolean)
    const data = await createPost({
      title: form.value.title.trim(),
      content: form.value.content.trim(),
      position: form.value.position.trim() || undefined,
      region: form.value.region.trim() || undefined,
      tags,
      interviewType: form.value.interviewType.trim() || undefined,
      result: form.value.result.trim() || undefined,
    })
    ElMessage.success('发布成功')
    router.replace(`/community/post/${data.postId}`)
  } catch {
    /* http 层已提示 */
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="page">
    <el-card class="card" shadow="never">
      <template #header>📝 发布帖子</template>
      <el-form label-position="top">
        <el-form-item label="标题（必填）">
          <el-input v-model="form.title" maxlength="100" show-word-limit placeholder="一句话说清你的问题/分享" />
        </el-form-item>
        <el-form-item label="内容（必填）">
          <el-input
            v-model="form.content"
            type="textarea"
            :rows="10"
            maxlength="2000"
            show-word-limit
            placeholder="详细描述你的问题背景、已尝试的思路、想请教的方向…"
          />
        </el-form-item>
        <div class="grid2">
          <el-form-item label="岗位（可选）">
            <el-input v-model="form.position" placeholder="如：公务员" />
          </el-form-item>
          <el-form-item label="地区（可选）">
            <el-input v-model="form.region" placeholder="如：四川" />
          </el-form-item>
          <el-form-item label="面试类型（可选）">
            <el-select v-model="form.interviewType" clearable placeholder="选择类型" style="width: 100%">
              <el-option label="结构化面试" value="结构化面试" />
              <el-option label="无领导小组" value="无领导小组" />
              <el-option label="半结构化" value="半结构化" />
              <el-option label="事业单位" value="事业单位" />
              <el-option label="教资" value="教资" />
              <el-option label="其他" value="其他" />
            </el-select>
          </el-form-item>
          <el-form-item label="结果（可选）">
            <el-radio-group v-model="form.result">
              <el-radio value="过">✅ 已过</el-radio>
              <el-radio value="没过">❌ 没过</el-radio>
            </el-radio-group>
          </el-form-item>
        </div>
        <el-form-item label="标签（可选，用逗号分隔）">
          <el-input v-model="form.tags" placeholder="如：面经, 真题, 心态" />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="actions">
          <el-button @click="router.back()">取消</el-button>
          <el-button type="primary" :loading="saving" @click="submit">发布</el-button>
        </div>
      </template>
    </el-card>
  </div>
</template>

<style scoped>
.page {
  max-width: 720px;
  margin: 0 auto;
}
.grid2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 16px;
}
.actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
