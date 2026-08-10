/**
 * Embedding 服务（阶段6 §10.2）
 * 远程优先 + 哈希兜底：
 * - mode=auto   ：先试远程（DashScope 兼容代理 qwen3.7-text-embedding），失败→哈希
 * - mode=remote ：仅远程（失败抛错）
 * - mode=hash   ：仅本地字符 n-gram 哈希（零依赖离线确定性）
 * 远程失败短时记忆（60s）避免反复打；流水线永不因 embedding 中断。
 */
const config = require('../config');
const logger = require('../utils/logger');

let remoteDisabledUntil = 0;

/** FNV-1a 32bit 哈希 */
function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

/** 归一化到单位长度（必要时裁剪/补零到 dim） */
function normalize(vec, dim) {
  const out = new Array(dim);
  let norm = 0;
  for (let i = 0; i < dim; i++) {
    const v = Number(vec[i]) || 0;
    out[i] = v;
    norm += v * v;
  }
  norm = Math.sqrt(norm) || 1;
  for (let i = 0; i < dim; i++) out[i] /= norm;
  return out;
}

/** 字符 2/3-gram 哈希向量（→ dim 定长 → 归一化），双哈希降碰撞 */
function hashEmbed(text) {
  const dim = config.ai.embedding.dim || 1024;
  const vec = new Array(dim).fill(0);
  const clean = String(text || '');
  for (let i = 0; i < clean.length; i++) {
    if (i + 3 <= clean.length) {
      const g = clean.slice(i, i + 3);
      vec[fnv1a(g) % dim] += 1.5;
      vec[fnv1a(g + '|b') % dim] += 1.5;
    }
    if (i + 2 <= clean.length) {
      const g = clean.slice(i, i + 2);
      vec[fnv1a(g) % dim] += 1;
      vec[fnv1a(g + '|b') % dim] += 1;
    }
  }
  return normalize(vec, dim);
}

/** 远程 embedding（OpenAI 兼容 /embeddings 请求体） */
async function remoteEmbed(text) {
  const cfg = config.ai.embedding;
  const url = `${String(cfg.baseURL).replace(/\/+$/, '')}/embeddings`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.apiKey}` },
    body: JSON.stringify({ model: cfg.model, input: text, encoding_format: 'float' }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`embedding HTTP ${res.status}`);
  const data = await res.json();
  const vec = data && data.data && data.data[0] && data.data[0].embedding;
  if (!Array.isArray(vec) || !vec.length) throw new Error('embedding 返回为空');
  return normalize(vec, config.ai.embedding.dim);
}

/**
 * 计算文本向量
 * @param {string} text
 * @returns {Promise<number[]>}
 */
async function embed(text) {
  const cfg = config.ai.embedding;
  if (cfg.mode === 'hash' || !cfg.apiKey) return hashEmbed(text);
  if (cfg.mode === 'remote') return remoteEmbed(text);
  // auto：远程失败降级哈希
  if (Date.now() < remoteDisabledUntil) return hashEmbed(text);
  try {
    return await remoteEmbed(text);
  } catch (err) {
    logger.warn('远程 embedding 失败，降级哈希兜底:', err.message);
    remoteDisabledUntil = Date.now() + 60000;
    return hashEmbed(text);
  }
}

module.exports = { embed, hashEmbed, remoteEmbed };
