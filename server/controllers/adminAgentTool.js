/**
 * Agent 工具管理控制器
 */
const service = require('../services/adminAgentToolService');
const { success } = require('../utils/response');

async function list(req, res, next) {
  try {
    const list = await service.list();
    return success(res, { list, total: list.length }, 'success');
  } catch (err) {
    return next(err);
  }
}

async function toggle(req, res, next) {
  try {
    const data = await service.toggle(req.params.id, req.body);
    return success(res, data, '工具状态已更新');
  } catch (err) {
    return next(err);
  }
}

module.exports = { list, toggle };
