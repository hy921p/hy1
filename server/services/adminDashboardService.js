/**
 * 管理看板聚合服务（技术文档 §8.3）
 * 全部 COUNT/AVG 直查各业务表，无需新建统计表。
 */
const { query } = require('../models');

async function count(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] ? Number(rows[0].c) : 0;
}

async function stats() {
  const totalUsers = await count('SELECT COUNT(*) AS c FROM users WHERE banned_at IS NULL');
  const totalQuestions = await count('SELECT COUNT(*) AS c FROM questions WHERE deleted_at IS NULL');
  const totalInterviews = await count('SELECT COUNT(*) AS c FROM interview_sessions');
  const completedInterviews = await count('SELECT COUNT(*) AS c FROM interview_sessions WHERE status = 3');
  const totalPosts = await count('SELECT COUNT(*) AS c FROM posts WHERE deleted_at IS NULL');
  const todayCheckIns = await count('SELECT COUNT(*) AS c FROM check_ins WHERE check_date = CURDATE()');
  const totalAiAnswers = await count('SELECT COUNT(*) AS c FROM ai_answers');
  const totalBadgesIssued = await count('SELECT COUNT(*) AS c FROM user_badges');
  const activePlans = await count('SELECT COUNT(*) AS c FROM study_plans WHERE is_active = 1');

  // 已完成面试的平均分（interview_reports.total_score）
  const avgRows = await query('SELECT ROUND(AVG(total_score), 1) AS avg FROM interview_reports');
  const avgScore = avgRows[0] && avgRows[0].avg != null ? Number(avgRows[0].avg) : 0;

  // 今日打卡近 7 天柱状（可选展示）
  const week = await query(
    'SELECT check_date AS d, COUNT(*) AS c FROM check_ins WHERE check_date >= DATE_SUB(CURDATE(), INTERVAL 6 DAY) GROUP BY check_date ORDER BY check_date',
  );

  return {
    totalUsers,
    totalQuestions,
    totalInterviews,
    completedInterviews,
    avgScore,
    totalPosts,
    todayCheckIns,
    totalAiAnswers,
    totalBadgesIssued,
    activePlans,
    weekCheckIns: week.map((r) => ({ date: r.d, count: Number(r.c) })),
  };
}

module.exports = { stats };
