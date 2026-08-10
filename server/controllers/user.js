/**
 * 用户控制器（§7.3 资料 + 画像/成长/勋章）
 */
const { success, paginated } = require('../utils/response');
const userService = require('../services/user');

/** GET /api/v1/user/profile */
async function getProfile(req, res, next) {
  try {
    const data = await userService.getProfile(req.user.id);
    return success(res, data, 'success');
  } catch (err) {
    next(err);
  }
}

/** PUT /api/v1/user/profile */
async function updateProfile(req, res, next) {
  try {
    const data = await userService.updateProfile(req.user.id, req.body || {});
    return success(res, data, '更新成功');
  } catch (err) {
    next(err);
  }
}

/** GET /api/v1/user/progress-trend 近14天学习趋势 */
async function progressTrend(req, res, next) {
  try {
    const days = Math.min(Math.max(parseInt(req.query.days, 10) || 14, 1), 90);
    const data = await userService.getProgressTrend(req.user.id, days);
    return success(res, data, 'success');
  } catch (err) {
    next(err);
  }
}

/** GET /api/v1/user/learning-report 学习报告 */
async function learningReport(req, res, next) {
  try {
    const data = await userService.getLearningReport(
      req.user.id, req.query.position, req.query.region,
    );
    return success(res, data, 'success');
  } catch (err) {
    next(err);
  }
}

/** GET /api/v1/user/ability-assessment 能力评估 */
async function abilityAssessment(req, res, next) {
  try {
    const data = await userService.getAbilityAssessment(req.user.id);
    return success(res, data, 'success');
  } catch (err) {
    next(err);
  }
}

/** GET /api/v1/user/badges 勋章列表 */
async function badges(req, res, next) {
  try {
    const data = await userService.getBadges(req.user.id);
    return success(res, data, 'success');
  } catch (err) {
    next(err);
  }
}

/** POST /api/v1/user/badges/refresh 懒扫描补发 */
async function refreshBadges(req, res, next) {
  try {
    const data = await userService.refreshBadges(req.user.id);
    return success(res, data, data.length ? `新获得 ${data.length} 枚勋章` : '暂无新勋章');
  } catch (err) {
    next(err);
  }
}

/** GET /api/v1/user/growth-tree 成长树 */
async function growthTree(req, res, next) {
  try {
    const data = await userService.getGrowthTree(req.user.id);
    return success(res, data, 'success');
  } catch (err) {
    next(err);
  }
}

/** GET /api/v1/user/growth-records 成长记录分页 */
async function growthRecords(req, res, next) {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(req.query.pageSize, 10) || 10, 1), 50);
    const data = await userService.getGrowthRecords(req.user.id, page, pageSize);
    return paginated(res, { ...data, page, pageSize });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getProfile,
  updateProfile,
  progressTrend,
  learningReport,
  abilityAssessment,
  badges,
  refreshBadges,
  growthTree,
  growthRecords,
};
