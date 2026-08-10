/**
 * 关键词检索（阶段6 §10.2 关键词路）
 * 从 aiAnswerService 抽出，供 aiAnswerService 与 ragService 共用（避免循环依赖）。
 * 中文无分词器 → n-gram 切词（3字/2字滑动窗口，停用字过滤）→ 5 表 UNION LIKE →
 * score=hits*10+titleHit*5 → top3；支持 position/region 偏好过滤。
 */
const { query } = require('../models');

// 中文虚词/语气词停用表（用于过滤检索关键词）
const STOPWORDS = new Set(
  '我你您他她它我们你们他们的了吗呢啊吧是在有和与或及对从为给让把被这那什么怎么如何怎样哪些哪个请问一个一下可以应该需要请想要中上下里着过都也很最们其之所示吗'.split(''),
);

/** 该串是否全部由停用字组成（无检索价值） */
function isAllStopwords(str) {
  for (const ch of str) {
    if (!STOPWORDS.has(ch)) return false;
  }
  return true;
}

/**
 * 从问题中抽取检索关键词（最多 6 个）
 * - 纯英文/数字词组整体保留（如 "AI"、"12345"）
 * - 连续中文 ≥5 字按 3字/2字 滑动窗口切词（无中文分词器，用 n-gram 近似）
 * - ≤4 字的中文词组整体保留
 * - 去重、去纯虚词串
 */
function extractKeywords(question) {
  const clean = String(question).replace(/[^一-龥a-zA-Z0-9]/g, ' ');
  const grams = [];
  for (const token of clean.split(/\s+/)) {
    if (token.length < 2) continue;
    const cn = token.replace(/[^一-龥]/g, '');
    if (cn.length === token.length && cn.length > 4) {
      // 纯长中文 → 每位置同时产出 3字/2字 n-gram（贴近真实词组，如 结构化/面试/应急）
      for (let i = 0; i + 2 <= cn.length; i++) {
        if (i + 3 <= cn.length) grams.push(cn.slice(i, i + 3));
        grams.push(cn.slice(i, i + 2));
      }
    } else {
      grams.push(token);
    }
  }
  const seen = new Set();
  const out = [];
  for (const g of grams) {
    if (seen.has(g)) continue;
    seen.add(g);
    if (isAllStopwords(g)) continue;
    out.push(g);
    if (out.length >= 6) break;
  }
  return out;
}

/** 跨 5 表 LIKE 检索（参数化），返回原始命中行 */
async function searchAllSources(keyword) {
  const like = `%${keyword}%`;
  const sql = `
    SELECT 'materials' AS tbl, id, title, content AS body, position, NULL AS region
      FROM materials WHERE content LIKE ? OR title LIKE ?
    UNION ALL
    SELECT 'questions', id, content, detail, position, region
      FROM questions WHERE content LIKE ? OR detail LIKE ? OR category LIKE ?
    UNION ALL
    SELECT 'readings', id, title, content, position, region
      FROM readings WHERE content LIKE ? OR title LIKE ?
    UNION ALL
    SELECT 'basics', id, title, content, position, NULL AS region
      FROM basics WHERE content LIKE ? OR title LIKE ?
    UNION ALL
    SELECT 'hot_topics', id, title, content, position, region
      FROM hot_topics WHERE content LIKE ? OR title LIKE ?
  `;
  return query(sql, [like, like, like, like, like, like, like, like, like, like, like]);
}

/** 偏好匹配：岗位/地区指定时，空值（通用）或精确匹配才命中 */
function matchesPref(it, position, region) {
  if (position && it.position && it.position !== position) return false;
  if (region && it.region && it.region !== region) return false;
  return true;
}

/**
 * 关键词检索上下文
 * @returns {{retrieved: boolean, citations: Array<{refType,refId,title,snippet}>}}
 */
async function retrieveContext(question, { position, region } = {}) {
  const keywords = extractKeywords(question);
  const items = new Map();
  for (const kw of keywords) {
    let rows = [];
    try {
      rows = await searchAllSources(kw);
    } catch (e) {
      continue;
    }
    for (const row of rows) {
      const key = `${row.tbl}:${row.id}`;
      let it = items.get(key);
      if (!it) {
        it = { tbl: row.tbl, id: row.id, title: row.title, body: row.body, position: row.position, region: row.region, hits: 0, titleHit: 0 };
        items.set(key, it);
      }
      it.hits += 1;
      if (String(row.title).includes(kw)) it.titleHit = 1;
    }
  }
  const scored = [...items.values()]
    .filter((it) => matchesPref(it, position, region))
    .map((it) => ({ ...it, score: it.hits * 10 + (it.titleHit ? 5 : 0) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
  const citations = scored.map((it) => ({
    refType: it.tbl,
    refId: it.id,
    title: String(it.title).slice(0, 80),
    snippet: String(it.body || '').slice(0, 120),
  }));
  return { retrieved: citations.length > 0, citations };
}

/** 组装参考资料文本 */
function buildReferenceText(citations) {
  return citations.map((c, i) => `[资料${i + 1}] ${c.title}：${c.snippet}`).join('\n');
}

module.exports = { extractKeywords, searchAllSources, retrieveContext, buildReferenceText };
