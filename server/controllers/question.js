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

/** GET /api/v1/questions/real（真题分页） */
async function realList(req, res, next) {
  try {
    const page = PAGE(req.query.page);
    const pageSize = PAGE_SIZE(req.query.pageSize);
    const { position, region } = recommendationService.resolvePositionRegion(req.user, req.query);
    const data = await questionBankService.realList({ position, region, page, pageSize });
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

/** GET /api/v1/questions/wrong（错题本） */
async function wrongList(req, res, next) {
  try {
    const page = PAGE(req.query.page);
    const pageSize = PAGE_SIZE(req.query.pageSize);
    const data = await questionBankService.wrongList(req.user.id, { page, pageSize });
    return paginated(res, { list: data.list, total: data.total, page, pageSize });
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

module.exports = {
  list,
  search,
  categories,
  sourceTypes,
  hotList,
  realList,
  detail,
  submit,
  toggleFavorite,
  favorites,
  wrongList,
  markMastered,
  practice,
};
