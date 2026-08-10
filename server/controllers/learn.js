/**
 * 智学控制器（阶段3 §7.15）
 * 晨读/素材/通识/课程/笔记/AI 摘要/学习进度
 */
const { success, paginated } = require('../utils/response');
const learnService = require('../services/learnService');
const recommendationService = require('../services/recommendationService');

const PAGE = (v) => Math.max(1, Number(v) || 1);
const PAGE_SIZE = (v) => Math.min(50, Math.max(1, Number(v) || 10));

function posReg(req) {
  return recommendationService.resolvePositionRegion(req.user, req.query);
}

/** GET /api/v1/learn/readings（可选鉴权） */
async function readings(req, res, next) {
  try {
    const page = PAGE(req.query.page);
    const pageSize = PAGE_SIZE(req.query.pageSize);
    const { position, region } = posReg(req);
    const data = await learnService.listReadings({ position, region, page, pageSize });
    return paginated(res, { list: data.list, total: data.total, page, pageSize });
  } catch (err) { next(err); }
}

/** GET /api/v1/learn/readings/stats（需登录） */
async function readingStats(req, res, next) {
  try {
    const data = await learnService.readingStats(req.user.id);
    return success(res, data, 'success');
  } catch (err) { next(err); }
}

/** GET /api/v1/learn/readings/:id（可选鉴权，登录记已读） */
async function readingDetail(req, res, next) {
  try {
    const data = await learnService.readingDetail(req.user ? req.user.id : null, Number(req.params.id));
    return success(res, data, 'success');
  } catch (err) { next(err); }
}

/** GET /api/v1/learn/materials（type 可选） */
async function materials(req, res, next) {
  try {
    const page = PAGE(req.query.page);
    const pageSize = PAGE_SIZE(req.query.pageSize);
    const { position } = posReg(req);
    const data = await learnService.listMaterials({ position, type: req.query.type, page, pageSize });
    return paginated(res, { list: data.list, total: data.total, page, pageSize });
  } catch (err) { next(err); }
}

/** GET /api/v1/learn/basics */
async function basics(req, res, next) {
  try {
    const page = PAGE(req.query.page);
    const pageSize = PAGE_SIZE(req.query.pageSize);
    const { position } = posReg(req);
    const data = await learnService.listBasics({ position, page, pageSize });
    return paginated(res, { list: data.list, total: data.total, page, pageSize });
  } catch (err) { next(err); }
}

/** GET /api/v1/learn/courses */
async function courses(req, res, next) {
  try {
    const page = PAGE(req.query.page);
    const pageSize = PAGE_SIZE(req.query.pageSize);
    const { position } = posReg(req);
    const data = await learnService.listCourses({ position, page, pageSize });
    return paginated(res, { list: data.list, total: data.total, page, pageSize });
  } catch (err) { next(err); }
}

/** GET /api/v1/learn/notes（sourceType 可选） */
async function notes(req, res, next) {
  try {
    const page = PAGE(req.query.page);
    const pageSize = PAGE_SIZE(req.query.pageSize);
    const data = await learnService.listNotes(req.user.id, { sourceType: req.query.sourceType, page, pageSize });
    return paginated(res, { list: data.list, total: data.total, page, pageSize });
  } catch (err) { next(err); }
}

/** POST /api/v1/learn/notes */
async function createNote(req, res, next) {
  try {
    const data = await learnService.createNote(req.user.id, {
      title: req.body.title,
      content: req.body.content,
      sourceType: req.body.sourceType,
      sourceId: req.body.sourceId,
      sourceTitle: req.body.sourceTitle,
    });
    return success(res, data, '笔记已创建');
  } catch (err) { next(err); }
}

/** PUT /api/v1/learn/notes/:id */
async function updateNote(req, res, next) {
  try {
    const data = await learnService.updateNote(req.user.id, Number(req.params.id), {
      title: req.body.title,
      content: req.body.content,
    });
    return success(res, data, '笔记已更新');
  } catch (err) { next(err); }
}

/** DELETE /api/v1/learn/notes/:id */
async function deleteNote(req, res, next) {
  try {
    const data = await learnService.deleteNote(req.user.id, Number(req.params.id));
    return success(res, data, '笔记已删除');
  } catch (err) { next(err); }
}

/** POST /api/v1/learn/ai-summary（限流） */
async function aiSummary(req, res, next) {
  try {
    const data = await learnService.aiSummary(req.user.id, {
      content: req.body.content,
      sourceType: req.body.sourceType,
      sourceId: req.body.sourceId,
      sourceTitle: req.body.sourceTitle,
      saveToNote: !!req.body.saveToNote,
    });
    return success(res, data, 'AI 摘要已生成');
  } catch (err) { next(err); }
}

/** POST /api/v1/learn/notes/:id/ai-summary（对笔记生成摘要回写，限流） */
async function summarizeNote(req, res, next) {
  try {
    const data = await learnService.summarizeNote(req.user.id, Number(req.params.id));
    return success(res, data, '笔记 AI 摘要已回写');
  } catch (err) { next(err); }
}

/** GET /api/v1/learn/progress（需登录） */
async function progress(req, res, next) {
  try {
    const data = await learnService.progress(req.user.id);
    return success(res, data, 'success');
  } catch (err) { next(err); }
}

module.exports = {
  readings,
  readingStats,
  readingDetail,
  materials,
  basics,
  courses,
  notes,
  createNote,
  updateNote,
  deleteNote,
  aiSummary,
  summarizeNote,
  progress,
};
