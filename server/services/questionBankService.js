/**
 * 题库服务（阶段3 §7.11）
 * 四入口（hot/real/mock/normal）+ 九题型筛选、搜索、详情（含收藏状态）、
 * 答题（对+5 成长值 / 错进错题本 + AI 解析）、收藏切换、随机练习。
 */
const AppError = require('../utils/app-error');
const aiService = require('./aiService');
const growthService = require('./growthService');
const badgeService = require('./badgeService');
const { questionModel } = require('../models/interview');
const { answerRecordModel, wrongAnswerModel, favoriteModel } = require('../models/answer');

/** 题库列表（动态筛选 + 三级回退 + 分页） */
async function listQuestions({ position, region, category, sourceType, keyword, page, pageSize, sort }) {
  return questionModel.list({ position, region, category, sourceType, keyword, page, pageSize, sort });
}

/** 关键词搜索 */
async function searchQuestions({ keyword, page, pageSize }) {
  const kw = keyword == null ? '' : String(keyword).trim();
  if (!kw) throw new AppError(1001, '搜索关键词不能为空');
  return questionModel.search({ keyword: kw, page, pageSize });
}

/** 九大题型及数量 */
async function getCategories() {
  return questionModel.listCategories();
}

/** 四入口枚举 */
async function getSourceTypes() {
  return questionModel.listSourceTypes();
}

/** 热点推荐列表（今日推荐，最多 20 条） */
async function hotList({ position, region }) {
  return questionModel.findHot(position, region, 20);
}

/** 真题列表（分页） */
async function realList({ position, region, page, pageSize }) {
  return questionModel.findReal(position, region, { page, pageSize });
}

/** 题目详情（登录返回 isFavorite） */
async function getQuestionDetail(userId, id) {
  const q = await questionModel.findById(id);
  if (!q) throw new AppError(1002, '题目不存在');
  const isFavorite = userId ? await favoriteModel.isFavorite(userId, id) : false;
  return {
    id: q.id,
    content: q.content,
    detail: q.detail,
    category: q.category,
    position: q.position,
    region: q.region,
    sourceType: q.source_type,
    year: q.year,
    type: q.type,
    difficulty: q.difficulty,
    referenceAnswer: q.reference_answer,
    tags: q.tags,
    isFavorite,
  };
}

/**
 * 提交作答（§5.15）
 * 答对：answer_records + 成长值 answer:5；答错：错题本 upsert + AI 错题解析（仅首次生成）。
 * 无论对错都触发勋章重判（answer_count 计入所有作答）。不包大事务，grant 自开事务。
 */
async function submitAnswer(userId, { questionId, userAnswer, isCorrect, answerTime }) {
  const q = await questionModel.findById(questionId);
  if (!q) throw new AppError(1002, '题目不存在');

  await answerRecordModel.insert({
    userId,
    questionId,
    isCorrect: !!isCorrect,
    answerTime: Number(answerTime) || 0,
    userAnswer,
    category: q.category,
    position: q.position,
  });

  let wrong = null;
  let gainedPoints = 0;

  if (!isCorrect) {
    const w = await wrongAnswerModel.upsertOnWrong(userId, questionId);
    if (!w.ai_analysis) {
      w.ai_analysis = await generateAnalysis(q, userAnswer);
      if (w.ai_analysis) {
        await wrongAnswerModel.setAnalysis(userId, questionId, w.ai_analysis);
      }
    }
    wrong = {
      questionId: w.question_id,
      wrongCount: w.wrong_count,
      aiAnalysis: w.ai_analysis || null,
      mastered: !!w.mastered,
    };
  } else {
    const res = await growthService.grant(userId, 'answer', null, '答题正确奖励');
    gainedPoints = res.points;
  }

  // 答题记录变化 → 勋章重判（answer_count 计入所有作答）
  await badgeService.checkAndGrant(userId);

  return { isCorrect: !!isCorrect, gainedPoints, wrong };
}

/** AI 错题解析（失败兜底返回 null，不阻断答题流程） */
async function generateAnalysis(q, userAnswer) {
  try {
    const result = await aiService.chatJSON(
      [
        {
          role: 'system',
          content:
            '你是一名资深结构化面试考官。请根据题目与用户的作答，输出错题解析。必须返回 JSON，格式为 {"analysis":"解析内容"}，' +
            '解析需包含：① 答题问题剖析 ② 正确作答思路 ③ 参考要点。',
        },
        {
          role: 'user',
          content: `题目：${q.content}\n参考答案要点：${q.reference_answer || '无'}\n我的作答：${userAnswer || '未作答'}\n请给出错题解析。`,
        },
      ],
      { temperature: 0.3, timeout: 45000 },
    );
    const analysis = result && result.analysis;
    return analysis ? String(analysis).trim() : null;
  } catch (e) {
    return null;
  }
}

/** 收藏切换（幂等），返回切换后状态 */
async function toggleFavorite(userId, questionId) {
  const q = await questionModel.findById(questionId);
  if (!q) throw new AppError(1002, '题目不存在');
  return favoriteModel.toggle(userId, questionId);
}

/** 收藏列表 */
async function favoritesList(userId, { page, pageSize }) {
  return favoriteModel.listByUser(userId, { page, pageSize });
}

/** 错题本列表（JOIN 题目） */
async function wrongList(userId, { page, pageSize }) {
  return wrongAnswerModel.listByUser(userId, { page, pageSize });
}

/** 标记错题已掌握（幂等；记录不存在才 1002） */
async function markMastered(userId, questionId) {
  const w = await wrongAnswerModel.findByUserQuestion(userId, questionId);
  if (!w) throw new AppError(1002, '错题记录不存在');
  await wrongAnswerModel.markMastered(userId, questionId);
  return { mastered: true };
}

/** 随机练习（不返回参考答案） */
async function practiceQuestions({ position, region, limit }) {
  return questionModel.findPractice(position, region, limit || 10);
}

module.exports = {
  listQuestions,
  searchQuestions,
  getCategories,
  getSourceTypes,
  hotList,
  realList,
  getQuestionDetail,
  submitAnswer,
  toggleFavorite,
  favoritesList,
  wrongList,
  markMastered,
  practiceQuestions,
};
