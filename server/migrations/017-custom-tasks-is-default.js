/**
 * 017 custom_tasks 增加 is_default（默认任务标记）
 * 背景：014 建表时漏了该列，而 models/customTask.js 一直依赖它——
 *   ensureDefaults 查 `WHERE user_id = ? AND is_default = 1`，播种默认任务时也写这列，
 *   列表还按 `is_default DESC` 排序。于是「表存在但缺列」的环境里，登录用户打开首页必 500
 *   （匿名请求不走该分支，所以外部看着正常，一登录就错）。
 * 本列必须由迁移保证，不能再依赖手工 ALTER。
 * 幂等：information_schema 检查列是否存在，存在则跳过。
 * 说明：历史行一律按 0（用户自建任务）看待——默认任务由 ensureDefaults 播种时显式写 1。
 */
const { pool } = require('../models');

async function up() {
  const [cols] = await pool.query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'custom_tasks' AND COLUMN_NAME = 'is_default'`,
  );
  if (!cols.length) {
    await pool.query(
      `ALTER TABLE custom_tasks
       ADD COLUMN is_default TINYINT NOT NULL DEFAULT 0 COMMENT '1=系统默认任务 0=用户自建' AFTER est_minutes`,
    );
    console.log('[migration] 017 custom_tasks.is_default 已添加');
  } else {
    console.log('[migration] 017 custom_tasks.is_default 已存在，跳过');
  }
}

module.exports = { up };
