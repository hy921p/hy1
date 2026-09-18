/**
 * 面试相关数据访问（interview_sessions / interview_messages /
 * interview_reports / questions / interview_scenarios）
 * 复用 models/index.js 的连接池与 query 封装
 */
const { query } = require('./index');

const SESSION_WHITELIST = [
  'status', 'current_index', 'total_questions', 'duration', 'score',
  'started_at', 'finished_at',
];

const sessionModel = {
  async findById(id) {
    const rows = await query('SELECT * FROM interview_sessions WHERE id = ?', [id]);
    return rows[0] || null;
  },

  async findByUser(userId, { page = 1, pageSize = 10, minScore, maxScore, keyword } = {}) {
    // 考试记录筛选：分数区间 + 试卷名称模糊搜索（参考 GIA 站）
    const where = ['user_id = ?'];
    const params = [userId];
    if (minScore != null && minScore !== '') { where.push('score >= ?'); params.push(Number(minScore)); }
    if (maxScore != null && maxScore !== '') { where.push('score <= ?'); params.push(Number(maxScore)); }
    if (keyword) { where.push('scenario_name LIKE ?'); params.push(`%${keyword}%`); }
    const whereSql = where.join(' AND ');
    const offset = (page - 1) * pageSize;
    const [total] = await query(
      'SELECT COUNT(*) AS c FROM interview_sessions WHERE ' + whereSql,
      params
    );
    const list = await query(
      'SELECT id, scenario_name, mode, status, current_index, total_questions, score, ' +
      'position, region, started_at, finished_at, created_at ' +
      'FROM interview_sessions WHERE ' + whereSql + ' ORDER BY id DESC LIMIT ? OFFSET ?',
      [...params, pageSize, offset]
    );
    return { list, total: total.c };
  },

  async create({ userId, scenarioId, scenarioName, mode, totalQuestions, position, region, questionPlan }) {
    const startedAt = new Date();
    const result = await query(
      'INSERT INTO interview_sessions ' +
      '(user_id, scenario_id, scenario_name, mode, status, current_index, total_questions, ' +
      'score, position, region, question_plan, started_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
      [
        userId, scenarioId, scenarioName, mode, 1, 0, totalQuestions,
        0, position, region, JSON.stringify(questionPlan), startedAt,
      ]
    );
    return result.insertId;
  },

  async update(id, fields) {
    const set = [];
    const params = [];
    for (const key of Object.keys(fields)) {
      if (SESSION_WHITELIST.includes(key)) {
        set.push(`\`${key}\` = ?`);
        params.push(fields[key]);
      }
    }
    if (!set.length) return;
    params.push(id);
    await query(`UPDATE interview_sessions SET ${set.join(', ')} WHERE id = ?`, params);
  },

  /** 分数区间（考试记录统计）：仅统计已完成的记录 */
  async scoreRange(userId) {
    const rows = await query(
      'SELECT MIN(score) AS minScore, MAX(score) AS maxScore ' +
      'FROM interview_sessions WHERE user_id = ? AND status = 3 AND score > 0',
      [userId],
    );
    return rows[0] || { minScore: null, maxScore: null };
  },

  /** 近 N 天按日聚合：面试次数 + 面试时长（分钟，首页趋势用） */
  async dailyByUser(userId, startDate, endDate) {
    return query(
      `SELECT DATE_FORMAT(started_at, '%Y-%m-%d') AS date, COUNT(*) AS interviews,
              COALESCE(ROUND(SUM(duration) / 60, 1), 0) AS minutes
       FROM interview_sessions
       WHERE user_id = ? AND started_at BETWEEN ? AND ?
       GROUP BY DATE_FORMAT(started_at, '%Y-%m-%d')`,
      [userId, startDate + ' 00:00:00', endDate + ' 23:59:59'],
    );
  },

  /** 删除本人面试记录（连报告 + 对话消息一起删；非本人返回 false） */
  async removeOwn(sessionId, userId) {
    const s = await this.findById(sessionId);
    if (!s || s.user_id !== userId) return false;
    await query('DELETE FROM interview_reports WHERE session_id = ?', [sessionId]);
    await query('DELETE FROM interview_messages WHERE session_id = ?', [sessionId]);
    await query('DELETE FROM interview_sessions WHERE id = ?', [sessionId]);
    return true;
  },

  /** 进行中超时待自动收尾的会话：状态仍为 1（进行中），且距最近一条消息（无消息用开始时刻）超过 idleMinutes 分钟 */
  async listIdleInProgress(idleMinutes) {
    return query(
      // s.started_at 必须进 GROUP BY：HAVING 里引用未分组列时，
      // MySQL 8 在 ONLY_FULL_GROUP_BY 下会报 1054「Unknown column 's.started_at' in 'having clause'」，
      // 生产上表现为「自动收尾扫描失败」刷屏、30 分钟无作答的面试永远不收尾。
      `SELECT s.id, s.user_id
       FROM interview_sessions s
       LEFT JOIN interview_messages m ON m.session_id = s.id
       WHERE s.status = 1
       GROUP BY s.id, s.user_id, s.started_at
       HAVING COALESCE(MAX(m.created_at), s.started_at) < NOW() - INTERVAL ? MINUTE`,
      [Number(idleMinutes)],
    );
  },

  /** 幂等收尾：仅当仍处于「进行中」时置为已完成(3)并写分，防止重复收尾/重复加分 */
  async completeClaim(sessionId, score) {
    const result = await query(
      'UPDATE interview_sessions SET status = 3, score = ?, finished_at = NOW() WHERE id = ? AND status = 1',
      [score, sessionId],
    );
    return result.affectedRows === 1;
  },

  /** 幂等放弃：仅当仍处于「进行中」时置为已中断(4)，不生成报告 */
  async abandonClaim(sessionId) {
    const result = await query(
      'UPDATE interview_sessions SET status = 4, finished_at = NOW() WHERE id = ? AND status = 1',
      [sessionId],
    );
    return result.affectedRows === 1;
  },
};

