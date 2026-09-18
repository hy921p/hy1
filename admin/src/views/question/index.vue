<script setup lang="ts">
// 题库维护：搜索 + 表格 + 新增/编辑弹窗 + 删除
import { onMounted, reactive, ref } from 'vue'
import { message } from 'ant-design-vue'
import {
  getQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  type Question,
} from '../../api/admin'

const TYPE_NAMES = [
  '社会现象',
  '态度观点',
  '组织管理',
  '应急应变',
  '人际关系',
  '情景模拟',
  '自我认知',
  '专业题',
  '开放论述',
]
const SOURCE_TYPES = [
  { label: '热点推荐', value: 'hot' },
  { label: '历年真题', value: 'real' },
  { label: '模拟试卷', value: 'mock' },
  { label: '专项练习', value: 'normal' },
]
const DIFFICULTIES = [
  { label: '简单', value: 1 },
  { label: '中等', value: 2 },
  { label: '困难', value: 3 },
]

const loading = ref(false)
const list = ref<Question[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)

// 搜索条件
const search = reactive<{ keyword: string; type?: number; source_type?: string; difficulty?: number }>({
  keyword: '',
  type: undefined,
  source_type: undefined,
  difficulty: undefined,
})

// 弹窗
const modalOpen = ref(false)
const saving = ref(false)
const editingId = ref<number | null>(null)
const formRef = ref()
const form = reactive<Record<string, any>>({
  content: '',
  detail: '',
  category: '',
  industry: '',
  position: '',
  region: '',
  source_type: 'normal',
  year: undefined,
  type: 1,
  difficulty: 2,
  reference_answer: '',
  tagsText: '',
  status: 1,
})

