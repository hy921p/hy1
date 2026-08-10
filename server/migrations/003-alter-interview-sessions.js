/**
 * 003 对齐面试相关表到 v2.1（幂等 ALTER）
 * - interview_sessions：补 position / region（岗位/地区快照）、question_plan（本轮题目计划 JSON）
 * - questions：补 region（地区，匹配规则 §5.7 用）
 * 沿用 002 的 information_schema 查列存在性做法，可安全重复执行。
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
  // interview_sessions
  const sessionAdds = [];
  if (!(await columnExists('interview_sessions', 'position'))) {
    sessionAdds.push('ADD COLUMN position VARCHAR(100) DEFAULT NULL COMMENT "岗位快照（如 公务员）" AFTER scenario_id');
  }
  if (!(await columnExists('interview_sessions', 'region'))) {
    sessionAdds.push('ADD COLUMN region VARCHAR(50) DEFAULT NULL COMMENT "地区快照（如 四川）" AFTER position');
  }
  if (!(await columnExists('interview_sessions', 'question_plan'))) {
    sessionAdds.push('ADD COLUMN question_plan JSON DEFAULT NULL COMMENT "本轮题目计划（题号/题干/题型）" AFTER region');
  }
  if (sessionAdds.length) {
    await pool.query(`ALTER TABLE interview_sessions ${sessionAdds.join(', ')}`);
  }

  // questions
  if (!(await columnExists('questions', 'region'))) {
    await pool.query(
      'ALTER TABLE questions ADD COLUMN region VARCHAR(50) DEFAULT NULL COMMENT "地区（全国=通用）" AFTER position',
    );
  }
}

module.exports = { up };
