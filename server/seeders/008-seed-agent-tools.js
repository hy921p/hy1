/**
 * 008 种子：Agent 面试官 5 工具注册表（阶段6 §10.3.1，幂等）
 * 按 key upsert，可重复执行。enabled 保留人工开关状态（不重置）。
 */
const { pool } = require('../models');

const TOOLS = [
  {
    key: 'retrieve_knowledge',
    name: '检索知识库',
    description:
      '检索平台知识库（面试素材/题库/晨读/通识/热点），返回与话题相关的参考要点。需要引用政策、案例或评估作答深度时调用。',
    params_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '检索关键词或问题' },
      },
      required: ['query'],
    },
    sort: 1,
  },
  {
    key: 'score_answer',
    name: '逐轮评分',
    description:
      '对求职者当前作答按 6 个维度（综合分析能力/逻辑条理/语言表达/岗位匹配/应急应变/学习与改进）即时评分。求职者每轮作答后必须调用一次。',
    params_schema: {
      type: 'object',
      properties: {
        answer: { type: 'string', description: '求职者的完整作答内容' },
      },
      required: ['answer'],
    },
    sort: 2,
  },
  {
    key: 'generate_followup',
    name: '生成追问',
    description:
      '针对当前作答生成 1 个具有深挖性的追问，用于考察思路细节或应变能力。当作答流于表面、缺少细节或想测试应变时调用。',
    params_schema: {
      type: 'object',
      properties: {
        answer: { type: 'string', description: '当前作答内容' },
        asked_questions: { type: 'string', description: '已追问过的问题（可空）' },
      },
      required: ['answer'],
    },
    sort: 3,
  },
  {
    key: 'next_question',
    name: '获取下一题',
    description:
      '获取下一道面试题目。当前题目作答已充分、需要推进面试时调用。',
    params_schema: {
      type: 'object',
      properties: {
        used_ids: {
          type: 'array',
          items: { type: 'integer' },
          description: '已使用过的题目 ID 列表（可空）',
        },
      },
    },
    sort: 4,
  },
  {
    key: 'finish_interview',
    name: '结束面试',
    description:
      '标记面试结束并给出总结收尾语。全部题目作答完毕时调用。',
    params_schema: {
      type: 'object',
      properties: {
        session_id: { type: 'integer', description: '当前面试 ID（可空）' },
      },
    },
    sort: 5,
  },
];

async function seed() {
  console.log('[seed] 008 开始写入 Agent 工具注册表…');
  for (const t of TOOLS) {
    await pool.query(
      `INSERT INTO agent_tools (\`key\`, name, description, params_schema, enabled, sort)
       VALUES (?, ?, ?, ?, 1, ?)
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         description = VALUES(description),
         params_schema = VALUES(params_schema),
         sort = VALUES(sort)`,
      [t.key, t.name, t.description, JSON.stringify(t.params_schema), t.sort],
    );
  }
  const [[{ c }]] = await pool.query('SELECT COUNT(*) AS c FROM agent_tools');
  console.log(`[seed] 008 完成，agent_tools 共 ${c} 条`);
}

module.exports = { seed };
