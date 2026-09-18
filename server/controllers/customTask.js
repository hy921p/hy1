/**
 * 自定义任务控制器（§7.5 今日任务加号自添加）
 */
const { success } = require('../utils/response');
const customTaskService = require('../services/customTaskService');

/** POST /api/v1/custom-tasks 新增 */
async function create(req, res, next) {
  try {
    const data = await customTaskService.create(req.user.id, {
      title: req.body.title,
      estMinutes: req.body.estMinutes,
    });
    return success(res, data, '任务已添加');
  } catch (err) {
    next(err);
  }
}

/** GET /api/v1/custom-tasks?status=0|1 列表（缺省全部） */
async function list(req, res, next) {
  try {
    const status = req.query.status === '0' || req.query.status === '1' ? Number(req.query.status) : undefined;
    const data = await customTaskService.list(req.user.id, status);
    return success(res, data, 'success');
  } catch (err) {
    next(err);
  }
}

/** PUT /api/v1/custom-tasks/:id/done 勾选/取消勾选（body.done 缺省 true=勾选完成） */
async function markDone(req, res, next) {
  try {
    const done = req.body.done !== false;
    await customTaskService.markDone(req.user.id, req.params.id, done);
    return success(res, null, done ? '任务已完成' : '已取消勾选');
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/v1/custom-tasks/:id 删除 */
async function remove(req, res, next) {
  try {
    await customTaskService.remove(req.user.id, req.params.id);
    return success(res, null, '任务已删除');
  } catch (err) {
    next(err);
  }
}

module.exports = { create, list, markDone, remove };
