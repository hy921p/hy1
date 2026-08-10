/**
 * 管理员状态
 * token 持久化 localStorage（admin_token），进入页面时凭 profile 刷新 admin 信息。
 */
import { defineStore } from 'pinia'
import { adminLogin, adminProfile, adminLogout, type AdminInfo } from '../api/admin'
import { TOKEN_KEY } from '../api/request'

export const useAdminStore = defineStore('admin', {
  state: () => ({
    token: localStorage.getItem(TOKEN_KEY) || '',
    admin: null as AdminInfo | null,
  }),
  actions: {
    async login(username: string, password: string) {
      const data = await adminLogin(username, password)
      this.token = data.token
      this.admin = data.admin
      localStorage.setItem(TOKEN_KEY, data.token)
    },
    async fetchProfile() {
      if (!this.token) return
      this.admin = await adminProfile()
    },
    async logout() {
      try {
        await adminLogout()
      } catch {
        /* 忽略 */
      }
      this.token = ''
      this.admin = null
      localStorage.removeItem(TOKEN_KEY)
    },
  },
})
