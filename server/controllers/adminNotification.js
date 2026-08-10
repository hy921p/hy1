/**
 * 通知推送控制器
 */
const { success, paginated } = require('../utils/response');
const service = require('../services/adminNotificationService');

/** POST /api/admin/notifications —— 推送（target: all|single） */
async function push(req, res, next) {
  try {
    const data = await service.push(req.body || {});
    return success(res, data, '推送成功');
  } catch (err) { next(err); }
}

/** GET /api/admin/notifications —— 发送记录 */
async function records(req, res, next) {
  try {
    const { page, pageSize } = req.query;
    const data = await service.records({ page, pageSize });
    return paginated(res, data);
  } catch (err) { next(err); }
}

module.exports = { push, records };
