/**
 * 015 wrong_answers 增加 user_answer（成绩单「我的答案」用）
 * 错题本原只记 wrong_count，交卷成绩单需要展示每道错题当时所选答案。
 * 幂等：information_schema 检查列是否存在，存在则跳过。
 */
const { pool } = require('../models');

async function up() {
  const [cols] = await pool.query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wrong_answers' AND COLUMN_NAME = 'user_answer'`,
  );
  if (!cols.length) {
    await pool.query(
      `ALTER TABLE wrong_answers
       ADD COLUMN user_answer CHAR(4) DEFAULT NULL COMMENT '最近一次答错所选答案' AFTER question_id`,
    );
    console.log('[migration] 015 wrong_answers.user_answer 已添加');
  } else {
    console.log('[migration] 015 wrong_answers.user_answer 已存在，跳过');
  }
}

module.exports = { up };
