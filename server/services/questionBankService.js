/**
 * 题库服务（阶段3 §7.11）
 * 四入口（hot/real/mock/normal）+ 九题型筛选、搜索、详情（含收藏状态）、
 * 答题（对+5 成长值 / 错进错题本 + AI 解析）、收藏切换、随机练习。
 */
const AppError = require('../utils/app-error');
const aiService = require('./aiService');
const growthService = require('./growthService');
const badgeService = require('./badgeService');
const recommendationService = require('./recommendationService');
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

/** 真题/模拟试卷列表（分页，支持按年份过滤 + 试卷类型） */
async function realList({ position, region, page, pageSize, year, sourceType }) {
  return questionModel.findReal(position, region, { page, pageSize, year, sourceType });
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
    const w = await wrongAnswerModel.upsertOnWrong(userId, questionId, userAnswer);
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

/**
 * 批量提交模拟考作答（真题交卷落库）
 * 答对 → answer_records + 成长值 answer:5（去重）
 * 答错 → answer_records + 错题本 upsert；AI 解析后台并发生成。
 */
async function submitExamAnswers(userId, { year, answers, startedAt }) {
  const list = (answers || []).filter((a) => a && a.questionId && a.answer);
  if (!list.length) throw new AppError(1001, '请至少作答一题后再交卷');

  // 归一化开始时间：number(ms)/ISO 字符串 → 服务器本地 Date（与 created_at 的 NOW() 时区一致）
  let startedVal = null;
  if (startedAt != null) {
    const t = typeof startedAt === 'number' ? startedAt : new Date(String(startedAt)).getTime();
    if (Number.isFinite(t)) startedVal = new Date(t);
  }

  const qs = await Promise.all(list.map((a) => questionModel.findById(Number(a.questionId))));
  const items = [];
  for (let i = 0; i < list.length; i++) {
    const q = qs[i];
    if (!q) throw new AppError(1002, `题目 ${list[i].questionId} 不存在`);
    if (!['real', 'mock'].includes(q.source_type)) throw new AppError(1001, `题目 ${list[i].questionId} 非真题`);
    if (year != null && String(q.year) !== String(year)) {
      throw new AppError(1001, `题目 ${list[i].questionId} 不属于 ${year} 年真题`);
    }
    items.push({ q, userAnswer: String(list[i].answer).trim().toUpperCase() });
  }

  const already = await answerRecordModel.idSetByUser(
    userId,
    items.map((it) => it.q.id),
  );
  const wrongQueue = [];
  let correct = 0;
  let wrong = 0;
  let gainedPoints = 0;
  let newRecords = 0;

  for (const { q, userAnswer } of items) {
    const ref = String(q.reference_answer || '').trim().toUpperCase();
    const isCorrect = !!ref && userAnswer === ref;

    // 无论对错均写入记录
    await answerRecordModel.insert({
      userId,
      questionId: q.id,
      isCorrect: !!isCorrect,
      answerTime: 0,
      userAnswer,
      category: q.category,
      position: q.position,
      startedAt: startedVal,
    });
    newRecords++;

    if (isCorrect) {
      correct++;
      if (!already.has(q.id)) {
        // 该题未曾答对过 → 给成长值奖励，防重复刷分
        const res = await growthService.grant(userId, 'answer', null, '模拟考答题正确');
        gainedPoints += res.points;
      }
    } else {
      wrong++;
      const w = await wrongAnswerModel.upsertOnWrong(userId, q.id, userAnswer);
      if (!w.ai_analysis) wrongQueue.push({ q, userAnswer });
    }
  }

  await badgeService.checkAndGrant(userId);

  // 后台并发补错题 AI 解析（不阻塞交卷响应）
  if (wrongQueue.length) {
    setImmediate(() => fillWrongAnalysis(userId, wrongQueue).catch(() => {}));
  }

  return { total: items.length, correct, wrong, gainedPoints, newRecords };
}

/** 错题 AI 解析后台并发生成（上限 2 并发，逐条失败不影响其它） */
const ANALYSIS_CONCURRENCY = 2;
async function fillWrongAnalysis(userId, queue) {
  const workers = Array.from({ length: Math.min(ANALYSIS_CONCURRENCY, queue.length) }, async () => {
    while (queue.length) {
      const { q, userAnswer } = queue.shift();
      try {
        const analysis = await generateAnalysis(q, userAnswer);
        if (analysis) await wrongAnswerModel.setAnalysis(userId, q.id, analysis);
      } catch { /* 单条失败跳过 */ }
    }
  });
  await Promise.all(workers);
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

/** 错题本列表（JOIN 题目；支持考点/频次/关键词/来源分组筛选，附带分组计数 + 每行 group 标注） */
async function wrongList(userId, { page, pageSize, category, wrongCount, keyword, group, position, region }) {
  // 今日推荐池：与首页同 limit(3)、同 RAND 日种子，把从「今日推荐」练错的题单独归为一组
  const todayIds = (await recommendationService.today(position, region, 3)).map((t) => t.id);
  const [base, groups] = await Promise.all([
    wrongAnswerModel.listByUser(userId, { page, pageSize, category, wrongCount, keyword, group, todayIds }),
    wrongAnswerModel.groupCounts(userId, todayIds),
  ]);
  const todaySet = new Set(todayIds);
  const list = base.list.map((row) => ({
    ...row,
    group: todaySet.has(row.question_id) ? 'today' : row.source_type === 'mock' ? 'mock' : 'real',
  }));
  return { list, total: base.total, counts: groups.counts };
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

/** 再练一题：今日推荐池内换一题（排除本次会话已练过的题目，避免与上一题相同） */
async function nextPracticeQuestion({ position, region, exclude = [] }) {
  const ids = (exclude || []).map(Number).filter((n) => Number.isInteger(n) && n > 0);
  const rows = await questionModel.findNextPractice(position, region, ids, 1);
  return { id: rows[0] ? rows[0].id : null };
}

/** 做题记录（按年份聚合） */
async function practiceRecords(userId) {
  return answerRecordModel.practiceRecordsByYear(userId);
}

/** 删除某年某试卷类型的做题记录（整卷记录；返回删除条数） */
async function deletePracticeRecords(userId, { year, sourceType }) {
  if (year == null || String(year).trim() === '') throw new AppError(1001, '缺少年份参数');
  const st = sourceType === 'mock' ? 'mock' : 'real';
  const deleted = await answerRecordModel.deleteByPaper(userId, year, st);
  return { deleted };
}

/** 成绩单：某年真题/模拟试卷全卷（题目 + 我的答案 + 正确答案 + 解析 + 统计） */
async function examReport(userId, { year, sourceType }) {
  if (year == null || String(year).trim() === '') throw new AppError(1001, '缺少年份参数');
  const st = sourceType === 'mock' ? 'mock' : 'real';
  const list = await answerRecordModel.examReportByYear(userId, year, st);
  const total = list.length;
  const answered = list.filter((x) => x.user_answer).length;
  const correct = list.filter((x) => x.is_correct).length;
  return {
    list,
    total,
    correct,
    wrong: answered - correct,
    unanswered: total - answered,
  };
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
  submitExamAnswers,
  toggleFavorite,
  favoritesList,
  wrongList,
  markMastered,
  practiceQuestions,
  nextPracticeQuestion,
  practiceRecords,
  deletePracticeRecords,
  examReport,
};
