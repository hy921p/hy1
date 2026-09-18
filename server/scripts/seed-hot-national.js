/**
 * 一次性幂等种子：补 3 道 region='全国' 的 hot 题，保证「热点推荐」入口对任意地区都有数据
 * 用法：node scripts/seed-hot-national.js （可重复跑，存在全国 hot 则跳过）
 */
const { pool } = require('../models');

const ROWS = [
  ['近年来多地出现“年轻人下班后去老年食堂吃饭”的现象，你怎么看？', '社会现象',
    '从代际融合、生活成本、社会保障等角度分析，提出完善社区食堂运营、规范管理、促进代际共融等建议。', 1],
  ['多地推行“首席数据官”制度，推动政府数据共享。谈谈你对政务数据共享的认识。', '社会现象',
    '分析数据共享对提升治理效能的积极意义，指出安全与隐私风险，提出制度建设、分级授权、技术支撑等对策。', 1],
  ['你如何看待“公园20分钟效应”在职场人中的流行？', '态度观点',
    '从心理健康、公共空间建设、城市宜居角度解读，提出优化城市公共空间、倡导健康生活方式等建议。', 2],
];

async function main() {
  const [cnt] = await pool.query("SELECT COUNT(*) AS c FROM questions WHERE source_type='hot' AND region='全国'");
  if (cnt[0].c > 0) {
    console.log('[seed] 全国 hot 已有数据，跳过');
    process.exit(0);
  }
  const sql =
    'INSERT INTO questions (content, detail, category, industry, position, region, source_type, year, type, ' +
    'difficulty, reference_answer, tags, usage_count, avg_score, status, created_by, deleted_at, operated_by) ' +
    'VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)';
  for (const [content, category, ref, type] of ROWS) {
    await pool.query(sql, [
      content, null, category, '公共部门', '公务员', '全国', 'hot', null, type,
      1, ref, JSON.stringify(['面试题']), 0, null, 1, 1, null, null,
    ]);
  }
  console.log('[seed] 已插入 3 道全国 hot 题');
  process.exit(0);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
