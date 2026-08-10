/**
 * 管理端 API 接口层
 * 所有成功响应已被 request 拦截器解包为 data。
 */
import { http } from './request'

export interface Paginated<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

export interface AdminInfo {
  id: number
  username: string
  nickname: string
  role: string
  status?: number
  last_login_at?: string
  created_at?: string
}

// ===== 认证 =====
export const adminLogin = (username: string, password: string) =>
  http.post<{ token: string; admin: AdminInfo }>('/auth/login', { username, password })
export const adminProfile = () => http.get<AdminInfo>('/auth/profile')
export const adminLogout = () => http.post('/auth/logout')

// ===== 数据看板 =====
export interface DashboardStats {
  totalUsers: number
  totalQuestions: number
  totalInterviews: number
  completedInterviews: number
  avgScore: number
  totalPosts: number
  todayCheckIns: number
  totalAiAnswers: number
  totalBadgesIssued: number
  activePlans: number
  weekCheckIns: { date: string; count: number }[]
}
export const getDashboardStats = () => http.get<DashboardStats>('/dashboard/stats')

// ===== 题库 =====
export interface Question {
  id: number
  content: string
  detail?: string
  category?: string
  industry?: string
  position?: string
  region?: string
  source_type?: string
  year?: number
  type?: number
  difficulty?: number
  reference_answer?: string
  tags?: string[] | string
  usage_count?: number
  avg_score?: number
  status?: number
  created_at?: string
  updated_at?: string
}
export const getQuestions = (params: Record<string, any>) => http.get<Paginated<Question>>('/questions', params)
export const createQuestion = (data: Partial<Question>) => http.post<{ id: number }>('/questions', data)
export const updateQuestion = (id: number, data: Partial<Question>) => http.put(`/questions/${id}`, data)
export const deleteQuestion = (id: number) => http.del(`/questions/${id}`)

// ===== 内容管理（五类共用）=====
export const getContentList = (type: string, params: Record<string, any>) =>
  http.get<Paginated<any>>(`/content/${type}`, params)
export const createContent = (type: string, data: Record<string, any>) =>
  http.post<{ id: number }>(`/content/${type}`, data)
export const updateContent = (type: string, id: number, data: Record<string, any>) =>
  http.put(`/content/${type}/${id}`, data)
export const deleteContent = (type: string, id: number) => http.del(`/content/${type}/${id}`)

// ===== 学习规划 =====
export interface StudyPlan {
  id: number
  name: string
  position?: string | null
  region?: string | null
  description?: string
  is_default?: number
  is_active?: number
  created_at?: string
}
export interface PlanNode {
  id: number
  plan_id: number
  title: string
  node_type?: string
  target_type?: string | null
  target_id?: number | null
  est_minutes?: number
  sort_order?: number
  required?: number
}
export const getStudyPlans = (params: Record<string, any>) => http.get<Paginated<StudyPlan>>('/study-plans', params)
export const createStudyPlan = (data: Partial<StudyPlan>) => http.post<{ id: number }>('/study-plans', data)
export const updateStudyPlan = (id: number, data: Partial<StudyPlan>) => http.put(`/study-plans/${id}`, data)
export const deleteStudyPlan = (id: number) => http.del(`/study-plans/${id}`)
export const getPlanNodes = (planId: number) => http.get<PlanNode[]>(`/study-plans/${planId}/nodes`)
export const addPlanNode = (planId: number, data: Partial<PlanNode>) =>
  http.post<{ id: number }>(`/study-plans/${planId}/nodes`, data)
export const updatePlanNode = (planId: number, nodeId: number, data: Partial<PlanNode>) =>
  http.put(`/study-plans/${planId}/nodes/${nodeId}`, data)
export const deletePlanNode = (planId: number, nodeId: number) =>
  http.del(`/study-plans/${planId}/nodes/${nodeId}`)

// ===== 勋章 =====
export interface Badge {
  id: number
  name: string
  code: string
  icon?: string
  description?: string
  condition_type?: string
  condition_value?: number
  sort?: number
  is_active?: number
  created_at?: string
}
export const getBadges = (params: Record<string, any>) => http.get<Paginated<Badge>>('/badges', params)
export const createBadge = (data: Partial<Badge>) => http.post<{ id: number }>('/badges', data)
export const updateBadge = (id: number, data: Partial<Badge>) => http.put(`/badges/${id}`, data)
export const deleteBadge = (id: number) => http.del(`/badges/${id}`)

// ===== 通知 =====
export interface NotifyRecord {
  id: number
  user_id: number
  type: string
  title: string
  content?: string
  payload?: any
  is_read?: number
  created_at?: string
  user_phone?: string
  user_nickname?: string
}
export const pushNotification = (data: {
  target: 'all' | 'single'
  userId?: number
  type?: string
  title: string
  content?: string
}) => http.post<{ sent: number }>('/notifications', data)
export const getNotifyRecords = (params: Record<string, any>) =>
  http.get<Paginated<NotifyRecord>>('/notifications', params)

// ===== Agent 工具（阶段6）=====
export interface AgentTool {
  id: number
  key: string
  name: string
  description: string
  enabled: number
  sort: number
}
export const getAgentTools = () => http.get<{ list: AgentTool[]; total: number }>('/agent-tools')
export const toggleAgentTool = (id: number, enabled: number) => http.put(`/agent-tools/${id}`, { enabled })
