/**
 * 学习规划管理服务
 * 规划软删（is_active=0）；节点真删。删除规划时级联清理其节点。
 */
const adminCrud = require('../models/adminCrud');
const { query } = require('../models');
const AppError = require('../utils/app-error');

const PLAN_FIELDS = ['name', 'position', 'region', 'description', 'is_default', 'is_active'];
const NODE_FIELDS = ['title', 'node_type', 'target_type', 'target_id', 'est_minutes', 'sort_order', 'required'];

function pickPlan(body) {
  const data = {};
  for (const k of PLAN_FIELDS) if (body[k] !== undefined && body[k] !== null) data[k] = body[k];
  return data;
}

function pickNode(body) {
  const data = {};
  for (const k of NODE_FIELDS) if (body[k] !== undefined && body[k] !== null) data[k] = body[k];
  return data;
}

async function listPlans({ page, pageSize, keyword }) {
  return adminCrud.listTable('study_plans', { page, pageSize, keyword, where: [] });
}

async function createPlan(body) {
  if (!body.name || !String(body.name).trim()) throw new AppError(1001, '规划名称不能为空');
  const data = pickPlan(body);
  if (data.is_active === undefined) data.is_active = 1;
  if (data.is_default === undefined) data.is_default = 0;
  return adminCrud.createRow('study_plans', data);
}

async function updatePlan(id, body) {
  const exist = await adminCrud.getById('study_plans', id);
  if (!exist) throw new AppError(1004, '规划不存在');
  return adminCrud.updateRow('study_plans', id, pickPlan(body));
}

async function removePlan(id) {
  const exist = await adminCrud.getById('study_plans', id);
  if (!exist) throw new AppError(1004, '规划不存在');
  await query('DELETE FROM study_plan_nodes WHERE plan_id = ?', [id]);
  return adminCrud.deleteRow('study_plans', id);
}

async function listNodes(planId) {
  const plan = await adminCrud.getById('study_plans', planId);
  if (!plan) throw new AppError(1004, '规划不存在');
  return query('SELECT * FROM study_plan_nodes WHERE plan_id = ? ORDER BY sort_order ASC, id ASC', [planId]);
}

async function addNode(planId, body) {
  const plan = await adminCrud.getById('study_plans', planId);
  if (!plan) throw new AppError(1004, '规划不存在');
  if (!body.title || !String(body.title).trim()) throw new AppError(1001, '节点标题不能为空');
  const data = pickNode(body);
  data.plan_id = planId;
  if (data.sort_order === undefined) {
    const rows = await query('SELECT MAX(sort_order) AS m FROM study_plan_nodes WHERE plan_id = ?', [planId]);
    data.sort_order = (rows[0].m == null ? -1 : Number(rows[0].m)) + 1;
  }
  return adminCrud.createRow('study_plan_nodes', data);
}

async function updateNode(nodeId, body) {
  const exist = await adminCrud.getById('study_plan_nodes', nodeId);
  if (!exist) throw new AppError(1004, '节点不存在');
  return adminCrud.updateRow('study_plan_nodes', nodeId, pickNode(body));
}

async function removeNode(nodeId) {
  const exist = await adminCrud.getById('study_plan_nodes', nodeId);
  if (!exist) throw new AppError(1004, '节点不存在');
  return adminCrud.deleteRow('study_plan_nodes', nodeId);
}

module.exports = {
  listPlans, createPlan, updatePlan, removePlan,
  listNodes, addNode, updateNode, removeNode,
};
