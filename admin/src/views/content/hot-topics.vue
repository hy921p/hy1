<script setup lang="ts">
// 热点管理
import CrudPage, { type ColumnConfig, type FormField } from './CrudPage.vue'

const apiType = 'hot-topics'
const columns: ColumnConfig[] = [
  { title: 'ID', dataIndex: 'id', width: 70 },
  { title: '标题', dataIndex: 'title', ellipsis: true },
  { title: '岗位', dataIndex: 'position', width: 100 },
  { title: '地区', dataIndex: 'region', width: 100 },
  { title: '浏览量', dataIndex: 'views', width: 90, align: 'center' },
  { title: '发布日期', dataIndex: 'publish_date', width: 120 },
  { title: '状态', dataIndex: 'is_active', type: 'status', width: 80 },
  { title: '操作', key: 'action', width: 150 },
]
const formFields: FormField[] = [
  { name: 'title', label: '标题', required: true },
  { name: 'summary', label: '摘要', type: 'textarea', rows: 2 },
  { name: 'content', label: '正文', type: 'textarea', rows: 6 },
  { name: 'position', label: '岗位', placeholder: '如：综合岗（可空=通用）' },
  { name: 'region', label: '地区', placeholder: '如：广东省（可空=全国）' },
  { name: 'cover', label: '封面图 URL' },
  { name: 'views', label: '浏览量', type: 'number' },
  { name: 'publish_date', label: '发布日期', type: 'date' },
  { name: 'is_active', label: '是否启用', type: 'switch' },
]
</script>

<template>
  <CrudPage :api-type="apiType" page-title="热点管理" :columns="columns" :form-fields="formFields" />
</template>
