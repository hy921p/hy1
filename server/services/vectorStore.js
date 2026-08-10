/**
 * 向量存储服务（阶段6 §10.2）— 可插拔后端
 * - mysql（默认）：chunks.vector JSON 列 + JS 余弦相似度
 * - qdrant：Qdrant REST API（全局 fetch，零新依赖），部署时切换
 * 由 config.ai.vector.mode 决定，启动即选定单例。
 */
const config = require('../config');
const { query } = require('../models');
const logger = require('../utils/logger');

function cosine(a, b) {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb) || 1;
  return dot / denom;
}

/** MySQL 后端：向量存 chunks.vector JSON，检索在 JS 里做余弦 */
const mysqlBackend = {
  name: 'mysql',

  async upsertChunk({ docId, chunkIndex, vector, payload }) {
    await query(
      `INSERT INTO knowledge_chunks (doc_id, chunk_index, content, vector, token_count)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE content = VALUES(content), vector = VALUES(vector), token_count = VALUES(token_count)`,
      [docId, chunkIndex, payload.content, JSON.stringify(vector), payload.token_count || 0],
    );
  },

  async search(vector, { topK, filter = {} } = {}) {
    const conds = ['d.is_active = 1'];
    const params = [];
    if (filter.source_type) {
      conds.push('d.source_type = ?');
      params.push(filter.source_type);
    }
    if (filter.position) {
      conds.push('(d.position IS NULL OR d.position = "" OR d.position = ?)');
      params.push(filter.position);
    }
    if (filter.region) {
      conds.push('(d.region IS NULL OR d.region = "" OR d.region = ?)');
      params.push(filter.region);
    }
    const rows = await query(
      `SELECT c.doc_id, c.chunk_index, c.content, c.vector,
              d.source_type, d.source_id, d.title, d.position, d.region
       FROM knowledge_chunks c JOIN knowledge_docs d ON c.doc_id = d.id
       WHERE ${conds.join(' AND ')} ORDER BY c.id ASC LIMIT 500`,
      params,
    );
    const scored = [];
    for (const r of rows) {
      let v = r.vector;
      if (typeof v === 'string') {
        try { v = JSON.parse(v); } catch { continue; }
      }
      if (!Array.isArray(v)) continue;
      scored.push({ ...r, _score: cosine(vector, v) });
    }
    scored.sort((a, b) => b._score - a._score);
    return scored.slice(0, topK);
  },

  async deleteByDoc(docId) {
    await query('DELETE FROM knowledge_chunks WHERE doc_id = ?', [docId]);
  },
};

/** Qdrant REST 后端（零新依赖，全局 fetch） */
const qdrantBackend = {
  name: 'qdrant',
  collection: config.ai.vector.collection,

  async ensure() {
    const res = await fetch(`${config.ai.vector.url}/collections/${this.collection}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vectors: { size: config.ai.embedding.dim, distance: 'Cosine' } }),
    });
    if (!res.ok && res.status !== 409) logger.warn(`qdrant ensure collection: HTTP ${res.status}`);
  },

  /** 确定性 UUIDv5-like（md5(name) 格式化），同 (docId,chunkIndex) 幂等 upsert */
  pointId(docId, chunkIndex) {
    const crypto = require('crypto');
    const hex = crypto.createHash('md5').update(`${docId}:${chunkIndex}`).digest('hex');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
  },

  async upsertChunk({ docId, chunkIndex, vector, payload }) {
    await this.ensure();
    const res = await fetch(`${config.ai.vector.url}/collections/${this.collection}/points`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        points: [{ id: this.pointId(docId, chunkIndex), vector, payload: { doc_id: docId, chunk_index: chunkIndex, ...payload } }],
      }),
    });
    if (!res.ok) throw new Error(`qdrant upsert HTTP ${res.status}`);
  },

  async search(vector, { topK, filter = {} } = {}) {
    const must = [];
    if (filter.source_type) must.push({ key: 'source_type', match: { value: filter.source_type } });
    for (const k of ['position', 'region']) {
      if (filter[k]) {
        // 通用（空值）或精确匹配
        must.push({ should: [{ key: k, match: { value: filter[k] } }, { is_empty: { key: k } }], min_should: 1 });
      }
    }
    const res = await fetch(`${config.ai.vector.url}/collections/${this.collection}/points/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vector, limit: topK * 3, with_payload: true, filter: { must } }),
    });
    if (!res.ok) throw new Error(`qdrant search HTTP ${res.status}`);
    const data = await res.json();
    return (data.result || []).map((p) => ({
      doc_id: p.payload.doc_id,
      chunk_index: p.payload.chunk_index,
      content: p.payload.content,
      source_type: p.payload.source_type,
      source_id: p.payload.source_id,
      title: p.payload.title,
      _score: p.score,
    }));
  },

  async deleteByDoc(docId) {
    const res = await fetch(`${config.ai.vector.url}/collections/${this.collection}/points/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filter: { must: [{ key: 'doc_id', match: { value: docId } }] } }),
    });
    if (!res.ok) logger.warn(`qdrant delete HTTP ${res.status}`);
  },
};

const vectorStore = config.ai.vector.mode === 'qdrant' ? qdrantBackend : mysqlBackend;

module.exports = vectorStore;
