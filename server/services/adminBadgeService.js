/**
 * 勋章管理服务
 * 软删（is_active=0）；C 端已领取记录不受影响。
 */
const adminCrud = require('../models/adminCrud');
const AppError = require('../utils/app-error');

const FIELDS = ['name', 'code', 'icon', 'description', 'condition_type', 'condition_value', 'sort', 'is_active'];

function pick(body) {
  const data = {};
  for (const k of FIELDS) if (body[k] !== undefined && body[k] !== null) data[k] = body[k];
  return data;
}

async function list({ page, pageSize, keyword }) {
  return adminCrud.listTable('badges', { page, pageSize, keyword, where: [] });
}

async function create(body) {
  if (!body.name || !String(body.name).trim()) throw new AppError(1001, '勋章名称不能为空');
  if (!body.code || !String(body.code).trim()) throw new AppError(1001, '勋章 code 不能为空');
  const data = pick(body);
  if (data.is_active === undefined) data.is_active = 1;
  if (data.sort === undefined) data.sort = 0;
  return adminCrud.createRow('badges', data);
}

async function update(id, body) {
  const exist = await adminCrud.getById('badges', id);
  if (!exist) throw new AppError(1004, '勋章不存在');
  return adminCrud.updateRow('badges', id, pick(body));
}

async function remove(id) {
  const exist = await adminCrud.getById('badges', id);
  if (!exist) throw new AppError(1004, '勋章不存在');
  return adminCrud.deleteRow('badges', id);
}

module.exports = { list, create, update, remove };
