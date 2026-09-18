/** 每日签到（§7.6） */
import http from './http'

export function checkIn() {
  return http.post('/checkins') as unknown as Promise<{
    checkDate: string
    streak: number
    points: number
    totalPoints: number
  }>
}

export function today() {
  return http.get('/checkins/today') as unknown as Promise<{
    checkedIn: boolean
    checkDate: string
    streak: number
  }>
}

export function stats() {
  return http.get('/checkins/stats') as unknown as Promise<{
    totalDays: number
    streak: number
    today: boolean
  }>
}
