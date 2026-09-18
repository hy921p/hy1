/**
 * 学习规划控制器
 */
const { success, paginated } = require('../utils/response');
const service = require('../services/adminStudyPlanService');

async function list(req, res, next) {
  try {
    const { page, pageSize, keyword } = req.query;
    const data = await service.listPlans({ page, pageSize, keyword });
    return paginated(res, data);
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const id = await service.createPlan(req.body);
    return success(res, { id }, '创建成功');
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    await service.updatePlan(Number(req.params.id), req.body);
    return success(res, null, '更新成功');
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    await service.removePlan(Number(req.params.id));
    return success(res, null, '删除成功');
  } catch (err) { next(err); }
}

async function listNodes(req, res, next) {
  try {
    const list = await service.listNodes(Number(req.params.id));
    return success(res, list, 'success');
  } catch (err) { next(err); }
}

async function addNode(req, res, next) {
  try {
    const id = await service.addNode(Number(req.params.id), req.body);
    return success(res, { id }, '创建成功');
  } catch (err) { next(err); }
}

async function updateNode(req, res, next) {
  try {
    await service.updateNode(Number(req.params.nodeId), req.body);
    return success(res, null, '更新成功');
  } catch (err) { next(err); }
}

async function removeNode(req, res, next) {
  try {
    await service.removeNode(Number(req.params.nodeId));
    return success(res, null, '删除成功');
  } catch (err) { next(err); }
}

module.exports = { list, create, update, remove, listNodes, addNode, updateNode, removeNode };
