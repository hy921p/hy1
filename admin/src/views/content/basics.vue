<script setup lang="ts">
// 通识基础
import CrudPage, { type ColumnConfig, type FormField } from './CrudPage.vue'

const apiType = 'basics'
const columns: ColumnConfig[] = [
  { title: 'ID', dataIndex: 'id', width: 70 },
  { title: '标题', dataIndex: 'title', ellipsis: true },
  { title: '岗位', dataIndex: 'position', width: 110 },
  { title: '分类', dataIndex: 'category', width: 120 },
  { title: '操作', key: 'action', width: 150 },
]
const formFields: FormField[] = [
  { name: 'title', label: '标题', required: true },
  { name: 'position', label: '岗位', placeholder: '如：综合岗（可空=通用）' },
  { name: 'category', label: '分类', placeholder: '如：法律常识 / 公共政策' },
  { name: 'content', label: '内容', type: 'textarea', rows: 6 },
]
</script>

<template>
  <CrudPage :api-type="apiType" page-title="通识基础" :columns="columns" :form-fields="formFields" />
</template>
