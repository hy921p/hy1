/**
 * 题库控制器（阶段3 §7.11）
 * 四入口 + 九题型：列表/搜索/题型/来源/热点/真题/详情/答题/错题/收藏/练习
 */
const { success, paginated } = require('../utils/response');
const questionBankService = require('../services/questionBankService');
const recommendationService = require('../services/recommendationService');

const PAGE = (v) => Math.max(1, Number(v) || 1);
const PAGE_SIZE = (v) => Math.min(50, Math.max(1, Number(v) || 10));

/** GET /api/v1/questions（可选鉴权，三级回退列表） */
async function list(req, res, next) {
  try {
    const page = PAGE(req.query.page);
    const pageSize = PAGE_SIZE(req.query.pageSize);
    const { position, region } = recommendationService.resolvePositionRegion(req.user, req.query);
    const data = await questionBankService.listQuestions({
      position,
      region,
      category: req.query.category,
      sourceType: req.query.sourceType,
      keyword: req.query.keyword,
      page,
      pageSize,
      sort: req.query.sort || 'latest',
    });
    return paginated(res, { list: data.list, total: data.total, page, pageSize });
  } catch (err) {
    next(err);
  }
}

/** GET /api/v1/questions/search */
async function search(req, res, next) {
  try {
    const page = PAGE(req.query.page);
    const pageSize = PAGE_SIZE(req.query.pageSize);
    const data = await questionBankService.searchQuestions({
      keyword: req.query.keyword,
      page,
      pageSize,
    });
    return paginated(res, { list: data.list, total: data.total, page, pageSize });
  } catch (err) {
    next(err);
  }
}

/** GET /api/v1/questions/categories（九大题型 + 数量） */
async function categories(req, res, next) {
  try {
    const data = await questionBankService.getCategories();
    return success(res, data, 'success');
  } catch (err) {
    next(err);
  }
}

/** GET /api/v1/questions/source-types（四入口） */
async function sourceTypes(req, res, next) {
  try {
    const data = await questionBankService.getSourceTypes();
    return success(res, data, 'success');
  } catch (err) {
    next(err);
  }
}

/** GET /api/v1/questions/hot（今日推荐） */
async function hotList(req, res, next) {
  try {
    const { position, region } = recommendationService.resolvePositionRegion(req.user, req.query);
    const data = await questionBankService.hotList({ position, region });
    return success(res, data, 'success');
  } catch (err) {
    next(err);
  }
}

/** GET /api/v1/questions/real（真题/模拟试卷分页；按年份前端整组展示，允许一次拉全） */
async function realList(req, res, next) {
  try {
    const page = PAGE(req.query.page);
    const pageSize = Math.min(500, Math.max(1, Number(req.query.pageSize) || 50));
    const { position, region } = recommendationService.resolvePositionRegion(req.user, req.query);
    const data = await questionBankService.realList({
      position, region, page, pageSize,
      year: req.query.year,
      sourceType: req.query.sourceType || 'real',
    });
    return paginated(res, { list: data.list, total: data.total, page, pageSize });
  } catch (err) {
    next(err);
  }
}

/** GET /api/v1/questions/:id（详情，登录返回 isFavorite） */
async function detail(req, res, next) {
  try {
    const data = await questionBankService.getQuestionDetail(req.user ? req.user.id : null, Number(req.params.id));
    return success(res, data, 'success');
  } catch (err) {
    next(err);
  }
}

/** POST /api/v1/questions/exam-submit（模拟考批量交卷） */
async function examSubmit(req, res, next) {
  try {
    const data = await questionBankService.submitExamAnswers(req.user.id, {
      year: req.body.year,
      answers: req.body.answers,
      startedAt: req.body.startedAt,
    });
    return success(res, data, 'success');
  } catch (err) {
    next(err);
  }
}

/** POST /api/v1/questions/:id/submit（提交作答） */
async function submit(req, res, next) {
  try {
    const data = await questionBankService.submitAnswer(req.user.id, {
      questionId: Number(req.params.id),
      userAnswer: req.body.userAnswer,
      isCorrect: !!req.body.isCorrect,
      answerTime: req.body.answerTime,
    });
    return success(res, data, 'success');
  } catch (err) {
    next(err);
  }
}

