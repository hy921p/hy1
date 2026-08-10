/**
 * 答题/错题/收藏数据访问（阶段3 §7.11 / §5.15）
 * answer_records / wrong_answers / question_favorites 三表操作。
 */
const { query } = require('./index');

const answerRecordModel = {
  async insert({ userId, questionId, isCorrect, answerTime, userAnswer, category, position }) {
    const result = await query(
      'INSERT INTO answer_records (user_id, question_id, is_correct, answer_time, user_answer, category, position) VALUES (?,?,?,?,?,?,?)',
      [userId, questionId, isCorrect ? 1 : 0, answerTime || 0, userAnswer || null, category || null, position || null],
    );
    return result.insertId;
  },

  async countByUser(userId) {
    const rows = await query('SELECT COUNT(*) AS c FROM answer_records WHERE user_id = ?', [userId]);
    return rows[0].c;
  },
};

const wrongAnswerModel = {
  /** 答错 upsert：首次插入，重复累加次数并刷新时间；返回当前行 */
  async upsertOnWrong(userId, questionId) {
    await query(
      'INSERT INTO wrong_answers (user_id, question_id, wrong_count) VALUES (?,?,1) ' +
      'ON DUPLICATE KEY UPDATE wrong_count = wrong_count + 1, last_wrong_at = NOW()',
      [userId, questionId],
    );
    return this.findByUserQuestion(userId, questionId);
  },

  async findByUserQuestion(userId, questionId) {
    const rows = await query(
      'SELECT * FROM wrong_answers WHERE user_id = ? AND question_id = ?',
      [userId, questionId],
    );
    return rows[0] || null;
  },

  async setAnalysis(userId, questionId, analysis) {
    await query(
      'UPDATE wrong_answers SET ai_analysis = ? WHERE user_id = ? AND question_id = ?',
      [analysis, userId, questionId],
    );
  },

  async listByUser(userId, { page = 1, pageSize = 10 } = {}) {
    const offset = (page - 1) * pageSize;
    const [[totalRow], list] = await Promise.all([
      query('SELECT COUNT(*) AS c FROM wrong_answers WHERE user_id = ?', [userId]),
      query(
        `SELECT w.id, w.question_id, w.wrong_count, w.ai_analysis, w.mastered, w.last_wrong_at,
                q.content, q.category, q.position, q.region, q.type, q.difficulty
         FROM wrong_answers w
         JOIN questions q ON q.id = w.question_id
         WHERE w.user_id = ?
         ORDER BY w.last_wrong_at DESC, w.id DESC LIMIT ? OFFSET ?`,
        [userId, pageSize, offset],
      ),
    ]);
    return { list, total: totalRow.c };
  },

  /** 标记已掌握（仅本人，返回影响行数） */
  async markMastered(userId, questionId) {
    const result = await query(
      'UPDATE wrong_answers SET mastered = 1 WHERE user_id = ? AND question_id = ?',
      [userId, questionId],
    );
    return result.affectedRows;
  },
};

const favoriteModel = {
  /** 切换收藏（唯一键幂等）；返回切换后状态 */
  async toggle(userId, questionId) {
    const exists = await this.isFavorite(userId, questionId);
    if (exists) {
      await query(
        'DELETE FROM question_favorites WHERE user_id = ? AND question_id = ?',
        [userId, questionId],
      );
      return { favorited: false };
    }
    try {
      await query(
        'INSERT INTO question_favorites (user_id, question_id) VALUES (?,?)',
        [userId, questionId],
      );
      return { favorited: true };
    } catch (e) {
      if (e && e.code === 'ER_DUP_ENTRY') return { favorited: true };
      throw e;
    }
  },

  async isFavorite(userId, questionId) {
    const rows = await query(
      'SELECT id FROM question_favorites WHERE user_id = ? AND question_id = ?',
      [userId, questionId],
    );
    return rows.length > 0;
  },

  /** 已收藏题目 ID 集合（批量详情标注用） */
  async idSet(userId, questionIds) {
    if (!questionIds || !questionIds.length) return new Set();
    const rows = await query(
      'SELECT question_id FROM question_favorites WHERE user_id = ? AND question_id IN (?)',
      [userId, questionIds],
    );
    return new Set(rows.map((r) => r.question_id));
  },

  async listByUser(userId, { page = 1, pageSize = 10 } = {}) {
    const offset = (page - 1) * pageSize;
    const [[totalRow], list] = await Promise.all([
      query('SELECT COUNT(*) AS c FROM question_favorites WHERE user_id = ?', [userId]),
      query(
        `SELECT f.id, f.question_id, f.created_at,
                q.content, q.category, q.position, q.region, q.type, q.difficulty
         FROM question_favorites f
         JOIN questions q ON q.id = f.question_id
         WHERE f.user_id = ?
         ORDER BY f.created_at DESC, f.id DESC LIMIT ? OFFSET ?`,
        [userId, pageSize, offset],
      ),
    ]);
    return { list, total: totalRow.c };
  },
};

module.exports = { answerRecordModel, wrongAnswerModel, favoriteModel };
