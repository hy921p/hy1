/**
 * 009 阶段5·管理员表对齐（幂等）
 * v1.0 已存在旧 admins 表（status 启用/停用 + deleted_at 软删，无 role 列）。
 * 本迁移：新库直接建表；旧库幂等补 role 列。沿用 002 的 information_schema 查列存在性。
 */
const { pool } = require('../models');

async function columnExists(table, column) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS cnt FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`,
    [table, column],
  );
  return rows[0].cnt > 0;
}

async function up() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS admins (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(50) NOT NULL COMMENT "登录账号",
      password_hash VARCHAR(128) NOT NULL COMMENT "bcrypt 哈希",
      nickname VARCHAR(50) DEFAULT NULL COMMENT "显示名",
      avatar VARCHAR(512) DEFAULT NULL COMMENT "头像",
      role VARCHAR(20) NOT NULL DEFAULT 'admin' COMMENT "admin/super",
      status TINYINT UNSIGNED NOT NULL DEFAULT 1 COMMENT "0停用/1启用",
      last_login_at DATETIME DEFAULT NULL COMMENT "最近登录时间",
      last_login_ip VARCHAR(50) DEFAULT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at DATETIME DEFAULT NULL COMMENT "软删时间",
      UNIQUE KEY uk_admin_username (username)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT="管理员表"
  `);

  // 旧表补 role 列（幂等）
  if (!(await columnExists('admins', 'role'))) {
    await pool.query("ALTER TABLE admins ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'admin' COMMENT 'admin/super' AFTER avatar");
  }

  console.log('[migration] 009 执行完成（admins 对齐）');
}

module.exports = { up };
