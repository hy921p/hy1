/**
 * RAG 知识库服务（阶段6 §10.2）
 * - 流水线：内容变更 → indexSource（分块 → embedding → 向量库 → knowledge_docs/chunks）
 * - 混合检索：向量 Top-K（RRF 合并）+ 关键词检索 → citations（refType/refId/title/snippet）
 * - 降级链：向量库可用 → 关键词检索 → 无检索裸调（retrieved=false，由调用方兜底）
 * - 幂等：uk_kdoc_source(source_type, source_id) + chunks 唯一键，rebuildAll 可重复执行
 */
const config = require('../config');
const { query } = require('../models');
const logger = require('../utils/logger');
const embeddingService = require('./embeddingService');
const vectorStore = require('./vectorStore');
const { retrieveContext } = require('./keywordRetrieval');

const SOURCE_TYPES = ['materials', 'questions', 'readings', 'basics', 'hot_topics'];

/** 各来源加载器：归一化出 {id,title,content,position,region} */
const SOURCE_LOADERS = {
  materials: async (id) => {
    const r = await query('SELECT id, title, position, NULL AS region, content FROM materials WHERE id = ?', [id]);
    return r[0] || null;
  },
  questions: async (id) => {
    const r = await query(
      `SELECT id, content AS title, position, region,
              CONCAT_WS('\\n', content, detail, CONCAT('【参考回答】', reference_answer)) AS content
       FROM questions WHERE id = ? AND deleted_at IS NULL AND status = 1`,
      [id],
    );
    return r[0] || null;
  },
  readings: async (id) => {
    const r = await query(
      `SELECT id, title, position, region, CONCAT_WS('\\n', summary, content) AS content
       FROM readings WHERE id = ? AND is_active = 1`,
      [id],
    );
    return r[0] || null;
  },
  basics: async (id) => {
    const r = await query(
      `SELECT id, title, position, NULL AS region, CONCAT_WS('\\n', category, content) AS content
       FROM basics WHERE id = ?`,
      [id],
    );
    return r[0] || null;
  },
  hot_topics: async (id) => {
    const r = await query(
      `SELECT id, title, position, region, CONCAT_WS('\\n', summary, content) AS content
       FROM hot_topics WHERE id = ? AND is_active = 1`,
      [id],
    );
    return r[0] || null;
  },
};

/** 各来源可索引 id 列表（rebuildAll 用） */
const SOURCE_ID_QUERIES = {
  materials: 'SELECT id FROM materials',
  questions: 'SELECT id FROM questions WHERE deleted_at IS NULL AND status = 1',
  readings: 'SELECT id FROM readings WHERE is_active = 1',
  basics: 'SELECT id FROM basics',
  hot_topics: 'SELECT id FROM hot_topics WHERE is_active = 1',
};

/** 标题前缀（分块用，截断防噪音） */
function shortTitle(title) {
  const t = String(title || '').trim();
  return t.length > 60 ? `${t.slice(0, 60)}…` : t;
}

/** 按段落分块，目标约 1200 字符/块（中文 ≈500 token） */
function chunkText(title, content) {
  const paras = String(content || '')
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (!paras.length) return [];
  const MAX = 1200;
  const raw = [];
  let buf = '';
  for (const p of paras) {
    if (buf && buf.length + p.length + 1 > MAX) {
      raw.push(buf);
      buf = '';
    }
    buf += (buf ? '\n' : '') + p;
  }
  if (buf) raw.push(buf);
  const t = shortTitle(title);
  return raw.map((c) => (t ? `${t}\n${c}` : c));
}

async function getDoc(source_type, source_id) {
  const rows = await query('SELECT * FROM knowledge_docs WHERE source_type = ? AND source_id = ? LIMIT 1', [source_type, source_id]);
  return rows[0] || null;
}

/**
 * 索引单个来源（幂等 upsert）
 * @returns {Promise<{docId:number, chunks:number}|null>} 来源不存在返回 null
 */
