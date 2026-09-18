/** 今日任务（默认任务 + 用户自建，§7.5） */
import http from './http'

export interface CustomTask {
  id: number
  title: string
  estMinutes: number | null
  isDefault: boolean
  status: number
  createdAt: string
}

export function createCustomTask(data: { title: string; estMinutes?: number | null }) {
  return http.post('/custom-tasks', data) as unknown as Promise<CustomTask>
}

export function listCustomTasks(status?: 0 | 1) {
  const qs = status !== undefined ? `?status=${status}` : ''
  return http.get(`/custom-tasks${qs}`) as unknown as Promise<CustomTask[]>
}

/** 勾选/取消勾选（done=true 划横线完成，false 恢复原状） */
export function toggleCustomTask(id: number, done: boolean) {
  return http.put(`/custom-tasks/${id}/done`, { done }) as unknown as Promise<null>
}

export function deleteCustomTask(id: number) {
  return http.delete(`/custom-tasks/${id}`) as unknown as Promise<null>
}
