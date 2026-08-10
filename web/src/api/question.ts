/** 题库（§7.11）：四入口 + 九题型 + 答题/错题/收藏 */
import http from './http'
import type { Paginated } from './types'

/** 列表行（raw snake_case） */
export interface QuestionRow {
  id: number
  content: string
  category: string
  position: string
  region: string
  source_type: string
  year: string
  type: number
  difficulty: string
  usage_count: number
  created_at: string
}

export interface WrongRow {
  id: number
  question_id: number
  wrong_count: number
  ai_analysis: string | null
  mastered: number
  last_wrong_at: string
  content: string
  category: string
  position: string
  region: string
  type: number
  difficulty: string
}

export function list(params?: {
  category?: string
  sourceType?: string
  keyword?: string
  sort?: string
  page?: number
  pageSize?: number
}) {
  return http.get('/questions', { params }) as unknown as Promise<Paginated<QuestionRow>>
}

export function categories() {
  return http.get('/questions/categories') as unknown as Promise<{ category: string; count: number }[]>
}

export function sourceTypes() {
  return http.get('/questions/source-types') as unknown as Promise<
    { type: string; label: string; description: string }[]
  >
}

export function hot() {
  return http.get('/questions/hot') as unknown as Promise<
    {
      id: number
      content: string
      detail: string
      category: string
      position: string
      region: string
      difficulty: string
      reference_answer: string
    }[]
  >
}

export function real(params?: { page?: number; pageSize?: number }) {
  return http.get('/questions/real', { params }) as unknown as Promise<Paginated<QuestionRow>>
}

export function favorites(params?: { page?: number; pageSize?: number }) {
  return http.get('/questions/favorites', { params }) as unknown as Promise<Paginated<any>>
}

export function wrong(params?: { page?: number; pageSize?: number }) {
  return http.get('/questions/wrong', { params }) as unknown as Promise<Paginated<WrongRow>>
}

export function practice(params?: { limit?: number }) {
  return http.get('/questions/practice', { params }) as unknown as Promise<QuestionRow[]>
}

export function search(params?: { keyword?: string; category?: string; page?: number; pageSize?: number }) {
  return http.get('/questions/search', { params }) as unknown as Promise<Paginated<QuestionRow>>
}

export interface QuestionDetail {
  id: number
  content: string
  detail: string
  category: string
  position: string
  region: string
  sourceType: string
  year: string
  type: number
  difficulty: string
  referenceAnswer: string
  tags: string[]
  isFavorite: boolean
}

export function detail(id: number | string) {
  return http.get(`/questions/${id}`) as unknown as Promise<QuestionDetail>
}

export function submit(id: number | string, payload: { userAnswer: string; isCorrect?: boolean; answerTime?: number }) {
  return http.post(`/questions/${id}/submit`, payload) as unknown as Promise<{
    isCorrect: boolean
    gainedPoints: number
    wrong: null | { questionId: number; wrongCount: number; aiAnalysis: string | null; mastered: boolean }
  }>
}

export function favorite(id: number | string) {
  return http.post(`/questions/${id}/favorite`) as unknown as Promise<{ favorited: boolean }>
}

export function markMastered(id: number | string) {
  return http.put(`/questions/wrong/${id}/mastered`) as unknown as Promise<{ mastered: boolean }>
}
