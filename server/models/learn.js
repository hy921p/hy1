/**
 * 智学数据访问（阶段3 §5.17/§5.18）
 * readings / materials / basics / courses / learning_notes
 * 已读记录复用 user_progress（type='reading', target_id=晨读id, progress>=100）。
 */
const { query } = require('./index');

const readingModel = {
  async list({ position, region, page = 1, pageSize = 10 } = {}) {
    const where = ['is_active = 1'];
    const params = [];
    if (position) {
      where.push('(position = ? OR position IS NULL OR position = "通用")');
      params.push(position);
    }
    const whereSql = where.join(' AND ');
    const offset = (page - 1) * pageSize;
    const [[totalRow], list] = await Promise.all([
      query(`SELECT COUNT(*) AS c FROM readings WHERE ${whereSql}`, params),
      query(
        `SELECT id, title, position, region, summary, cover, publish_date, is_hot
         FROM readings WHERE ${whereSql} ORDER BY is_hot DESC, publish_date DESC, id DESC LIMIT ? OFFSET ?`,
        [...params, pageSize, offset],
      ),
    ]);
    return { list, total: totalRow.c };
  },

  async findById(id) {
    const rows = await query(
      'SELECT * FROM readings WHERE id = ? AND is_active = 1',
      [id],
    );
    return rows[0] || null;
  },

  /** 已读日期集合（去重，按 user_progress reading 记录） */
  async readDates(userId) {
    return query(
      "SELECT DISTINCT DATE(created_at) AS d FROM user_progress WHERE user_id = ? AND type = 'reading' AND progress >= 100",
      [userId],
    );
  },
};

const materialModel = {
  async list({ position, type, page = 1, pageSize = 10 } = {}) {
    const where = [];
    const params = [];
    if (type) { where.push('type = ?'); params.push(type); }
    if (position) {
      where.push('(position = ? OR position IS NULL OR position = "通用")');
      params.push(position);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const offset = (page - 1) * pageSize;
    const [[totalRow], list] = await Promise.all([
      query(`SELECT COUNT(*) AS c FROM materials ${whereSql}`, params),
      query(
        `SELECT id, title, position, type, content FROM materials ${whereSql} ORDER BY id ASC LIMIT ? OFFSET ?`,
        [...params, pageSize, offset],
      ),
    ]);
    return { list, total: totalRow.c };
  },
};

const basicModel = {
  async list({ position, page = 1, pageSize = 10 } = {}) {
    const where = [];
    const params = [];
    if (position) {
      where.push('(position = ? OR position IS NULL OR position = "通用")');
      params.push(position);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const offset = (page - 1) * pageSize;
    const [[totalRow], list] = await Promise.all([
      query(`SELECT COUNT(*) AS c FROM basics ${whereSql}`, params),
      query(
        `SELECT id, title, position, category, content FROM basics ${whereSql} ORDER BY id ASC LIMIT ? OFFSET ?`,
        [...params, pageSize, offset],
      ),
    ]);
    return { list, total: totalRow.c };
  },
};

const courseModel = {
  async list({ position, page = 1, pageSize = 10 } = {}) {
    const where = [];
    const params = [];
    if (position) {
      where.push('(position = ? OR position IS NULL OR position = "通用")');
      params.push(position);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const offset = (page - 1) * pageSize;
    const [[totalRow], list] = await Promise.all([
      query(`SELECT COUNT(*) AS c FROM courses ${whereSql}`, params),
      query(
        `SELECT id, title, position, cover, video_url, duration, teacher, description
         FROM courses ${whereSql} ORDER BY id ASC LIMIT ? OFFSET ?`,
        [...params, pageSize, offset],
      ),
    ]);
    return { list, total: totalRow.c };
  },
};

const noteModel = {
  async listByUser(userId, { sourceType, page = 1, pageSize = 10 } = {}) {
    const where = ['user_id = ? AND status = 1'];
    const params = [userId];
    if (sourceType) { where.push('source_type = ?'); params.push(sourceType); }
    const whereSql = where.join(' AND ');
    const offset = (page - 1) * pageSize;
    const [[totalRow], list] = await Promise.all([
      query(`SELECT COUNT(*) AS c FROM learning_notes WHERE ${whereSql}`, params),
      query(
        `SELECT id, title, content, source_type, source_id, source_title, is_ai_summary, created_at, updated_at
         FROM learning_notes WHERE ${whereSql} ORDER BY updated_at DESC, id DESC LIMIT ? OFFSET ?`,
        [...params, pageSize, offset],
      ),
    ]);
    return { list, total: totalRow.c };
  },

  async findById(id) {
    const rows = await query(
      'SELECT * FROM learning_notes WHERE id = ? AND status = 1',
      [id],
    );
    return rows[0] || null;
  },

  async create({ userId, title, content, sourceType, sourceId, sourceTitle, isAiSummary }) {
    const result = await query(
      'INSERT INTO learning_notes (user_id, title, content, source_type, source_id, source_title, is_ai_summary) VALUES (?,?,?,?,?,?,?)',
      [userId, title, content, sourceType || 'manual', sourceId || null, sourceTitle || null, isAiSummary ? 1 : 0],
    );
    return result.insertId;
  },

  /** 更新标题/内容（仅本人，返回影响行数） */
  async update(id, userId, { title, content }) {
    const result = await query(
      'UPDATE learning_notes SET title = COALESCE(?, title), content = COALESCE(?, content) WHERE id = ? AND user_id = ? AND status = 1',
      [title || null, content || null, id, userId],
    );
    return result.affectedRows;
  },

  /** 逻辑删除（仅本人，返回影响行数） */
  async remove(id, userId) {
    const result = await query(
      'UPDATE learning_notes SET status = 0 WHERE id = ? AND user_id = ? AND status = 1',
      [id, userId],
    );
    return result.affectedRows;
  },

  /** 追加 AI 摘要：原内容 + 【AI 摘要】，标记 is_ai_summary */
  async appendAiSummary(id, summary) {
    await query(
      "UPDATE learning_notes SET content = CONCAT(content, '\n\n【AI 摘要】\n', ?), is_ai_summary = 1 WHERE id = ? AND status = 1",
      [summary, id],
    );
  },
};

module.exports = { readingModel, materialModel, basicModel, courseModel, noteModel };
