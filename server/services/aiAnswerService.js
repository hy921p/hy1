/**
 * AI 答疑服务（阶段3 §7.14 / 阶段6 §10.2 接入 RAG）
 * - RAG 混合检索（向量 + 关键词，retrieveContext 为关键词路）→ citations
 * - 未命中裸调兜底（retrieved=false）
 * - chatText 生成回答 → 落 ai_answers → ai_answer 通知本人
 */
const AppError = require('../utils/app-error');
const aiService = require('./aiService');
const notificationService = require('./notificationService');
const preferenceService = require('./preferenceService');
const ragService = require('./ragService');
const { retrieveContext, extractKeywords, buildReferenceText } = require('./keywordRetrieval');
const aiAnswerModel = require('../models/aiAnswer');

/**
 * AI 答疑（§7.14）
 * RAG 检索命中则带【参考资料】作答，未命中裸调兜底（retrieved=false）。
 */
async function ask(userId, { question, entry, refType, refId }) {
  const q = question == null ? '' : String(question).trim();
  if (!q) throw new AppError(1001, '问题不能为空');

  const pref = await preferenceService.getPreference(userId);
  const { retrieved, citations } = await ragService.search(q, { position: pref.position, region: pref.region });
  const refText = retrieved ? buildReferenceText(citations) : null;

  const messages = [
    {
      role: 'system',
      content:
        '你是一名公考求职备考 AI 答疑助手，覆盖结构化面试、求职、笔试等场景。回答要专业、具体、可操作，条理清晰。' +
        (refText ? '如果提供了参考资料，请优先结合参考资料作答，并在回答末尾标注引用了哪些资料。' : ''),
    },
    {
      role: 'user',
      content: refText ? `${refText}\n\n我的问题：${q}` : q,
    },
  ];

  const answer = await aiService.chatText(messages, { temperature: 0.5, timeout: 60000 });

  const answerId = await aiAnswerModel.insert({
    userId,
    question: q,
    answer,
    category: 'knowledge',
    refType,
    refId,
    entry: entry || null,
    citations,
  });

  // ai_answer 通知本人（fail-open）
  await notificationService.notify(
    userId,
    'ai_answer',
    '你的答疑已完成',
    'AI 已为你生成回答，点击查看',
    { answerId },
  );

  return { answerId, answer, retrieved, citations };
}

/** 仅检索上下文（不耗 LLM、不限流）；可选传 position/region 过滤 */
async function context(question, { position, region } = {}) {
  const q = question == null ? '' : String(question).trim();
  if (!q) throw new AppError(1001, '问题不能为空');
  const { retrieved, citations } = await ragService.search(q, { position, region });
  return { question: q, retrieved, citations };
}

/** 答疑记录分页 */
async function listAnswers(userId, { page, pageSize }) {
  return aiAnswerModel.listByUser(userId, { page, pageSize });
}

/** 答疑详情（仅本人） */
async function getAnswer(userId, id) {
  const a = await aiAnswerModel.findById(id);
  if (!a) throw new AppError(1002, '答疑记录不存在');
  if (a.user_id !== userId) throw new AppError(2002, '无权查看他人答疑记录');
  let citations = a.citations;
  if (typeof citations === 'string' && citations) {
    try { citations = JSON.parse(citations); } catch (e) { citations = []; }
  }
  return {
    id: a.id,
    question: a.question,
    answer: a.answer,
    category: a.category,
    refType: a.ref_type,
    refId: a.ref_id,
    entry: a.entry,
    citations,
    createdAt: a.created_at,
  };
}

/** 删除答疑记录（仅本人） */
async function deleteAnswer(userId, id) {
  const a = await aiAnswerModel.findById(id);
  if (!a) throw new AppError(1002, '答疑记录不存在');
  if (a.user_id !== userId) throw new AppError(2002, '无权删除他人答疑记录');
  const affected = await aiAnswerModel.remove(id, userId);
  if (!affected) throw new AppError(1002, '答疑记录不存在');
  return { deleted: true };
}

module.exports = {
  ask,
  context,
  listAnswers,
  getAnswer,
  deleteAnswer,
  // 兼容导出：关键词检索能力（供 ragService 等复用）
  retrieveContext,
  extractKeywords,
};
