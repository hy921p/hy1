/** AI 答疑（§7.14） */
import http from './http'
import type { Paginated } from './types'

export interface Citation {
  refType: string
  refId: number
  title: string
  snippet: string
}

export function ask(payload: { question: string; entry?: string; refType?: string; refId?: number }) {
  return http.post('/ai/ask', payload) as unknown as Promise<{
    answerId: number
    answer: string
    retrieved: boolean
    citations: Citation[]
  }>
}

export function context(query: string) {
  return http.get('/ai/context', { params: { question: query } }) as unknown as Promise<{
    question: string
    retrieved: boolean
    citations: Citation[]
  }>
}

export function answers(params?: { page?: number; pageSize?: number }) {
  return http.get('/ai/answers', { params }) as unknown as Promise<
    Paginated<{
      id: number
      question: string
      answer: string
      category: string
      ref_type: string
      ref_id: number
      entry: string
      citations: string
      created_at: string
    }>
  >
}

export function answerDetail(id: number | string) {
  return http.get(`/ai/answers/${id}`) as unknown as Promise<{
    id: number
    question: string
    answer: string
    category: string
    refType: string
    refId: number
    entry: string
    citations: Citation[]
    createdAt: string
  }>
}

export function deleteAnswer(id: number | string) {
  return http.delete(`/ai/answers/${id}`) as unknown as Promise<{ deleted: boolean }>
}
