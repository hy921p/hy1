/**
 * 打卡数据访问（check_ins）
 * 唯一键 uk_user_date (user_id, check_date) 作为并发防重的原子闸
 */
const { query } = require('./index');

const checkInModel = {
  /** 插入打卡记录（同日重复会抛 ER_DUP_ENTRY） */
  async insert({ userId, checkDate, points }) {
    const result = await query(
      'INSERT INTO check_ins (user_id, check_date, points) VALUES (?,?,?)',
      [userId, checkDate, points],
    );
    return result.insertId;
  },

  /** 查询某日是否已打卡 */
  async findByUserDate(userId, checkDate) {
    const rows = await query(
      'SELECT id, points FROM check_ins WHERE user_id = ? AND check_date = ? LIMIT 1',
      [userId, checkDate],
    );
    return rows[0] || null;
  },

  /** 某月打卡列表（calendar） */
  async findByMonth(userId, month) {
    return query(
      "SELECT check_date, points FROM check_ins WHERE user_id = ? AND DATE_FORMAT(check_date, '%Y-%m') = ? ORDER BY check_date ASC",
      [userId, month],
    );
  },

  /** 打卡总天数（stats） */
  async countByUser(userId) {
    const rows = await query('SELECT COUNT(*) AS c FROM check_ins WHERE user_id = ?', [userId]);
    return rows[0].c;
  },

  /** 打卡分页列表（最近优先） */
  async listByUser(userId, { page = 1, pageSize = 10 } = {}) {
    const offset = (page - 1) * pageSize;
    const [total] = await query('SELECT COUNT(*) AS c FROM check_ins WHERE user_id = ?', [userId]);
    const list = await query(
      'SELECT id, check_date, points, created_at FROM check_ins WHERE user_id = ? ORDER BY check_date DESC LIMIT ? OFFSET ?',
      [userId, pageSize, offset],
    );
    return { list, total: total.c };
  },

  /** 按日期分组统计打卡天数（progress-trend，近 N 天） */
  async countByDateRange(userId, startDate, endDate) {
    return query(
      'SELECT check_date, COUNT(*) AS cnt FROM check_ins WHERE user_id = ? AND check_date BETWEEN ? AND ? GROUP BY check_date',
      [userId, startDate, endDate],
    );
  },
};

module.exports = checkInModel;
