/**
 * 管理端请求封装
 * baseURL /api/admin；请求拦截附 Bearer token；响应拦截解 {code,data,message}。
 * code!==0 自动 message.error；2001/2003 清 token 跳 /login。
 */
import axios from 'axios'
import { message } from 'ant-design-vue'

export const TOKEN_KEY = 'admin_token'

const request = axios.create({ baseURL: '/api/admin', timeout: 20000 })

request.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

request.interceptors.response.use(
  (response) => {
    const res = response.data
    if (res && typeof res === 'object' && 'code' in res) {
      if (res.code === 0) return res.data
      if (res.code === 2001 || res.code === 2003) {
        localStorage.removeItem(TOKEN_KEY)
        message.error(res.message || '未登录或登录过期')
        if (!window.location.hash.includes('/login')) window.location.hash = '#/login'
        return Promise.reject(new Error(res.message || '未登录'))
      }
      message.error(res.message || '请求失败')
      return Promise.reject(new Error(res.message || '请求失败'))
    }
    return res
  },
  (error) => {
    const msg = error.response?.data?.message || error.message || '网络错误'
    if (msg !== 'Network Error') message.error(msg)
    return Promise.reject(error)
  },
)

/** 带类型小封装：成功响应拦截器已解包出 data */
export const http = {
  get: <T = any>(url: string, params?: Record<string, any>): Promise<T> =>
    request.get(url, { params }) as unknown as Promise<T>,
  post: <T = any>(url: string, data?: any): Promise<T> => request.post(url, data) as unknown as Promise<T>,
  put: <T = any>(url: string, data?: any): Promise<T> => request.put(url, data) as unknown as Promise<T>,
  del: <T = any>(url: string): Promise<T> => request.delete(url) as unknown as Promise<T>,
}

export default request
