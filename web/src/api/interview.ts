/**
 * 面试相关 API（含 SSE 流式一问一答）
 */
import http, { TOKEN_KEY } from './http'

export interface CreateInterviewParams {
  position?: string
  region?: string
  totalQuestions?: number
}

/** 手机号 + 验证码登录 */
export function login(phone: string, code: string) {
  return http.post('/auth/login', { phone, code }) as unknown as Promise<{
    token: string
    user: any
  }>
}

/** 创建面试 */
export function createInterview(params: CreateInterviewParams) {
  return http.post('/interviews', params) as unknown as Promise<{
    sessionId: number
    scenarioName: string
    totalQuestions: number
    position: string
    region: string
  }>
}

/** 面试历史列表 */
export function listInterviews() {
  return http.get('/interviews') as unknown as Promise<{
    list: any[]
    total: number
    page: number
    pageSize: number
    hasMore: boolean
  }>
}

/** 面试详情 */
export function getInterview(id: number | string) {
  return http.get(`/interviews/${id}`) as unknown as Promise<any>
}

/** 结束面试并生成报告 */
export function endInterview(id: number | string) {
  return http.put(`/interviews/${id}/end`) as unknown as Promise<{
    reportId: number
    totalScore: number
  }>
}

/** 获取报告 */
export function getReport(id: number | string) {
  return http.get(`/interviews/${id}/report`) as unknown as Promise<any>
}

export interface ToolFrame {
  tool_key: string
  status: 'success' | 'error'
  latency_ms?: number
  error?: string
}

export interface StreamHandlers {
  onText: (text: string) => void
  onDone: (data: { hasNext: boolean; currentIndex: number; totalQuestions: number }) => void
  onTool?: (tool: ToolFrame) => void
  onError?: (message: string) => void
}

/**
 * SSE 一问一答（POST + fetch/ReadableStream，EventSource 仅支持 GET）
 * 逐帧解析：data: {"type":"text","content":"…"} → onText
 *            data: {"type":"tool","data":{…}}  → onTool（Agent 面试官工具状态）
 *            data: {"type":"done","data":{…}}  → onDone
 *            data: {"type":"error","data":{…}} → 抛错
 */
export async function messageStream(
  sessionId: number | string,
  answer: string,
  handlers: StreamHandlers,
): Promise<void> {
  const token = localStorage.getItem(TOKEN_KEY) || ''
  const res = await fetch(`/api/v1/interviews/${sessionId}/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ answer }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.message || `请求失败（${res.status}）`)
  }
  if (!res.body) throw new Error('当前浏览器不支持流式读取')

  const reader = res.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buf = ''

  const handleFrame = (frame: string) => {
    const line = frame.split('\n').find((l) => l.startsWith('data:'))
    if (!line) return
    const ev = JSON.parse(line.slice(5).trim())
    if (ev.type === 'text') handlers.onText(ev.content)
    else if (ev.type === 'tool') handlers.onTool?.(ev.data)
    else if (ev.type === 'done') handlers.onDone(ev.data)
    else if (ev.type === 'error') {
      const msg = ev.data?.message || 'AI 服务异常，请重试'
      handlers.onError?.(msg)
      throw new Error(msg)
    }
  }

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    let idx
    while ((idx = buf.indexOf('\n\n')) !== -1) {
      const frame = buf.slice(0, idx)
      buf = buf.slice(idx + 2)
      handleFrame(frame)
    }
  }
}
