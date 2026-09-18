/** 分页响应外壳（§6 统一响应 data 形态） */
export interface Paginated<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}
