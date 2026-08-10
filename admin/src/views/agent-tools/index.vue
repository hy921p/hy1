<script setup lang="ts">
// Agent 工具启停（阶段6 §10.3）：展示 5 个工具的注册信息 + 启用开关
import { onMounted, ref } from 'vue'
import { message } from 'ant-design-vue'
import { getAgentTools, toggleAgentTool, type AgentTool } from '../../api/admin'

const loading = ref(false)
const toggling = ref(false)
const list = ref<AgentTool[]>([])

async function load() {
  loading.value = true
  try {
    const data = await getAgentTools()
    list.value = data.list
  } finally {
    loading.value = false
  }
}

async function onChange(record: AgentTool, enabled: boolean) {
  toggling.value = true
  try {
    await toggleAgentTool(record.id, enabled ? 1 : 0)
    record.enabled = enabled ? 1 : 0
    message.success(`已${enabled ? '启用' : '停用'}「${record.name}」`)
  } catch {
    /* 已提示 */
  } finally {
    toggling.value = false
  }
}

onMounted(load)
</script>

<template>
  <a-card title="🤖 Agent 工具">
    <template #extra>
      <a-tag color="blue">V2.0 Agent 面试官 · 工具注册表</a-tag>
    </template>
    <a-alert
      type="info"
      show-icon
      style="margin-bottom: 16px"
      message="工具仅在启用时会被面试官 Agent 调用。score_answer 建议保持开启（用于逐轮评分并入报告）。"
    />
    <a-table
      :columns="[
        { title: '排序', dataIndex: 'sort', width: 70 },
        { title: '工具标识', dataIndex: 'key', width: 190 },
        { title: '名称', dataIndex: 'name', width: 120 },
        { title: '说明（给 LLM 看）', dataIndex: 'description', ellipsis: true },
        { title: '状态', dataIndex: 'enabled', width: 110 },
        { title: '操作', key: 'action', width: 90 },
      ]"
      :data-source="list"
      :loading="loading"
      :pagination="false"
      row-key="id"
      size="middle"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.dataIndex === 'enabled'">
          <a-tag :color="record.enabled === 1 ? 'green' : 'default'">
            {{ record.enabled === 1 ? '启用' : '停用' }}
          </a-tag>
        </template>
        <template v-else-if="column.key === 'action'">
          <a-switch
            :checked="record.enabled === 1"
            :loading="toggling"
            @change="(v: boolean) => onChange(record, v)"
          />
        </template>
      </template>
    </a-table>
  </a-card>
</template>
