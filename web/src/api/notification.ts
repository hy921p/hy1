/** 通知（§7.17） */
import http from './http'
import type { Paginated } from './types'

export interface NotificationRow {
  id: number
  type: string
  title: string
  content: string
  payload: string
  is_read: number
  read_at: string | null
  created_at: string
}

export function list(params?: { type?: string; page?: number; pageSize?: number }) {
  return http.get('/notifications', { params }) as unknown as Promise<Paginated<NotificationRow>>
}

export function unreadCount() {
  return http.get('/notifications/unread-count') as unknown as Promise<{ total: number }>
}

export function markRead(id: number | string) {
  return http.put(`/notifications/${id}/read`) as unknown as Promise<{ read: boolean }>
}

export function markAllRead() {
  return http.put('/notifications/read-all') as unknown as Promise<{ affected: number }>
}

export function remove(id: number | string) {
  return http.delete(`/notifications/${id}`) as unknown as Promise<{ deleted: boolean }>
}
