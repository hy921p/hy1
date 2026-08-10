/**
 * 通知控制器（阶段3 §7.17）
 * 列表（type 过滤）/未读数/单条已读/全部已读/删除
 */
const { success, paginated } = require('../utils/response');
const AppError = require('../utils/app-error');
const notificationService = require('../services/notificationService');

const PAGE = (v) => Math.max(1, Number(v) || 1);
const PAGE_SIZE = (v) => Math.min(50, Math.max(1, Number(v) || 10));

/** GET /api/v1/notifications（需登录，type 可选） */
async function list(req, res, next) {
  try {
    const page = PAGE(req.query.page);
    const pageSize = PAGE_SIZE(req.query.pageSize);
    const data = await notificationService.list(req.user.id, {
      type: req.query.type || undefined,
      page,
      pageSize,
    });
    return paginated(res, { list: data.list, total: data.total, page, pageSize });
  } catch (err) { next(err); }
}

/** GET /api/v1/notifications/unread-count（需登录） */
async function unreadCount(req, res, next) {
  try {
    const total = await notificationService.unreadCount(req.user.id);
    return success(res, { total }, 'success');
  } catch (err) { next(err); }
}

/** PUT /api/v1/notifications/:id/read（需登录，仅本人） */
async function markRead(req, res, next) {
  try {
    const affected = await notificationService.markRead(Number(req.params.id), req.user.id);
    if (!affected) return next(new AppError(1002, '通知不存在或已读'));
    return success(res, { read: true }, '已标记已读');
  } catch (err) { next(err); }
}

/** PUT /api/v1/notifications/read-all（需登录） */
async function markAllRead(req, res, next) {
  try {
    const affected = await notificationService.markAllRead(req.user.id);
    return success(res, { affected }, '全部已读');
  } catch (err) { next(err); }
}

/** DELETE /api/v1/notifications/:id（需登录，仅本人） */
async function remove(req, res, next) {
  try {
    const affected = await notificationService.remove(Number(req.params.id), req.user.id);
    if (!affected) return next(new AppError(1002, '通知不存在'));
    return success(res, { deleted: true }, '已删除');
  } catch (err) { next(err); }
}

module.exports = { list, unreadCount, markRead, markAllRead, remove };
