/**
 * 004 阶段2：成长 + 学习体系建库（幂等）
 * 按文档 §21 迁移顺序：
 *   1. ALTER users/questions/interview_scenarios/posts 补字段与索引
 *   2. user_progress 旧单行结构（0 行）幂等重建为多行结构（user_id+type+target_id+progress）
 *   3. CREATE 7 张新表：check_ins / growth_records / study_plans / study_plan_nodes /
 *      badges / user_badges / hot_topics
 * 沿用 002/003 的 information_schema 查列/索引存在性做法，可安全重复执行。
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

async function indexExists(table, index) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS cnt FROM information_schema.statistics
     WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ?`,
    [table, index],
  );
  return rows[0].cnt > 0;
}

async function up() {
  // ---------- 1. ALTER 现有表 ----------

  // users：岗位/地区检索索引 + 岗位归一化（保证默认规则与索引有效）
  if (!(await indexExists('users', 'idx_pos_reg'))) {
    await pool.query(
      'UPDATE users SET target_position = "公务员" WHERE target_position IS NULL OR target_position = ""',
    );
    await pool.query(
      'CREATE INDEX idx_pos_reg ON users (target_position, preferred_region)',
    );
  }

  // questions：来源/年份 + 检索索引
  if (!(await columnExists('questions', 'source_type'))) {
    await pool.query(
      'ALTER TABLE questions ADD COLUMN source_type VARCHAR(20) NOT NULL DEFAULT "normal" COMMENT "来源：hot热点/real真题/mock试卷/normal专项" AFTER region',
    );
  }
  if (!(await columnExists('questions', 'year'))) {
    await pool.query(
      'ALTER TABLE questions ADD COLUMN year INT DEFAULT NULL COMMENT "真题年份（source_type=real 时有效）" AFTER source_type',
    );
  }
  if (!(await indexExists('questions', 'idx_q_source'))) {
    await pool.query('CREATE INDEX idx_q_source ON questions (source_type)');
  }
  if (!(await indexExists('questions', 'idx_q_pos_reg_cat'))) {
    await pool.query('CREATE INDEX idx_q_pos_reg_cat ON questions (position, region, category)');
  }

  // interview_scenarios：地区/封面 + 检索索引
  if (!(await columnExists('interview_scenarios', 'region'))) {
    await pool.query(
      'ALTER TABLE interview_scenarios ADD COLUMN region VARCHAR(50) DEFAULT NULL COMMENT "地区（NULL/全国=通用）" AFTER position',
    );
  }
  if (!(await columnExists('interview_scenarios', 'cover'))) {
    await pool.query(
      'ALTER TABLE interview_scenarios ADD COLUMN cover VARCHAR(512) DEFAULT NULL COMMENT "封面图" AFTER description',
    );
  }
  if (!(await indexExists('interview_scenarios', 'idx_scenario_pos_reg'))) {
    await pool.query('CREATE INDEX idx_scenario_pos_reg ON interview_scenarios (position, region)');
  }

  // posts：地区标签（§5.11）
  if (!(await columnExists('posts', 'region'))) {
    await pool.query(
      'ALTER TABLE posts ADD COLUMN region VARCHAR(50) DEFAULT NULL COMMENT "地区标签" AFTER position',
    );
  }

  // ---------- 2. user_progress 幂等重建 ----------
  // 旧单行结构（已核实 0 行）：若存在 weekly_scores 列则 DROP 重建为多行结构
  if (await columnExists('user_progress', 'weekly_scores')) {
    await pool.query('DROP TABLE IF EXISTS user_progress');
    console.log('[migration] user_progress 旧单行结构已删除');
  }
  // 全新库无该表（或刚删除），统一 IF NOT EXISTS 创建多行结构
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_progress (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      user_id BIGINT UNSIGNED NOT NULL COMMENT "所属用户",
      type VARCHAR(20) NOT NULL COMMENT "进度类型 reading/question/course/interview/study_plan",
      target_id BIGINT DEFAULT NULL COMMENT "目标对象ID（study_plan=节点id）",
      progress INT NOT NULL DEFAULT 0 COMMENT "进度值 0-100",
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uk_user_type_target (user_id, type, target_id),
      KEY idx_up_user (user_id, updated_at),
      KEY idx_up_type_target (type, target_id),
      CONSTRAINT fk_up_user FOREIGN KEY (user_id) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT="学习进度表（多行）"
  `);
  console.log('[migration] user_progress 已就绪（多行结构）');

  // ---------- 3. 新表 ----------

  // check_ins（§5.14）
  await pool.query(`
    CREATE TABLE IF NOT EXISTS check_ins (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      user_id BIGINT UNSIGNED NOT NULL COMMENT "所属用户",
      check_date DATE NOT NULL COMMENT "打卡日期",
      points INT NOT NULL DEFAULT 10 COMMENT "本次获得成长值",
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uk_user_date (user_id, check_date),
      KEY idx_checkin_date (check_date),
      CONSTRAINT fk_checkin_user FOREIGN KEY (user_id) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT="打卡表"
  `);

  // growth_records（§5.22）
  await pool.query(`
    CREATE TABLE IF NOT EXISTS growth_records (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      user_id BIGINT UNSIGNED NOT NULL COMMENT "所属用户",
      type VARCHAR(20) NOT NULL COMMENT "事件类型 register/checkin/answer/interview/ai_summary/...",
      points INT NOT NULL COMMENT "本次成长值",
      remark VARCHAR(200) DEFAULT NULL COMMENT "备注",
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_growth_user (user_id, created_at),
      CONSTRAINT fk_growth_user FOREIGN KEY (user_id) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT="成长值日志表"
  `);

  // study_plans（§5.23）
  await pool.query(`
    CREATE TABLE IF NOT EXISTS study_plans (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL COMMENT "规划名称",
      position VARCHAR(50) DEFAULT NULL COMMENT "岗位（可空=通用）",
      region VARCHAR(50) DEFAULT NULL COMMENT "地区（可空=通用）",
      description VARCHAR(255) DEFAULT NULL COMMENT "描述",
      is_default TINYINT NOT NULL DEFAULT 0 COMMENT "是否默认回退规划",
      is_active TINYINT NOT NULL DEFAULT 1 COMMENT "是否启用",
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_plan_pos (position, is_active)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT="智能学习规划表"
  `);

  // study_plan_nodes（§5.23）
  await pool.query(`
    CREATE TABLE IF NOT EXISTS study_plan_nodes (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      plan_id BIGINT UNSIGNED NOT NULL COMMENT "所属规划",
      title VARCHAR(100) NOT NULL COMMENT "节点标题",
      node_type VARCHAR(20) NOT NULL COMMENT "节点类型 checkin/reading/question/course/interview/review",
      target_type VARCHAR(20) DEFAULT NULL COMMENT "目标类型（可空）",
      target_id BIGINT DEFAULT NULL COMMENT "目标对象ID（可空）",
      est_minutes INT NOT NULL DEFAULT 0 COMMENT "预计耗时（分钟）",
      sort_order INT NOT NULL DEFAULT 0 COMMENT "排序",
      required TINYINT NOT NULL DEFAULT 1 COMMENT "是否必做",
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_plan_node (plan_id, sort_order),
      CONSTRAINT fk_node_plan FOREIGN KEY (plan_id) REFERENCES study_plans(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT="学习规划节点表"
  `);

  // badges（§5.21）
  await pool.query(`
    CREATE TABLE IF NOT EXISTS badges (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(50) NOT NULL COMMENT "勋章名称",
      code VARCHAR(50) NOT NULL COMMENT "勋章编码（唯一）",
      icon VARCHAR(64) DEFAULT NULL COMMENT "图标",
      description VARCHAR(200) DEFAULT NULL COMMENT "描述",
      condition_type VARCHAR(30) NOT NULL COMMENT "checkin_days/interview_count/score_threshold/growth_points/answer_count/plan_count",
      condition_value INT NOT NULL DEFAULT 0 COMMENT "判定阈值",
      sort INT NOT NULL DEFAULT 0 COMMENT "排序",
      is_active TINYINT NOT NULL DEFAULT 1 COMMENT "是否启用",
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uk_badge_code (code),
      KEY idx_badge_active (is_active, sort)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT="勋章定义表"
  `);

  // user_badges（§5.21）
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_badges (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      user_id BIGINT UNSIGNED NOT NULL COMMENT "所属用户",
      badge_id BIGINT UNSIGNED NOT NULL COMMENT "勋章ID",
      earned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT "获得时间",
      UNIQUE KEY uk_user_badge (user_id, badge_id),
      KEY idx_ub_badge (badge_id),
      CONSTRAINT fk_ub_user FOREIGN KEY (user_id) REFERENCES users(id),
      CONSTRAINT fk_ub_badge FOREIGN KEY (badge_id) REFERENCES badges(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT="用户已获勋章表"
  `);

  // hot_topics（§5.17）
  await pool.query(`
    CREATE TABLE IF NOT EXISTS hot_topics (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(200) NOT NULL COMMENT "标题",
      summary VARCHAR(500) DEFAULT NULL COMMENT "摘要",
      content TEXT DEFAULT NULL COMMENT "内容",
      position VARCHAR(50) DEFAULT NULL COMMENT "岗位（可空=通用）",
      region VARCHAR(50) DEFAULT NULL COMMENT "地区（可空=通用）",
      cover VARCHAR(512) DEFAULT NULL COMMENT "封面图",
      views INT NOT NULL DEFAULT 0 COMMENT "浏览量",
      publish_date DATE DEFAULT NULL COMMENT "发布日期",
      is_active TINYINT NOT NULL DEFAULT 1 COMMENT "是否启用",
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_ht_pos (publish_date, position, region)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT="热点内容表"
  `);

  console.log('[migration] 004 执行完成（ALTER 4 表 + user_progress 重建 + 7 张新表）');
}

module.exports = { up };
