/** 首页聚合（§7.5） */
import http from './http'

export interface Recommendation {
  id: number
  content: string
  category: string
  position: string
  region: string
  difficulty: string
  year?: number | string | null
}

export function overview() {
  return http.get('/home/overview') as unknown as Promise<{
    checkin: { checkedIn: boolean; checkDate: string; streak: number }
    calendar: { month: string | null; list: { date: string; points: number }[] }
    tasks: { nodeId: string; title: string; estMinutes: number | null; done: boolean; isDefault: boolean }[]
    trend: { date: string; label: string; minutes: number; answers: number; interviews: number }[]
    recommendations: Recommendation[]
  }>
}
