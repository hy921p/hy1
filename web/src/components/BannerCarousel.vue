<script setup lang="ts">
// 首页顶部轮播：精美大图 + 深度视觉呈现 + 高度升级 + 交互动效
import { useRouter } from 'vue-router'

const router = useRouter()

const BANNERS = [
  {
    tag: 'AI 智考核心',
    title: 'AI 智能多模态模拟面试',
    desc: '全真考场环境 · 真实考官追问 · 360° 多维能力雷达评分与逐题复盘',
    highlights: ['全真考场体验', '即时考官追问', '多维智能打分'],
    btnText: '立即开启模拟 →',
    img: '/banners/banner-interview.jpg',
    to: '/exam',
    bg: 'linear-gradient(135deg, #091a3e 0%, #102e6b 55%, #1d4b9b 100%)',
    accentColor: '#38bdf8'
  },
  {
    tag: '海量真题 · 智能刷题',
    title: '考公与名企精品真题库',
    desc: '覆盖历年国考/省考/事业单位真题 · AI 考点深度解析 · 智能错题诊断',
    highlights: ['历年真题精析', '高频高分考点', '智能错题本'],
    btnText: '马上刷题突破 →',
    img: '/banners/banner-qbank.jpg',
    to: '/questions',
    bg: 'linear-gradient(135deg, #0a1b38 0%, #143265 50%, #1e458e 100%)',
    accentColor: '#60a5fa'
  },
  {
    tag: '每日晨读 · 思维进阶',
    title: '每日晨读与高频金句积累',
    desc: '晨读时政热点 · 结构化答题思维导图 · 名师提炼高分表达与通识素材',
    highlights: ['时政热点速递', '结构化答题思维', '面试金句宝典'],
    btnText: '进入每日晨读 →',
    img: '/banners/banner-reading.jpg',
    to: '/learn/reading',
    bg: 'linear-gradient(135deg, #24123a 0%, #441865 50%, #6d246c 100%)',
    accentColor: '#fb923c'
  },
]
</script>

<template>
  <el-carousel height="260px" :interval="5000" class="banner" arrow="hover">
    <el-carousel-item v-for="(b, idx) in BANNERS" :key="idx">
      <div class="banner-card" :style="{ background: b.bg }" @click="router.push(b.to)">
        <!-- 全幅背景大图：铺满整张卡片（图片加载前先透出底部 bg 渐变兜底） -->
        <img class="banner-bg" :src="b.img" :alt="b.title" />
        <!-- 左深右透遮罩：保证左侧文字清晰可读，同时露出右侧画面主体 -->
        <div class="banner-mask" />

        <!-- 左侧内容区 -->
        <div class="banner-body">
          <div class="banner-tag">
            <span class="tag-dot" :style="{ background: b.accentColor }" />
            {{ b.tag }}
          </div>
          <h2 class="banner-title">{{ b.title }}</h2>
          <p class="banner-desc">{{ b.desc }}</p>

          <div class="banner-highlights">
            <span v-for="h in b.highlights" :key="h" class="highlight-chip">
              <span class="chip-icon">✓</span> {{ h }}
            </span>
          </div>

          <div class="banner-actions">
            <el-button class="banner-btn" type="primary" @click="router.push(b.to)">
              {{ b.btnText }}
            </el-button>
          </div>
        </div>
      </div>
    </el-carousel-item>
  </el-carousel>
</template>

<style scoped>
.banner {
  border-radius: 18px;
  overflow: hidden;
  margin-bottom: 24px;
  box-shadow: 0 12px 36px rgba(10, 25, 55, 0.22);
}

.banner :deep(.el-carousel__indicators--horizontal) {
  bottom: 12px;
}

.banner :deep(.el-carousel__button) {
  width: 24px;
  height: 5px;
  border-radius: 4px;
  opacity: 0.5;
  transition: all 0.3s ease;
}

.banner :deep(.is-active .el-carousel__button) {
  width: 40px;
  opacity: 1;
  background-color: #fff;
}

.banner-card {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 0 44px;
  color: #fff;
  position: relative;
  overflow: hidden;
  user-select: none;
  cursor: pointer;
}

/* 全幅背景图：铺满整卡，hover 缓慢放大增强纵深感 */
.banner-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  pointer-events: none;
  transition: transform 6s ease;
}
.banner-card:hover .banner-bg {
  transform: scale(1.05);
}

/* 左深右透遮罩：文字区压暗、右侧图景放亮 */
.banner-mask {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(
    90deg,
    rgba(4, 14, 38, 0.94) 0%,
    rgba(4, 14, 38, 0.78) 24%,
    rgba(4, 14, 38, 0.5) 46%,
    rgba(4, 14, 38, 0.18) 68%,
    rgba(4, 14, 38, 0) 85%
  );
}

.banner-body {
  position: relative;
  z-index: 2;
  max-width: 56%;
  padding-right: 8px;
}

.banner-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: rgba(255, 255, 255, 0.95);
  letter-spacing: 0.5px;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.18);
  backdrop-filter: blur(8px);
  border-radius: 20px;
  padding: 4px 14px;
  font-size: 12px;
  font-weight: 600;
}

.tag-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  box-shadow: 0 0 8px currentColor;
}

.banner-title {
  margin: 10px 0 8px;
  font-size: 28px;
  font-weight: 800;
  letter-spacing: 0.5px;
  line-height: 1.25;
  color: #ffffff;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.banner-desc {
  margin: 0 0 14px;
  font-size: 13.5px;
  line-height: 1.55;
  color: rgba(255, 255, 255, 0.85);
}

.banner-highlights {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 18px;
}

.highlight-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.9);
  background: rgba(255, 255, 255, 0.08);
  padding: 2px 10px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.chip-icon {
  font-size: 11px;
  font-weight: 800;
  color: #34d399;
}

.banner-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.banner-btn {
  background: #ffffff !important;
  color: #0f172a !important;
  border: none !important;
  border-radius: 10px;
  height: 40px;
  padding: 0 22px;
  font-size: 14px;
  font-weight: 700;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.18);
  transition: all 0.25s ease;
}

.banner-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.28);
  background: #f8fafc !important;
  color: #1e40af !important;
}

@media (max-width: 900px) {
  .banner-card {
    padding: 0 24px;
  }
  .banner-body {
    max-width: 100%;
  }
  .banner-mask {
    background: linear-gradient(
      90deg,
      rgba(4, 14, 38, 0.94) 0%,
      rgba(4, 14, 38, 0.84) 30%,
      rgba(4, 14, 38, 0.62) 60%,
      rgba(4, 14, 38, 0.3) 100%
    );
  }
  .banner-title {
    font-size: 24px;
  }
}
</style>

