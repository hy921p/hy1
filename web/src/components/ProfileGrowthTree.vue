<script setup lang="ts">
// 成长树·本周玩法：树只反映「本周新赚的成长值」，每周一自动从树根重置。
// 打卡 +10 / 答对一题 +5 / 模拟面试 +100 / AI 摘要 +20 攒本周分，角色 🧗 从树根爬到树冠。
// 数据来自 GET /user/growth-tree 返回的 week{points,goal,start,levels} + weekRecent[]。
// 累计成长值照旧显示在用户卡/勋章，与树互不影响。
import { computed, onActivated, onMounted, ref } from 'vue'
import { growthTree } from '../api/user'

// SVG 几何常量：树干竖直居中，爬升跨度 BOTTOM_Y(树根) → TOP_Y(树冠)
const TRUNK_X = 210
const BOTTOM_Y = 430
const TOP_Y = 200

const tree = ref<any>(null)
const loading = ref(false)

async function load() {
  loading.value = true
  try {
    tree.value = await growthTree()
  } catch {
    /* http 层已提示 */
  } finally {
    loading.value = false
  }
}
onMounted(load)
onActivated(load)

const week = computed(() => tree.value?.week ?? null)
const points = computed(() => week.value?.points ?? 0)
const goal = computed(() => week.value?.goal || 1)
const weekLevels = computed(() => week.value?.levels ?? [])
const weekRecent = computed<any[]>(() => tree.value?.weekRecent ?? [])

// 本周爬升百分比：本周分 / 周目标 → 0% 树根，100% 树冠
const pct = computed(() => Math.min(1, Math.max(0, points.value / goal.value)))
const climberY = computed(() => BOTTOM_Y - pct.value * (BOTTOM_Y - TOP_Y))
const bubbleY = computed(() => Math.max(16, climberY.value - 42))
const donePct = computed(() => Math.round(pct.value * 100))

// 里程碑刻度 y：min 占周目标的比例映射到树干高度（0→树根 / goal→树冠）
function yAt(min: number) {
  return BOTTOM_Y - Math.min(min, goal.value) / goal.value * (BOTTOM_Y - TOP_Y)
}

// 当前到达档位 + 下一档
const stage = computed(() => {
  const ls = weekLevels.value
  let idx = 0
  for (let i = 0; i < ls.length; i++) if (points.value >= ls[i].min) idx = i
  return { reached: ls[idx], next: ls[idx + 1] ?? null }
})
const topReached = computed(() => stage.value.next === null)
const gap = computed(() => (stage.value.next ? stage.value.next.min - points.value : 0))

function fmtDate(s?: string) {
  return s ? String(s).replace('T', ' ').slice(5, 16) : ''
}
</script>

