/** 学习规划（§7.8） */
import http from './http'

export interface PlanNode {
  id: number
  title: string
  nodeType: string
  targetType: string
  targetId: number
  estMinutes: number
  required: boolean
  completed: boolean
}

export function current() {
  return http.get('/study-plans/current') as unknown as Promise<{
    plan: { id: number; name: string; position: string; region: string; description: string } | null
    nodes: PlanNode[]
    total: number
    completed: number
    progress: number
  }>
}

export function completeNode(nodeId: number | string) {
  return http.put(`/study-plans/nodes/${nodeId}/complete`) as unknown as Promise<{
    nodeId: number
    completed: boolean
    planId: number
    planName: string
    total: number
    completedCount: number
    progress: number
  }>
}
