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
  reference_answer?: string
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
  /** 我的答案（答错时选择的选项字母/手输内容） */
  user_answer: string | null
  source_type: string
  year: string
  /** 来源分组：real 历年真题 / mock 模拟试卷 / today 今日推荐（服务层按今日推荐池标注） */
  group: 'real' | 'mock' | 'today'
  content: string
  category: string
  position: string
  region: string
  type: number
  difficulty: string
  reference_answer: string | null
  detail: string | null
}

/** 错题本来源分组计数（历年真题 / 模拟试卷 / 今日推荐） */
export interface WrongGroupCount {
  key: 'real' | 'mock' | 'today'
  label: string
  count: number
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

export function real(params?: {
  page?: number
  pageSize?: number
  year?: number | string
  sourceType?: string
}) {
  return http.get('/questions/real', { params }) as unknown as Promise<Paginated<QuestionRow>>
}

export function favorites(params?: { page?: number; pageSize?: number }) {
  return http.get('/questions/favorites', { params }) as unknown as Promise<Paginated<any>>
}

/** 错题本（考点/出错频次/关键词/来源分组筛选；返回考点列表 + 分组计数） */
export function wrong(params?: {
  page?: number
  pageSize?: number
  category?: string
  wrongCount?: number
  keyword?: string
  group?: 'real' | 'mock' | 'today'
}) {
  return http.get('/questions/wrong', { params }) as unknown as Promise<
    Paginated<WrongRow> & { categories: string[] } & { counts: WrongGroupCount[] }
  >
}

/** 再练一题：今日推荐池内换一道新题（exclude 排除本次会话已练过的题目，逗号分隔 ID） */
export function nextQuestion(exclude: number[]) {
  const qs = exclude.length ? `?exclude=${exclude.join(',')}` : ''
  return http.get(`/questions/next${qs}`) as unknown as Promise<{ id: number | null }>
}

export function practice(params?: { limit?: number }) {
  return http.get('/questions/practice', { params }) as unknown as Promise<QuestionRow[]>
}

/** 做题记录（按年份聚合；source_type 区分真题 real / 模拟试卷 mock；started/ended 为做题时间/结束时间） */
export function practiceRecords() {
  return http.get('/questions/practice-records') as unknown as Promise<{
    list: {
      year: number | string | null
      source_type: string
      total: number
      correct: number
      started: string | null
      ended: string | null
    }[]
  }>
}

/** 删除某年某试卷类型的整卷做题记录（成绩单等一并消失；仅整卷记录，单题练习不受影响） */
export function deletePracticeRecord(payload: { year: number | string; sourceType: 'real' | 'mock' }) {
  return http.delete('/questions/practice-records', { data: payload }) as unknown as Promise<{ deleted: number }>
}

/** 成绩单行：某套真题/模拟试卷的单题回顾 */
export interface ExamReportRow {
  id: number
  content: string
  category: string
  reference_answer: string | null
  detail: string | null
  user_answer: string | null
  is_correct: boolean
}

/** 成绩单（某年真题/模拟试卷全卷：题目 + 我的答案 + 正确答案 + 解析） */
export function examReport(params: { year: number | string; sourceType: 'real' | 'mock' }) {
  return http.get('/questions/exam-report', { params }) as unknown as Promise<{
    list: ExamReportRow[]
    total: number
    correct: number
    wrong: number
    unanswered: number
  }>
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

export interface ExamSubmitPayload {
  year: number | string
  answers: { questionId: number; answer: string }[]
  /** 本次做题开始时间（毫秒时间戳或 ISO 字符串；进卷时刻，用于做题记录「做题时间」） */
  startedAt?: number | string
}

export function examSubmit(payload: ExamSubmitPayload) {
  return http.post('/questions/exam-submit', payload) as unknown as Promise<{
    total: number
    correct: number
    wrong: number
    gainedPoints: number
    newRecords: number
  }>
}

export function favorite(id: number | string) {
  return http.post(`/questions/${id}/favorite`) as unknown as Promise<{ favorited: boolean }>
}

export function markMastered(id: number | string) {
  return http.put(`/questions/wrong/${id}/mastered`) as unknown as Promise<{ mastered: boolean }>
}
