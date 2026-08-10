/**
 * 通知推送服务
 *  single → 指定用户（notificationService.notify）
 *  all    → 全体未封禁用户（逐个 notify，fail-open）
 * 记录查询 JOIN users 显示手机号/昵称。
 */
const notificationService = require('./notificationService');
const { query } = require('../models');
const AppError = require('../utils/app-error');

const ALLOWED_TYPES = ['system', 'like', 'ai_answer', 'achievement', 'membership', 'checkin', 'comment'];

async function push({ target, userId, type, title, content, payload }) {
  if (!title || !String(title).trim()) throw new AppError(1001, '通知标题不能为空');
  const typeName = type || 'system';
  if (!ALLOWED_TYPES.includes(typeName)) throw new AppError(1001, `不支持的通知类型: ${typeName}`);

  let sent = 0;
  if (target === 'single') {
    if (!userId) throw new AppError(1001, '指定用户需传 userId');
    const users = await query('SELECT id FROM users WHERE id = ? AND banned_at IS NULL', [userId]);
    if (!users.length) throw new AppError(1004, '用户不存在或已封禁');
    const id = await notificationService.notify(userId, typeName, title, content, payload || null);
    sent = id ? 1 : 0;
  } else {
    const users = await query('SELECT id FROM users WHERE banned_at IS NULL');
    for (const u of users) {
      const id = await notificationService.notify(u.id, typeName, title, content, payload || null);
      if (id) sent++;
    }
  }
  return { sent };
}

async function records({ page, pageSize }) {
  const p = Math.max(1, parseInt(page, 10) || 1);
  const ps = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 10));
  const totalRows = await query('SELECT COUNT(*) AS c FROM notifications');
  const total = totalRows[0] ? Number(totalRows[0].c) : 0;
  const list = await query(
    `SELECT n.id, n.user_id, n.type, n.title, n.content, n.payload, n.is_read, n.read_at, n.created_at,
            u.phone AS user_phone, u.nickname AS user_nickname
     FROM notifications n
     LEFT JOIN users u ON n.user_id = u.id
     ORDER BY n.id DESC LIMIT ? OFFSET ?`,
    [ps, (p - 1) * ps],
  );
  return { list, total, page: p, pageSize: ps, hasMore: p * ps < total };
}

module.exports = { push, records };
