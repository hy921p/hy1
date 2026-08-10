/**
 * 成长值日志数据访问（growth_records）
 * 加分写库统一走 services/growthService.js 的事务 grant()
 */
const { query } = require('./index');

const growthModel = {
  /** 成长记录分页列表 */
  async listByUser(userId, { page = 1, pageSize = 10 } = {}) {
    const offset = (page - 1) * pageSize;
    const [total] = await query('SELECT COUNT(*) AS c FROM growth_records WHERE user_id = ?', [userId]);
    const list = await query(
      'SELECT id, type, points, remark, created_at FROM growth_records WHERE user_id = ? ORDER BY id DESC LIMIT ? OFFSET ?',
      [userId, pageSize, offset],
    );
    return { list, total: total.c };
  },

  /** 最近 N 条成长记录（growth-tree） */
  async recentByUser(userId, limit = 10) {
    return query(
      'SELECT type, points, remark, created_at FROM growth_records WHERE user_id = ? ORDER BY id DESC LIMIT ?',
      [userId, limit],
    );
  },
};

module.exports = growthModel;
