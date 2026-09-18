/**
 * 打卡控制器（§7.6）
 */
const { success, paginated } = require('../utils/response');
const checkinService = require('../services/checkinService');

/** POST /api/v1/checkins 今日打卡 */
async function create(req, res, next) {
  try {
    const data = await checkinService.checkIn(req.user.id);
    return success(res, data, '打卡成功');
  } catch (err) {
    next(err);
  }
}

/** GET /api/v1/checkins/today 今日状态 */
async function today(req, res, next) {
  try {
    const data = await checkinService.today(req.user.id);
    return success(res, data, 'success');
  } catch (err) {
    next(err);
  }
}

/** GET /api/v1/checkins/calendar?month=YYYY-MM 月历 */
async function calendar(req, res, next) {
  try {
    const month = req.query.month || '';
    if (!/^\d{4}-\d{2}$/.test(month)) {
      const { fail } = require('../utils/response');
      return fail(res, 1001, '参数错误：month 格式应为 YYYY-MM');
    }
    const data = await checkinService.calendar(req.user.id, month);
    return success(res, data, 'success');
  } catch (err) {
    next(err);
  }
}

/** GET /api/v1/checkins/stats 统计 */
async function stats(req, res, next) {
  try {
    const data = await checkinService.stats(req.user.id);
    return success(res, data, 'success');
  } catch (err) {
    next(err);
  }
}

/** GET /api/v1/checkins 打卡历史分页 */
async function list(req, res, next) {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(req.query.pageSize, 10) || 10, 1), 50);
    const data = await checkinService.list(req.user.id, page, pageSize);
    return paginated(res, { ...data, page, pageSize });
  } catch (err) {
    next(err);
  }
}

module.exports = { create, today, calendar, stats, list };
