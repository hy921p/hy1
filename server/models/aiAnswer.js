/**
 * AI 答疑数据访问（阶段3 §5.20 / §7.14）
 */
const { query } = require('./index');

const aiAnswerModel = {
  async insert({ userId, question, answer, category, refType, refId, entry, citations }) {
    const result = await query(
      'INSERT INTO ai_answers (user_id, question, answer, category, ref_type, ref_id, entry, citations) VALUES (?,?,?,?,?,?,?,?)',
      [userId, question, answer, category || 'knowledge', refType || null, refId || null, entry || null, citations && citations.length ? JSON.stringify(citations) : null],
    );
    return result.insertId;
  },

  async listByUser(userId, { page = 1, pageSize = 10 } = {}) {
    const offset = (page - 1) * pageSize;
    const [[totalRow], list] = await Promise.all([
      query('SELECT COUNT(*) AS c FROM ai_answers WHERE user_id = ?', [userId]),
      query(
        `SELECT id, question, answer, category, ref_type, ref_id, entry, citations, created_at
         FROM ai_answers WHERE user_id = ? ORDER BY id DESC LIMIT ? OFFSET ?`,
        [userId, pageSize, offset],
      ),
    ]);
    return { list, total: totalRow.c };
  },

  async findById(id) {
    const rows = await query('SELECT * FROM ai_answers WHERE id = ?', [id]);
    return rows[0] || null;
  },

  /** 删除（仅本人，返回影响行数） */
  async remove(id, userId) {
    const result = await query(
      'DELETE FROM ai_answers WHERE id = ? AND user_id = ?',
      [id, userId],
    );
    return result.affectedRows;
  },
};

module.exports = aiAnswerModel;
