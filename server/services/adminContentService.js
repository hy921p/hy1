/**
 * 内容管理服务
 * 五类内容共用一套 CRUD，仅字段集不同：
 *   readings(晨读) / materials(面试素材) / basics(通识基础) / courses(课程) / hot-topics(热点)
 * 软删：readings / hot-topics → is_active=0；materials / basics / courses → 真删。
 */
const adminCrud = require('../models/adminCrud');
const AppError = require('../utils/app-error');
const ragService = require('./ragService');

const FIELDS = {
  readings: ['title', 'position', 'region', 'summary', 'content', 'cover', 'publish_date', 'is_hot', 'is_active'],
  materials: ['title', 'position', 'type', 'content'],
  basics: ['title', 'position', 'category', 'content'],
  courses: ['title', 'position', 'cover', 'video_url', 'duration', 'teacher', 'description'],
  hot_topics: ['title', 'summary', 'content', 'position', 'region', 'cover', 'views', 'publish_date', 'is_active'],
};

// 路由用连字符（hot-topics），配置键用下划线（hot_topics）
function normalize(type) {
  return type === 'hot-topics' ? 'hot_topics' : type;
}

function assertType(type) {
  if (!FIELDS[type]) throw new AppError(1004, '未知内容类型: ' + type);
}

function pick(type, body) {
  const data = {};
  for (const k of FIELDS[type]) {
    if (body[k] !== undefined && body[k] !== null) data[k] = body[k];
  }
  return data;
}

async function list(type, { page, pageSize, keyword, position, region }) {
  type = normalize(type);
  assertType(type);
  const where = [];
  if (position) where.push(['position', position]);
  if (region) where.push(['region', region]);
  return adminCrud.listTable(type, { page, pageSize, keyword, where });
}

async function detail(type, id) {
  type = normalize(type);
  assertType(type);
  const row = await adminCrud.getById(type, id);
  if (!row) throw new AppError(1004, '内容不存在');
  return row;
}

async function create(type, body) {
  type = normalize(type);
  assertType(type);
  if (!body.title || !String(body.title).trim()) throw new AppError(1001, '标题不能为空');
  const data = pick(type, body);
  // 仅含 is_active 列的表（readings/hot_topics）给默认值
  if (FIELDS[type].includes('is_active') && data.is_active === undefined) data.is_active = 1;
  const id = await adminCrud.createRow(type, data);
  // RAG 增量同步（fail-open，不阻塞业务）
  ragService.indexSource(type, id).catch(() => {});
  return id;
}

async function update(type, id, body) {
  type = normalize(type);
  assertType(type);
  const exist = await adminCrud.getById(type, id);
  if (!exist) throw new AppError(1004, '内容不存在');
  const result = await adminCrud.updateRow(type, id, pick(type, body));
  ragService.indexSource(type, id).catch(() => {});
  return result;
}

async function remove(type, id) {
  type = normalize(type);
  assertType(type);
  const exist = await adminCrud.getById(type, id);
  if (!exist) throw new AppError(1004, '内容不存在');
  const result = await adminCrud.deleteRow(type, id);
  ragService.removeSource(type, id).catch(() => {});
  return result;
}

module.exports = { list, detail, create, update, remove };
