<script setup lang="ts">
// 通知推送：上推送达卡片 + 发送记录表格
import { onMounted, reactive, ref } from 'vue'
import { message } from 'ant-design-vue'
import { pushNotification, getNotifyRecords, type NotifyRecord } from '../../api/admin'

const TYPES = [
  { label: '系统通知', value: 'system' },
  { label: '点赞', value: 'like' },
  { label: 'AI 答疑', value: 'ai_answer' },
  { label: '成就勋章', value: 'achievement' },
  { label: '会员', value: 'membership' },
  { label: '打卡提醒', value: 'checkin' },
  { label: '评论', value: 'comment' },
]

// ===== 推送表单 =====
const pushing = ref(false)
const pushForm = reactive({
  target: 'all' as 'all' | 'single',
  userId: undefined as number | undefined,
  type: 'system',
  title: '',
  content: '',
})

async function onPush() {
  if (!pushForm.title.trim()) {
    message.warning('请输入通知标题')
    return
  }
  if (pushForm.target === 'single' && !pushForm.userId) {
    message.warning('请填写目标用户 ID')
    return
  }
  pushing.value = true
  try {
    const res = await pushNotification({
      target: pushForm.target,
      userId: pushForm.target === 'single' ? pushForm.userId : undefined,
      type: pushForm.type,
      title: pushForm.title,
      content: pushForm.content || undefined,
    })
    message.success(`已推送 ${res.sent} 条`)
    pushForm.title = ''
    pushForm.content = ''
    if (pushForm.target === 'all') load()
    else page.value = 1, load()
  } catch {
    /* 已提示 */
  } finally {
    pushing.value = false
  }
}

// ===== 发送记录 =====
const loading = ref(false)
const list = ref<NotifyRecord[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)

async function load() {
  loading.value = true
  try {
    const data = await getNotifyRecords({ page: page.value, pageSize: pageSize.value })
    list.value = data.list
    total.value = data.total
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div>
    <a-card title="📢 推送通知">
      <a-form layout="vertical" @submit.prevent="onPush">
        <a-form-item label="推送目标">
          <a-radio-group v-model:value="pushForm.target">
            <a-radio value="all">全体用户</a-radio>
            <a-radio value="single">指定用户</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item v-if="pushForm.target === 'single'" label="目标用户 ID" required>
          <a-input-number v-model:value="pushForm.userId" :min="1" style="width: 240px" placeholder="输入用户 id" />
        </a-form-item>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="通知类型">
              <a-select v-model:value="pushForm.type" style="width: 100%">
                <a-select-option v-for="t in TYPES" :key="t.value" :value="t.value">{{ t.label }}</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="通知标题" required>
              <a-input v-model:value="pushForm.title" placeholder="如：系统维护通知" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="通知内容">
          <a-textarea v-model:value="pushForm.content" :rows="3" placeholder="正文（可选）" />
        </a-form-item>
        <a-button type="primary" :loading="pushing" html-type="submit">立即推送</a-button>
      </a-form>
    </a-card>

    <a-card title="📋 发送记录" style="margin-top: 16px">
      <a-table
        :columns="[
          { title: 'ID', dataIndex: 'id', width: 70 },
          { title: '用户', dataIndex: 'user_phone', width: 130 },
          { title: '类型', dataIndex: 'type', width: 110 },
          { title: '标题', dataIndex: 'title', ellipsis: true },
          { title: '已读', dataIndex: 'is_read', width: 80 },
          { title: '发送时间', dataIndex: 'created_at', width: 170 },
        ]"
        :data-source="list"
        :loading="loading"
        :pagination="{
          current: page,
          pageSize,
          total,
          showTotal: (t: number) => `共 ${t} 条`,
          onChange: (p: number, s: number) => {
            page = p
            pageSize = s
            load()
          },
        }"
        row-key="id"
        size="middle"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'user_phone'">
            {{ record.user_phone || `#${record.user_id}` }}<template v-if="record.user_nickname">（{{ record.user_nickname }}）</template>
          </template>
          <template v-else-if="column.dataIndex === 'type'">
            {{ (TYPES.find((t) => t.value === record.type) || {}).label || record.type }}
          </template>
          <template v-else-if="column.dataIndex === 'is_read'">
            <a-tag :color="record.is_read === 1 ? 'default' : 'green'">{{ record.is_read === 1 ? '已读' : '未读' }}</a-tag>
          </template>
        </template>
      </a-table>
    </a-card>
  </div>
</template>
