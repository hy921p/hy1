/**
 * 登录态 store：token + 用户信息持久化到 localStorage
 */
import { defineStore } from 'pinia'
import { TOKEN_KEY } from '../api/http'

const USER_KEY = 'ai_zhimian_user'

function readUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || 'null')
  } catch {
    return null
  }
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem(TOKEN_KEY) || '',
    user: readUser() as any,
  }),
  getters: {
    isLoggedIn: (s) => !!s.token,
  },
  actions: {
    setAuth(token: string, user: any) {
      this.token = token
      this.user = user
      localStorage.setItem(TOKEN_KEY, token)
      localStorage.setItem(USER_KEY, JSON.stringify(user))
    },
    logout() {
      this.token = ''
      this.user = null
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
    },
  },
})
