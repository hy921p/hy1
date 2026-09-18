/**
 * 答题/错题/收藏数据访问（阶段3 §7.11 / §5.15）
 * answer_records / wrong_answers / question_favorites 三表操作。
 */
const { query } = require('./index');

const answerRecordModel = {
  async insert({ userId, questionId, isCorrect, answerTime, userAnswer, category, position, startedAt }) {
    const result = await query(
      'INSERT INTO answer_records (user_id, question_id, is_correct, answer_time, user_answer, category, position, started_at) VALUES (?,?,?,?,?,?,?,?)',
      [userId, questionId, isCorrect ? 1 : 0, answerTime || 0, userAnswer || null, category || null, position || null, startedAt || null],
    );
    return result.insertId;
  },

  async countByUser(userId) {
    const rows = await query('SELECT COUNT(*) AS c FROM answer_records WHERE user_id = ?', [userId]);
    return rows[0].c;
  },

  /** 已答题集合（批量交卷去重用：答过的不再重复 +5 成长值） */
  async idSetByUser(userId, questionIds) {
    if (!questionIds || !questionIds.length) return new Set();
    const rows = await query(
      'SELECT question_id FROM answer_records WHERE user_id = ? AND question_id IN (?)',
      [userId, questionIds],
    );
    return new Set(rows.map((r) => r.question_id));
  },

  /**
   * 每年做题统计：做题数 + 答对数 + 做题时间/结束时间（题库「做题记录」模块用）
   * 口径：只统计「整卷完整交卷」的记录（started_at 非空）。
   * 首页「今日推荐」的单题练习与错题重练通过 submitAnswer 落库（started_at 为空），
   * 不算做题记录 —— 做题记录只展示做过的历年真题/模拟试卷整卷。
   * 做题时间 = MIN(started_at)（进卷时刻）；结束时间 = MAX(created_at)（最后落库时刻）。
   * 排序：最近交卷（MAX(created_at)）越晚越靠前 —— 前端从左到右/从上到下渲染，最新做的在最左边。
   * 仅统计真题（source_type='real'）和模拟试卷（source_type='mock'）。
   */
  async practiceRecordsByYear(userId) {
    return query(
      `SELECT q.year AS year, q.source_type AS source_type,
              COUNT(*) AS total, SUM(ar.is_correct) AS correct,
              MIN(ar.started_at) AS started, MAX(ar.created_at) AS ended
       FROM answer_records ar
       JOIN questions q ON q.id = ar.question_id
       WHERE ar.user_id = ?
         AND q.source_type IN ('real', 'mock')
         AND ar.started_at IS NOT NULL
       GROUP BY q.year, q.source_type
       ORDER BY MAX(ar.created_at) DESC, q.year DESC, q.source_type DESC`,
      [userId],
    );
  },

  /** 删除某年某试卷类型整卷的做题记录（仅整卷交卷的记录；单题练习的 started_at 为空不动） */
  async deleteByPaper(userId, year, sourceType) {
    const result = await query(
      `DELETE ar FROM answer_records ar
       JOIN questions q ON q.id = ar.question_id
       WHERE ar.user_id = ?
         AND ar.started_at IS NOT NULL
         AND q.source_type = ?
         AND q.year = ?`,
      [userId, sourceType, Number(year)],
    );
    return result.affectedRows;
  },

  /**
   * 成绩单：某年真题/模拟试卷全卷题目 + 我的答案 + 正确答案 + 解析
   * 我的答案：优先取 answer_records.user_answer（正确/错误作答均会落库），
   * 兼容历史数据再并 wrong_answers.user_answer。
   * 去重：answer_records 允许同一题目多次作答（重复交卷/重做），直接 LEFT JOIN
   * 会产生扇出（一题多行）。这里先按题目取最新一条（MAX(id)）再关联，保证一题一行。
   */
  async examReportByYear(userId, year, sourceType) {
    const rows = await query(
      `SELECT q.id, q.content, q.category, q.reference_answer, q.detail,
              ar.user_answer AS ar_answer, wr.user_answer AS wr_answer
       FROM questions q
       LEFT JOIN (
         SELECT a.question_id, a.user_answer
         FROM answer_records a
         INNER JOIN (
           SELECT question_id, MAX(id) AS mid
           FROM answer_records
           WHERE user_id = ?
           GROUP BY question_id
         ) m ON a.id = m.mid
       ) ar ON ar.question_id = q.id
       LEFT JOIN wrong_answers wr ON wr.question_id = q.id AND wr.user_id = ?
       WHERE q.source_type = ? AND q.year = ? AND q.status = 1 AND q.deleted_at IS NULL
       ORDER BY q.id ASC`,
      [userId, userId, sourceType, Number(year)],
    );
    return rows.map((r) => {
      const userAnswer = r.ar_answer || r.wr_answer || null;
      const ref = String(r.reference_answer || '').trim().toUpperCase();
      const normalized = userAnswer ? String(userAnswer).trim().toUpperCase() : null;
      return {
        id: r.id,
        content: r.content,
        category: r.category,
        reference_answer: r.reference_answer,
        detail: r.detail,
        user_answer: normalized,
        is_correct: !!ref && !!normalized && normalized === ref,
      };
    });
  },

  /** 近 N 天按日聚合：刷题数 + 刷题时长（分钟，首页趋势用） */
  async dailyByUser(userId, startDate, endDate) {
    return query(
      `SELECT DATE_FORMAT(created_at, '%Y-%m-%d') AS date, COUNT(*) AS answers,
              COALESCE(ROUND(SUM(answer_time) / 60, 1), 0) AS minutes
       FROM answer_records
       WHERE user_id = ? AND created_at BETWEEN ? AND ?
       GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d')`,
      [userId, startDate + ' 00:00:00', endDate + ' 23:59:59'],
    );
  },
};

