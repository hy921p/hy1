/**
 * 011 阶段6·V2.0 Agent 面试官建表（幂等）
 * agent_tools      工具注册表（5 工具：retrieve_knowledge/score_answer/generate_followup/next_question/finish_interview）
 * agent_tool_logs  工具调用日志（入参/结果摘要/耗时/状态，供报告聚合与审计）
 */
const { pool } = require('../models');

async function up() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS agent_tools (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      \`key\` VARCHAR(50) NOT NULL COMMENT "工具标识（唯一）",
      name VARCHAR(50) NOT NULL COMMENT "工具名",
      description VARCHAR(500) NOT NULL COMMENT "给 LLM 看的说明（何时调用）",
      params_schema JSON NOT NULL COMMENT "参数 JSON Schema",
      enabled TINYINT NOT NULL DEFAULT 1 COMMENT "是否启用",
      sort INT NOT NULL DEFAULT 0 COMMENT "排序",
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uk_atool_key (\`key\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT="Agent 工具注册表"
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS agent_tool_logs (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      interview_id BIGINT UNSIGNED NOT NULL COMMENT "面试会话",
      user_id BIGINT UNSIGNED NOT NULL COMMENT "求职者",
      tool_key VARCHAR(50) NOT NULL COMMENT "工具标识",
      request_payload JSON DEFAULT NULL COMMENT "入参",
      response_summary JSON DEFAULT NULL COMMENT "结果摘要",
      latency_ms INT NOT NULL DEFAULT 0 COMMENT "耗时（毫秒）",
      status VARCHAR(20) NOT NULL DEFAULT 'success' COMMENT "success/error",
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_aglog_int (interview_id),
      KEY idx_aglog_user (user_id),
      CONSTRAINT fk_aglog_int FOREIGN KEY (interview_id) REFERENCES interview_sessions(id) ON DELETE CASCADE,
      CONSTRAINT fk_aglog_user FOREIGN KEY (user_id) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT="Agent 工具调用日志表"
  `);

  console.log('[migration] 011 执行完成（agent_tools / agent_tool_logs）');
}

module.exports = { up };
