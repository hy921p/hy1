<script setup lang="ts">
// 账号设置：资料编辑
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { profile, updateProfile } from '../../api/user'
import { usePreferenceStore, POSITIONS, REGIONS } from '../../stores/preference'

const pref = usePreferenceStore()

const loading = ref(false)
const saving = ref(false)
const form = ref({
  nickname: '',
  avatar: '',
  gender: '',
  targetPosition: '',
  preferredRegion: '',
})

async function load() {
  loading.value = true
  try {
    const u = await profile()
    form.value = {
      nickname: u.nickname || '',
      avatar: u.avatar || '',
      gender: u.gender || '',
      targetPosition: u.targetPosition || '',
      preferredRegion: u.preferredRegion || '',
    }
  } catch {
    /* http 层已提示 */
  } finally {
    loading.value = false
  }
}

async function save() {
  if (!form.value.nickname.trim()) {
    ElMessage.warning('昵称不能为空')
    return
  }
  saving.value = true
  try {
    await updateProfile({
      nickname: form.value.nickname.trim(),
      avatar: form.value.avatar.trim() || undefined,
      gender: form.value.gender || undefined,
      targetPosition: form.value.targetPosition || undefined,
      preferredRegion: form.value.preferredRegion || undefined,
    })
    // 同步偏好 store（首页/题库等按偏好过滤）
    if (form.value.targetPosition && form.value.preferredRegion) {
      pref.set(form.value.targetPosition, form.value.preferredRegion)
    }
    ElMessage.success('保存成功')
  } catch {
    /* http 层已提示 */
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="page">
    <el-card v-loading="loading" class="card" shadow="never">
      <template #header>⚙️ 账号设置</template>
      <el-form label-position="top">
        <el-form-item label="昵称">
          <el-input v-model="form.nickname" maxlength="20" placeholder="你的昵称" />
        </el-form-item>
        <el-form-item label="头像（Emoji 或图片 URL）">
          <el-input v-model="form.avatar" placeholder="如：🦊 或 https://…" />
        </el-form-item>
        <el-form-item label="性别">
          <el-radio-group v-model="form.gender">
            <el-radio value="男">男</el-radio>
            <el-radio value="女">女</el-radio>
            <el-radio value="保密">保密</el-radio>
          </el-radio-group>
        </el-form-item>
        <div class="grid2">
          <el-form-item label="目标岗位">
            <el-select v-model="form.targetPosition" clearable placeholder="选择岗位" style="width: 100%">
              <el-option v-for="p in POSITIONS" :key="p" :label="p" :value="p" />
            </el-select>
          </el-form-item>
          <el-form-item label="目标地区">
            <el-select v-model="form.preferredRegion" clearable placeholder="选择地区" style="width: 100%">
              <el-option v-for="r in REGIONS" :key="r" :label="r" :value="r" />
            </el-select>
          </el-form-item>
        </div>
        <div class="tip">岗位/地区保存后，首页、题库、智学等内容将按新偏好过滤。</div>
      </el-form>
      <template #footer>
        <div class="actions">
          <el-button type="primary" :loading="saving" @click="save">保存</el-button>
        </div>
      </template>
    </el-card>
  </div>
</template>

<style scoped>
.page {
  max-width: 560px;
  margin: 0 auto;
}
.grid2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 16px;
}
.tip {
  font-size: 12px;
  color: #c0c4cc;
  margin-top: -8px;
}
.actions {
  display: flex;
  justify-content: flex-end;
}
</style>
