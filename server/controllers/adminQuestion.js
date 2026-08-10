/**
 * 题库维护控制器
 */
const { success, paginated } = require('../utils/response');
const service = require('../services/adminQuestionService');

async function list(req, res, next) {
  try {
    const { page, pageSize, keyword, position, region, category, source_type, type } = req.query;
    const data = await service.list({ page, pageSize, keyword, position, region, category, source_type, type });
    return paginated(res, data);
  } catch (err) { next(err); }
}

async function detail(req, res, next) {
  try {
    const row = await service.detail(Number(req.params.id));
    return success(res, row, 'success');
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const id = await service.create(req.body, req.admin.id);
    return success(res, { id }, '创建成功');
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    await service.update(Number(req.params.id), req.body, req.admin.id);
    return success(res, null, '更新成功');
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    await service.remove(Number(req.params.id));
    return success(res, null, '删除成功');
  } catch (err) { next(err); }
}

module.exports = { list, detail, create, update, remove };