const messageModel = {
  async findBySession(sessionId) {
    return query(
      'SELECT * FROM interview_messages WHERE session_id = ? ORDER BY id ASC',
      [sessionId]
    );
  },

  async insert({ sessionId, role, content, questionIndex, roundIndex }) {
    const result = await query(
      'INSERT INTO interview_messages (session_id, role, content, question_index, round_index) VALUES (?,?,?,?,?)',
      [sessionId, role, content, questionIndex, roundIndex]
    );
    return result.insertId;
  },
};

const reportModel = {
  async findBySession(sessionId) {
    const rows = await query(
      'SELECT * FROM interview_reports WHERE session_id = ?',
      [sessionId]
    );
    return rows[0] || null;
  },

  async create({ sessionId, userId, totalScore, dimensions, highlights, improvements, perQuestion }) {
    const now = new Date();
    const result = await query(
      'INSERT INTO interview_reports ' +
      '(session_id, user_id, total_score, dimension_scores, highlights, improvements, per_question, generated_at, created_at) ' +
      'VALUES (?,?,?,?,?,?,?,?,?)',
      [
        sessionId, userId, totalScore,
        JSON.stringify(dimensions), JSON.stringify(highlights), JSON.stringify(improvements),
        JSON.stringify(perQuestion), now, now,
      ]
    );
    return result.insertId;
  },

  /** 批量取指定会话的逐题评分（考试记录正确率用，避免 N+1） */
  async findBySessions(sessionIds) {
    if (!sessionIds || !sessionIds.length) return [];
    return query(
      'SELECT session_id, per_question FROM interview_reports WHERE session_id IN (?)',
      [sessionIds],
    );
  },

  /** 近 N 天按日聚合：平均分 + 报告数（progress-trend） */
  async scoreByDateRange(userId, startDate, endDate) {
    return query(
      `SELECT DATE(generated_at) AS date,
              ROUND(AVG(total_score), 1) AS avgScore,
              COUNT(*) AS reports
       FROM interview_reports
       WHERE user_id = ? AND generated_at BETWEEN ? AND ?
       GROUP BY DATE(generated_at)`,
      [userId, startDate + ' 00:00:00', endDate + ' 23:59:59'],
    );
  },

  /** 全部报告的能力维度分（ability-assessment） */
  async dimensionScoresByUser(userId) {
    return query(
      'SELECT dimension_scores FROM interview_reports WHERE user_id = ?',
      [userId],
    );
  },
};

