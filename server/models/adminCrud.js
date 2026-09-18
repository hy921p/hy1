/**
 * 通用管理 CRUD 模型
 * 表名白名单 + 通用 list/get/create/update/delete，供各 admin 模块 service 复用。
 * 删除策略按表：
 *   questions       → 软删 deleted_at=NOW(), status=0
 *   is_active 表    → 软删 is_active=0（readings/hot_topics/badges/study_plans）
 *   其余内容表      → 真删（materials/basics/courses/study_plan_nodes）
 */
const { query } = require('./index');
const AppError = require('../utils/app-error');

const TABLES = {
  questions: { keywordFields: ['content', 'detail'] },
  readings: { keywordFields: ['title', 'summary'] },
  materials: { keywordFields: ['title'] },
  basics: { keywordFields: ['title'] },
  courses: { keywordFields: ['title'] },
  hot_topics: { keywordFields: ['title', 'summary'] },
  study_plans: { keywordFields: ['name', 'description'] },
  study_plan_nodes: { keywordFields: ['title'] },
  badges: { keywordFields: ['name', 'code'] },
};

function assertTable(table) {
  if (!TABLES[table]) throw new AppError(1004, '未知内容类型: ' + table);
}

/**
 * 分页列表
 * @param {string} table 白名单表名
 * @param {object} opts { page, pageSize, keyword, where:[[col,val],...], order }
 */
async function listTable(table, opts = {}) {
  assertTable(table);
  const page = Math.max(1, parseInt(opts.page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(opts.pageSize, 10) || 10));
  const keyword = opts.keyword ? String(opts.keyword).trim() : '';
  const where = opts.where || [];
  const order = opts.order || 'id DESC';

  const conds = [];
  const params = [];
  if (table === 'questions') conds.push('deleted_at IS NULL');
  for (const [col, val] of where) {
    if (val === undefined || val === null || val === '') continue;
    conds.push(`${col} = ?`);
    params.push(val);
  }
  if (keyword && TABLES[table].keywordFields.length) {
    conds.push(`(${TABLES[table].keywordFields.map((f) => `${f} LIKE ?`).join(' OR ')})`);
    TABLES[table].keywordFields.forEach(() => params.push(`%${keyword}%`));
  }
  const whereSql = conds.length ? `WHERE ${conds.join(' AND ')}` : '';

  const countRows = await query(`SELECT COUNT(*) AS c FROM ${table} ${whereSql}`, params);
  const total = countRows[0] ? Number(countRows[0].c) : 0;

  const list = await query(
    `SELECT * FROM ${table} ${whereSql} ORDER BY ${order} LIMIT ? OFFSET ?`,
    [...params, pageSize, (page - 1) * pageSize],
  );
  return { list, total, page, pageSize, hasMore: page * pageSize < total };
}

/** 单条详情（questions 自动排除已删） */
async function getById(table, id) {
  assertTable(table);
  let sql = `SELECT * FROM ${table} WHERE id = ?`;
  if (table === 'questions') sql += ' AND deleted_at IS NULL';
  const rows = await query(sql, [id]);
  return rows[0] || null;
}

/** 新增（data 为列名→值的对象） */
async function createRow(table, data) {
  assertTable(table);
  const keys = Object.keys(data);
  if (!keys.length) throw new AppError(1001, '无有效字段');
  const placeholders = keys.map(() => '?').join(', ');
  const result = await query(
    `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`,
    Object.values(data),
  );
  return result.insertId;
}

/** 更新（data 为列名→值的对象） */
async function updateRow(table, id, data) {
  assertTable(table);
  const keys = Object.keys(data);
  if (!keys.length) return;
  const sets = keys.map((k) => `${k} = ?`).join(', ');
  const result = await query(
    `UPDATE ${table} SET ${sets} WHERE id = ?`,
    [...Object.values(data), id],
  );
  return result.affectedRows;
}

/** 删除（按表软删/真删） */
async function deleteRow(table, id) {
  assertTable(table);
  let result;
  if (table === 'questions') {
    result = await query('UPDATE questions SET deleted_at = NOW(), status = 0 WHERE id = ?', [id]);
  } else if (['readings', 'hot_topics', 'badges', 'study_plans'].includes(table)) {
    result = await query(`UPDATE ${table} SET is_active = 0 WHERE id = ?`, [id]);
  } else {
    result = await query(`DELETE FROM ${table} WHERE id = ?`, [id]);
  }
  return result.affectedRows;
}

module.exports = { listTable, getById, createRow, updateRow, deleteRow, assertTable };
