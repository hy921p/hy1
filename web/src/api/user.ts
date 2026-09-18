/** 用户资料 / 画像 / 成长 / 勋章（§7.3） */
import http from './http'

export interface UserProfile {
  id: number
  phone: string
  nickname: string
  avatar: string
  gender: string
  targetPosition: string
  preferredRegion: string
  growthPoints: number
  checkInStreak: number
  totalInterviews: number
  avgScore: number
  createdAt: string
}

export function profile() {
  return http.get('/user/profile') as unknown as Promise<UserProfile>
}

export function updateProfile(
  payload: Partial<{
    nickname: string
    avatar: string
    gender: string
    targetPosition: string
    preferredRegion: string
  }>,
) {
  return http.put('/user/profile', payload) as unknown as Promise<UserProfile>
}

export function growthTree() {
  return http.get('/user/growth-tree') as unknown as Promise<{
    level: number
    levelName: string
    currentPoints: number
    nextLevelPoints: number | null
    progress: number
    recent: { type: string; points: number; remark: string; createdAt: string }[]
  }>
}

export function growthRecords(params?: { page?: number; pageSize?: number }) {
  return http.get('/user/growth-records', { params }) as unknown as Promise<any>
}

export function badges() {
  return http.get('/user/badges') as unknown as Promise<
    {
      id: number
      code: string
      name: string
      icon: string
      description: string
      conditionType: string
      conditionValue: number
      currentValue: number
      earned: boolean
      earnedAt: number | null
    }[]
  >
}

export function refreshBadges() {
  return http.post('/user/badges/refresh') as unknown as Promise<{ granted: any[] }>
}

export function learningReport() {
  return http.get('/user/learning-report') as unknown as Promise<{
    totalCheckins: number
    totalInterviews: number
    avgScore: number
    completedNodes: number
    planProgress: { planId: number; planName: string; total: number; completed: number; progress: number } | null
  }>
}

export function abilityAssessment() {
  return http.get('/user/ability-assessment') as unknown as Promise<{ dimension: string; score: number }[]>
}

export function progressTrend() {
  return http.get('/user/progress-trend') as unknown as Promise<
    { date: string; avgScore: number | null; reports: number; checkins: number }[]
  >
}
