/**
 * 打卡服务（§7.6）
 * 并发防重：check_ins 唯一键 uk_user_date 原子闸，重复打卡抛 3001。
 * 连续天数：last_check_in_at 为昨天 → +1；今天 → 保持；否则重置 1。
 */
const config = require('../config');
const AppError = require('../utils/app-error');
const User = require('../models/user');
const checkInModel = require('../models/checkin');
const growthService = require('./growthService');
const badgeService = require('./badgeService');

/** 本地日期 YYYY-MM-DD */
function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 任意日期加减 N 天（返回 YYYY-MM-DD） */
function addDays(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d + days);
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${dt.getFullYear()}-${mm}-${dd}`;
}

/** 数据库日期/时间 → 本地 YYYY-MM-DD */
function fmtDate(dt) {
  if (!dt) return null;
  const d = dt instanceof Date ? dt : new Date(dt);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** 计算连续打卡天数 */
function computeStreak(cur, lastAt, today) {
  if (!lastAt) return 1;
  const last = fmtDate(lastAt);
  if (last === addDays(today, -1)) return (cur || 0) + 1;
  if (last === today) return cur || 0; // 防御：已在今天打过卡
  return 1;
}

/** 打卡：落记录 → 更新连续天数 → 成长值 → 勋章判定 */
async function checkIn(userId) {
  const today = todayStr();
  const points = config.growth.rules.checkin;
  try {
    await checkInModel.insert({ userId, checkDate: today, points });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') throw new AppError(3001, '今天已经打过卡啦');
    throw e;
  }
  const user = await User.findById(userId);
  const streak = computeStreak(user.check_in_streak, user.last_check_in_at, today);
  await User.applyStreak(userId, streak);
  const { totalPoints } = await growthService.grant(userId, 'checkin', points, `连续打卡第 ${streak} 天`);
  await badgeService.checkAndGrant(userId);
  return { checkDate: today, streak, points, totalPoints };
}

/** 今日打卡状态（首页/列表用） */
async function today(userId) {
  const checkDate = todayStr();
  const [record, user] = await Promise.all([
    checkInModel.findByUserDate(userId, checkDate),
    User.findById(userId),
  ]);
  return {
    checkedIn: !!record,
    checkDate,
    streak: user ? user.check_in_streak || 0 : 0,
  };
}

/** 月历（YYYY-MM） */
async function calendar(userId, month) {
  const list = await checkInModel.findByMonth(userId, month);
  return {
    month,
    list: list.map((r) => ({ date: fmtDate(r.check_date), points: r.points })),
  };
}

/** 统计 */
async function stats(userId) {
  const [totalDays, user] = await Promise.all([
    checkInModel.countByUser(userId),
    User.findById(userId),
  ]);
  const todayState = await today(userId);
  return {
    totalDays,
    streak: user ? user.check_in_streak || 0 : 0,
    today: todayState.checkedIn,
  };
}

/** 分页列表 */
async function list(userId, page, pageSize) {
  return checkInModel.listByUser(userId, { page, pageSize });
}

module.exports = { checkIn, today, calendar, stats, list, todayStr };
