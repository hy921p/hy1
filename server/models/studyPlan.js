/**
 * 学习规划数据访问（study_plans / study_plan_nodes）
 * 规划匹配三级回退：position+region 精确 → position+(全国/NULL) → 通用(is_default)
 */
const { query } = require('./index');

const studyPlanModel = {
  /** 匹配规划（三级回退），返回最合适的启用规划 */
  async matchActive(position, region) {
    const exact = await query(
      'SELECT * FROM study_plans WHERE is_active = 1 AND position = ? AND region = ? ORDER BY is_default DESC, id ASC LIMIT 1',
      [position, region],
    );
    if (exact.length) return exact[0];

    const regFree = await query(
      "SELECT * FROM study_plans WHERE is_active = 1 AND position = ? AND (region IS NULL OR region = '全国') ORDER BY is_default DESC, id ASC LIMIT 1",
      [position],
    );
    if (regFree.length) return regFree[0];

    const def = await query('SELECT * FROM study_plans WHERE is_active = 1 AND is_default = 1 ORDER BY id ASC LIMIT 1');
    return def[0] || null;
  },

  async findById(id) {
    const rows = await query('SELECT * FROM study_plans WHERE id = ? LIMIT 1', [id]);
    return rows[0] || null;
  },

  async findNodeById(id) {
    const rows = await query(
      'SELECT n.*, p.position AS plan_position, p.region AS plan_region FROM study_plan_nodes n JOIN study_plans p ON p.id = n.plan_id WHERE n.id = ? LIMIT 1',
      [id],
    );
    return rows[0] || null;
  },

  /** 规划节点列表（按 sort_order） */
  async findNodesByPlan(planId) {
    return query(
      'SELECT id, plan_id, title, node_type, target_type, target_id, est_minutes, sort_order, required FROM study_plan_nodes WHERE plan_id = ? ORDER BY sort_order ASC, id ASC',
      [planId],
    );
  },

  /** 按岗位统计已启用规划数（学习报告用） */
  async countActive() {
    const rows = await query('SELECT COUNT(*) AS c FROM study_plans WHERE is_active = 1');
    return rows[0].c;
  },
};

module.exports = studyPlanModel;
