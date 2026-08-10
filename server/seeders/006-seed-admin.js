/**
 * 006 种子：默认管理员（幂等，UPSERT）
 * 保证 admin / admin123 可用：存在则重置密码+启用，不存在则新建。
 */
const bcrypt = require('bcryptjs');
const { pool } = require('../models');

async function seed() {
  const hash = bcrypt.hashSync('admin123', 10);
  const [exist] = await pool.query('SELECT id FROM admins WHERE username = ? LIMIT 1', ['admin']);
  if (exist.length) {
    const [result] = await pool.query(
      'UPDATE admins SET password_hash = ?, nickname = ?, role = ?, status = 1, deleted_at = NULL WHERE username = ?',
      [hash, '超级管理员', 'super', 'admin'],
    );
    if (result.affectedRows > 0) console.log('[seed] 006 已重置管理员 admin 密码为 admin123');
    else console.log('[seed] 006 管理员 admin 已存在且密码正确，跳过');
    return;
  }
  await pool.query(
    'INSERT INTO admins (username, password_hash, nickname, role, status) VALUES (?,?,?,?,1)',
    ['admin', hash, '超级管理员', 'super'],
  );
  console.log('[seed] 006 已创建默认管理员 admin/admin123');
}

module.exports = { seed };