async function indexSource(source_type, source_id) {
  if (!SOURCE_LOADERS[source_type]) throw new Error(`未知来源类型: ${source_type}`);
  const row = await SOURCE_LOADERS[source_type](source_id);
  if (!row) return null;

  const chunks = chunkText(row.title, row.content);
  await query(
    `INSERT INTO knowledge_docs (source_type, source_id, title, content, position, region, status, chunk_count, is_active)
     VALUES (?, ?, ?, ?, ?, ?, 'embedding', ?, 1)
     ON DUPLICATE KEY UPDATE title = VALUES(title), content = VALUES(content), position = VALUES(position),
       region = VALUES(region), status = 'embedding', chunk_count = VALUES(chunk_count), is_active = 1`,
    [source_type, source_id, String(row.title || '').slice(0, 300), row.content || '', row.position || null, row.region || null, chunks.length],
  );

  const doc = await getDoc(source_type, source_id);
  // 旧分块清除后重建（幂等）
  await vectorStore.deleteByDoc(doc.id);
  await query('DELETE FROM knowledge_chunks WHERE doc_id = ?', [doc.id]);

  for (let i = 0; i < chunks.length; i++) {
    const vec = await embeddingService.embed(chunks[i]);
    await vectorStore.upsertChunk({
      docId: doc.id,
      chunkIndex: i,
      vector: vec,
      payload: {
        content: chunks[i],
        token_count: Math.ceil(chunks[i].length / 2),
        source_type,
        source_id: row.id,
        title: String(row.title || '').slice(0, 300),
        position: row.position || null,
        region: row.region || null,
      },
    });
  }

  await query("UPDATE knowledge_docs SET status = 'indexed' WHERE id = ?", [doc.id]);
  return { docId: doc.id, chunks: chunks.length };
}

/** 删除来源（doc + chunks + 向量点） */
async function removeSource(source_type, source_id) {
  const rows = await query('SELECT id FROM knowledge_docs WHERE source_type = ? AND source_id = ?', [source_type, source_id]);
  for (const r of rows) {
    await vectorStore.deleteByDoc(r.id);
    await query('DELETE FROM knowledge_chunks WHERE doc_id = ?', [r.id]);
  }
  await query('DELETE FROM knowledge_docs WHERE source_type = ? AND source_id = ?', [source_type, source_id]);
  return rows.length > 0;
}

/** 全量重建（清空后按 5 表重索引；单条失败不中断） */
async function rebuildAll() {
  await query('DELETE FROM knowledge_chunks');
  await query('DELETE FROM knowledge_docs');
  const stats = {};
  for (const type of SOURCE_TYPES) {
    const rows = await query(SOURCE_ID_QUERIES[type]);
    let ok = 0;
    for (const r of rows) {
      try {
        await indexSource(type, r.id);
        ok += 1;
      } catch (e) {
        logger.error(`[rag] 索引失败 ${type}:${r.id}`, e.message);
      }
    }
    stats[type] = ok;
    console.log(`[rag] ${type} 索引完成 ${ok}/${rows.length}`);
  }
  return stats;
}

/** 块内容去标题前缀后取摘要 */
function snippetFromChunk(content, title) {
  let t = String(content || '');
  const tt = String(title || '').trim();
  if (tt && t.startsWith(tt)) t = t.slice(tt.length).trim();
  return t.slice(0, 120);
}

/** 向量检索：按文档去重（保留最佳块）→ citations 形状 */
async function vectorSearch(question, { position, region, topK }) {
  try {
    const vec = await embeddingService.embed(question);
    const results = await vectorStore.search(vec, { topK: topK * 2, filter: { position, region } });
    const best = new Map();
    for (const r of results) {
      const key = `${r.source_type}:${r.source_id}`;
      if (!best.has(key) || (r._score || 0) > (best.get(key)._score || 0)) best.set(key, r);
    }
    return [...best.values()].map((r) => ({
      refType: r.source_type,
      refId: Number(r.source_id),
      title: String(r.title || '').slice(0, 80),
      snippet: snippetFromChunk(r.content, r.title),
    }));
  } catch (e) {
    logger.warn('[rag] 向量检索失败（降级纯关键词）:', e.message);
    return [];
  }
}

/** RRF 结果融合：1/(K+rank)，K=60 */
function rrfMerge(groups) {
  const K = 60;
  const scores = new Map();
  for (const group of groups) {
    group.forEach((c, i) => {
      const key = `${c.refType}:${c.refId}`;
      const cur = scores.get(key) || { score: 0, citation: c };
      cur.score += 1 / (K + i + 1);
      scores.set(key, cur);
    });
  }
  return [...scores.values()].sort((a, b) => b.score - a.score).map((s) => s.citation);
}

/**
 * 混合检索
 * @returns {{retrieved:boolean, citations:Array<{refType,refId,title,snippet}>}}
 */
async function search(question, { position, region, topK } = {}) {
  const k = topK || config.ai.vector.topK || 5;
  const vec = await vectorSearch(question, { position, region, topK: k });
  let kw = { citations: [] };
  try {
    kw = await retrieveContext(question, { position, region });
  } catch (e) {
    logger.warn('[rag] 关键词检索失败:', e.message);
  }
  const combined = rrfMerge([vec, kw.citations]);
  return { retrieved: combined.length > 0, citations: combined.slice(0, k) };
}

module.exports = { indexSource, removeSource, rebuildAll, search, SOURCE_TYPES };
