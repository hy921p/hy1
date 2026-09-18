/**
 * axios 统一封装
 * - 请求拦截：自动附加 JWT + GET 偏好注入（position/region 作为 query 参数，§13.2）
 * - 响应拦截：解包 §6 统一响应 {code,data,message}，code=0 返回 data
 * - 401(2001) 自动跳登录
 */
import axios from 'axios'
import { ElMessage } from 'element-plus'

export const TOKEN_KEY = 'ai_zhimian_token'
export const PREF_KEY = 'ai_zhimian_pref'

const http = axios.create({ baseURL: '/api/v1', timeout: 60000 })

http.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) config.headers.Authorization = `Bearer ${token}`
  // 偏好注入：所有 GET 请求自动带 position/region（读 localStorage，避免循环依赖 store）
  if (config.method?.toUpperCase() === 'GET') {
    try {
      const pref = JSON.parse(localStorage.getItem(PREF_KEY) || 'null')
      if (pref?.position || pref?.region) {
        config.params = { ...(config.params || {}), position: pref.position, region: pref.region }
      }
    } catch {
      /* ignore */
    }
  }
  return config
})

http.interceptors.response.use(
  (res) => {
    const body = res.data
    if (body && body.code === 0) return body.data
    ElMessage.error(body?.message || '请求失败')
    return Promise.reject(new Error(body?.message || '请求失败'))
  },
  (err) => {
    const body = err.response?.data
    if (body?.code === 2001) {
      ElMessage.error('登录已过期，请重新登录')
      localStorage.removeItem(TOKEN_KEY)
      if (!location.pathname.startsWith('/login')) location.href = '/login'
    } else {
      ElMessage.error(body?.message || err.message || '网络错误')
    }
    return Promise.reject(err)
  },
)

export default http
