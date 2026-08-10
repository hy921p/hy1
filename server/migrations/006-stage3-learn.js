/**
 * 006 阶段3·智学模块建库（幂等）
 * 五张新表（§5.17 / §5.18）：
 *   readings      晨读（热点精读）
 *   materials     素材库（金句/案例/名言）
 *   basics        面试通识
 *   courses       视频课程
 *   learning_notes 学习笔记（manual 手写 / ai_summary AI 摘要）
 * 全部 CREATE TABLE IF NOT EXISTS，可安全重复执行。
 */
const { pool } = require('../models');

async function up() {
  // readings（§5.17 晨读）
  await pool.query(`
    CREATE TABLE IF NOT EXISTS readings (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(200) NOT NULL COMMENT "标题",
      position VARCHAR(50) DEFAULT NULL COMMENT "岗位（可空=通用）",
      region VARCHAR(50) DEFAULT NULL COMMENT "地区（可空=全国）",
      summary VARCHAR(500) DEFAULT NULL COMMENT "摘要",
      content TEXT COMMENT "正文",
      cover VARCHAR(512) DEFAULT NULL COMMENT "封面图",
      publish_date DATE DEFAULT NULL COMMENT "发布日期",
      is_hot TINYINT NOT NULL DEFAULT 0 COMMENT "是否热点",
      is_active TINYINT NOT NULL DEFAULT 1 COMMENT "是否启用",
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_read_pos (position, region, is_active, publish_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT="晨读表"
  `);

  // materials（§5.17 素材库）
  await pool.query(`
    CREATE TABLE IF NOT EXISTS materials (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(200) NOT NULL COMMENT "素材标题",
      position VARCHAR(50) DEFAULT NULL COMMENT "岗位（可空=通用）",
      type VARCHAR(20) NOT NULL DEFAULT '金句' COMMENT "类型 金句/案例/名言",
      content TEXT COMMENT "素材内容",
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_mat_pos (type, position)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT="素材库表"
  `);

  // basics（§5.17 通识）
  await pool.query(`
    CREATE TABLE IF NOT EXISTS basics (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(200) NOT NULL COMMENT "标题",
      position VARCHAR(50) DEFAULT NULL COMMENT "岗位（可空=通用）",
      category VARCHAR(50) DEFAULT NULL COMMENT "分类",
      content TEXT COMMENT "内容",
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_basic_pos (category, position)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT="面试通识表"
  `);

  // courses（§5.17 课程）
  await pool.query(`
    CREATE TABLE IF NOT EXISTS courses (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(200) NOT NULL COMMENT "课程标题",
      position VARCHAR(50) DEFAULT NULL COMMENT "岗位（可空=通用）",
      cover VARCHAR(512) DEFAULT NULL COMMENT "封面图",
      video_url VARCHAR(512) DEFAULT NULL COMMENT "视频地址",
      duration INT NOT NULL DEFAULT 0 COMMENT "时长（分钟）",
      teacher VARCHAR(50) DEFAULT NULL COMMENT "讲师",
      description VARCHAR(500) DEFAULT NULL COMMENT "课程简介",
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_course_pos (position)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT="视频课程表"
  `);

  // learning_notes（§5.18）
  await pool.query(`
    CREATE TABLE IF NOT EXISTS learning_notes (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      user_id BIGINT UNSIGNED NOT NULL COMMENT "所属用户",
      title VARCHAR(200) NOT NULL DEFAULT '无标题笔记' COMMENT "标题",
      content TEXT COMMENT "笔记内容",
      source_type VARCHAR(20) NOT NULL DEFAULT 'manual' COMMENT "来源 manual手写/ai_summary AI摘要",
      source_id BIGINT DEFAULT NULL COMMENT "来源对象ID（如晨读ID）",
      source_title VARCHAR(200) DEFAULT NULL COMMENT "来源标题",
      is_ai_summary TINYINT NOT NULL DEFAULT 0 COMMENT "是否为 AI 摘要",
      status TINYINT NOT NULL DEFAULT 1 COMMENT "状态 1正常/0删除",
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_note_user (user_id, created_at),
      CONSTRAINT fk_note_user FOREIGN KEY (user_id) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT="学习笔记表"
  `);

  console.log('[migration] 006 执行完成（readings / materials / basics / courses / learning_notes）');
}

module.exports = { up };
