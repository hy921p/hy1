/**
 * 通知 store（§13 轮询规范：30s）
 * MainLayout 挂载时 startPolling、卸载时 stopPolling。
 */
import { defineStore } from 'pinia'
import { unreadCount } from '../api/notification'

export const useNotificationStore = defineStore('notification', {
  state: () => ({ unread: 0, timer: null as ReturnType<typeof setInterval> | null }),
  actions: {
    async refresh() {
      try {
        this.unread = (await unreadCount()).total || 0
      } catch {
        /* http 层已提示 */
      }
    },
    startPolling(interval = 30000) {
      this.stopPolling()
      this.refresh()
      this.timer = setInterval(() => this.refresh(), interval)
    },
    stopPolling() {
      if (this.timer) {
        clearInterval(this.timer)
        this.timer = null
      }
    },
  },
})
