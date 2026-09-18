/**
 * 管理看板控制器
 */
const { success } = require('../utils/response');
const adminDashboardService = require('../services/adminDashboardService');

/** GET /api/admin/dashboard/stats */
async function stats(req, res, next) {
  try {
    const data = await adminDashboardService.stats();
    return success(res, data, 'success');
  } catch (err) {
    next(err);
  }
}

module.exports = { stats };
