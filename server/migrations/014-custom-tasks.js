/**
 * 014 自定义任务表（今日任务加号自添加）
 * 用户可手动添加/完成自己的临时任务，与学习计划节点并列展示在首页「今日任务」。
 * 幂等：IF NOT EXISTS。
 */
const { pool } = require('../models');

async function up() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS \`custom_tasks\` (
      \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
      \`user_id\` INT UNSIGNED NOT NULL COMMENT '所属用户',
      \`title\` VARCHAR(120) NOT NULL COMMENT '任务标题',
      \`est_minutes\` INT UNSIGNED NULL DEFAULT NULL COMMENT '预计耗时（分钟，可空）',
      \`is_default\` TINYINT NOT NULL DEFAULT 0 COMMENT '1=系统默认任务 0=用户自建',
      \`status\` TINYINT NOT NULL DEFAULT 0 COMMENT '0待办 1已完成',
      \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`finished_at\` DATETIME NULL DEFAULT NULL,
      PRIMARY KEY (\`id\`),
      KEY \`idx_user_status\` (\`user_id\`, \`status\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='今日任务-用户自定义任务'
  `);
  console.log('[migration] 014 custom_tasks 表已创建');
}

module.exports = { up };