async function load() {
  loading.value = true
  try {
    const params: Record<string, any> = { page: page.value, pageSize: pageSize.value }
    if (search.keyword) params.keyword = search.keyword
    if (search.type !== undefined && search.type !== null) params.type = search.type
    if (search.source_type) params.source_type = search.source_type
    if (search.difficulty !== undefined && search.difficulty !== null) params.difficulty = search.difficulty
    const data = await getQuestions(params)
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
  search.keyword = ''
  search.type = undefined
  search.source_type = undefined
  search.difficulty = undefined
  onSearch()
}

function openCreate() {
  editingId.value = null
  Object.assign(form, {
    content: '',
    detail: '',
    category: '',
    industry: '',
    position: '',
    region: '',
    source_type: 'normal',
    year: undefined,
    type: 1,
    difficulty: 2,
    reference_answer: '',
    tagsText: '',
    status: 1,
  })
  modalOpen.value = true
}

function openEdit(row: Question) {
  editingId.value = row.id
  const tags = Array.isArray(row.tags) ? row.tags : typeof row.tags === 'string' ? JSON.parse(row.tags || '[]') : []
  Object.assign(form, {
    content: row.content || '',
    detail: row.detail || '',
    category: row.category || '',
    industry: row.industry || '',
    position: row.position || '',
    region: row.region || '',
    source_type: row.source_type || 'normal',
    year: row.year ?? undefined,
    type: row.type || 1,
    difficulty: row.difficulty || 2,
    reference_answer: row.reference_answer || '',
    tagsText: tags.join('，'),
    status: row.status ?? 1,
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
  payload.tags = (payload.tagsText || '')
    .split(/[,，]/)
    .map((t: string) => t.trim())
    .filter(Boolean)
  delete payload.tagsText
  saving.value = true
  try {
    if (editingId.value) {
      await updateQuestion(editingId.value, payload)
      message.success('已更新')
    } else {
      await createQuestion(payload)
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

async function onDelete(row: Question) {
  try {
    await deleteQuestion(row.id)
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
          <a-input v-model:value="search.keyword" placeholder="题目内容/岗位/地区" style="width: 200px" @pressEnter="onSearch" />
        </a-form-item>
        <a-form-item label="题型">
          <a-select v-model:value="search.type" placeholder="全部题型" allow-clear style="width: 140px">
            <a-select-option v-for="(n, i) in TYPE_NAMES" :key="i + 1" :value="i + 1">{{ n }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="来源">
          <a-select v-model:value="search.source_type" placeholder="全部来源" allow-clear style="width: 130px">
            <a-select-option v-for="s in SOURCE_TYPES" :key="s.value" :value="s.value">{{ s.label }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="难度">
          <a-select v-model:value="search.difficulty" placeholder="全部难度" allow-clear style="width: 120px">
            <a-select-option v-for="d in DIFFICULTIES" :key="d.value" :value="d.value">{{ d.label }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-space>
            <a-button type="primary" html-type="submit">搜索</a-button>
            <a-button @click="onReset">重置</a-button>
            <a-button type="primary" ghost @click="openCreate">+ 新增题目</a-button>
          </a-space>
        </a-form-item>
      </a-form>
    </a-card>

    <a-card style="margin-top: 16px">
      <a-table
        :columns="[
          { title: 'ID', dataIndex: 'id', width: 70 },
          { title: '题目', dataIndex: 'content', ellipsis: true },
          { title: '题型', dataIndex: 'type', width: 90 },
          { title: '难度', dataIndex: 'difficulty', width: 80 },
          { title: '来源', dataIndex: 'source_type', width: 100 },
          { title: '状态', dataIndex: 'status', width: 80 },
          { title: '操作', key: 'action', width: 160 },
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
          <template v-if="column.dataIndex === 'type'">
            {{ TYPE_NAMES[record.type - 1] || record.type }}
          </template>
          <template v-else-if="column.dataIndex === 'difficulty'">
            <a-tag :color="['', 'green', 'orange', 'red'][record.difficulty] || ''">
              {{ ['', '简单', '中等', '困难'][record.difficulty] || record.difficulty }}
            </a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'source_type'">
            {{ (SOURCE_TYPES.find((s) => s.value === record.source_type) || {}).label || record.source_type }}
          </template>
          <template v-else-if="column.dataIndex === 'status'">
            <a-tag :color="record.status === 1 ? 'green' : 'red'">{{ record.status === 1 ? '启用' : '停用' }}</a-tag>
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space>
              <a @click="openEdit(record)">编辑</a>
              <a-popconfirm title="确认删除该题目？" @confirm="onDelete(record)">
                <a class="danger">删除</a>
              </a-popconfirm>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <a-modal
      v-model:open="modalOpen"
      :title="editingId ? '编辑题目' : '新增题目'"
      :confirm-loading="saving"
      width="720px"
      @ok="onSubmit"
      @cancel="modalOpen = false"
    >
      <a-form ref="formRef" :model="form" layout="vertical">
        <a-form-item label="题目内容" name="content" :rules="[{ required: true, message: '请输入题目内容' }]">
          <a-textarea v-model:value="form.content" :rows="3" placeholder="面试题目正文" />
        </a-form-item>
        <a-form-item label="题目详解" name="detail">
          <a-textarea v-model:value="form.detail" :rows="3" placeholder="补充说明（可选）" />
        </a-form-item>
        <a-row :gutter="12">
          <a-col :span="8">
            <a-form-item label="题型" name="type">
              <a-select v-model:value="form.type">
                <a-select-option v-for="(n, i) in TYPE_NAMES" :key="i + 1" :value="i + 1">{{ n }}</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="难度" name="difficulty">
              <a-select v-model:value="form.difficulty">
                <a-select-option v-for="d in DIFFICULTIES" :key="d.value" :value="d.value">{{ d.label }}</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="来源" name="source_type">
              <a-select v-model:value="form.source_type">
                <a-select-option v-for="s in SOURCE_TYPES" :key="s.value" :value="s.value">{{ s.label }}</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="分类" name="category">
              <a-input v-model:value="form.category" placeholder="如：综合分析" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="所属年份" name="year">
              <a-input-number v-model:value="form.year" :min="2000" :max="2100" style="width: 100%" placeholder="如 2025" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="12">
          <a-col :span="8">
            <a-form-item label="行业" name="industry">
              <a-input v-model:value="form.industry" placeholder="如：公务员" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="岗位" name="position">
              <a-input v-model:value="form.position" placeholder="如：综合岗" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="地区" name="region">
              <a-input v-model:value="form.region" placeholder="如：广东省" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="参考回答" name="reference_answer">
          <a-textarea v-model:value="form.reference_answer" :rows="4" placeholder="答题思路与参考要点" />
        </a-form-item>
        <a-form-item label="标签" name="tagsText">
          <a-input v-model:value="form.tagsText" placeholder="多个标签用逗号分隔，如：时政，民生，热点" />
        </a-form-item>
        <a-form-item label="状态" name="status">
          <a-radio-group v-model:value="form.status">
            <a-radio :value="1">启用</a-radio>
            <a-radio :value="0">停用</a-radio>
          </a-radio-group>
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
