/**
 * 010 阶段6·V1.1 RAG 知识库建表（幂等）
 * knowledge_docs    文档（来源五表任一 → 文档元信息 + 状态机）
 * knowledge_chunks  分块（存 embedding 向量 JSON，MySQL 兜底向量库）
 * 均 CREATE TABLE IF NOT EXISTS；chunks 唯一键 (doc_id, chunk_index) 支持幂等 upsert。
 */
const { pool } = require('../models');

async function up() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS knowledge_docs (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      source_type VARCHAR(20) NOT NULL COMMENT "来源类型 materials/questions/readings/basics/hot_topics",
      source_id BIGINT UNSIGNED NOT NULL COMMENT "来源表主键",
      title VARCHAR(300) DEFAULT NULL COMMENT "标题",
      content MEDIUMTEXT COMMENT "原始内容（未分块）",
      position VARCHAR(50) DEFAULT NULL COMMENT "岗位（空=通用）",
      region VARCHAR(50) DEFAULT NULL COMMENT "地区（空=全国）",
      status VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT "pending/embedding/indexed/failed",
      chunk_count INT NOT NULL DEFAULT 0 COMMENT "分块数",
      is_active TINYINT NOT NULL DEFAULT 1 COMMENT "是否启用",
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uk_kdoc_source (source_type, source_id),
      KEY idx_kdoc_type (source_type, is_active)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT="知识库文档表"
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS knowledge_chunks (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      doc_id BIGINT UNSIGNED NOT NULL COMMENT "所属文档",
      chunk_index INT NOT NULL COMMENT "块序号（从0）",
      content MEDIUMTEXT COMMENT "块内容（标题+正文）",
      vector JSON DEFAULT NULL COMMENT "embedding 向量（MySQL 兜底存数组）",
      token_count INT NOT NULL DEFAULT 0 COMMENT "近似 token 数",
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uk_kchunk_doc_idx (doc_id, chunk_index),
      CONSTRAINT fk_kchunk_doc FOREIGN KEY (doc_id) REFERENCES knowledge_docs(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT="知识库分块表"
  `);

  console.log('[migration] 010 执行完成（knowledge_docs / knowledge_chunks）');
}

module.exports = { up };
