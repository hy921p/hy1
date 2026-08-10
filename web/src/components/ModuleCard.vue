<script setup lang="ts">
// 通用模块入口卡：图标 + 标题 + 描述 + 可选角标
defineProps<{ icon: string; title: string; desc: string; tag?: string }>()
</script>

<template>
  <div class="module-card">
    <div class="icon">{{ icon }}</div>
    <div class="title">{{ title }}</div>
    <div class="desc">{{ desc }}</div>
    <div v-if="tag" class="tag">{{ tag }}</div>
  </div>
</template>

<style scoped>
.module-card {
  position: relative;
  padding: 22px 18px;
  border: 1px solid #ebeef5;
  border-radius: 12px;
  background: #fff;
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
}
.module-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(31, 45, 61, 0.1);
  border-color: #c6e2ff;
}
.icon {
  font-size: 32px;
}
.title {
  margin-top: 10px;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}
.desc {
  margin-top: 6px;
  font-size: 12px;
  color: #909399;
  line-height: 1.6;
}
.tag {
  position: absolute;
  top: 10px;
  right: 10px;
  padding: 1px 8px;
  border-radius: 999px;
  background: #fdf6ec;
  color: #e6a23c;
  font-size: 11px;
}
</style>
