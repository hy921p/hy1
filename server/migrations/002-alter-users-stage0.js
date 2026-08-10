/**
 * 002 对齐 users 表到 v2.0 结构（幂等 ALTER）
 * 背景：数据库存在 v1.0 旧 schema（16 表已有数据），v2.0 文档重写新增了
 * 岗位/地区联动与成长体系字段，此处仅补齐本次启动必需字段，不破坏已有数据。
 * 完整对齐见文档 §21 迁移顺序（先改表后建表）。
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
  const adds = [];
  if (!(await columnExists('users', 'preferred_region'))) {
    adds.push('ADD COLUMN preferred_region VARCHAR(50) NOT NULL DEFAULT "四川" COMMENT "偏好地区（地区筛选器默认值）" AFTER target_position');
  }
  if (!(await columnExists('users', 'growth_points'))) {
    adds.push('ADD COLUMN growth_points INT NOT NULL DEFAULT 0 COMMENT "成长值（成长树等级依据）" AFTER preferred_region');
  }
  if (!(await columnExists('users', 'check_in_streak'))) {
    adds.push('ADD COLUMN check_in_streak INT NOT NULL DEFAULT 0 COMMENT "连续打卡天数" AFTER growth_points');
  }
  if (!(await columnExists('users', 'last_check_in_at'))) {
    adds.push('ADD COLUMN last_check_in_at DATETIME DEFAULT NULL COMMENT "最近打卡时间" AFTER check_in_streak');
  }
  if (!(await columnExists('users', 'total_interviews'))) {
    adds.push('ADD COLUMN total_interviews INT NOT NULL DEFAULT 0 COMMENT "累计面试次数" AFTER last_check_in_at');
  }
  if (!(await columnExists('users', 'avg_score'))) {
    adds.push('ADD COLUMN avg_score DECIMAL(4,1) DEFAULT NULL COMMENT "平均面试得分" AFTER total_interviews');
  }

  if (adds.length) {
    await pool.query(`ALTER TABLE users ${adds.join(', ')}`);
  }
}

module.exports = { up };
