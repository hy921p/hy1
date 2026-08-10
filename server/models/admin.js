/**
 * 管理员模型（对齐 v1.0 旧表：status 启用标志 + deleted_at 软删）
 */
const { query } = require('./index');

/** 按用户名查（含密码哈希，仅供登录用，排除软删） */
async function findByUsername(username) {
  const rows = await query(
    'SELECT * FROM admins WHERE username = ? AND deleted_at IS NULL LIMIT 1',
    [username],
  );
  return rows[0] || null;
}

/** 按 id 查（不含密码哈希，排除软删） */
async function findById(id) {
  const rows = await query(
    'SELECT id, username, nickname, role, status, last_login_at, created_at FROM admins WHERE id = ? AND deleted_at IS NULL LIMIT 1',
    [id],
  );
  return rows[0] || null;
}

/** 更新最近登录时间 */
async function updateLastLogin(id) {
  await query('UPDATE admins SET last_login_at = NOW() WHERE id = ?', [id]);
}

module.exports = { findByUsername, findById, updateLastLogin };
