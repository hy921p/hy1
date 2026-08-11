/**
 * 全题库 source_type 整肃（一次性数据修复，可重复执行，幂等）
 * 背景：此前将大量不可溯源题目标记为 source_type='real'（真题），
 *       用户要求「所有题库都要是真题，不是真题的降为模拟题」。
 * 规则：
 *   1) source_type='real' 且题干不含「海关」→ 降级 'mock'（仅保留 2 道已溯源 2023 海关真题）
 *   2) source_type='normal'（基础专项题，非真题）→ 降级 'mock'
 * 保留 'hot'（热点推荐为独立精选入口，从未标注真题）。
 * 幂等：执行后不再有 real/normal 残留，重复执行无副作用。
 */
const { pool } = require('../models');

async function main() {
  const [r1] = await pool.query(
    "UPDATE questions SET source_type='mock', tags = JSON_ARRAY('模拟题') " +
      "WHERE deleted_at IS NULL AND source_type='real' AND content NOT LIKE '%海关%'",
  );
  const [r2] = await pool.query(
    "UPDATE questions SET source_type='mock', tags = JSON_ARRAY('模拟题') " +
      "WHERE deleted_at IS NULL AND source_type='normal'",
  );
  console.log(`[fix] real→mock: ${r1.affectedRows} 道`);
  console.log(`[fix] normal→mock: ${r2.affectedRows} 道`);

  const [rows] = await pool.query(
    'SELECT source_type, COUNT(*) AS c FROM questions WHERE deleted_at IS NULL GROUP BY source_type ORDER BY c DESC',
  );
  console.table(rows);

  const [real] = await pool.query(
    "SELECT id, category, year, region, LEFT(content, 40) AS content FROM questions WHERE deleted_at IS NULL AND source_type='real'",
  );
  console.log('[fix] 保留的真题：');
  console.table(real);

  await pool.end();
}

main().catch((e) => {
  console.error('[fix] 失败：', e.message);
  process.exit(1);
});
