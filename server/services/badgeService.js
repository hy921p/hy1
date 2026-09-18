/**
 * 勋章服务（§5.21/§5.24 半落表）
 * 勋章定义为配置表（badges），达成状态为事件驱动（checkAndGrant）+ 懒扫描（refresh）。
 * 事件点：打卡完成、面试完成、规划节点完成、答题、AI 摘要、成长值变更处统一调用 checkAndGrant。
 * 新发勋章时发 achievement 通知（fail-open，表未建不阻断）。
 */
const { query } = require('../models');
const User = require('../models/user');
const badgeModel = require('../models/badge');
const notificationService = require('./notificationService');

// 条件判定表：返回用户当前在该条件上的进度值；无源数据的类型返回 null（视为未达成）
const EVAL = {
  checkin_days: (u) => u.check_in_streak || 0,
  interview_count: (u) => u.total_interviews || 0,
  growth_points: (u) => u.growth_points || 0,
  async plan_count() {
    return completedPlanCount();
  },
  score_threshold: () => null, // 评分门槛勋章源留待后续
  async answer_count(u) {        // 阶段3：answer_records 建表后接线
    const rows = await query(
      'SELECT COUNT(*) AS c FROM answer_records WHERE user_id = ?',
      [u.id],
    );
    return rows[0].c;
  },
};

/** 完成全部节点的规划数（供 plan_count 勋章判定） */
async function completedPlanCount() {
  const rows = await query(`
    SELECT COUNT(*) AS c FROM (
      SELECT p.id FROM study_plans p
      JOIN study_plan_nodes n ON n.plan_id = p.id
      LEFT JOIN user_progress up ON up.type = 'study_plan' AND up.target_id = n.id AND up.progress >= 100
      GROUP BY p.id
      HAVING COUNT(*) = SUM(up.id IS NOT NULL)
    ) t
  `);
  return rows[0].c;
}

/** 全量判定并补发未达成的勋章，返回本次新发勋章列表 */
async function checkAndGrant(userId) {
  const user = await User.findById(userId);
  if (!user) return [];

  const earned = await badgeModel.findEarnedByUser(userId);
  const earnedSet = new Set(earned.map((b) => b.badge_id));
  const badges = await badgeModel.allActive();

  const granted = [];
  for (const b of badges) {
    if (earnedSet.has(b.id)) continue;
    const fn = EVAL[b.condition_type];
    if (!fn) continue;
    const value = await fn(user);
    if (value != null && value >= b.condition_value) {
      await badgeModel.grant(userId, b.id);
      granted.push({ id: b.id, code: b.code, name: b.name, icon: b.icon, earnedAt: new Date() });
    }
  }
  // 阶段3：新发勋章 → achievement 通知（fail-open，不阻断）
  for (const g of granted) {
    await notificationService.notify(
      userId,
      'achievement',
      `获得新勋章「${g.name}」`,
      '你达成了新的勋章成就，快去勋章墙看看吧',
      { badgeId: g.id, badgeCode: g.code, badgeName: g.name, icon: g.icon || null },
    );
  }
  return granted;
}

/** 懒扫描 = 全量重判（用户主动刷新勋章） */
async function refresh(userId) {
  return checkAndGrant(userId);
}

/** 勋章列表 + 达成状态（badges 接口 §7.3） */
async function listWithProgress(userId) {
  const user = await User.findById(userId);
  const badges = await badgeModel.allActive();
  const earned = await badgeModel.findEarnedByUser(userId);
  const earnedMap = new Map(earned.map((b) => [b.badge_id, b.earned_at]));

  const result = [];
  for (const b of badges) {
    const fn = EVAL[b.condition_type];
    const currentValue = fn ? await fn(user) : null;
    const earnedAt = earnedMap.get(b.id) || null;
    result.push({
      id: b.id,
      code: b.code,
      name: b.name,
      icon: b.icon,
      description: b.description,
      conditionType: b.condition_type,
      conditionValue: b.condition_value,
      currentValue,
      earned: !!earnedAt,
      earnedAt,
    });
  }
  return result;
}

module.exports = { checkAndGrant, refresh, listWithProgress, completedPlanCount };
