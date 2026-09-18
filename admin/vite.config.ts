import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// 阶段 0：admin 起在 8082，/api 代理到后端 3000
// 生产构建：nginx 挂在 /admin/ 下，资产路径由 VITE_BASE 注入（Dockerfile 里 VITE_BASE=/admin/）
export default defineConfig({
  base: process.env.VITE_BASE || '/',
  plugins: [vue()],
  server: {
    port: 8082,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