/** POST /api/v1/questions/:id/favorite（收藏切换） */
async function toggleFavorite(req, res, next) {
  try {
    const data = await questionBankService.toggleFavorite(req.user.id, Number(req.params.id));
    return success(res, data, 'success');
  } catch (err) {
    next(err);
  }
}

/** GET /api/v1/questions/favorites（收藏列表） */
async function favorites(req, res, next) {
  try {
    const page = PAGE(req.query.page);
    const pageSize = PAGE_SIZE(req.query.pageSize);
    const data = await questionBankService.favoritesList(req.user.id, { page, pageSize });
    return paginated(res, { list: data.list, total: data.total, page, pageSize });
  } catch (err) {
    next(err);
  }
}

/** GET /api/v1/questions/wrong（错题本：考点/出错频次/关键词/来源分组筛选） */
async function wrongList(req, res, next) {
  try {
    const page = PAGE(req.query.page);
    const pageSize = PAGE_SIZE(req.query.pageSize);
    const category = req.query.category ? String(req.query.category) : undefined;
    const wrongCount = req.query.wrongCount === undefined ? undefined : Number(req.query.wrongCount);
    const keyword = req.query.keyword ? String(req.query.keyword).trim() : undefined;
    const group = ['real', 'mock', 'today'].includes(req.query.group) ? req.query.group : undefined;
    const { position, region } = recommendationService.resolvePositionRegion(req.user, req.query);
    const data = await questionBankService.wrongList(req.user.id, {
      page,
      pageSize,
      category,
      wrongCount,
      keyword,
      group,
      position,
      region,
    });
    return paginated(res, {
      list: data.list,
      total: data.total,
      page,
      pageSize,
      categories: data.categories,
      counts: data.counts,
    });
  } catch (err) {
    next(err);
  }
}

/** GET /api/v1/questions/practice-records（做题记录：按年份聚合） */
async function practiceRecords(req, res, next) {
  try {
    const list = await questionBankService.practiceRecords(req.user.id);
    return success(res, { list }, 'success');
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/v1/questions/practice-records（删除某年某类型整卷做题记录） */
async function deletePracticeRecords(req, res, next) {
  try {
    const data = await questionBankService.deletePracticeRecords(req.user.id, {
      year: req.body.year,
      sourceType: req.body.sourceType,
    });
    return success(res, data, 'success');
  } catch (err) {
    next(err);
  }
}

/** GET /api/v1/questions/exam-report（成绩单：某年真题/模拟试卷全卷回顾） */
async function examReport(req, res, next) {
  try {
    const data = await questionBankService.examReport(req.user.id, {
      year: req.query.year,
      sourceType: req.query.sourceType || 'real',
    });
    return success(res, data, 'success');
  } catch (err) {
    next(err);
  }
}

/** PUT /api/v1/questions/wrong/:id/mastered（标记已掌握，id=题目ID） */
async function markMastered(req, res, next) {
  try {
    const data = await questionBankService.markMastered(req.user.id, Number(req.params.id));
    return success(res, data, 'success');
  } catch (err) {
    next(err);
  }
}

/** GET /api/v1/questions/practice（随机练习） */
async function practice(req, res, next) {
  try {
    const { position, region } = recommendationService.resolvePositionRegion(req.user, req.query);
    const data = await questionBankService.practiceQuestions({
      position,
      region,
      limit: Number(req.query.limit) || 10,
    });
    return success(res, data, 'success');
  } catch (err) {
    next(err);
  }
}

/** GET /api/v1/questions/next（再练一题：排除本次已练题目后换下一道） */
async function nextQuestion(req, res, next) {
  try {
    const { position, region } = recommendationService.resolvePositionRegion(req.user, req.query);
    const exclude = String(req.query.exclude || '')
      .split(',')
      .map(Number)
      .filter(Boolean);
    const data = await questionBankService.nextPracticeQuestion({ position, region, exclude });
    return success(res, data, 'success');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  list,
  search,
  categories,
  sourceTypes,
  hotList,
  realList,
  detail,
  submit,
  examSubmit,
  toggleFavorite,
  favorites,
  wrongList,
  markMastered,
  practice,
  nextQuestion,
  practiceRecords,
  deletePracticeRecords,
  examReport,
};
