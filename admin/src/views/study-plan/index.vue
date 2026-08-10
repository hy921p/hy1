<script setup lang="ts">
// 学习规划：计划列表 + 增删改 + 节点抽屉（节点增删改）
import { onMounted, reactive, ref } from 'vue'
import { message } from 'ant-design-vue'
import {
  getStudyPlans,
  createStudyPlan,
  updateStudyPlan,
  deleteStudyPlan,
  getPlanNodes,
  addPlanNode,
  updatePlanNode,
  deletePlanNode,
  type StudyPlan,
  type PlanNode,
} from '../../api/admin'

const NODE_TYPES = [
  { label: '晨读打卡', value: 'checkin' },
  { label: '晨读', value: 'reading' },
  { label: '题库练习', value: 'question' },
  { label: '课程学习', value: 'course' },
  { label: '模拟面试', value: 'interview' },
  { label: '复盘回顾', value: 'review' },
]

// ===== 计划列表 =====
const loading = ref(false)
const list = ref<StudyPlan[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)

const planModalOpen = ref(false)
const saving = ref(false)
const editingPlanId = ref<number | null>(null)
const planFormRef = ref()
const planForm = reactive<Record<string, any>>({
  name: '',
  position: '',
  region: '',
  description: '',
  is_default: 0,
})

async function load() {
  loading.value = true
  try {
    const data = await getStudyPlans({ page: page.value, pageSize: pageSize.value })
    list.value = data.list
    total.value = data.total
  } finally {
    loading.value = false
  }
}

function openPlanCreate() {
  editingPlanId.value = null
  Object.assign(planForm, { name: '', position: '', region: '', description: '', is_default: 0 })
  planModalOpen.value = true
}

function openPlanEdit(row: StudyPlan) {
  editingPlanId.value = row.id
  Object.assign(planForm, {
    name: row.name,
    position: row.position || '',
    region: row.region || '',
    description: row.description || '',
    is_default: row.is_default || 0,
  })
  planModalOpen.value = true
}

async function onPlanSubmit() {
  try {
    await planFormRef.value.validate()
  } catch {
    return
  }
  const payload: Record<string, any> = { ...planForm }
  for (const k of ['position', 'region', 'description']) {
    if (!payload[k]) delete payload[k]
  }
  saving.value = true
  try {
    if (editingPlanId.value) {
      await updateStudyPlan(editingPlanId.value, payload)
      message.success('已更新')
    } else {
      await createStudyPlan(payload)
      message.success('已创建')
    }
    planModalOpen.value = false
    load()
  } catch {
    /* 已提示 */
  } finally {
    saving.value = false
  }
}

async function onPlanDelete(row: StudyPlan) {
  try {
    await deleteStudyPlan(row.id)
    message.success('已删除')
    if (list.value.length === 1 && page.value > 1) page.value -= 1
    load()
  } catch {
    /* 已提示 */
  }
}

// ===== 节点抽屉 =====
const drawerOpen = ref(false)
const currentPlan = ref<StudyPlan | null>(null)
const nodes = ref<PlanNode[]>([])
const nodesLoading = ref(false)

const nodeModalOpen = ref(false)
const nodeSaving = ref(false)
const editingNodeId = ref<number | null>(null)
const nodeFormRef = ref()
const nodeForm = reactive<Record<string, any>>({
  title: '',
  node_type: 'reading',
  target_type: '',
  target_id: undefined,
  est_minutes: 20,
  sort_order: undefined,
  required: 1,
})

async function openNodes(row: StudyPlan) {
  currentPlan.value = row
  drawerOpen.value = true
  await loadNodes()
}

async function loadNodes() {
  if (!currentPlan.value) return
  nodesLoading.value = true
  try {
    nodes.value = await getPlanNodes(currentPlan.value.id)
  } finally {
    nodesLoading.value = false
  }
}

