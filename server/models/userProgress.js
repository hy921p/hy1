/**
 * 学习进度数据访问（user_progress，多行结构）
 * 节点完成状态：type='study_plan', target_id=节点id, progress=100
 * 唯一键 uk_user_type_target 是完成防重的原子闸
 */
const { query } = require('./index');

const userProgressModel = {
  /** 已完成的目标 ID 集合（IN 查询，nodeIds 为空传 [0] 兜底） */
  async completedTargetIds(userId, type, targetIds) {
    if (!targetIds.length) return [];
    const rows = await query(
      'SELECT target_id FROM user_progress WHERE user_id = ? AND type = ? AND progress >= 100 AND target_id IN (?)',
      [userId, type, targetIds],
    );
    return rows.map((r) => r.target_id);
  },

  /** 写入完成进度（已存在抛 ER_DUP_ENTRY，由调用方幂等处理） */
  async insertCompleted(userId, type, targetId, progress = 100) {
    const result = await query(
      'INSERT INTO user_progress (user_id, type, target_id, progress) VALUES (?,?,?,?)',
      [userId, type, targetId, progress],
    );
    return result.insertId;
  },

  /** 某类型已完成条数（学习报告用） */
  async countCompletedByType(userId, type) {
    const rows = await query(
      'SELECT COUNT(*) AS c FROM user_progress WHERE user_id = ? AND type = ? AND progress >= 100',
      [userId, type],
    );
    return rows[0].c;
  },

  /** 全部已完成条数（学习报告用） */
  async countCompleted(userId) {
    const rows = await query(
      'SELECT COUNT(*) AS c FROM user_progress WHERE user_id = ? AND progress >= 100',
      [userId],
    );
    return rows[0].c;
  },
};

module.exports = userProgressModel;
