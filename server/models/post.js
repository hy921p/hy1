/**
 * 社区数据访问（阶段3 §7.13 / §5.11）
 * posts 用 author_id 归属；post_likes 唯一键 uk_post_user 并发防重。
 */
const { query } = require('./index');

const postModel = {
  /**
   * 帖子列表（hot: like_count*2+view_count 排序；latest: 时间倒序）
   * 岗位/地区过滤 + deleted_at IS NULL AND status != 0
   */
  async list({ position, region, sort = 'latest', page = 1, pageSize = 10 } = {}) {
    const where = ['deleted_at IS NULL AND status != 0'];
    const params = [];
    if (position) {
      where.push('(position = ? OR position IS NULL OR position = "通用")');
      params.push(position);
    }
    if (region) {
      where.push('(region = ? OR region IS NULL OR region = "全国")');
      params.push(region);
    }
    const whereSql = where.join(' AND ');
    const orderBy = sort === 'hot' ? '(like_count * 2 + view_count) DESC, id DESC' : 'id DESC';
    const offset = (page - 1) * pageSize;
    const [[totalRow], list] = await Promise.all([
      query(`SELECT COUNT(*) AS c FROM posts WHERE ${whereSql}`, params),
      query(
        `SELECT id, author_id, author_name, author_avatar, title, content, position, region, interview_type, result,
                tags, view_count, like_count, comment_count, created_at
         FROM posts WHERE ${whereSql} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
        [...params, pageSize, offset],
      ),
    ]);
    return { list, total: totalRow.c };
  },

  async findById(id) {
    const rows = await query(
      'SELECT * FROM posts WHERE id = ? AND deleted_at IS NULL AND status != 0',
      [id],
    );
    return rows[0] || null;
  },

  async create({ authorId, authorName, authorAvatar, title, content, position, region, interviewType, result, tags }) {
    const insertResult = await query(
      'INSERT INTO posts (author_id, author_name, author_avatar, title, content, position, region, interview_type, result, tags, status) VALUES (?,?,?,?,?,?,?,?,?,?,1)',
      [authorId, authorName, authorAvatar, title, content, position || null, region || null, interviewType || null, result || null, tags ? JSON.stringify(tags) : null],
    );
    return insertResult.insertId;
  },

  async incView(id) {
    await query('UPDATE posts SET view_count = view_count + 1 WHERE id = ?', [id]);
  },

  async incLike(id, delta) {
    await query('UPDATE posts SET like_count = GREATEST(0, like_count + ?) WHERE id = ?', [delta, id]);
  },
};

const postLikeModel = {
  async find(postId, userId) {
    const rows = await query(
      'SELECT id FROM post_likes WHERE post_id = ? AND user_id = ?',
      [postId, userId],
    );
    return rows[0] || null;
  },

  async insert(postId, userId) {
    const result = await query(
      'INSERT INTO post_likes (post_id, user_id) VALUES (?,?)',
      [postId, userId],
    );
    return result.insertId;
  },

  async remove(postId, userId) {
    const result = await query(
      'DELETE FROM post_likes WHERE post_id = ? AND user_id = ?',
      [postId, userId],
    );
    return result.affectedRows;
  },
};

module.exports = { postModel, postLikeModel };
