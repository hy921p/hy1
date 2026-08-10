/**
 * 首页聚合服务（§7.5）
 * 复用 checkin / studyPlan / recommendation 三个服务并行组装。
 */
const checkinService = require('./checkinService');
const studyPlanService = require('./studyPlanService');
const recommendationService = require('./recommendationService');

/** 首页总览：打卡状态 + 当前规划进度 + 今日推荐 */
async function overview(user, query = {}) {
  const { position, region } = recommendationService.resolvePositionRegion(user, query);
  const userId = user ? user.id : null;

  const [checkin, planResult, recommendations] = await Promise.all([
    userId ? checkinService.today(userId) : Promise.resolve({ checkedIn: false, checkDate: null, streak: 0 }),
    studyPlanService.current(userId, position, region),
    recommendationService.today(position, region, 3),
  ]);

  return {
    checkin,
    plan: planResult.plan
      ? {
          planId: planResult.plan.id,
          planName: planResult.plan.name,
          total: planResult.nodes.length,
          completed: planResult.completedCount,
          progress: planResult.progress,
        }
      : null,
    recommendations,
  };
}

module.exports = { overview };
