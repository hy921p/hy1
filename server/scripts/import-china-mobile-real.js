/**
 * 一次性脚本：解析 D:/15-25 下中国移动 2021-2025 五年招聘在线笔试真题 docx，
 * 转成 source_type='real' / position='国企央企面试' / region='全国' 的题库题目。
 *
 * 用法：
 *   node scripts/import-china-mobile-real.js            # dry-run：仅解析+生成 SQL 文件
 *   node scripts/import-china-mobile-real.js --apply    # 解析 + 写入本地 MySQL（先清空题库再导入）
 *
 * 前置依赖：本机 pandoc（把 docx 转 plain text）
 * 说明：本机一次性工具，不改动线上逻辑；服务器用生成的 SQL 文件导入。
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PANDOC = 'D:/pandoc-3.10-windows-x86_64/pandoc-3.10/pandoc.exe';
const DOC_DIR = 'D:/15-25';
const BACKUP_DIR = 'D:/15-25/backup-questions-2026-08-23';
const OUT_SQL = path.join(BACKUP_DIR, 'china-mobile-real-2026-08-23.sql');
const APPLY = process.argv.includes('--apply');

const FILES = [
  { year: 2021, name: '中国移动 2021 招聘在线测试完整真题及答案第一批.docx' },
  { year: 2022, name: '中国移动 2022 招聘在线笔试完整真题及答案第一批.docx' },
  { year: 2023, name: '中国移动 2023 招聘在线笔试真题及答案.docx' },
  { year: 2024, name: '中国移动2024招聘在线测试完整真题及答案.docx' },
  { year: 2025, name: '中国移动2025招聘考试完整版真题及答案解析.docx' },
];

// 占位/说明性行（图片题、图形推理、摘要段）→ 跳过
const SKIP_LINE = /图片题|无法展示|仅保留题干|仅保留题目|图形推理|包含大量|答案分别|以下为可辨识|图形题/;

// 行状态机
const QNUM = /^\s*(\d{1,3})[、.．]\s*(.*)$/;
const OPT = /^([A-D])[.．、]\s*(.*)$/;
const ANS = /^答案[:：]\s*([A-D]{1,4})[。.．]?\s*$/;
const JX = /^解析[:：]\s*(.*)$/;

function pandoc(file) {
  return execFileSync(PANDOC, [file, '-t', 'plain'], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
}

function parseFile(text) {
  const lines = text.split(/\r?\n/);
  const questions = [];
  let cur = null;
  for (const raw of lines) {
    const line = raw.replace(/\t+/g, ' ').replace(/\s+/g, ' ').trimEnd();
    const qm = line.match(QNUM);
    if (qm) {
      if (cur) questions.push(cur);
      cur = { num: +qm[1], content: [qm[2].trim()], options: {}, optOrder: [], answer: null, jiexi: null, inJiexi: false };
      continue;
    }
    if (!cur) continue;
    const trimmed = line.trim();
    if (!trimmed) continue;
    // 摘要/占位行：整行过滤
    if (SKIP_LINE.test(trimmed)) continue;
    // 答案行
    let m = line.match(ANS);
    if (m) { cur.answer = m[1]; continue; }
    // 解析行（2025 独有）
    m = line.match(JX);
    if (m) { cur.jiexi = m[1].trim(); cur.inJiexi = true; continue; }
    // 解析正文续行
    if (cur.inJiexi) { cur.jiexi += '\n' + trimmed; continue; }
    // 页码/分隔线噪音
    if (/^Page\b/i.test(trimmed) || /^[-—=·•]{3,}$/.test(trimmed)) continue;
    // 选项行
    m = line.match(OPT);
    if (m) {
      const letter = m[1];
      if (!cur.options[letter]) { cur.options[letter] = []; cur.optOrder.push(letter); }
      const txt = m[2].trim();
      if (txt) cur.options[letter].push(txt);
      continue;
    }
    // 选项续行 → 追加到最后一个选项；否则追加到题干
    if (cur.optOrder.length) {
      cur.options[cur.optOrder[cur.optOrder.length - 1]].push(trimmed);
    } else {
      cur.content.push(trimmed);
    }
  }
  if (cur) questions.push(cur);
  return questions;
}

function cleanContent(q) {
  const body = q.content.join(' ')
    .replace(/\s+/g, ' ')
    .replace(/^[、.．\s]+/, '')
    .trim();
  const opts = q.optOrder.map((l) => `${l}. ${q.options[l].join(' ').replace(/\s+/g, ' ').trim()}`);
  return { body, opts };
}

function isImportable(q) {
  if (!q.answer || !q.answer.trim()) return false;
  if (q.optOrder.length < 2) return false;
  for (const l of q.optOrder) if (!q.options[l].join('').trim()) return false;
  const { body } = cleanContent(q);
  if (!body) return false;
  if (SKIP_LINE.test(body)) return false;
  return true;
}

// 数字推理判断：题干靠近（ ）的 30 字符内以数字为主
function isNumberSeq(c) {
  const m = c.match(/[（(]\s*[）)]/);
  if (!m) return false;
  const pre = c.slice(Math.max(0, m.index - 30), m.index);
  const digits = (pre.match(/\d/g) || []).length;
  const total = pre.replace(/\s/g, '').length;
  return total > 0 && digits >= Math.max(2, total * 0.3);
}

function classify(c) {
  if (/发生顺序|顺序为|事件排序|合理的顺序|先后顺序|正确的顺序/.test(c)) return '事件排序';
  if (/类比|可类比于|相当于/.test(c)) return '类比推理';
  if (isNumberSeq(c)) return '数量关系';
  if (/数字推理|数列|规律填空/.test(c)) return '数量关系';
  if (
    /\d/.test(c) &&
    /元|块|个|人|名|张|支|袋|岁|小时|分钟|分|秒|天|年|月|米|公里|倍|率|比例|人数|价格|费用|利润|成本|面积|体积|速度|时间|距离|折扣|概率|排列|组合|钟表|时钟|闹钟|时针|分针|年龄|队伍|队列|商品|工作量|工程|鸡兔|整除/.test(c)
  ) return '数量关系';
  if (/根据(上述|以上)?定义|符合(上述|以上)?定义|属于(上述|以上)?定义|不属于(上述|以上)?定义|依据定义/.test(c)) return '定义判断';
  if (/质疑|削弱|最能|最有助于|支持|解释|矛盾|前提|论证|推出|推断|无法推出|无法推断|可以推出|必须假设|如果为真|推理/.test(c)) return '逻辑判断';
  if (/下列.{0,14}(正确|错误|不正确)的是|符合.{0,10}的是/.test(c) && /汉字|词语|成语|典故|历史|地理|物理|化学|生物|天文|经济|法律|政治|文学/.test(c)) return '常识判断';
  return '言语理解';
}

function esc(v) {
  if (v == null) return 'NULL';
  return "'" + String(v).replace(/\\/g, '\\\\').replace(/'/g, "''") + "'";
}

function buildRow(q, year) {
  const { body, opts } = cleanContent(q);
  const content = (body + '\n' + opts.join('\n')).trim();
  const category = classify(body);
  const detail = q.jiexi && q.jiexi.trim() ? q.jiexi.trim() : null;
  return { content, category, detail, year, answer: q.answer.trim() };
}

(async () => {
  const all = [];
  console.log('== dry-run 解析报告 ==\n');
  for (const f of FILES) {
    const file = path.join(DOC_DIR, f.name);
    const text = pandoc(file);
    const parsed = parseFile(text);
    const imported = [];
    const skipped = [];
    for (const q of parsed) {
      if (isImportable(q)) imported.push(buildRow(q, f.year));
      else skipped.push(q.num);
    }
    all.push(...imported);
    console.log(`[${f.year}] 解析 ${parsed.length} 块 → 导入 ${imported.length}，跳过 ${skipped.length}（题号: ${skipped.slice(0, 40).join(',')}${skipped.length > 40 ? '…' : ''}）`);
  }

  const total = all.length;
  const byCat = {};
  const byYear = {};
  for (const q of all) { byCat[q.category] = (byCat[q.category] || 0) + 1; byYear[q.year] = (byYear[q.year] || 0) + 1; }
  console.log('\n共可导入 ' + total + ' 道');
  console.log('按科目：', JSON.stringify(byCat, null, 0));
  console.log('按年份：', JSON.stringify(byYear, null, 0));

  // 生成 SQL 文件（供服务器导入）
  const cols = 'content, detail, category, industry, position, region, source_type, year, type, difficulty, reference_answer, tags, usage_count, avg_score, status, created_by, deleted_at, operated_by';
  const rows = all.map((q) =>
    `(${esc(q.content)}, ${esc(q.detail)}, ${esc(q.category)}, '通信运营商', '国企央企面试', '全国', 'real', ${q.year}, 0, 1, ${esc(q.answer)}, '["真题"]', 0, NULL, 1, 1, NULL, NULL)`,
  ).join(',\n');
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  fs.writeFileSync(OUT_SQL, `INSERT INTO questions (${cols}) VALUES\n${rows};\n`, 'utf8');
  console.log(`\nSQL 文件已写入: ${OUT_SQL} (${(fs.statSync(OUT_SQL).size / 1024).toFixed(1)} KB)`);

  if (!APPLY) {
    console.log('\n（dry-run，未写库；加 --apply 才会清空题库并写入本地 MySQL）');
    return;
  }

  // ---- apply：清空题库 + 关联表，写入本地 MySQL ----
  const mysql = require('mysql2/promise');
  const conn = await mysql.createConnection({ host: '127.0.0.1', port: 3306, user: 'root', password: '123456', database: 'ai_interview_coach' });
  const [delFk] = await conn.query('DELETE FROM answer_records');
  const [delW] = await conn.query('DELETE FROM wrong_answers');
  const [delF] = await conn.query('DELETE FROM question_favorites');
  const [delQ] = await conn.query('DELETE FROM questions');
  console.log(`\n已清空：answer_records ${delFk.affectedRows}、wrong_answers ${delW.affectedRows}、question_favorites ${delF.affectedRows}、questions ${delQ.affectedRows}`);

  let inserted = 0;
  const sql =
    'INSERT INTO questions (content, detail, category, industry, position, region, source_type, year, type, difficulty, reference_answer, tags, usage_count, avg_score, status, created_by, deleted_at, operated_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)';
  for (const q of all) {
    await conn.query(sql, [q.content, q.detail, q.category, '通信运营商', '国企央企面试', '全国', 'real', q.year, 0, 1, q.answer, JSON.stringify(['真题']), 0, null, 1, 1, null, null]);
    inserted++;
  }
  await conn.end();
  console.log(`本地 MySQL：已写入 ${inserted} 道真题`);
})().catch((e) => { console.error(e); process.exit(1); });
