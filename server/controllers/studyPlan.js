/**
 * 学习规划控制器（§7.8）
 */
const { success } = require('../utils/response');
const studyPlanService = require('../services/studyPlanService');
const recommendationService = require('../services/recommendationService');

/** GET /api/v1/study-plans/current（可选鉴权） */
async function current(req, res, next) {
  try {
    const { position, region } = recommendationService.resolvePositionRegion(req.user, req.query);
    const userId = req.user ? req.user.id : null;
    const data = await studyPlanService.current(userId, position, region);
    return success(res, {
      plan: data.plan
        ? {
            id: data.plan.id,
            name: data.plan.name,
            position: data.plan.position,
            region: data.plan.region,
            description: data.plan.description,
          }
        : null,
      nodes: data.nodes.map((n) => ({
        id: n.id,
        title: n.title,
        nodeType: n.node_type,
        targetType: n.target_type,
        targetId: n.target_id,
        estMinutes: n.est_minutes,
        required: !!n.required,
        completed: data.doneSet.has(n.id),
      })),
      total: data.nodes.length,
      completed: data.completedCount,
      progress: data.progress,
    }, 'success');
  } catch (err) {
    next(err);
  }
}

/** PUT /api/v1/study-plans/nodes/:nodeId/complete（需登录） */
async function completeNode(req, res, next) {
  try {
    const data = await studyPlanService.completeNode(req.user.id, req.params.nodeId);
    return success(res, data, '节点已完成');
  } catch (err) {
    next(err);
  }
}

/** GET /api/v1/study-plans/progress（需登录） */
async function progress(req, res, next) {
  try {
    const { position, region } = recommendationService.resolvePositionRegion(req.user, req.query);
    const data = await studyPlanService.progress(req.user.id, position, region);
    return success(res, data, 'success');
  } catch (err) {
    next(err);
  }
}

module.exports = { current, completeNode, progress };
