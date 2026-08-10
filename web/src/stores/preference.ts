/**
 * 岗位/地区偏好 store（§7.1/§7.4）
 * - localStorage 持久化（键 ai_zhimian_pref，http.ts GET 注入也读这个键）
 * - 登录后 init()：以服务端偏好为准回填本地；修改即 PUT /preferences
 * 枚举白名单与 server/config preference 保持一致。
 */
import { defineStore } from 'pinia'
import { PREF_KEY } from '../api/http'
import { getPreference, updatePreference } from '../api/preference'

export const POSITIONS = ['公务员', '事业单位', '国企央企面试', '教资面试', '通用']
export const REGIONS = [
  '四川', '广东', '北京', '上海', '浙江', '江苏', '山东', '河南', '湖北',
  '湖南', '重庆', '陕西', '云南', '贵州', '广西', '福建', '江西', '安徽',
  '河北', '山西', '辽宁', '吉林', '黑龙江', '内蒙古', '甘肃', '青海',
  '宁夏', '新疆', '西藏', '海南', '天津', '全国',
]

function readLocal(): { position: string; region: string } {
  try {
    const raw = JSON.parse(localStorage.getItem(PREF_KEY) || 'null')
    if (raw && raw.position && raw.region) return { position: raw.position, region: raw.region }
  } catch {
    /* ignore */
  }
  return { position: '公务员', region: '四川' }
}

export const usePreferenceStore = defineStore('preference', {
  state: () => readLocal(),
  actions: {
    /** 登录后调用：以服务端偏好回填本地（服务端有值时用服务端，否则把本地推上去） */
    async init() {
      try {
        const remote = await getPreference()
        if (remote?.position && remote?.region) {
          this.position = remote.position
          this.region = remote.region
          localStorage.setItem(PREF_KEY, JSON.stringify({ position: this.position, region: this.region }))
        } else {
          await updatePreference({ position: this.position, region: this.region })
        }
      } catch {
        /* http 层已提示，本地保持默认 */
      }
    },
    /** 修改偏好：本地立即生效 + 后台同步服务端 */
    set(position: string, region: string) {
      this.position = position
      this.region = region
      localStorage.setItem(PREF_KEY, JSON.stringify({ position, region }))
      updatePreference({ position, region }).catch(() => {})
    },
  },
})
