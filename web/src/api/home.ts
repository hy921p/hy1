/** 首页聚合（§7.5） */
import http from './http'

export interface Recommendation {
  id: number
  content: string
  category: string
  position: string
  region: string
  difficulty: string
}

export function overview() {
  return http.get('/home/overview') as unknown as Promise<{
    checkin: { checkedIn: boolean; checkDate: string; streak: number }
    plan: { planId: number; planName: string; total: number; completed: number; progress: number } | null
    recommendations: Recommendation[]
  }>
}
