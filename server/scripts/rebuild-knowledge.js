/**
 * 命令行：全量重建 RAG 知识库索引（阶段6 §10.2）
 * 使用：node scripts/rebuild-knowledge.js
 */
require('dotenv').config();
const ragService = require('../services/ragService');

async function main() {
  console.log('[rebuild-knowledge] 开始重建知识库索引…');
  const stats = await ragService.rebuildAll();
  console.log('[rebuild-knowledge] 完成', JSON.stringify(stats));
  process.exit(0);
}

main().catch((e) => {
  console.error('[rebuild-knowledge] 失败', e);
  process.exit(1);
});
