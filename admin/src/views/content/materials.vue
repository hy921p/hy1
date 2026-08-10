<script setup lang="ts">
// 面试素材
import CrudPage, { type ColumnConfig, type FormField } from './CrudPage.vue'

const apiType = 'materials'
const columns: ColumnConfig[] = [
  { title: 'ID', dataIndex: 'id', width: 70 },
  { title: '素材标题', dataIndex: 'title', ellipsis: true },
  { title: '岗位', dataIndex: 'position', width: 110 },
  { title: '类型', dataIndex: 'type', width: 90 },
  { title: '操作', key: 'action', width: 150 },
]
const formFields: FormField[] = [
  { name: 'title', label: '素材标题', required: true },
  { name: 'position', label: '岗位', placeholder: '如：公务员（可空=通用）' },
  { name: 'type', label: '类型', type: 'select', width: '100%', options: [
    { label: '金句', value: '金句' },
    { label: '案例', value: '案例' },
    { label: '名言', value: '名言' },
  ] },
  { name: 'content', label: '素材内容', type: 'textarea', rows: 6, required: true },
]
</script>

<template>
  <CrudPage :api-type="apiType" page-title="面试素材" :columns="columns" :form-fields="formFields" />
</template>
