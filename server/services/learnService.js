/**
 * 智学服务（阶段3 §7.15 / §5.17-5.18）
 * 晨读/素材/通识/课程列表、晨读详情（登录记已读）、笔记 CRUD、
 * AI 摘要（ai_summary:20 + 可选存笔记）、学习进度聚合。
 */
const AppError = require('../utils/app-error');
const aiService = require('./aiService');
const growthService = require('./growthService');
const badgeService = require('./badgeService');
const { query } = require('../models');
const User = require('../models/user');
const userProgressModel = require('../models/userProgress');
const { readingModel, materialModel, basicModel, courseModel, noteModel } = require('../models/learn');

/** 晨读列表（分页，三级回退） */
async function listReadings({ position, region, page, pageSize }) {
  return readingModel.list({ position, region, page, pageSize });
}

/** 素材列表（type 可选：金句/案例/名言） */
async function listMaterials({ position, type, page, pageSize }) {
  return materialModel.list({ position, type, page, pageSize });
}

/** 通识列表 */
async function listBasics({ position, page, pageSize }) {
  return basicModel.list({ position, page, pageSize });
}

/** 课程列表 */
async function listCourses({ position, page, pageSize }) {
  return courseModel.list({ position, page, pageSize });
}

/** 晨读详情（登录则记已读，幂等） */
async function readingDetail(userId, id) {
  const r = await readingModel.findById(id);
  if (!r) throw new AppError(1002, '晨读内容不存在');
  if (userId) {
    try {
      await userProgressModel.insertCompleted(userId, 'reading', id, 100);
    } catch (e) {
      if (!(e && e.code === 'ER_DUP_ENTRY')) throw e;
    }
  }
  return {
    id: r.id,
    title: r.title,
    position: r.position,
    region: r.region,
    summary: r.summary,
    content: r.content,
    cover: r.cover,
    publishDate: r.publish_date,
    isHot: !!r.is_hot,
  };
}

function fmtDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 晨读统计：已读总数 + 连续天数（锚点今天或昨天向前逐日计数） */
async function readingStats(userId) {
  const rows = await readingModel.readDates(userId);
  const dateSet = new Set(rows.map((r) => fmtDate(r.d)));
  const today = new Date();
  let cursor = dateSet.has(fmtDate(today)) ? today : new Date(today.getTime() - 86400000);
  let streak = 0;
  while (dateSet.has(fmtDate(cursor))) {
    streak += 1;
    cursor = new Date(cursor.getTime() - 86400000);
  }
  return { totalRead: dateSet.size, streak };
}

/** 笔记列表（sourceType 可选：manual/ai_summary） */
async function listNotes(userId, { sourceType, page, pageSize }) {
  return noteModel.listByUser(userId, { sourceType, page, pageSize });
}

/** 新建笔记（手写，note 规则 0 分不加成长值） */
async function createNote(userId, { title, content, sourceType, sourceId, sourceTitle }) {
  const text = content == null ? '' : String(content).trim();
  if (!text) throw new AppError(1001, '笔记内容不能为空');
  const noteId = await noteModel.create({
    userId,
    title: title || '无标题笔记',
    content: text,
    sourceType,
    sourceId,
    sourceTitle,
    isAiSummary: 0,
  });
  return { noteId };
}

/** 更新笔记（仅本人） */
async function updateNote(userId, noteId, { title, content }) {
  const note = await noteModel.findById(noteId);
  if (!note) throw new AppError(1002, '笔记不存在');
  if (note.user_id !== userId) throw new AppError(2002, '无权操作他人笔记');
  const affected = await noteModel.update(noteId, userId, { title, content });
  if (!affected) throw new AppError(1002, '笔记不存在');
  return { updated: true };
}

/** 删除笔记（仅本人） */
async function deleteNote(userId, noteId) {
  const note = await noteModel.findById(noteId);
  if (!note) throw new AppError(1002, '笔记不存在');
  if (note.user_id !== userId) throw new AppError(2002, '无权操作他人笔记');
  const affected = await noteModel.remove(noteId, userId);
  if (!affected) throw new AppError(1002, '笔记不存在');
  return { deleted: true };
}

/**
 * AI 摘要（§7.15）
 * chatJSON 强制 {summary} → 成长值 ai_summary:20 → 可选存为 ai_summary 笔记 → 勋章重判。
 */
async function aiSummary(userId, { content, sourceType, sourceId, sourceTitle, saveToNote }) {
  const text = content == null ? '' : String(content).trim();
  if (!text) throw new AppError(1001, '内容不能为空');
  const summary = await generateSummary(text);
  await growthService.grant(userId, 'ai_summary', null, 'AI 摘要生成奖励');
  let noteId = null;
  if (saveToNote) {
    noteId = await noteModel.create({
      userId,
      title: sourceTitle || 'AI 摘要笔记',
      content: summary,
      sourceType: 'ai_summary',
      sourceId: sourceId || null,
      sourceTitle: sourceTitle || null,
      isAiSummary: 1,
    });
  }
  await badgeService.checkAndGrant(userId);
  return { summary, noteId };
}

/** 对已有笔记生成 AI 摘要并回写追加（仅本人，不重复加分） */
async function summarizeNote(userId, noteId) {
  const note = await noteModel.findById(noteId);
  if (!note) throw new AppError(1002, '笔记不存在');
  if (note.user_id !== userId) throw new AppError(2002, '无权操作他人笔记');
  const summary = await generateSummary(note.content);
  await noteModel.appendAiSummary(noteId, summary);
  return { noteId, summary };
}

/** 调用 chatJSON 强制 {summary}（失败抛 5000） */
async function generateSummary(text) {
  const result = await aiService.chatJSON(
    [
      {
        role: 'system',
        content:
          '你是一名学习助手。请把用户输入的内容提炼为结构化学习摘要，保留关键信息与要点。必须返回 JSON，格式为 {"summary":"摘要内容"}。',
      },
      { role: 'user', content: text },
    ],
    { temperature: 0.3, timeout: 60000 },
  );
  const summary = result && result.summary ? String(result.summary).trim() : '';
  if (!summary) throw new AppError(5000, 'AI 摘要生成失败，请重试', 502);
  return summary;
}

/** 学习进度聚合（user_progress 按 type + 成长总点数） */
async function progress(userId) {
  const rows = await query(
    'SELECT type, COUNT(*) AS count FROM user_progress WHERE user_id = ? AND progress >= 100 GROUP BY type',
    [userId],
  );
  const agg = { reading: 0, question: 0, course: 0, interview: 0, studyPlan: 0 };
  for (const r of rows) {
    const t = r.type;
    if (t in agg) agg[t] = r.count;
  }
  const user = await User.findById(userId);
  return { ...agg, totalPoints: user ? user.growth_points : 0 };
}

module.exports = {
  listReadings,
  listMaterials,
  listBasics,
  listCourses,
  readingDetail,
  readingStats,
  listNotes,
  createNote,
  updateNote,
  deleteNote,
  aiSummary,
  summarizeNote,
  progress,
};
