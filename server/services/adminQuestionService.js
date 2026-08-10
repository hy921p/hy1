/**
 * 题库维护服务
 * 复用 adminCrud 通用模型；questions 软删（deleted_at + status=0）。
 */
const adminCrud = require('../models/adminCrud');
const AppError = require('../utils/app-error');
const ragService = require('./ragService');

const PICK_FIELDS = [
  'content', 'detail', 'category', 'industry', 'position', 'region',
  'source_type', 'year', 'type', 'difficulty', 'reference_answer', 'tags', 'status',
];

function pick(body) {
  const data = {};
  for (const k of PICK_FIELDS) {
    if (body[k] !== undefined && body[k] !== null) data[k] = body[k];
  }
  if (Array.isArray(data.tags)) data.tags = JSON.stringify(data.tags);
  return data;
}

async function list({ page, pageSize, keyword, position, region, category, source_type, type }) {
  const where = [];
  if (position) where.push(['position', position]);
  if (region) where.push(['region', region]);
  if (category) where.push(['category', category]);
  if (source_type) where.push(['source_type', source_type]);
  if (type !== undefined && type !== '' && type !== null) where.push(['type', type]);
  return adminCrud.listTable('questions', { page, pageSize, keyword, where });
}

async function detail(id) {
  const row = await adminCrud.getById('questions', id);
  if (!row) throw new AppError(1004, '题目不存在');
  return row;
}

async function create(body, adminId) {
  if (!body.content || !String(body.content).trim()) throw new AppError(1001, '题干不能为空');
  const data = pick(body);
  data.created_by = adminId;
  data.operated_by = adminId;
  if (data.status === undefined) data.status = 1;
  const id = await adminCrud.createRow('questions', data);
  // RAG 增量同步（fail-open，不阻塞业务）
  ragService.indexSource('questions', id).catch(() => {});
  return id;
}

async function update(id, body, adminId) {
  const exist = await adminCrud.getById('questions', id);
  if (!exist) throw new AppError(1004, '题目不存在');
  const data = pick(body);
  data.operated_by = adminId;
  const result = await adminCrud.updateRow('questions', id, data);
  ragService.indexSource('questions', id).catch(() => {});
  return result;
}

async function remove(id) {
  const exist = await adminCrud.getById('questions', id);
  if (!exist) throw new AppError(1004, '题目不存在');
  const result = await adminCrud.deleteRow('questions', id);
  ragService.removeSource('questions', id).catch(() => {});
  return result;
}

module.exports = { list, detail, create, update, remove };
