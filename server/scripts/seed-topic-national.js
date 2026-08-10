/**
 * 一次性幂等种子：补 2 条 position='公务员'、region='全国' 的热点资讯，
 * 保证「智学-热点话题」对任意岗位/地区偏好都有数据。
 * 用法：node scripts/seed-topic-national.js （可重复跑，已存在则跳过）
 */
const { pool } = require('../models');

const ROWS = [
  ['政务服务"好差评"制度全面推行，如何落实以评促改？',
    '各地将群众评价纳入政务服务考核，推动服务从"能办"向"好办、快办"转变。',
    '公务员', '全国'],
  ['多地探索"跨省通办"，异地办事不再"来回跑"。',
    '围绕高频事项推进流程再造与数据共享，是优化营商环境、便利群众办事的典型案例。',
    '公务员', '全国'],
];

async function main() {
  const [cnt] = await pool.query("SELECT COUNT(*) AS c FROM hot_topics WHERE position='公务员' AND region='全国'");
  if (cnt[0].c > 0) {
    console.log('[seed] 公务员·全国热点已有数据，跳过');
    process.exit(0);
  }
  const sql =
    'INSERT INTO hot_topics (title, summary, content, position, region, views, publish_date, is_active) ' +
    'VALUES (?,?,?,?,?,?,?,1)';
  for (const [title, summary, position, region] of ROWS) {
    await pool.query(sql, [title, summary, summary, position, region, 66, '2026-08-09 00:00:00']);
  }
  console.log('[seed] 已插入 2 条公务员·全国热点');
  process.exit(0);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
