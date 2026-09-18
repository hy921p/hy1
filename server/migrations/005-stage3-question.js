/**
 * 005 阶段3·题库模块建库（幂等）
 * 三张新表（§7.11 / §5.15 / 收藏自定）：
 *   answer_records      答题记录（答对+5 成长值）
 *   wrong_answers       错题本（uk_wrong_user_q 原子防重，AI 解析）
 *   question_favorites  题目收藏（uk_user_question 原子防重）
 * 全部 CREATE TABLE IF NOT EXISTS，可安全重复执行。
 */
const { pool } = require('../models');

async function up() {
  // answer_records（§5.15）
  await pool.query(`
    CREATE TABLE IF NOT EXISTS answer_records (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      user_id BIGINT UNSIGNED NOT NULL COMMENT "答题用户",
      question_id BIGINT UNSIGNED NOT NULL COMMENT "题目ID",
      is_correct TINYINT NOT NULL DEFAULT 0 COMMENT "是否答对 0/1",
      answer_time INT NOT NULL DEFAULT 0 COMMENT "作答耗时（秒）",
      user_answer TEXT DEFAULT NULL COMMENT "用户作答内容",
      category VARCHAR(50) DEFAULT NULL COMMENT "题型快照（冗余便于统计）",
      position VARCHAR(50) DEFAULT NULL COMMENT "岗位快照",
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_ar_user (user_id, created_at),
      KEY idx_ar_q (question_id),
      CONSTRAINT fk_ar_user FOREIGN KEY (user_id) REFERENCES users(id),
      CONSTRAINT fk_ar_question FOREIGN KEY (question_id) REFERENCES questions(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT="答题记录表"
  `);

  // wrong_answers（§5.15）
  await pool.query(`
    CREATE TABLE IF NOT EXISTS wrong_answers (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      user_id BIGINT UNSIGNED NOT NULL COMMENT "所属用户",
      question_id BIGINT UNSIGNED NOT NULL COMMENT "题目ID",
      wrong_count INT NOT NULL DEFAULT 1 COMMENT "错误次数",
      ai_analysis TEXT DEFAULT NULL COMMENT "AI 错题解析",
      mastered TINYINT NOT NULL DEFAULT 0 COMMENT "是否已掌握 0/1",
      last_wrong_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT "最近一次答错时间",
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uk_wrong_user_q (user_id, question_id),
      KEY idx_wrong_user_m (user_id, mastered),
      CONSTRAINT fk_wrong_user FOREIGN KEY (user_id) REFERENCES users(id),
      CONSTRAINT fk_wrong_question FOREIGN KEY (question_id) REFERENCES questions(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT="错题本表"
  `);

  // question_favorites（收藏，文档留白自定）
  await pool.query(`
    CREATE TABLE IF NOT EXISTS question_favorites (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      user_id BIGINT UNSIGNED NOT NULL COMMENT "所属用户",
      question_id BIGINT UNSIGNED NOT NULL COMMENT "题目ID",
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uk_user_question (user_id, question_id),
      KEY idx_fav_user (user_id, created_at),
      CONSTRAINT fk_fav_user FOREIGN KEY (user_id) REFERENCES users(id),
      CONSTRAINT fk_fav_question FOREIGN KEY (question_id) REFERENCES questions(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT="题目收藏表"
  `);

  console.log('[migration] 005 执行完成（answer_records / wrong_answers / question_favorites）');
}

module.exports = { up };
