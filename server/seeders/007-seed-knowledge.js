/**
 * 007 种子：知识库全量重建（阶段6 §10.2，幂等）
 * 清空 knowledge_docs/chunks 后按 5 表重索引。可重复执行（跑两遍无副作用）。
 */
const ragService = require('../services/ragService');

async function seed() {
  console.log('[seed] 007 开始重建知识库索引…');
  const stats = await ragService.rebuildAll();
  console.log('[seed] 007 知识库重建完成', JSON.stringify(stats));
}

module.exports = { seed };
