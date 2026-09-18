<script setup lang="ts">
// 视频课程
import CrudPage, { type ColumnConfig, type FormField } from './CrudPage.vue'

const apiType = 'courses'
const columns: ColumnConfig[] = [
  { title: 'ID', dataIndex: 'id', width: 70 },
  { title: '课程标题', dataIndex: 'title', ellipsis: true },
  { title: '岗位', dataIndex: 'position', width: 100 },
  { title: '讲师', dataIndex: 'teacher', width: 100 },
  { title: '时长(分钟)', dataIndex: 'duration', width: 110, align: 'center' },
  { title: '操作', key: 'action', width: 150 },
]
const formFields: FormField[] = [
  { name: 'title', label: '课程标题', required: true },
  { name: 'position', label: '岗位', placeholder: '如：综合岗（可空=通用）' },
  { name: 'teacher', label: '讲师' },
  { name: 'duration', label: '时长（分钟）', type: 'number' },
  { name: 'cover', label: '封面图 URL' },
  { name: 'video_url', label: '视频地址' },
  { name: 'description', label: '课程简介', type: 'textarea', rows: 3 },
]
</script>

<template>
  <CrudPage :api-type="apiType" page-title="视频课程" :columns="columns" :form-fields="formFields" />
</template>
