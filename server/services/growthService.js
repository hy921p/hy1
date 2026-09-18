/**
 * 成长值统一服务（§5.22）
 * 所有加分必须经 grant()，避免散落各业务：
 *   - 插 growth_records 日志 + 原子累加 users.growth_points（同一事务）
 *   - 规则表集中在 config.growth.rules
 */
const config = require('../config');
const { getConnection, query } = require('../models');
const User = require('../models/user');
const growthModel = require('../models/growth');

/**
 * 加分（统一入口）
 * @param {number} userId
 * @param {string} type - 事件类型（register/checkin/answer/interview/ai_summary/...）
 * @param {number|null} [points=null] - 显式点数；null 时取 config.growth.rules[type]
 * @param {string|null} [remark=null]
 * @returns {Promise<{points:number, totalPoints:number}>} 本次点数与累计总点数
 */
async function grant(userId, type, points = null, remark = null) {
  const rule = points != null ? points : (config.growth.rules[type] || 0);
  if (!rule) return { points: 0, totalPoints: 0 };

  const conn = await getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(
      'INSERT INTO growth_records (user_id, type, points, remark) VALUES (?,?,?,?)',
      [userId, type, rule, remark],
    );
    await conn.query(
      'UPDATE users SET growth_points = growth_points + ? WHERE id = ?',
      [rule, userId],
    );
    const [[row]] = await conn.query(
      'SELECT growth_points AS totalPoints FROM users WHERE id = ?',
      [userId],
    );
    await conn.commit();
    return { points: rule, totalPoints: row.totalPoints };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

/** 成长树等级计算（config.growth.levels 六档） */
function getLevel(points) {
  const levels = config.growth.levels;
  let idx = 0;
  for (let i = levels.length - 1; i >= 0; i--) {
    if (points >= levels[i].min) { idx = i; break; }
  }
  const cur = levels[idx];
  const next = levels[idx + 1] || null;
  const progress = next
    ? Math.min(100, Math.floor(((points - cur.min) / (next.min - cur.min)) * 100))
    : 100;
  return {
    level: idx + 1,
    levelName: cur.name,
    currentPoints: points,
    nextLevelPoints: next ? next.min : null,
    progress,
  };
}

/** 成长树：全局等级信息 + 最近记录 + 本周爬树数据（周一自动重置） */
async function getTree(userId) {
  const user = await User.findById(userId);
  const recent = await growthModel.recentByUser(userId, 10);
  // 周界以 MySQL 时钟为准（YEARWEEK mode1 = 周一为起点），与 created_at 存储时钟一致
  const [week] = await query(
    `SELECT
       COALESCE(SUM(points), 0) AS weekPoints,
       DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY), '%Y-%m-%d') AS weekStart
     FROM growth_records
     WHERE user_id = ? AND YEARWEEK(created_at, 1) = YEARWEEK(CURDATE(), 1)`,
    [userId],
  );
  const weekRecent = await query(
    `SELECT type, points, remark, created_at FROM growth_records
     WHERE user_id = ? AND YEARWEEK(created_at, 1) = YEARWEEK(CURDATE(), 1)
     ORDER BY id DESC LIMIT 6`,
    [userId],
  );
  const wk = config.growth.week;
  const names = config.growth.levels.map((l) => l.name);
  return {
    ...getLevel(user ? user.growth_points : 0),
    recent: recent.map((r) => ({ type: r.type, points: r.points, remark: r.remark, createdAt: r.created_at })),
    // 本周玩法：树由 week.points 驱动，周一自动重置到 0
    week: {
      points: week.weekPoints,
      goal: wk.goal,
      start: week.weekStart,
      levels: wk.levelMins.map((min, i) => ({ min, name: names[i] || names[names.length - 1] })),
    },
    weekRecent: weekRecent.map((r) => ({ type: r.type, points: r.points, remark: r.remark, createdAt: r.created_at })),
  };
}

/** 成长记录分页（用户模块 §7.3） */
async function getRecords(userId, page, pageSize) {
  return growthModel.listByUser(userId, { page, pageSize });
}

/** 成长记录按 type 求和（学习报告用） */
async function sumPointsByUser(userId) {
  const rows = await query(
    'SELECT COALESCE(SUM(points), 0) AS total FROM growth_records WHERE user_id = ?',
    [userId],
  );
  return rows[0].total;
}

module.exports = { grant, getLevel, getTree, getRecords, sumPointsByUser };
