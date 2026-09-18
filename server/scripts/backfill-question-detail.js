/**
 * backfill-question-detail.js —— 批量补齐题目「解析」（questions.detail）
 * 背景：真题/模拟题中 242 道（real 201 + mock 41）detail 为空，做题记录成绩单里没有每题解析。
 * 做法：对 detail 为空的题调用 DeepSeek（aiService.chatText）生成简短解析，写回 questions.detail。
 * 幂等：detail 非空跳过；可重复执行（中断后续跑只补剩余）。
 * 用法（在 server 目录下执行，自动读取 .env 的 AI_API_KEY）：
 *   node scripts/backfill-question-detail.js            # 全量补全
 *   node scripts/backfill-question-detail.js --limit 5  # 试跑前 5 题（验证格式）
 */
const { pool } = require('../models');
const aiService = require('../services/aiService');

const CONCURRENCY = 5;
const MAX_RETRY = 2;

/** 单题解析生成（失败重试 MAX_RETRY 次，仍失败返回 null，不阻断其它题） */
async function generateDetail(q) {
  const lines = [
    `题目：${q.content}`,
    q.reference_answer ? `正确答案：${q.reference_answer}` : '',
    '请为这道国企笔试题撰写答案解析：先给出正确选项，再说明它为什么正确、其他选项错在哪里。要求：100 字左右，简洁直接，不要使用 Markdown（禁止星号、加粗、多段换行），纯文本一段话。',
  ].filter(Boolean).join('\n');
  for (let i = 0; i < MAX_RETRY; i++) {
    try {
      const text = await aiService.chatText(
        [
          {
            role: 'system',
            content: '你是一名资深国企笔试讲师，擅长言语理解、判断推理、数量资料等行测类题目精讲。',
          },
          { role: 'user', content: lines },
        ],
        { temperature: 0.3, timeout: 45000 },
      );
      if (text) return text;
    } catch (e) {
      console.warn(`  #${q.id} 第 ${i + 1} 次生成失败：${e.message}`);
    }
  }
  return null;
}

async function main() {
  // --limit N：只处理前 N 题（试跑）
  const limitArg = process.argv.indexOf('--limit');
  const limit = limitArg >= 0 ? Number(process.argv[limitArg + 1]) || 5 : 0;

  const [rows] = await pool.query(
    `SELECT id, content, reference_answer FROM questions
     WHERE status = 1 AND deleted_at IS NULL
       AND source_type IN ('real', 'mock')
       AND (detail IS NULL OR detail = '')
     ORDER BY id ASC${limit ? ' LIMIT ' + Number(limit) : ''}`,
  );
  if (!rows.length) {
    console.log('[backfill] 没有需要补齐解析的题目');
    await pool.end();
    return;
  }

  console.log(`[backfill] 待生成解析：${rows.length} 题（并发 ${CONCURRENCY}）`);
  const queue = [...rows];
  let ok = 0;
  let fail = 0;

  const workers = Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
    while (queue.length) {
      const q = queue.shift();
      try {
        const detail = await generateDetail(q);
        if (detail) {
          await pool.query('UPDATE questions SET detail = ? WHERE id = ?', [detail, q.id]);
          ok++;
        } else {
          fail++;
          console.warn(`  #${q.id} 生成失败，已跳过`);
        }
      } catch (e) {
        fail++;
        console.warn(`  #${q.id} 更新失败：${e.message}`);
      }
      const done = ok + fail;
      if (done % 20 === 0 || done === rows.length) {
        console.log(`[backfill] 进度 ${done}/${rows.length}（成功 ${ok}，失败 ${fail}）`);
      }
    }
  });
  await Promise.all(workers);

  const [[left]] = await pool.query(
    `SELECT COUNT(*) AS c FROM questions
     WHERE status = 1 AND deleted_at IS NULL
       AND source_type IN ('real', 'mock')
       AND (detail IS NULL OR detail = '')`,
  );
  console.log(`[backfill] 完成：成功 ${ok}，失败 ${fail}，仍缺解析 ${left.c}`);
  await pool.end();
}

main().catch((e) => {
  console.error('[backfill] 失败：', e.message);
  process.exit(1);
});