function openNodeCreate() {
  editingNodeId.value = null
  Object.assign(nodeForm, {
    title: '',
    node_type: 'reading',
    target_type: '',
    target_id: undefined,
    est_minutes: 20,
    sort_order: undefined,
    required: 1,
  })
  nodeModalOpen.value = true
}

function openNodeEdit(node: PlanNode) {
  editingNodeId.value = node.id
  Object.assign(nodeForm, {
    title: node.title,
    node_type: node.node_type || 'reading',
    target_type: node.target_type || '',
    target_id: node.target_id ?? undefined,
    est_minutes: node.est_minutes ?? 20,
    sort_order: node.sort_order ?? undefined,
    required: node.required ?? 1,
  })
  nodeModalOpen.value = true
}

async function onNodeSubmit() {
  if (!currentPlan.value) return
  try {
    await nodeFormRef.value.validate()
  } catch {
    return
  }
  const payload: Record<string, any> = { ...nodeForm }
  if (!payload.target_type) delete payload.target_type
  if (payload.target_id === undefined || payload.target_id === null) delete payload.target_id
  if (payload.sort_order === undefined || payload.sort_order === null) delete payload.sort_order
  nodeSaving.value = true
  try {
    if (editingNodeId.value) {
      await updatePlanNode(currentPlan.value.id, editingNodeId.value, payload)
      message.success('节点已更新')
    } else {
      await addPlanNode(currentPlan.value.id, payload)
      message.success('节点已添加')
    }
    nodeModalOpen.value = false
    loadNodes()
  } catch {
    /* 已提示 */
  } finally {
    nodeSaving.value = false
  }
}

async function onNodeDelete(node: PlanNode) {
  if (!currentPlan.value) return
  try {
    await deletePlanNode(currentPlan.value.id, node.id)
    message.success('节点已删除')
    loadNodes()
  } catch {
    /* 已提示 */
  }
}

onMounted(load)
</script>

