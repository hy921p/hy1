/**
 * 首页聚合服务（§7.5）
 * 复用 checkin / recommendation 两个服务并行组装，
 * 登录用户额外返回：本月签到日历 calendar、今日任务 tasks（默认任务 + 用户自建）、本周学习趋势 trend。
 */
const checkinService = require('./checkinService');
const recommendationService = require('./recommendationService');
const customTaskService = require('../services/customTaskService');
const customTaskModel = require('../models/customTask');
const { answerRecordModel } = require('../models/answer');
const { sessionModel } = require('../models/interview');

const WEEK_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

/** 本周一 → 周日 7 天逐日学习趋势（刷题/面试次数 + 学习时长分钟，未来天补 0） */
async function weeklyTrend(userId) {
  const now = new Date();
  const offset = (now.getDay() + 6) % 7; // 距本周一的天数（周日=6）
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset);

  function fmt(d) {
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
  }
  const startDate = fmt(start);
  const endDate = fmt(new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6));

  const [answers, sessions] = await Promise.all([
    answerRecordModel.dailyByUser(userId, startDate, endDate),
    sessionModel.dailyByUser(userId, startDate, endDate),
  ]);
  const answerMap = new Map(answers.map((r) => [r.date, r]));
  const sessionMap = new Map(sessions.map((r) => [r.date, r]));

  const list = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const date = fmt(d);
    const a = answerMap.get(date);
    const s = sessionMap.get(date);
    // mysql 聚合值可能为字符串，统一 Number 后再相加
    const am = Number(a ? a.minutes : 0);
    const sm = Number(s ? s.minutes : 0);
    list.push({
      date,
      label: WEEK_LABELS[i],
      minutes: Math.round((am + sm) * 10) / 10,
      answers: Number(a ? a.answers : 0),
      interviews: Number(s ? s.interviews : 0),
    });
  }
  return list;
}

/** 首页总览：打卡状态 + 签到日历 + 今日任务（默认+自定义） + 本周趋势 + 今日推荐 */
async function overview(user, query = {}) {
  const { position, region } = recommendationService.resolvePositionRegion(user, query);
  const userId = user ? user.id : null;

  const [checkin, recommendations] = await Promise.all([
    userId ? checkinService.today(userId) : Promise.resolve({ checkedIn: false, checkDate: null, streak: 0 }),
    recommendationService.today(position, region, 3),
  ]);

  // 仅登录用户：本月签到日历 + 本周趋势 + 今日任务（先播种默认任务，再取全部）
  let calendar = { month: null, list: [] };
  let tasks = [];
  let trend = [];
  if (userId) {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const [cal, tr] = await Promise.all([
      checkinService.calendar(userId, month),
      weeklyTrend(userId),
    ]);
    calendar = cal;
    trend = tr;
    await customTaskService.ensureDefaults(userId);
    // 跨天先重置昨日完成的勾选：今日任务每天从「未打勾」开始
    await customTaskModel.resetStaleDone(userId);
    const rows = await customTaskModel.findByUser(userId);
    tasks = rows.map((t) => ({
      nodeId: `c-${t.id}`,
      title: t.title,
      estMinutes: t.est_minutes,
      done: t.status === 1,
      isDefault: t.is_default === 1,
    }));
  }

  return {
    checkin,
    calendar,
    tasks,
    trend,
    recommendations,
  };
}

module.exports = { overview };
