/** 调试：查看指定 docx 解析出的每个块的跳过原因 / 样例内容 */
const { execFileSync } = require('child_process');
const path = require('path');

const PANDOC = 'D:/pandoc-3.10-windows-x86_64/pandoc-3.10/pandoc.exe';
const DOC_DIR = 'D:/15-25';

const SKIP_LINE = /图片题|无法展示|仅保留题干|仅保留题目|图形推理|包含大量|答案分别|以下为可辨识|图形题/;
const QNUM = /^\s*(\d{1,3})[、.．]\s*(.*)$/;
const OPT = /^([A-D])[.．、]\s*(.*)$/;
const ANS = /^答案[:：]\s*([A-D]{1,4})[。.．]?\s*$/;
const JX = /^解析[:：]\s*(.*)$/;

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
    if (SKIP_LINE.test(trimmed)) { cur.skipLines = cur.skipLines || []; cur.skipLines.push(trimmed.slice(0, 30)); continue; }
    let m = line.match(ANS);
    if (m) { cur.answer = m[1]; continue; }
    m = line.match(JX);
    if (m) { cur.jiexi = m[1].trim(); cur.inJiexi = true; continue; }
    if (cur.inJiexi) { cur.jiexi += '\n' + trimmed; continue; }
    if (/^Page\b/i.test(trimmed) || /^[-—=·•]{3,}$/.test(trimmed)) continue;
    m = line.match(OPT);
    if (m) {
      const letter = m[1];
      if (!cur.options[letter]) { cur.options[letter] = []; cur.optOrder.push(letter); }
      const txt = m[2].trim();
      if (txt) cur.options[letter].push(txt);
      continue;
    }
    if (cur.optOrder.length) cur.options[cur.optOrder[cur.optOrder.length - 1]].push(trimmed);
    else cur.content.push(trimmed);
  }
  if (cur) questions.push(cur);
  return questions;
}

function cleanContent(q) {
  const body = q.content.join(' ').replace(/\s+/g, ' ').replace(/^[、.．\s]+/, '').trim();
  const opts = q.optOrder.map((l) => `${l}. ${q.options[l].join(' ').replace(/\s+/g, ' ').trim()}`);
  return { body, opts };
}

function reason(q) {
  if (SKIP_LINE.test(cleanContent(q).body)) return '题干含占位词';
  if (!q.answer || !q.answer.trim()) return '无答案';
  if (q.optOrder.length < 2) return `选项数=${q.optOrder.length}`;
  for (const l of q.optOrder) if (!q.options[l].join('').trim()) return `选项${l}为空`;
  if (!cleanContent(q).body) return '题干为空';
  return null;
}

const file = process.argv[2];
const range = process.argv[3]; // e.g. 1-30
const text = execFileSync(PANDOC, [path.join(DOC_DIR, file), '-t', 'plain'], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
const parsed = parseFile(text);
let [a, b] = (range || `1-${parsed.length}`).split('-').map(Number);
for (const q of parsed.slice(a - 1, b)) {
  const r = reason(q);
  const { body, opts } = cleanContent(q);
  console.log(`--- Q${q.num} ${r ? '跳过(' + r + ')' : '导入'}`);
  console.log(`  题干: ${body.slice(0, 120)}`);
  if (r && q.skipLines && q.skipLines.length) console.log(`  命中过滤: ${q.skipLines.slice(0, 3).join(' | ')}`);
  if (!r) console.log(`  选项: ${opts.join('  ')}`);
  if (q.answer) console.log(`  答案: ${q.answer}`);
  if (q.jiexi) console.log(`  解析: ${q.jiexi.slice(0, 60)}`);
}
