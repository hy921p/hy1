/**
 * 内容管理控制器（readings/materials/basics/courses/hot-topics）
 */
const { success, paginated } = require('../utils/response');
const service = require('../services/adminContentService');

async function list(req, res, next) {
  try {
    const { page, pageSize, keyword, position, region } = req.query;
    const data = await service.list(req.params.type, { page, pageSize, keyword, position, region });
    return paginated(res, data);
  } catch (err) { next(err); }
}

async function detail(req, res, next) {
  try {
    const row = await service.detail(req.params.type, Number(req.params.id));
    return success(res, row, 'success');
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const id = await service.create(req.params.type, req.body);
    return success(res, { id }, '创建成功');
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    await service.update(req.params.type, Number(req.params.id), req.body);
    return success(res, null, '更新成功');
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    await service.remove(req.params.type, Number(req.params.id));
    return success(res, null, '删除成功');
  } catch (err) { next(err); }
}

module.exports = { list, detail, create, update, remove };
