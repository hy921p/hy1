/** 智学（§7.15）：晨读/素材/通识/课程/笔记/AI 摘要/进度 */
import http from './http'
import type { Paginated } from './types'

export interface ReadingRow {
  id: number
  title: string
  position: string
  region: string
  summary: string
  cover: string
  publish_date: string
  is_hot: number
}

export interface NoteRow {
  id: number
  title: string
  content: string
  source_type: string
  source_id: number | null
  source_title: string
  is_ai_summary: number
  created_at: string
  updated_at: string
}

export function readings(params?: { page?: number; pageSize?: number }) {
  return http.get('/learn/readings', { params }) as unknown as Promise<Paginated<ReadingRow>>
}

export function readingDetail(id: number | string) {
  return http.get(`/learn/readings/${id}`) as unknown as Promise<{
    id: number
    title: string
    position: string
    region: string
    summary: string
    content: string
    cover: string
    publishDate: string
    isHot: boolean
  }>
}

export function readingStats() {
  return http.get('/learn/readings/stats') as unknown as Promise<{ totalRead: number; streak: number }>
}

export function materials(params?: { type?: string; page?: number; pageSize?: number }) {
  return http.get('/learn/materials', { params }) as unknown as Promise<
    Paginated<{ id: number; title: string; position: string; type: string; content: string }>
  >
}

export function basics(params?: { page?: number; pageSize?: number }) {
  return http.get('/learn/basics', { params }) as unknown as Promise<
    Paginated<{ id: number; title: string; position: string; category: string; content: string }>
  >
}

export function courses(params?: { page?: number; pageSize?: number }) {
  return http.get('/learn/courses', { params }) as unknown as Promise<
    Paginated<{
      id: number
      title: string
      position: string
      cover: string
      video_url: string
      duration: number
      teacher: string
      description: string
    }>
  >
}

export function notes(params?: { page?: number; pageSize?: number; sourceType?: string }) {
  return http.get('/learn/notes', { params }) as unknown as Promise<Paginated<NoteRow>>
}

export function createNote(payload: {
  title: string
  content: string
  sourceType?: string
  sourceId?: number
  sourceTitle?: string
}) {
  return http.post('/learn/notes', payload) as unknown as Promise<{ id: number }>
}

export function updateNote(id: number | string, payload: { title: string; content: string }) {
  return http.put(`/learn/notes/${id}`, payload) as unknown as Promise<{ id: number }>
}

export function deleteNote(id: number | string) {
  return http.delete(`/learn/notes/${id}`) as unknown as Promise<{ deleted: boolean }>
}

export function aiSummary(payload: {
  content: string
  sourceType?: string
  sourceId?: number
  sourceTitle?: string
  saveToNote?: boolean
}) {
  return http.post('/learn/ai-summary', payload) as unknown as Promise<{ summary: string; noteId: number | null }>
}

export function summarizeNote(id: number | string) {
  return http.post(`/learn/notes/${id}/ai-summary`) as unknown as Promise<{ summary: string; noteId: number | null }>
}

export function progress() {
  return http.get('/learn/progress') as unknown as Promise<{
    reading: number
    question: number
    course: number
    interview: number
    studyPlan: number
    totalPoints: number
  }>
}
