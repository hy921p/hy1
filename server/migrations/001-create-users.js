/**
 * 001 创建 users 表（阶段 0 最小结构）
 * 与文档 §5.3 users 表对齐，其余字段随阶段 2 迁移补全
 */
const { pool } = require('../models');

async function up() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      phone VARCHAR(20) NOT NULL COMMENT '手机号（登录凭证）',
      nickname VARCHAR(50) NOT NULL DEFAULT '' COMMENT '昵称',
      avatar VARCHAR(512) DEFAULT NULL COMMENT '头像 URL',
      gender TINYINT DEFAULT NULL COMMENT '性别 1男 2女 0未知',
      target_position VARCHAR(64) NOT NULL DEFAULT '公务员' COMMENT '目标岗位（岗位筛选器默认值）',
      preferred_region VARCHAR(50) NOT NULL DEFAULT '四川' COMMENT '偏好地区（地区筛选器默认值）',
      growth_points INT NOT NULL DEFAULT 0 COMMENT '成长值（成长树等级依据）',
      check_in_streak INT NOT NULL DEFAULT 0 COMMENT '连续打卡天数',
      last_check_in_at DATETIME DEFAULT NULL COMMENT '最近打卡时间',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uk_phone (phone)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表'
  `);
}

module.exports = { up };
