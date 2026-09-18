/**
 * 勋章数据访问（badges / user_badges）
 */
const { query } = require('./index');

const badgeModel = {
  /** 全部启用中的勋章定义（按 sort 排序） */
  async allActive() {
    return query('SELECT * FROM badges WHERE is_active = 1 ORDER BY sort ASC, id ASC');
  },

  /** 用户已获得的勋章 */
  async findEarnedByUser(userId) {
    return query(
      'SELECT badge_id, earned_at FROM user_badges WHERE user_id = ?',
      [userId],
    );
  },

  /** 用户已获勋章详情（含定义，badges 接口用） */
  async findEarnedWithDetail(userId) {
    return query(
      'SELECT b.*, ub.earned_at FROM user_badges ub JOIN badges b ON b.id = ub.badge_id WHERE ub.user_id = ? ORDER BY b.sort ASC, b.id ASC',
      [userId],
    );
  },

  /** 补发勋章（唯一键 uk_user_badge 兜底防重） */
  async grant(userId, badgeId) {
    await query(
      'INSERT INTO user_badges (user_id, badge_id) VALUES (?,?) ON DUPLICATE KEY UPDATE earned_at = earned_at',
      [userId, badgeId],
    );
  },
};

module.exports = badgeModel;
