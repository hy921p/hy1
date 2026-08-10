/**
 * Agent 工具数据访问（agent_tools / agent_tool_logs，阶段6 §10.3）
 * agent_tool_logs 供报告聚合（score_answer 逐轮分）与审计使用。
 */
const { query } = require('./index');

const agentToolModel = {
  /** 启用的工具列表（转成 OpenAI function-calling 格式） */
  async getEnabledTools() {
    const rows = await query(
      'SELECT `key`, name, description, params_schema, sort FROM agent_tools WHERE enabled = 1 ORDER BY sort ASC, id ASC',
      [],
    );
    return rows.map((r) => ({
      type: 'function',
      function: {
        name: r.key,
        description: r.description,
        parameters: parseSchema(r.params_schema),
      },
    }));
  },

  /** 写入一次工具调用日志（fail-open，调用方不因日志失败中断） */
  async insertLog({ interviewId, userId, toolKey, requestPayload, responseSummary, latencyMs, status }) {
    const result = await query(
      'INSERT INTO agent_tool_logs ' +
      '(interview_id, user_id, tool_key, request_payload, response_summary, latency_ms, status) ' +
      'VALUES (?,?,?,?,?,?,?)',
      [
        interviewId, userId, toolKey,
        JSON.stringify(requestPayload || {}),
        JSON.stringify(responseSummary || {}),
        latencyMs || 0,
        status || 'success',
      ],
    );
    return result.insertId;
  },

  /** 某场面试的 score_answer 逐轮评分（questionIndex 最新的生效） */
  async getScoresBySession(sessionId) {
    const rows = await query(
      "SELECT response_summary FROM agent_tool_logs WHERE interview_id = ? AND tool_key = 'score_answer' AND status = 'success' ORDER BY id ASC",
      [sessionId],
    );
    // mysql2 自动把 JSON 列解析为对象
    const latest = new Map();
    for (const r of rows) {
      let s = r.response_summary || {};
      if (typeof s === 'string') { try { s = JSON.parse(s); } catch { continue; } }
      if (s && typeof s === 'object' && s.questionIndex !== undefined && s.questionIndex !== null) {
        latest.set(Number(s.questionIndex), s);
      }
    }
    return [...latest.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([questionIndex, s]) => ({
        questionIndex,
        totalScore: s.total_score != null ? Math.round(Number(s.total_score)) : null,
        comment: String(s.comment || ''),
        dimensions: s.dimensions || null,
      }));
  },
};

function parseSchema(raw) {
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch (e) { return { type: 'object', properties: {} }; }
  }
  return raw && typeof raw === 'object' ? raw : { type: 'object', properties: {} };
}

module.exports = agentToolModel;
