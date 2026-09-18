/**
 * 通知服务（技术文档 §7.17 / §5.19）
 * 统一发通知入口；notify 采用 fail-open（失败仅 log 不抛错），
 * 保证任何业务主流程（打卡/答题/点赞/AI 答疑/勋章）都不受通知影响。
 */
const { query } = require('../models');
const logger = require('../utils/logger');

/**
 * 发送通知
 * @param {number} userId - 接收用户
 * @param {string} type - system/like/ai_answer/achievement/membership/checkin
 * @param {string} title
 * @param {string} content
 * @param {object|null} [payload] - 跳转数据（路由、对象 ID）
 * @returns {Promise<number|null>} 通知 id；失败返回 null（不抛错）
 */
async function notify(userId, type, title, content, payload = null) {
  try {
    const result = await query(
      'INSERT INTO notifications (user_id, type, title, content, payload) VALUES (?,?,?,?,?)',
      [userId, type, title, content, payload ? JSON.stringify(payload) : null],
    );
    return result.insertId;
  } catch (e) {
    logger.warn('通知发送失败(userId=%s,type=%s): %s', userId, type, e.message);
    return null;
  }
}

/** 通知列表（分页，type 可选） */
async function list(userId, { type, page, pageSize } = {}) {
  const where = ['user_id = ?'];
  const params = [userId];
  if (type) {
    where.push('type = ?');
    params.push(type);
  }
  const whereSql = where.join(' AND ');
  const [[totalRow], rows] = await Promise.all([
    query(`SELECT COUNT(*) AS total FROM notifications WHERE ${whereSql}`, params),
    query(
      `SELECT id, type, title, content, payload, is_read, read_at, created_at
       FROM notifications WHERE ${whereSql}
       ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`,
      [...params, pageSize, (page - 1) * pageSize],
    ),
  ]);
  return { list: rows, total: totalRow.total };
}

/** 未读数 */
async function unreadCount(userId) {
  const rows = await query(
    'SELECT COUNT(*) AS total FROM notifications WHERE user_id = ? AND is_read = 0',
    [userId],
  );
  return rows[0].total;
}

/** 单条已读（仅本人，返回影响行数） */
async function markRead(id, userId) {
  const result = await query(
    'UPDATE notifications SET is_read = 1, read_at = NOW() WHERE id = ? AND user_id = ? AND is_read = 0',
    [id, userId],
  );
  return result.affectedRows;
}

/** 全部已读 */
async function markAllRead(userId) {
  const result = await query(
    'UPDATE notifications SET is_read = 1, read_at = NOW() WHERE user_id = ? AND is_read = 0',
    [userId],
  );
  return result.affectedRows;
}

/** 删除通知（仅本人，返回影响行数） */
async function remove(id, userId) {
  const result = await query(
    'DELETE FROM notifications WHERE id = ? AND user_id = ?',
    [id, userId],
  );
  return result.affectedRows;
}

module.exports = { notify, list, unreadCount, markRead, markAllRead, remove };