const wrongAnswerModel = {
  /** 答错 upsert：首次插入，重复累加次数并刷新时间与所选答案；返回当前行 */
  async upsertOnWrong(userId, questionId, userAnswer) {
    await query(
      'INSERT INTO wrong_answers (user_id, question_id, user_answer, wrong_count) VALUES (?,?,?,1) ' +
      'ON DUPLICATE KEY UPDATE wrong_count = wrong_count + 1, last_wrong_at = NOW(), user_answer = ?',
      [userId, questionId, userAnswer || null, userAnswer || null],
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

  /**
   * 错题列表：排除已掌握，支持考点/出错频次/题干关键词筛选（参考 GIA 错题本）
   * 额外支持来源分组 group（real 历年真题 / mock 模拟试卷 / today 今日推荐）。
   * today 组：题目在今天「今日推荐」池内（homeService 同款 findDailyReal 日种子）算今日推荐，
   * 其余 real 才算历年真题 —— 分组互斥且合计=总错题数。todayIds 由服务层算好传入。
   */
  async listByUser(
    userId,
    { page = 1, pageSize = 10, category, wrongCount, keyword, group, todayIds = [] } = {},
  ) {
    const where = ['w.user_id = ?', 'w.mastered = 0'];
    const params = [userId];
    if (group === 'today') {
      if (todayIds.length) {
        where.push(`w.question_id IN (${todayIds.map(() => '?').join(',')})`);
        params.push(...todayIds);
      } else {
        where.push('1 = 0');
      }
    } else if (group === 'mock') {
      where.push("q.source_type = 'mock'");
    } else if (group === 'real') {
      where.push("q.source_type = 'real'");
      if (todayIds.length) {
        where.push(`w.question_id NOT IN (${todayIds.map(() => '?').join(',')})`);
        params.push(...todayIds);
      }
    }
    if (category) {
      where.push('q.category = ?');
      params.push(category);
    }
    if (wrongCount === 1 || wrongCount === 2) {
      where.push('w.wrong_count = ?');
      params.push(wrongCount);
    } else if (wrongCount === 3) {
      where.push('w.wrong_count >= ?');
      params.push(3);
    }
    if (keyword) {
      where.push('q.content LIKE ?');
      params.push(`%${keyword}%`);
    }
    const whereSql = where.join(' AND ');
    const offset = (page - 1) * pageSize;
    const [[totalRow], list] = await Promise.all([
      query(
        `SELECT COUNT(*) AS c FROM wrong_answers w JOIN questions q ON q.id = w.question_id WHERE ${whereSql}`,
        params,
      ),
      query(
        `SELECT w.id, w.question_id, w.wrong_count, w.ai_analysis, w.mastered, w.last_wrong_at,
                w.user_answer AS user_answer,
                q.content, q.category, q.position, q.region, q.type, q.difficulty,
                q.source_type, q.year, q.reference_answer, q.detail
         FROM wrong_answers w
         JOIN questions q ON q.id = w.question_id
         WHERE ${whereSql}
         ORDER BY w.last_wrong_at DESC, w.id DESC LIMIT ? OFFSET ?`,
        [...params, pageSize, offset],
      ),
    ]);
    return { list, total: totalRow.c };
  },

  /** 错题来源分组计数：历年真题 real / 模拟试卷 mock / 今日推荐 today（互斥，todayIds 服务层传入） */
  async groupCounts(userId, todayIds = []) {
    const today = todayIds.map(Number).filter(Boolean);
    const tSql = today.length ? `w.question_id IN (${today.map(() => '?').join(',')})` : '1 = 0';
    // 注意绑定顺序：tSql 的占位符出现在 SELECT（WHERE 之前），须先传 today 再传 userId
    const rows = await query(
      `SELECT COUNT(*) AS c,
              SUM(CASE WHEN (${tSql}) THEN 1 ELSE 0 END) AS \`today\`,
              SUM(CASE WHEN NOT (${tSql}) AND q.source_type = 'mock' THEN 1 ELSE 0 END) AS \`mock\`,
              SUM(CASE WHEN NOT (${tSql}) AND q.source_type = 'real' THEN 1 ELSE 0 END) AS \`real\`
       FROM wrong_answers w
       JOIN questions q ON q.id = w.question_id
       WHERE w.user_id = ? AND w.mastered = 0`,
      [...today, ...today, ...today, userId],
    );
    const r = rows[0] || {};
    return {
      total: Number(r.c || 0),
      counts: [
        { key: 'real', label: '历年真题', count: Number(r.real || 0) },
        { key: 'mock', label: '模拟试卷', count: Number(r.mock || 0) },
        { key: 'today', label: '今日推荐', count: Number(r.today || 0) },
      ],
    };
  },

  /** 错题本内出现的考点列表（考点归属下拉用） */
  async distinctCategories(userId) {
    const rows = await query(
      `SELECT DISTINCT q.category FROM wrong_answers w
       JOIN questions q ON q.id = w.question_id
       WHERE w.user_id = ? AND w.mastered = 0 ORDER BY q.category`,
      [userId],
    );
    return rows.map((r) => r.category);
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
