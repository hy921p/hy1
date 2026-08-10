/**
 * Agent 工具管理服务（阶段6 §10.3）
 * 列表 + 启停开关（只动 enabled，不覆盖工具定义，人工状态可持久）。
 */
const { query } = require('../models');
const AppError = require('../utils/app-error');

async function list() {
  const rows = await query(
    'SELECT id, `key`, name, description, enabled, sort FROM agent_tools ORDER BY sort ASC, id ASC',
    [],
  );
  return rows.map((r) => ({
    id: r.id,
    key: r.key,
    name: r.name,
    description: r.description,
    enabled: r.enabled,
    sort: r.sort,
  }));
}

async function toggle(id, { enabled }) {
  const value = enabled ? 1 : 0;
  const result = await query('UPDATE agent_tools SET enabled = ? WHERE id = ?', [value, id]);
  if (!result.affectedRows) throw new AppError(1004, '工具不存在');
  return { id, enabled: value };
}

module.exports = { list, toggle };
