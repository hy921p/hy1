/**
 * 学习规划服务（§7.8）
 * 规划匹配三级回退：position+region → position+(全国/NULL) → is_default 通用。
 * 节点完成状态复用 user_progress（type='study_plan', target_id=节点id, progress=100）。
 */
const AppError = require('../utils/app-error');
const studyPlanModel = require('../models/studyPlan');
const userProgressModel = require('../models/userProgress');
const badgeService = require('./badgeService');
const { resolvePositionRegion } = require('./recommendationService');

/** 节点完成状态 + 总进度（一次 IN 查询避免 N+1） */
async function calcProgress(userId, plan, nodes) {
  const nodeIds = nodes.map((n) => n.id);
  const doneIds = userId
    ? await userProgressModel.completedTargetIds(userId, 'study_plan', nodeIds)
    : [];
  const doneSet = new Set(doneIds);
  const completed = nodes.filter((n) => doneSet.has(n.id)).length;
  const progress = nodes.length ? Math.round((completed / nodes.length) * 100) : 0;
  return { completed, progress, doneSet };
}

/** 当前规划：匹配 → 节点树 + 完成状态 + 总进度 */
async function current(userId, position, region) {
  const plan = await studyPlanModel.matchActive(position, region);
  if (!plan) {
    return { plan: null, nodes: [], completedCount: 0, progress: 0, doneSet: new Set() };
  }
  const nodes = await studyPlanModel.findNodesByPlan(plan.id);
  const { completed, progress, doneSet } = await calcProgress(userId, plan, nodes);
  return { plan, nodes, completedCount: completed, progress, doneSet };
}

/** 完成节点：防重写 user_progress → 重算进度 → 勋章判定 */
async function completeNode(userId, nodeId) {
  const node = await studyPlanModel.findNodeById(nodeId);
  if (!node) throw new AppError(1002, '规划节点不存在');

  try {
    await userProgressModel.insertCompleted(userId, 'study_plan', nodeId, 100);
  } catch (e) {
    if (e.code !== 'ER_DUP_ENTRY') throw e; // 已完成 → 幂等继续
  }

  const plan = await studyPlanModel.findById(node.plan_id);
  const nodes = await studyPlanModel.findNodesByPlan(plan.id);
  const { completed, progress } = await calcProgress(userId, plan, nodes);
  await badgeService.checkAndGrant(userId); // 完成规划 → plan_count 勋章

  return {
    nodeId: Number(nodeId),
    completed: true,
    planId: plan.id,
    planName: plan.name,
    total: nodes.length,
    completedCount: completed,
    progress,
  };
}

/** 学习进度总览（登录用户按偏好匹配规划） */
async function progress(userId, position, region) {
  const plan = await studyPlanModel.matchActive(position, region);
  if (!plan) return { planId: null, planName: null, total: 0, completed: 0, progress: 0 };
  const nodes = await studyPlanModel.findNodesByPlan(plan.id);
  const { completed, progress: pct } = await calcProgress(userId, plan, nodes);
  return { planId: plan.id, planName: plan.name, total: nodes.length, completed, progress: pct };
}

module.exports = { current, completeNode, progress, resolvePositionRegion };
