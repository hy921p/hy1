<script setup lang="ts">
// 内容管理通用页：由配置驱动（columns + formFields），五类内容共用
import { onMounted, reactive, ref } from 'vue'
import { message } from 'ant-design-vue'
import { getContentList, createContent, updateContent, deleteContent } from '../../api/admin'

export interface FormField {
  name: string
  label: string
  type?: 'input' | 'textarea' | 'number' | 'switch' | 'select' | 'date'
  required?: boolean
  placeholder?: string
  rows?: number
  options?: { label: string; value: any }[]
  width?: string
}

export interface ColumnConfig {
  title: string
  dataIndex?: string
  key?: string
  width?: number
  ellipsis?: boolean
  align?: 'left' | 'center' | 'right'
  type?: 'text' | 'status' | 'hot' | 'date'
}

const props = defineProps<{
  apiType: string
  pageTitle: string
  columns: ColumnConfig[]
  formFields: FormField[]
}>()

const loading = ref(false)
const list = ref<Record<string, any>[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const keyword = ref('')

const modalOpen = ref(false)
const saving = ref(false)
const editingId = ref<number | null>(null)
const formRef = ref()
const form = reactive<Record<string, any>>({})

// 初始化表单默认值
function initForm() {
  Object.keys(form).forEach((k) => delete form[k])
  for (const f of props.formFields) {
    if (f.type === 'switch') form[f.name] = 1
    else if (f.type === 'number') form[f.name] = undefined
    else if (f.type === 'date') form[f.name] = undefined
    else form[f.name] = ''
  }
}

function rules(f: FormField): { required: boolean; message: string }[] {
  return f.required ? [{ required: true, message: `请输入${f.label}` }] : []
}

async function load() {
  loading.value = true
  try {
    const params: Record<string, any> = { page: page.value, pageSize: pageSize.value }
    if (keyword.value) params.keyword = keyword.value
    const data = await getContentList(props.apiType, params)
    list.value = data.list
    total.value = data.total
  } finally {
    loading.value = false
  }
}

function onSearch() {
  page.value = 1
  load()
}

function onReset() {
  keyword.value = ''
  onSearch()
}

function openCreate() {
  editingId.value = null
  initForm()
  modalOpen.value = true
}

function openEdit(row: Record<string, any>) {
  editingId.value = row.id
  initForm()
  for (const f of props.formFields) {
    const v = row[f.name]
    form[f.name] = f.type === 'switch' ? (v ? 1 : 0) : v ?? ''
  }
  modalOpen.value = true
}

async function onSubmit() {
  try {
    await formRef.value.validate()
  } catch {
    return
  }
  const payload: Record<string, any> = {}
  for (const f of props.formFields) {
    let v = form[f.name]
    if (f.type === 'switch') v = v ? 1 : 0
    if (v === '' || v === undefined || v === null) continue
    payload[f.name] = v
  }
  saving.value = true
  try {
    if (editingId.value) {
      await updateContent(props.apiType, editingId.value, payload)
      message.success('已更新')
    } else {
      await createContent(props.apiType, payload)
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

async function onDelete(row: Record<string, any>) {
  try {
    await deleteContent(props.apiType, row.id)
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
      <a-form layout="inline" @submit.prevent="onSearch">
        <a-form-item label="关键词">
          <a-input v-model:value="keyword" :placeholder="`搜索${pageTitle}标题`" style="width: 220px" allow-clear @pressEnter="onSearch" />
        </a-form-item>
        <a-form-item>
          <a-space>
            <a-button type="primary" html-type="submit">搜索</a-button>
            <a-button @click="onReset">重置</a-button>
            <a-button type="primary" ghost @click="openCreate">+ 新增</a-button>
          </a-space>
        </a-form-item>
      </a-form>
    </a-card>

    <a-card style="margin-top: 16px">
      <a-table
        :columns="columns"
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
          <template v-if="column.type === 'status'">
            <a-tag :color="record[column.dataIndex] === 1 ? 'green' : 'red'">
              {{ record[column.dataIndex] === 1 ? '启用' : '停用' }}
            </a-tag>
          </template>
          <template v-else-if="column.type === 'hot'">
            <a-tag :color="record[column.dataIndex] === 1 ? 'orange' : 'default'">
              {{ record[column.dataIndex] === 1 ? '热门' : '普通' }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space>
              <a @click="openEdit(record)">编辑</a>
              <a-popconfirm title="确认删除该内容？" @confirm="onDelete(record)">
                <a class="danger">删除</a>
              </a-popconfirm>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <a-modal
      v-model:open="modalOpen"
      :title="editingId ? '编辑' : '新增'"
      :confirm-loading="saving"
      width="720px"
      @ok="onSubmit"
      @cancel="modalOpen = false"
    >
      <a-form ref="formRef" :model="form" layout="vertical">
        <template v-for="f in formFields" :key="f.name">
          <a-form-item v-if="f.type === 'textarea'" :label="f.label" :name="f.name" :rules="rules(f)">
            <a-textarea v-model:value="form[f.name]" :rows="f.rows || 3" :placeholder="f.placeholder || `请输入${f.label}`" />
          </a-form-item>
          <a-form-item v-else-if="f.type === 'switch'" :label="f.label" :name="f.name" :value-prop="'checked'">
            <a-switch :checked="!!form[f.name]" @change="(v: boolean) => (form[f.name] = v ? 1 : 0)" />
          </a-form-item>
          <a-form-item v-else-if="f.type === 'select'" :label="f.label" :name="f.name" :rules="rules(f)">
            <a-select v-model:value="form[f.name]" :placeholder="f.placeholder || `请选择${f.label}`" :style="{ width: f.width || '100%' }">
              <a-select-option v-for="o in f.options" :key="o.value" :value="o.value">{{ o.label }}</a-select-option>
            </a-select>
          </a-form-item>
          <a-form-item v-else-if="f.type === 'number'" :label="f.label" :name="f.name">
            <a-input-number v-model:value="form[f.name]" style="width: 100%" :placeholder="f.placeholder || `请输入${f.label}`" />
          </a-form-item>
          <a-form-item v-else-if="f.type === 'date'" :label="f.label" :name="f.name">
            <a-date-picker v-model:value="form[f.name]" value-format="YYYY-MM-DD" style="width: 100%" placeholder="选择日期" />
          </a-form-item>
          <a-form-item v-else :label="f.label" :name="f.name" :rules="rules(f)">
            <a-input v-model:value="form[f.name]" :placeholder="f.placeholder || `请输入${f.label}`" />
          </a-form-item>
        </template>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped>
.danger {
  color: #ff4d4f;
}
</style>