<template>
  <div>
    <a-card class="toolbar">
      <a-space>
        <a-button type="primary" ghost @click="openPlanCreate">+ 新增规划</a-button>
      </a-space>
    </a-card>

    <a-card style="margin-top: 16px">
      <a-table
        :columns="[
          { title: 'ID', dataIndex: 'id', width: 70 },
          { title: '规划名称', dataIndex: 'name', ellipsis: true },
          { title: '岗位', dataIndex: 'position', width: 110 },
          { title: '地区', dataIndex: 'region', width: 110 },
          { title: '默认', dataIndex: 'is_default', width: 80 },
          { title: '状态', dataIndex: 'is_active', width: 80 },
          { title: '操作', key: 'action', width: 200 },
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
          <template v-if="column.dataIndex === 'is_default'">
            <a-tag :color="record.is_default === 1 ? 'gold' : 'default'">{{ record.is_default === 1 ? '是' : '否' }}</a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'is_active'">
            <a-tag :color="record.is_active === 1 ? 'green' : 'red'">{{ record.is_active === 1 ? '启用' : '停用' }}</a-tag>
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space>
              <a @click="openNodes(record)">节点</a>
              <a @click="openPlanEdit(record)">编辑</a>
              <a-popconfirm title="删除规划将一并停用其节点，确认？" @confirm="onPlanDelete(record)">
                <a class="danger">删除</a>
              </a-popconfirm>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- 规划编辑 -->
    <a-modal
      v-model:open="planModalOpen"
      :title="editingPlanId ? '编辑规划' : '新增规划'"
      :confirm-loading="saving"
      width="640px"
      @ok="onPlanSubmit"
      @cancel="planModalOpen = false"
    >
      <a-form ref="planFormRef" :model="planForm" layout="vertical">
        <a-form-item label="规划名称" name="name" :rules="[{ required: true, message: '请输入规划名称' }]">
          <a-input v-model:value="planForm.name" placeholder="如：公务员面试 30 天冲刺计划" />
        </a-form-item>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="岗位" name="position">
              <a-input v-model:value="planForm.position" placeholder="如：综合岗（可空=通用）" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="地区" name="region">
              <a-input v-model:value="planForm.region" placeholder="如：广东省（可空=全国）" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="描述" name="description">
          <a-textarea v-model:value="planForm.description" :rows="3" />
        </a-form-item>
        <a-form-item label="设为默认规划" name="is_default">
          <a-switch :checked="planForm.is_default === 1" @change="(v: boolean) => (planForm.is_default = v ? 1 : 0)" />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 节点抽屉 -->
    <a-drawer
      v-model:open="drawerOpen"
      :title="`节点管理 · ${currentPlan?.name || ''}`"
      :width="760"
      destroy-on-close
    >
      <a-space style="margin-bottom: 12px">
        <a-button type="primary" ghost @click="openNodeCreate">+ 新增节点</a-button>
        <a-button @click="loadNodes">刷新</a-button>
      </a-space>
      <a-table
        :columns="[
          { title: '排序', dataIndex: 'sort_order', width: 70, align: 'center' },
          { title: '节点标题', dataIndex: 'title', ellipsis: true },
          { title: '类型', dataIndex: 'node_type', width: 100 },
          { title: '目标', dataIndex: 'target_type', width: 90 },
          { title: '耗时(分钟)', dataIndex: 'est_minutes', width: 100, align: 'center' },
          { title: '必做', dataIndex: 'required', width: 70, align: 'center' },
          { title: '操作', key: 'action', width: 120 },
        ]"
        :data-source="nodes"
        :loading="nodesLoading"
        :pagination="false"
        row-key="id"
        size="middle"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'node_type'">
            {{ (NODE_TYPES.find((n) => n.value === record.node_type) || {}).label || record.node_type }}
          </template>
          <template v-else-if="column.dataIndex === 'required'">
            <a-tag :color="record.required === 1 ? 'blue' : 'default'">{{ record.required === 1 ? '必做' : '选做' }}</a-tag>
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space>
              <a @click="openNodeEdit(record)">编辑</a>
              <a-popconfirm title="确认删除该节点？" @confirm="onNodeDelete(record)">
                <a class="danger">删除</a>
              </a-popconfirm>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-drawer>

    <!-- 节点编辑 -->
    <a-modal
      v-model:open="nodeModalOpen"
      :title="editingNodeId ? '编辑节点' : '新增节点'"
      :confirm-loading="nodeSaving"
      width="640px"
      @ok="onNodeSubmit"
      @cancel="nodeModalOpen = false"
    >
      <a-form ref="nodeFormRef" :model="nodeForm" layout="vertical">
        <a-form-item label="节点标题" name="title" :rules="[{ required: true, message: '请输入节点标题' }]">
          <a-input v-model:value="nodeForm.title" placeholder="如：晨读 3 篇热点精读" />
        </a-form-item>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="节点类型" name="node_type">
              <a-select v-model:value="nodeForm.node_type">
                <a-select-option v-for="n in NODE_TYPES" :key="n.value" :value="n.value">{{ n.label }}</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="必做" name="required">
              <a-switch :checked="nodeForm.required === 1" @change="(v: boolean) => (nodeForm.required = v ? 1 : 0)" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="目标类型" name="target_type">
              <a-select v-model:value="nodeForm.target_type" allow-clear placeholder="关联对象类型（可空）">
                <a-select-option value="reading">晨读</a-select-option>
                <a-select-option value="question">题目</a-select-option>
                <a-select-option value="course">课程</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="目标对象 ID" name="target_id">
              <a-input-number v-model:value="nodeForm.target_id" :min="1" style="width: 100%" placeholder="对应内容 ID（可空）" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="预计耗时（分钟）" name="est_minutes">
              <a-input-number v-model:value="nodeForm.est_minutes" :min="0" style="width: 100%" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="排序" name="sort_order">
              <a-input-number v-model:value="nodeForm.sort_order" :min="0" style="width: 100%" placeholder="留空自动排末尾" />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped>
.danger {
  color: #ff4d4f;
}
</style>
