<script setup lang="ts">
// 勋章管理：表格 + CRUD 弹窗
import { onMounted, reactive, ref } from 'vue'
import { message } from 'ant-design-vue'
import { getBadges, createBadge, updateBadge, deleteBadge, type Badge } from '../../api/admin'

const CONDITION_TYPES = [
  { label: '打卡天数', value: 'checkin_days' },
  { label: '答题数量', value: 'answer_count' },
  { label: '成长值', value: 'growth_points' },
  { label: '面试次数', value: 'interview_count' },
  { label: '首次规划', value: 'plan_first' },
]

const loading = ref(false)
const list = ref<Badge[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)

const modalOpen = ref(false)
const saving = ref(false)
const editingId = ref<number | null>(null)
const formRef = ref()
const form = reactive<Record<string, any>>({
  name: '',
  code: '',
  icon: '',
  description: '',
  condition_type: 'checkin_days',
  condition_value: 1,
  sort: 0,
  is_active: 1,
})

async function load() {
  loading.value = true
  try {
    const data = await getBadges({ page: page.value, pageSize: pageSize.value })
    list.value = data.list
    total.value = data.total
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editingId.value = null
  Object.assign(form, {
    name: '',
    code: '',
    icon: '',
    description: '',
    condition_type: 'checkin_days',
    condition_value: 1,
    sort: 0,
    is_active: 1,
  })
  modalOpen.value = true
}

function openEdit(row: Badge) {
  editingId.value = row.id
  Object.assign(form, {
    name: row.name,
    code: row.code,
    icon: row.icon || '',
    description: row.description || '',
    condition_type: row.condition_type || 'checkin_days',
    condition_value: row.condition_value ?? 1,
    sort: row.sort ?? 0,
    is_active: row.is_active ?? 1,
  })
  modalOpen.value = true
}

async function onSubmit() {
  try {
    await formRef.value.validate()
  } catch {
    return
  }
  const payload: Record<string, any> = { ...form }
  if (!payload.icon) delete payload.icon
  if (!payload.description) delete payload.description
  saving.value = true
  try {
    if (editingId.value) {
      await updateBadge(editingId.value, payload)
      message.success('已更新')
    } else {
      await createBadge(payload)
      message.success('已创建')
    }
    modalOpen.value = false
    load()
  } catch {
    /* 已提示 */
  } finally {
    saving.value = false
  }
}

async function onDelete(row: Badge) {
  try {
    await deleteBadge(row.id)
    message.success('已删除')
    if (list.value.length === 1 && page.value > 1) page.value -= 1
    load()
  } catch {
    /* 已提示 */
  }
}

onMounted(load)
</script>

<template>
  <div>
    <a-card class="toolbar">
      <a-button type="primary" ghost @click="openCreate">+ 新增勋章</a-button>
    </a-card>

    <a-card style="margin-top: 16px">
      <a-table
        :columns="[
          { title: 'ID', dataIndex: 'id', width: 70 },
          { title: '勋章', dataIndex: 'name', width: 160 },
          { title: '编码', dataIndex: 'code', width: 150 },
          { title: '图标', dataIndex: 'icon', width: 120 },
          { title: '达成条件', dataIndex: 'condition_type', width: 130 },
          { title: '阈值', dataIndex: 'condition_value', width: 80, align: 'center' },
          { title: '排序', dataIndex: 'sort', width: 80, align: 'center' },
          { title: '状态', dataIndex: 'is_active', width: 80 },
          { title: '操作', key: 'action', width: 150 },
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
          <template v-if="column.dataIndex === 'icon'">
            {{ record.icon || '—' }}
          </template>
          <template v-else-if="column.dataIndex === 'condition_type'">
            {{ (CONDITION_TYPES.find((c) => c.value === record.condition_type) || {}).label || record.condition_type }}
          </template>
          <template v-else-if="column.dataIndex === 'is_active'">
            <a-tag :color="record.is_active === 1 ? 'green' : 'red'">{{ record.is_active === 1 ? '启用' : '停用' }}</a-tag>
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space>
              <a @click="openEdit(record)">编辑</a>
              <a-popconfirm title="确认停用/删除该勋章？" @confirm="onDelete(record)">
                <a class="danger">删除</a>
              </a-popconfirm>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <a-modal
      v-model:open="modalOpen"
      :title="editingId ? '编辑勋章' : '新增勋章'"
      :confirm-loading="saving"
      width="640px"
      @ok="onSubmit"
      @cancel="modalOpen = false"
    >
      <a-form ref="formRef" :model="form" layout="vertical">
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="勋章名称" name="name" :rules="[{ required: true, message: '请输入勋章名称' }]">
              <a-input v-model:value="form.name" placeholder="如：坚持打卡 7 天" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="勋章编码 code" name="code" :rules="[{ required: true, message: '请输入编码' }]">
              <a-input v-model:value="form.code" placeholder="如：checkin_7" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="图标" name="icon">
              <a-input v-model:value="form.icon" placeholder="emoji 或图标名，如 🔥" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="排序" name="sort">
              <a-input-number v-model:value="form.sort" :min="0" style="width: 100%" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="达成条件" name="condition_type">
              <a-select v-model:value="form.condition_type">
                <a-select-option v-for="c in CONDITION_TYPES" :key="c.value" :value="c.value">{{ c.label }}</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="判定阈值" name="condition_value">
              <a-input-number v-model:value="form.condition_value" :min="0" style="width: 100%" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="描述" name="description">
          <a-textarea v-model:value="form.description" :rows="2" placeholder="勋章说明（可选）" />
        </a-form-item>
        <a-form-item label="是否启用" name="is_active">
          <a-switch :checked="form.is_active === 1" @change="(v: boolean) => (form.is_active = v ? 1 : 0)" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped>
.danger {
  color: #ff4d4f;
}
</style>
