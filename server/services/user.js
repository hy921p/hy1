/**
 * 用户服务（§7.3 资料 + 画像/成长/勋章 计算型接口）
 */
const User = require('../models/user');
const AppError = require('../utils/app-error');
const checkInModel = require('../models/checkin');
const userProgressModel = require('../models/userProgress');
const { reportModel } = require('../models/interview');
const growthService = require('./growthService');
const badgeService = require('./badgeService');
const studyPlanService = require('./studyPlanService');
const recommendationService = require('./recommendationService');
const { sanitize } = require('./auth');

/** 获取当前用户资料 */
async function getProfile(userId) {
  const user = await User.findById(userId);
  if (!user) throw new AppError(1002, '用户不存在');
  return sanitize(user);
}

/** 更新当前用户资料（仅白名单字段） */
async function updateProfile(userId, fields) {
  const allowed = ['nickname', 'avatar', 'gender', 'targetPosition', 'preferredRegion'];
  const pick = {};
  for (const key of allowed) {
    if (fields[key] !== undefined) pick[key] = fields[key];
  }
  if (!Object.keys(pick).length) {
    throw new AppError(1001, '没有可更新的字段');
  }
  await User.update(userId, pick);
  return getProfile(userId);
}

/** 近 14 天学习趋势：按日合并平均分与打卡数 */
async function getProgressTrend(userId, days = 14) {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - (days - 1));

  function fmt(d) {
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
  }
  const startDate = fmt(start);
  const endDate = fmt(end);

  const [reports, checkins] = await Promise.all([
    reportModel.scoreByDateRange(userId, startDate, endDate),
    checkInModel.countByDateRange(userId, startDate, endDate),
  ]);
  const reportMap = new Map(reports.map((r) => [r.date, r]));
  const checkinMap = new Map(checkins.map((r) => [r.date, r.cnt]));

  const list = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const date = fmt(d);
    const r = reportMap.get(date);
    list.push({
      date,
      avgScore: r ? r.avgScore : null,
      reports: r ? r.reports : 0,
      checkins: checkinMap.get(date) || 0,
    });
  }
  return list;
}

/** 学习报告：打卡/面试/节点/规划进度聚合 */
async function getLearningReport(userId, position, region) {
  const user = await User.findById(userId);
  if (!user) throw new AppError(1002, '用户不存在');
  const [totalCheckins, completedNodes, planProgress] = await Promise.all([
    checkInModel.countByUser(userId),
    userProgressModel.countCompleted(userId),
    studyPlanService.progress(userId, position || user.target_position, region || user.preferred_region),
  ]);
  return {
    totalCheckins,
    totalInterviews: user.total_interviews || 0,
    avgScore: user.avg_score || 0,
    completedNodes,
    planProgress,
  };
}

/** 能力评估：各报告 dimension_scores 逐维度取平均 */
async function getAbilityAssessment(userId) {
  const rows = await reportModel.dimensionScoresByUser(userId);
  if (!rows.length) return [];

  const sums = {};
  const counts = {};
  for (const row of rows) {
    let dims = row.dimension_scores;
    if (typeof dims === 'string') {
      try { dims = JSON.parse(dims); } catch (e) { dims = null; }
    }
    if (!dims || typeof dims !== 'object') continue;
    for (const [dim, score] of Object.entries(dims)) {
      const n = Number(score);
      if (!Number.isFinite(n)) continue;
      sums[dim] = (sums[dim] || 0) + n;
      counts[dim] = (counts[dim] || 0) + 1;
    }
  }
  return Object.entries(sums).map(([dimension, sum]) => ({
    dimension,
    score: Math.round(sum / counts[dimension]),
  }));
}

/** 勋章列表 + 达成进度 */
async function getBadges(userId) {
  return badgeService.listWithProgress(userId);
}

/** 懒扫描补发勋章 */
async function refreshBadges(userId) {
  return badgeService.refresh(userId);
}

/** 成长树 */
async function getGrowthTree(userId) {
  return growthService.getTree(userId);
}

/** 成长记录分页 */
async function getGrowthRecords(userId, page, pageSize) {
  return growthService.getRecords(userId, page, pageSize);
}

module.exports = {
  getProfile,
  updateProfile,
  getProgressTrend,
  getLearningReport,
  getAbilityAssessment,
  getBadges,
  refreshBadges,
  getGrowthTree,
  getGrowthRecords,
};