const questionModel = {
  /**
   * 按文档 §5.7 匹配题目：三级回退
   * 1) position+region 精确；2) position+(region='全国' OR region IS NULL)；3) position 通用/默认组
   * 题库改造后仅真题（source_type='real'）入库，模拟面试不再配题 → 强制排除 real 返回空。
   */
  async match(position, region, limit) {
    const sql = `
      SELECT id, content, detail, category, position, region, difficulty, reference_answer
      FROM questions
      WHERE status = 1 AND deleted_at IS NULL
        AND source_type IN ('hot', 'mock', 'normal')
        AND (
          (position = ? AND region = ?)
          OR (position = ? AND (region = '全国' OR region IS NULL))
          OR (position IS NULL OR position = '通用' OR position = '公务员')
        )
      ORDER BY FIELD(position, ?, '通用', '公务员') ASC, category ASC, RAND()
      LIMIT ?
    `;
    return query(sql, [position, region, position, position, limit]);
  },

  /** 今日推荐（source_type='hot'，三级回退，匹配度优先） */
  async findHot(position, region, limit) {
    const sql = `
      SELECT id, content, detail, category, position, region, difficulty, reference_answer
      FROM questions
      WHERE status = 1 AND deleted_at IS NULL AND source_type = 'hot'
        AND (
          (position = ? AND region = ?)
          OR (position = ? AND (region = '全国' OR region IS NULL))
          OR (position IS NULL OR position = '通用')
        )
      ORDER BY FIELD(position, ?, '通用') ASC, id DESC
      LIMIT ?
    `;
    return query(sql, [position, region, position, position, limit]);
  },

  /** 今日推荐真题（source_type='real'，三级回退；RAND(日种子) 保证当天固定、次日轮换） */
  async findDailyReal(position, region, limit) {
    const daySeed = Math.floor(Date.now() / 86400000);
    const sql = `
      SELECT id, content, detail, category, position, region, source_type, year, type, difficulty, reference_answer
      FROM questions
      WHERE status = 1 AND deleted_at IS NULL AND source_type = 'real'
        AND (
          (position = ? AND region = ?)
          OR (position = ? AND (region = '全国' OR region IS NULL))
          OR (position IS NULL OR position = '通用' OR position = '公务员')
        )
      ORDER BY RAND(?) , year DESC, id DESC
      LIMIT ?
    `;
    return query(sql, [position, region, position, daySeed, limit]);
  },

  /** 再练一题：今日推荐真题池（RAND 日种子）排除已练 ids 续取下一道，避免与上一题相同 */
  async findNextPractice(position, region, excludeIds = [], limit = 1) {
    const daySeed = Math.floor(Date.now() / 86400000);
    const ids = excludeIds.map(Number).filter((n) => Number.isInteger(n) && n > 0);
    const notIn = ids.length ? `AND id NOT IN (${ids.map(() => '?').join(',')})` : '';
    const sql = `
      SELECT id, content, detail, category, position, region, source_type, year, type, difficulty, reference_answer
      FROM questions
      WHERE status = 1 AND deleted_at IS NULL AND source_type = 'real'
        AND (
          (position = ? AND region = ?)
          OR (position = ? AND (region = '全国' OR region IS NULL))
          OR (position IS NULL OR position = '通用' OR position = '公务员')
        )
        ${notIn}
      ORDER BY RAND(?) , year DESC, id DESC
      LIMIT ?
    `;
    return query(sql, [position, region, position, ...ids, daySeed, limit]);
  },

  /** 单题详情（题库详情页，阶段3 §7.11） */
  async findById(id) {
    const rows = await query(
      'SELECT * FROM questions WHERE id = ? AND deleted_at IS NULL',
      [id],
    );
    return rows[0] || null;
  },

  /**
   * 题库列表：动态 WHERE + 岗位/地区三级回退 + 分页
   * @param {{position, region, category, sourceType, keyword, page, pageSize, sort}} params
   */
  async list({ position, region, category, sourceType, keyword, page = 1, pageSize = 10, sort = 'latest' } = {}) {
    // 题库改造：专项/模拟/热点仅展示 hot/mock/normal，真题（real）只走历年真题入口
    const where = ['status = 1 AND deleted_at IS NULL', "source_type IN ('hot', 'mock', 'normal')"];
    const params = [];
    if (category) { where.push('category = ?'); params.push(category); }
    if (sourceType) { where.push('source_type = ?'); params.push(sourceType); }
    if (keyword) { where.push('content LIKE ?'); params.push(`%${keyword}%`); }
    if (position) {
      where.push(
        '((position = ? AND region = ?) OR (position = ? AND (region = "全国" OR region IS NULL)) OR (position IS NULL OR position = "通用" OR position = "公务员"))',
      );
      params.push(position, region || '', position);
    }
    const whereSql = where.join(' AND ');
    const orderBy = sort === 'hot' ? 'usage_count DESC, id DESC' : 'id DESC';
    const offset = (page - 1) * pageSize;
    const [[totalRow], list] = await Promise.all([
      query(`SELECT COUNT(*) AS c FROM questions WHERE ${whereSql}`, params),
      query(
        `SELECT id, content, category, position, region, source_type, year, type, difficulty, usage_count, created_at
         FROM questions WHERE ${whereSql} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
        [...params, pageSize, offset],
      ),
    ]);
    return { list, total: totalRow.c };
  },

  /** 关键词搜索（content/category/detail 模糊） */
  async search({ keyword, page = 1, pageSize = 10 } = {}) {
    const like = `%${keyword}%`;
    const where = 'status = 1 AND deleted_at IS NULL AND (content LIKE ? OR category LIKE ? OR detail LIKE ?)';
    const params = [like, like, like];
    const offset = (page - 1) * pageSize;
    const [[totalRow], list] = await Promise.all([
      query(`SELECT COUNT(*) AS c FROM questions WHERE ${where}`, params),
      query(
        `SELECT id, content, category, position, region, source_type, year, type, difficulty, created_at
         FROM questions WHERE ${where} ORDER BY id DESC LIMIT ? OFFSET ?`,
        [...params, pageSize, offset],
      ),
    ]);
    return { list, total: totalRow.c };
  },

  /** 九大题型及数量（§5.2，按文档顺序；真题除外，专项练习整空） */
  async listCategories() {
    return query(
      `SELECT category, COUNT(*) AS count FROM questions
       WHERE status = 1 AND deleted_at IS NULL
         AND source_type IN ('hot', 'mock', 'normal')
       GROUP BY category
       ORDER BY FIELD(category, '社会现象','态度观点','组织管理','应急应变','人际关系','情景模拟','自我认知','专业题','开放论述'), category`,
    );
  },

  /** 四入口静态枚举（§5.2 source_type） */
  listSourceTypes() {
    return [
      { code: 'hot', name: '热点推荐', desc: '每日精选热门题' },
      { code: 'real', name: '历年真题', desc: '真实考场真题' },
      { code: 'mock', name: '模拟试卷', desc: '全真模拟练习' },
      { code: 'normal', name: '专项练习', desc: '按题型专项训练' },
    ];
  },

  /** 真题/模拟试卷列表（source_type='real'/'mock'，年份倒序，可按 year 过滤，三级回退 + 分页） */
  async findReal(position, region, { page = 1, pageSize = 10, year, sourceType = 'real' } = {}) {
    let where =
      'status = 1 AND deleted_at IS NULL AND source_type = ? AND ' +
      '((position = ? AND region = ?) OR (position = ? AND (region = "全国" OR region IS NULL)) OR (position IS NULL OR position = "通用" OR position = "公务员"))';
    const params = [sourceType, position, region, position];
    if (year) {
      where += ' AND year = ?';
      params.push(Number(year));
    }
    const offset = (page - 1) * pageSize;
    const [[totalRow], list] = await Promise.all([
      query(`SELECT COUNT(*) AS c FROM questions WHERE ${where}`, params),
      query(
        `SELECT id, content, category, position, region, source_type, year, type, difficulty, reference_answer, detail, created_at
         FROM questions WHERE ${where} ORDER BY year DESC, id DESC LIMIT ? OFFSET ?`,
        [...params, pageSize, offset],
      ),
    ]);
    return { list, total: totalRow.c };
  },

  /** 热点推荐列表（source_type='hot'，三级回退 + 分页） */
  async findHotList(position, region, { page = 1, pageSize = 10 } = {}) {
    const where =
      'status = 1 AND deleted_at IS NULL AND source_type = "hot" AND ' +
      '((position = ? AND region = ?) OR (position = ? AND (region = "全国" OR region IS NULL)) OR (position IS NULL OR position = "通用"))';
    const params = [position, region, position];
    const offset = (page - 1) * pageSize;
    const [[totalRow], list] = await Promise.all([
      query(`SELECT COUNT(*) AS c FROM questions WHERE ${where}`, params),
      query(
        `SELECT id, content, category, position, region, source_type, year, type, difficulty, created_at
         FROM questions WHERE ${where} ORDER BY usage_count DESC, id DESC LIMIT ? OFFSET ?`,
        [...params, pageSize, offset],
      ),
    ]);
    return { list, total: totalRow.c };
  },

  /** 随机练习（三级回退 + RAND，不返回参考答案，隐藏作答解析） */
  async findPractice(position, region, limit = 10) {
    const sql = `
      SELECT id, content, category, position, region, source_type, year, type, difficulty
      FROM questions
      WHERE status = 1 AND deleted_at IS NULL
        AND source_type IN ('hot', 'mock', 'normal')
        AND (
          (position = ? AND region = ?)
          OR (position = ? AND (region = '全国' OR region IS NULL))
          OR (position IS NULL OR position = '通用' OR position = '公务员')
        )
      ORDER BY RAND()
      LIMIT ?
    `;
    return query(sql, [position, region, position, limit]);
  },
};

const scenarioModel = {
  async findById(id) {
    const rows = await query(
      'SELECT * FROM interview_scenarios WHERE id = ? AND deleted_at IS NULL',
      [id]
    );
    return rows[0] || null;
  },

  /**
   * 匹配场景：先按岗位精确，再回退 公务员，最后任一可用场景（sort_order 靠前优先）
   * FIELD(position, '公务员', ?) → 公务员=1 / 精确岗位=2 / 其他=0，DESC 使精确岗位最优先
   */
  async match(position) {
    const rows = await query(
      'SELECT * FROM interview_scenarios WHERE deleted_at IS NULL ' +
      "ORDER BY FIELD(position, '公务员', ?) DESC, sort_order ASC, id ASC LIMIT 1",
      [position]
    );
    return rows[0] || null;
  },
};

module.exports = { sessionModel, messageModel, reportModel, questionModel, scenarioModel };
