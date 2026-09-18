/** 岗位/地区偏好（§7.4） */
import http from './http'

export function getPreference() {
  return http.get('/preferences') as unknown as Promise<{ position: string; region: string }>
}

export function updatePreference(payload: { position?: string; region?: string }) {
  return http.put('/preferences', payload) as unknown as Promise<{ position: string; region: string }>
}
