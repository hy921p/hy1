/** 社区（§7.13） */
import http from './http'
import type { Paginated } from './types'

export interface PostRow {
  id: number
  author_id: number
  author_name: string
  author_avatar: string
  title: string
  content: string
  position: string
  region: string
  interview_type: string
  result: string
  tags: string
  view_count: number
  like_count: number
  comment_count: number
  created_at: string
}

export function posts(params?: {
  sort?: 'hot' | 'latest'
  position?: string
  region?: string
  page?: number
  pageSize?: number
}) {
  return http.get('/community/posts', { params }) as unknown as Promise<Paginated<PostRow>>
}

export function postDetail(id: number | string) {
  return http.get(`/community/posts/${id}`) as unknown as Promise<{
    id: number
    authorId: number
    authorName: string
    authorAvatar: string
    title: string
    content: string
    position: string
    region: string
    interviewType: string
    result: string
    tags: string[]
    viewCount: number
    likeCount: number
    commentCount: number
    liked: boolean
    createdAt: string
  }>
}

export function createPost(payload: {
  title: string
  content: string
  position?: string
  region?: string
  tags?: string[]
  interviewType?: string
  result?: string
}) {
  return http.post('/community/posts', payload) as unknown as Promise<{ postId: number }>
}

export function toggleLike(id: number | string) {
  return http.post(`/community/posts/${id}/like`) as unknown as Promise<{ liked: boolean; likeCount: number }>
}
