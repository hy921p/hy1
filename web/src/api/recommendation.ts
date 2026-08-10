/** 今日推荐 / 热点（§7.7） */
import http from './http'

export function today() {
  return http.get('/recommendations/today') as unknown as Promise<
    { id: number; content: string; category: string; position: string; region: string; difficulty: string }[]
  >
}

export function hot() {
  return http.get('/recommendations/hot') as unknown as Promise<
    {
      id: number
      title: string
      summary: string
      cover: string
      position: string
      region: string
      views: number
      publishDate: string
    }[]
  >
}
