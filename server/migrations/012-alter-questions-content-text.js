/**
 * 012 真题改造：questions.content 由 varchar(500) 扩为 TEXT
 * 原因：中国移动 2021-2025 真题为行测类题干 + A/B/C/D 选项，单题常超 500 字符，
 *       原列放不下会导致导入截断/报错。
 * 幂等：TEXT 已是目标类型时可重复执行。
 */
const { pool } = require('../models');

async function up() {
  await pool.query("ALTER TABLE questions MODIFY `content` TEXT NOT NULL COMMENT '题目内容（题干+选项，可长文本）'");
  console.log('[migration] 012 questions.content 已扩展为 TEXT');
}

module.exports = { up };
