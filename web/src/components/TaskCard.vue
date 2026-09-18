<script setup lang="ts">
// 今日任务：默认任务（每日打卡/每日晨读/学习通识知识/模拟考试）+ 用户「+」自建任务
// 每条前面一个完成圆圈：勾选 → 划横线，再点恢复原状；每条可删除；右上角 ＋ 新增。
// 「每日打卡」勾选时同时触发真实签到；变更后 emit('changed') 由首页重拉 overview。
import { reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { createCustomTask, toggleCustomTask, deleteCustomTask } from '../api/customTask'
import { checkIn, today } from '../api/checkin'

const props = defineProps<{
  tasks: { nodeId: string; title: string; estMinutes: number | null; done: boolean; isDefault: boolean }[]
}>()

const emit = defineEmits<{ (e: 'changed'): void }>()

const CHECKIN_TITLE = '每日打卡'

/* ---- 添加任务 ---- */
const dialogVisible = ref(false)
const saving = ref(false)
const form = reactive({ title: '', estMinutes: null as number | null })

function openAdd() {
  form.title = ''
  form.estMinutes = null
  dialogVisible.value = true
}

async function confirmAdd() {
  const title = form.title.trim()
  if (!title) {
    ElMessage.warning('请输入任务内容')
    return
  }
  saving.value = true
  try {
    await createCustomTask({ title, estMinutes: form.estMinutes })
    ElMessage.success('已添加任务')
    dialogVisible.value = false
    emit('changed')
  } finally {
    saving.value = false
  }
}

/* ---- 勾选 / 取消勾选（划横线） ---- */
const toggling = ref<Record<string, boolean>>({})

async function onToggle(t: { nodeId: string; title: string; done: boolean; isDefault: boolean }) {
  toggling.value[t.nodeId] = true
  try {
    const id = Number(t.nodeId.replace(/^c-/, ''))
    if (!Number.isFinite(id)) return
    const willDone = !t.done
    // 每日打卡勾选时联动真实签到：若今天已打过卡则静默跳过（不弹重复签到提示），否则签到并提示加分
    if (willDone && t.isDefault && t.title === CHECKIN_TITLE) {
      try {
        const st = await today()
        if (!st.checkedIn) {
          const data = await checkIn()
          ElMessage.success(`签到成功，+${data.points} 成长值（连续 ${data.streak} 天）`)
        }
      } catch {
        /* http 层已提示 */
      }
    }
    await toggleCustomTask(id, willDone)
    emit('changed')
  } catch {
    /* http 层已提示 */
  } finally {
    toggling.value[t.nodeId] = false
  }
}

/* ---- 删除任务 ---- */
const deleting = ref<string | null>(null)

async function onDelete(t: { nodeId: string; title: string; isDefault: boolean }) {
  const id = Number(t.nodeId.replace(/^c-/, ''))
  if (!Number.isFinite(id)) return
  deleting.value = t.nodeId
  try {
    await deleteCustomTask(id)
    ElMessage.success(t.isDefault ? '已删除默认任务' : '任务已删除')
    emit('changed')
  } catch {
    /* http 层已提示 */
  } finally {
    deleting.value = null
  }
}
</script>

<template>
  <div class="task-card">
    <div class="tc-head">
      <span>✅ 今日任务</span>
      <el-button class="tc-add" circle size="small" title="添加任务" @click="openAdd">＋</el-button>
    </div>
    <div class="tc-list">
      <div v-for="t in tasks" :key="t.nodeId" class="tc-item" :class="{ done: t.done }">
        <span
          class="tc-circle"
          :class="{ checked: t.done }"
          :title="t.done ? '取消勾选' : '标记完成'"
          @click.stop="onToggle(t)"
        >{{ t.done ? '✓' : '' }}</span>
        <span class="tc-title">{{ t.title }}</span>
        <span v-if="t.estMinutes" class="tc-min">{{ t.estMinutes }}min</span>
        <span
          class="tc-del"
          :class="{ loading: deleting === t.nodeId }"
          title="删除任务"
          @click.stop="onDelete(t)"
        >×</span>
      </div>
      <el-empty v-if="!tasks.length" description="暂无任务，点右上角 ＋ 添加任务" :image-size="60" />
    </div>

    <el-dialog v-model="dialogVisible" title="添加今日任务" width="380px" :close-on-click-modal="false">
    <div class="add-form">
      <div class="add-field">
        <label class="add-label">任务内容</label>
        <el-input
          v-model="form.title"
          placeholder="例如：复盘昨天的面试题"
          maxlength="120"
          show-word-limit
          @keyup.enter="confirmAdd"
        />
      </div>
      <div class="add-field">
        <label class="add-label">预计耗时（分钟，可选）</label>
        <el-input-number v-model="form.estMinutes" :min="0" :max="600" :controls="false" placeholder="可不填" class="add-min" />
      </div>
    </div>
    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" :loading="saving" @click="confirmAdd">添加</el-button>
    </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.task-card {
  padding: 2px 0;
}
.tc-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 15px;
  font-weight: 700;
  color: #303133;
  margin-bottom: 10px;
}
.tc-add {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  padding: 0;
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  background: var(--app-primary);
  border: 0;
  line-height: 1;
}
.tc-add:hover {
  background: var(--app-primary-mid);
}
.tc-list {
  min-height: 40px;
}
.tc-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 8px;
  border-radius: 8px;
  background: #f7f8fa;
  margin-bottom: 6px;
  font-size: 13px;
  transition: background 0.2s;
}
.tc-item:hover {
  background: #eef1f6;
}
/* 完成圈圈：未勾选空心圆，勾选实心打勾，任务划横线 */
.tc-circle {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 1.5px solid var(--app-primary);
  color: #fff;
  font-size: 11px;
  line-height: 15px;
  text-align: center;
  cursor: pointer;
  background: transparent;
  transition: background 0.2s;
}
.tc-circle:hover {
  background: var(--el-color-primary-light-6);
}
.tc-circle.checked {
  background: var(--app-primary);
}
.tc-title {
  flex: 1;
  color: #303133;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  transition: color 0.2s;
}
.tc-item.done .tc-title {
  text-decoration: line-through;
  color: #c0c4cc;
}
.tc-min {
  flex-shrink: 0;
  font-size: 11px;
  color: #c0c4cc;
}
.tc-item.done .tc-min {
  color: #dcdfe6;
}
/* 删除按钮：默认隐藏，悬停行出现 */
.tc-del {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  font-size: 13px;
  line-height: 16px;
  text-align: center;
  color: #c0c4cc;
  cursor: pointer;
  opacity: 0;
  transition: all 0.15s;
}
.tc-item:hover .tc-del {
  opacity: 1;
}
.tc-del:hover {
  color: #fff;
  background: #f56c6c;
}
.tc-del.loading {
  opacity: 1;
  color: #c0c4cc;
}
.add-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.add-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.add-label {
  font-size: 13px;
  color: #606266;
}
.add-min {
  width: 100%;
}
</style>
