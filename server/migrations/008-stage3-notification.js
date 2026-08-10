/**
 * 008 阶段3·通知建库（幂等）
 * notifications（§5.19 / §7.17）：
 *   type system/like/ai_answer/achievement/membership/checkin
 *   payload JSON（route + objectID 跳转数据）
 * M3 先行建表（like/ai_answer 通知触发验证的前置），M4 提供读写 API。
 */
const { pool } = require('../models');

async function up() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      user_id BIGINT UNSIGNED NOT NULL COMMENT "接收用户",
      type VARCHAR(20) NOT NULL COMMENT "system/like/ai_answer/achievement/membership/checkin",
      title VARCHAR(200) NOT NULL COMMENT "标题",
      content VARCHAR(500) DEFAULT NULL COMMENT "内容",
      payload JSON DEFAULT NULL COMMENT "跳转数据（route+objectID）",
      is_read TINYINT NOT NULL DEFAULT 0 COMMENT "是否已读 0/1",
      read_at DATETIME DEFAULT NULL COMMENT "已读时间",
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_noti_user (user_id, is_read, created_at),
      CONSTRAINT fk_noti_user FOREIGN KEY (user_id) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT="通知表"
  `);

  console.log('[migration] 008 执行完成（notifications）');
}

module.exports = { up };
