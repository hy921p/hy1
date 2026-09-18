/**
 * 007 阶段3·社区 + AI 答疑建库（幂等）
 * ai_answers：AI 答疑记录（§5.20，citations 为自定扩展便于回显）
 * posts / post_likes 为 v1.0 已有表（本模块不重建）。
 */
const { pool } = require('../models');

async function up() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ai_answers (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      user_id BIGINT UNSIGNED NOT NULL COMMENT "提问用户",
      question TEXT NOT NULL COMMENT "用户问题",
      answer TEXT NOT NULL COMMENT "AI 回答",
      category VARCHAR(20) NOT NULL DEFAULT 'knowledge' COMMENT "community/interview/knowledge",
      ref_type VARCHAR(20) DEFAULT NULL COMMENT "引用来源类型",
      ref_id BIGINT DEFAULT NULL COMMENT "引用来源ID",
      entry VARCHAR(20) DEFAULT NULL COMMENT "入口 community/interview/knowledge",
      citations JSON DEFAULT NULL COMMENT "检索引用（自定扩展）",
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_ai_user (user_id, created_at),
      CONSTRAINT fk_ai_user FOREIGN KEY (user_id) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT="AI 答疑记录表"
  `);

  console.log('[migration] 007 执行完成（ai_answers）');
}

module.exports = { up };
