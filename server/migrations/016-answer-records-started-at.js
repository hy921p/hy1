/**
 * 016 answer_records 增加 started_at（做题记录「做题时间/结束时间」用）
 * 做题时间 = 用户进入该套试卷的开始时刻（前端进卷时记录，交卷随 exam-submit 上传），
 * 结束时间 = 交卷落库时刻（created_at）。
 * 幂等：information_schema 检查列是否存在，存在则跳过。
 */
const { pool } = require('../models');

async function up() {
  const [cols] = await pool.query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'answer_records' AND COLUMN_NAME = 'started_at'`,
  );
  if (!cols.length) {
    await pool.query(
      `ALTER TABLE answer_records
       ADD COLUMN started_at DATETIME DEFAULT NULL COMMENT '本次做题开始时间（进卷时刻）' AFTER answer_time`,
    );
    console.log('[migration] 016 answer_records.started_at 已添加');
  } else {
    console.log('[migration] 016 answer_records.started_at 已存在，跳过');
  }
}

module.exports = { up };