<template>
  <el-card v-loading="loading" class="grow-tree-card" shadow="never">
    <div class="tree-head">
      <div class="tree-title">成长树</div>
      <el-tag v-if="tree" size="small" type="success" effect="light">
        本周 {{ week?.points ?? 0 }} / {{ week?.goal ?? '-' }} 分
      </el-tag>
    </div>

    <template v-if="tree">
      <!-- 树：自绘 SVG，角色按本周分爬到对应高度 -->
      <div class="tree-panel">
        <svg viewBox="0 0 420 470" role="img" aria-label="成长树" class="tree-svg">
          <!-- 云朵 -->
          <g fill="#ffffff" opacity="0.85">
            <ellipse cx="64" cy="62" rx="26" ry="13" />
            <ellipse cx="86" cy="55" rx="17" ry="11" />
            <ellipse cx="354" cy="84" rx="22" ry="12" />
            <ellipse cx="374" cy="77" rx="13" ry="9" />
          </g>

          <!-- 树冠后层（深绿） -->
          <g fill="#6cbf73">
            <circle cx="210" cy="126" r="46" />
            <circle cx="160" cy="158" r="34" />
            <circle cx="260" cy="152" r="36" />
          </g>
          <!-- 果实 -->
          <g fill="#f6b93b">
            <circle cx="194" cy="112" r="5" />
            <circle cx="228" cy="120" r="5" />
            <circle cx="252" cy="168" r="5" />
            <circle cx="170" cy="178" r="5" />
          </g>

          <!-- 树干（下端止于草地之内，圆头不超出草地；先于树冠前层，保证树梢被枝叶包住） -->
          <path d="M210 436 V232" stroke="#7a5a3e" stroke-width="36" stroke-linecap="round" fill="none" />
          <path d="M210 436 V232" stroke="#9a6f50" stroke-width="12" stroke-linecap="round" fill="none" opacity="0.55" />
          <path d="M210 334 C186 326 172 316 164 300" stroke="#7a5a3e" stroke-width="14" stroke-linecap="round" fill="none" />
          <path d="M210 270 C232 264 246 254 252 240" stroke="#7a5a3e" stroke-width="12" stroke-linecap="round" fill="none" />

          <!-- 树冠前层（浅绿 + 收拢树梢） -->
          <g fill="#92d493">
            <circle cx="188" cy="148" r="30" />
            <circle cx="234" cy="144" r="28" />
            <circle cx="176" cy="196" r="24" />
            <circle cx="246" cy="192" r="24" />
            <circle cx="210" cy="202" r="30" />
          </g>
          <g fill="#6cbf73">
            <circle cx="156" cy="292" r="9" />
            <circle cx="248" cy="238" r="8" />
          </g>

          <!-- 地面草地 -->
          <g fill="#b7e0a4">
            <ellipse cx="210" cy="452" rx="158" ry="12" />
          </g>
          <ellipse cx="210" cy="456" rx="40" ry="9" fill="#8fc97a" />

          <!-- 本周六档刻度点（无文字，min 越接近周目标越靠树冠） -->
          <circle
            v-for="st in weekLevels"
            :key="st.min"
            :cx="TRUNK_X"
            :cy="yAt(st.min)"
            :r="4"
            :fill="points >= st.min ? '#f2b01e' : '#e3e6ea'"
            stroke="#ffffff"
            stroke-width="2"
          />

          <!-- 角色：画出来的小人物，脚踩在当前进度高度，按 pct 往上爬 -->
          <g :transform="`translate(${TRUNK_X} ${climberY})`">
            <circle cx="0" cy="-19.4" r="4.6" fill="#f6c88f" />
            <rect x="-4.4" y="-14.6" width="8.8" height="10" rx="3.4" fill="#5aa9ff" />
            <rect x="-7.8" y="-13.6" width="3.2" height="7.2" rx="1.6" fill="#5aa9ff" />
            <rect x="4.6" y="-13.6" width="3.2" height="7.2" rx="1.6" fill="#5aa9ff" />
            <rect x="-3.8" y="-4.6" width="3.2" height="5" rx="1.5" fill="#3f4a5a" />
            <rect x="0.6" y="-4.6" width="3.2" height="5" rx="1.5" fill="#3f4a5a" />
          </g>
          <!-- 进度气泡 -->
          <g :transform="`translate(248 ${bubbleY})`">
            <rect x="-24" y="-11" width="48" height="22" rx="11" fill="#ffffff" stroke="#cfe0ff" stroke-width="1.5" />
            <text x="0" y="1" text-anchor="middle" dominant-baseline="central" font-size="11" fill="#409eff" font-weight="700">
              已爬 {{ donePct }}%
            </text>
          </g>
        </svg>
      </div>

      <!-- 爬升说明 -->
      <div class="tree-info">
        <div v-if="!topReached" class="tree-line">
          本周已得 <b class="pts">{{ week?.points }}</b> 分 · 距「<b>{{ stage.next?.name }}</b>」还差
          <b class="gap">{{ gap }}</b> 分
        </div>
        <div v-else class="tree-line">
          已达成周目标 {{ week?.goal }} 分，登顶树冠！
        </div>
        <div class="tree-cycle">树每周一自动重置，从 {{ week?.start }} 这周开始爬起</div>
      </div>

      <!-- 本周成长记录 -->
      <div class="recent">
        <div class="recent-title">本周成长</div>
        <div v-if="weekRecent.length" class="recent-list">
          <div v-for="(r, idx) in weekRecent.slice(0, 5)" :key="idx" class="r-row">
            <span class="r-remark">{{ r.remark }}</span>
            <span class="r-pts">+{{ r.points }}</span>
            <span class="r-date">{{ fmtDate(r.createdAt) }}</span>
          </div>
        </div>
        <div v-else class="recent-empty">本周还没有成长记录，去打卡 / 做题让树苗发芽吧</div>
      </div>
    </template>

    <el-empty v-else-if="!loading" description="成长数据加载失败" :image-size="60" />
  </el-card>
</template>

<style scoped>
.grow-tree-card {
  margin-top: 12px;
}
.tree-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.tree-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}
.tree-panel {
  margin-top: 6px;
  border-radius: 12px;
  overflow: hidden;
  background: linear-gradient(180deg, #eff6ff 0%, #f3fbf0 72%, #e8f6df 100%);
}
.tree-svg {
  display: block;
  width: 100%;
  max-width: 440px;
  height: auto;
  margin: 0 auto;
}
.tree-info {
  margin-top: 12px;
  text-align: center;
}
.tree-line {
  font-size: 14px;
  color: #303133;
}
.tree-line .pts {
  color: #409eff;
}
.tree-line .gap {
  color: #f2b01e;
}
.tree-cycle {
  margin-top: 6px;
  font-size: 12px;
  color: #909399;
}
.recent {
  margin-top: 14px;
  border-top: 1px solid #f0f2f5;
  padding-top: 10px;
}
.recent-title {
  font-size: 13px;
  color: #909399;
  margin-bottom: 6px;
}
.recent-list .r-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 2px;
  font-size: 13px;
}
.r-remark {
  flex: 1;
  color: #303133;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.r-pts {
  color: #67c23a;
  font-weight: 600;
  flex-shrink: 0;
}
.r-date {
  color: #c0c4cc;
  font-size: 12px;
  flex-shrink: 0;
}
.recent-empty {
  font-size: 13px;
  color: #c0c4cc;
  padding: 6px 2px;
}
</style>
