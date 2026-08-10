/**
 * AI 答疑控制器（阶段3 §7.14）
 * ask（限流）/context（检索不限流）/答疑记录 CRUD
 */
const { success, paginated } = require('../utils/response');
const aiAnswerService = require('../services/aiAnswerService');

const PAGE = (v) => Math.max(1, Number(v) || 1);
const PAGE_SIZE = (v) => Math.min(50, Math.max(1, Number(v) || 10));

/** POST /api/v1/ai/ask（需登录 + 限流） */
async function ask(req, res, next) {
  try {
    const data = await aiAnswerService.ask(req.user.id, {
      question: req.body.question,
      entry: req.body.entry,
      refType: req.body.refType,
      refId: req.body.refId,
    });
    return success(res, data, 'AI 答疑完成');
  } catch (err) { next(err); }
}

/** GET /api/v1/ai/context（可选鉴权，仅检索不耗 LLM） */
async function context(req, res, next) {
  try {
    const data = await aiAnswerService.context(req.query.question, {
      position: req.query.position,
      region: req.query.region,
    });
    return success(res, data, 'success');
  } catch (err) { next(err); }
}

/** GET /api/v1/ai/answers（需登录，本人记录） */
async function listAnswers(req, res, next) {
  try {
    const page = PAGE(req.query.page);
    const pageSize = PAGE_SIZE(req.query.pageSize);
    const data = await aiAnswerService.listAnswers(req.user.id, { page, pageSize });
    return paginated(res, { list: data.list, total: data.total, page, pageSize });
  } catch (err) { next(err); }
}

/** GET /api/v1/ai/answers/:id（需登录，仅本人） */
async function answerDetail(req, res, next) {
  try {
    const data = await aiAnswerService.getAnswer(req.user.id, Number(req.params.id));
    return success(res, data, 'success');
  } catch (err) { next(err); }
}

/** DELETE /api/v1/ai/answers/:id（需登录，仅本人） */
async function deleteAnswer(req, res, next) {
  try {
    const data = await aiAnswerService.deleteAnswer(req.user.id, Number(req.params.id));
    return success(res, data, '已删除');
  } catch (err) { next(err); }
}

module.exports = { ask, context, listAnswers, answerDetail, deleteAnswer };
