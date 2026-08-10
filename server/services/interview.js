/**
 * 面试业务服务（V1.0 规则编排）
 * 创建面试（场景/题目匹配 §5.7）→ 每轮消息（SSE 流式）→ 结束生成报告（多维评分）
 * 状态约定（interview_sessions.status）：0未开始 1进行中 2暂停 3已完成 4中断
 */
const config = require('../config');
const AppError = require('../utils/app-error');
const logger = require('../utils/logger');
const aiService = require('./aiService');
const User = require('../models/user');
const growthService = require('./growthService');
const badgeService = require('./badgeService');
const {
  sessionModel, messageModel, reportModel, questionModel, scenarioModel,
} = require('../models/interview');
const agentToolLogModel = require('../models/agentTool');

const DEFAULT_POSITION = '公务员';
const DEFAULT_REGION = '四川';
const DEFAULT_TOTAL = 3; // demo 验收：真人对话 3 轮

// 评分维度（文档留白，自定 6 维）
const SCORE_DIMENSIONS = [
  '综合分析能力', '逻辑条理', '语言表达', '岗位匹配', '应急应变', '学习与改进',
];

/** 解析 question_plan（mysql2 可能返回字符串或对象） */
function parsePlan(raw) {
  if (!raw) return [];
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch (e) { return []; }
  }
  return Array.isArray(raw) ? raw : [];
}

/**
 * 创建面试：匹配场景 → 按 §5.7 出题 → 建 session
 * @returns {Promise<{sessionId:number, scenarioName:string, totalQuestions:number, position:string, region:string}>}
 */
async function createInterview(userId, { position, region, totalQuestions } = {}) {
  const pos = (position || DEFAULT_POSITION).trim();
  const reg = (region || DEFAULT_REGION).trim();
  const total = Math.min(Math.max(parseInt(totalQuestions, 10) || DEFAULT_TOTAL, 1), 10);

  const scenario = await scenarioModel.match(pos);
  if (!scenario) throw new AppError(3001, '暂无匹配的面试场景，请稍后再试', 404);

  const questions = await questionModel.match(pos, reg, total);
  if (!questions.length) throw new AppError(3001, '暂无匹配的面试题目，请稍后再试', 404);

  const plan = questions.slice(0, total).map((q) => ({
    questionId: q.id,
    content: q.content,
    detail: q.detail || null,
    category: q.category,
    position: q.position,
    region: q.region,
    referenceAnswer: q.reference_answer || null, // Agent next_question 工具带参考要点
  }));

  // Agent 面试官启用时新建会话标记 mode=1（信息性，不参与流程分支）
  const sessionId = await sessionModel.create({
    userId, scenarioId: scenario.id, scenarioName: scenario.name,
    mode: config.ai.agent.enabled ? 1 : 0, totalQuestions: plan.length, position: pos, region: reg, questionPlan: plan,
  });

  return { sessionId, scenarioName: scenario.name, totalQuestions: plan.length, position: pos, region: reg };
}

async function listInterviews(userId, page, pageSize) {
  return sessionModel.findByUser(userId, { page, pageSize });
}

async function getSession(sessionId, userId) {
  const session = await sessionModel.findById(sessionId);
  if (!session) throw new AppError(3001, '面试不存在', 404);
  if (Number(session.user_id) !== Number(userId)) throw new AppError(2001, '无权访问该面试', 403);
  return session;
}

/** 组装面试官 system prompt（不泄露题目列表，题目按轮注入） */
function buildInterviewSystem(scenario, session) {
  const persona =
    (scenario && scenario.system_prompt) ||
    '你是一位专业、亲切的 AI 模拟面试官，擅长结构化面试，点评具体且有建设性。';
  return [
    persona,
    `正在为求职者进行「${session.position || DEFAULT_POSITION} · ${session.region || DEFAULT_REGION}」岗位的模拟面试。`,
    '请用自然、专业、温暖的中文对答；点评要简短具体；不要一次性抛出多个问题。',
  ].join('\n');
}

/**
 * 准备一轮消息：组装 DeepSeek messages 与轮次元信息
 * @returns {Promise<{messages:Array, currentIndex:number, nextIndex:number, isOpening:boolean, isWrapUp:boolean, hasNext:boolean, questionIndex:number}>}
 */
async function prepareTurn(session, transcript, answer) {
  const plan = parsePlan(session.question_plan);
  const currentIndex = session.current_index || 0;
  const isOpening = currentIndex === 0;
  const isWrapUp = currentIndex >= plan.length;
  const hasNext = !isWrapUp;
  const questionIndex = Math.min(currentIndex, Math.max(plan.length - 1, 0));

  const scenario = await scenarioModel.findById(session.scenario_id);
  const system = buildInterviewSystem(scenario, session);

  const messages = [{ role: 'system', content: system }];
  for (const m of transcript) {
    messages.push({ role: m.role === 2 ? 'user' : 'assistant', content: m.content });
  }

  let instruction;
  if (isOpening) {
    instruction = '面试开始。请以面试官身份做一句简洁的开场白，然后抛出第 1 道题：' + plan[0].content;
  } else if (isWrapUp) {
    instruction =
      '这是最后一题的作答。请先对作答做简短点评（2-3 句），然后给出面试收尾语（总结整体表现、表达鼓励、告知即将生成面试报告），不要提问。';
  } else {
    instruction =
      `请先对求职者上一题的作答做简短、专业的点评（2-3 句），然后抛出第 ${currentIndex + 1} 道题：` + plan[currentIndex].content;
  }

  // 当前轮的用户作答必须进入 LLM 上下文，否则 AI 只会点评上一轮
  const answerTrimmed = (answer || '').trim();
  if (answerTrimmed) {
    messages.push({ role: 'user', content: answerTrimmed });
  }
  // 追加指令并避免连续两个 user 消息
  const last = messages[messages.length - 1];
  if (last && last.role === 'user') {
    last.content += '\n\n' + instruction;
  } else {
    messages.push({ role: 'user', content: instruction });
  }

  return {
    messages, currentIndex, nextIndex: isWrapUp ? currentIndex : currentIndex + 1,
    isOpening, isWrapUp, hasNext, questionIndex, plan,
  };
}

/**
 * 落库一轮（用户作答 + AI 回复原子写入，成功后推进 current_index）
 */
async function commitTurn(session, answer, aiContent, turn) {
  const trimmed = (answer || '').trim();
  if (trimmed) {
    await messageModel.insert({
      sessionId: session.id, role: 2, content: trimmed,
      questionIndex: Math.max(turn.currentIndex - 1, 0), roundIndex: 1,
    });
  }
  await messageModel.insert({
    sessionId: session.id, role: 1, content: aiContent,
    questionIndex: turn.questionIndex, roundIndex: 1,
  });
  // V1.0 每轮 +1；Agent 模式由 turn.nextIndex 决定（仅 next_question/finish_interview 时推进）
  const nextIndex = turn.nextIndex != null ? turn.nextIndex : (turn.isWrapUp ? turn.currentIndex : turn.currentIndex + 1);
  await sessionModel.update(session.id, { current_index: nextIndex });
}

/**
 * 结束面试：校验完成 → DeepSeek 六维评分 → 写报告 + 更新 session
 */
async function endInterview(sessionId, userId) {
  const session = await getSession(sessionId, userId);
  if (session.status !== 1) {
    const existing = await reportModel.findBySession(sessionId);
    if (existing) return existing;
    throw new AppError(3001, '面试不在进行中', 400);
  }

  const plan = parsePlan(session.question_plan);
  const transcript = await messageModel.findBySession(sessionId);
  const userAnswers = transcript.filter((m) => m.role === 2);
  if (userAnswers.length < plan.length) {
    throw new AppError(3001, `面试尚未完成（已完成 ${userAnswers.length}/${plan.length} 题），不能生成报告`, 400);
  }

  const scenario = await scenarioModel.findById(session.scenario_id);
  const messages = [
    { role: 'system', content: buildEvalSystem(session, scenario) },
    { role: 'user', content: buildEvalTranscript(session, plan, transcript) },
  ];
  const raw = await aiService.chatJSON(messages, { timeout: 90000, temperature: 0.3 });

  const report = normalizeReport(raw, session, plan, transcript, userId);
  // Agent 模式：把逐轮 score_answer 的 tool_scores 合并进逐题点评（兼容 V1.0 报告结构）
  if (config.ai.agent.enabled) {
    await mergeToolScores(report, sessionId);
  }
  await reportModel.create(report);
  await sessionModel.update(session.id, {
    status: 3,
    score: Math.round(report.totalScore),
    finished_at: new Date(),
  });

  // 成长闭环：面试次数 + 平均分、成长值、首次面试勋章（阶段2）
  await User.incInterview(userId, report.totalScore);
  await growthService.grant(userId, 'interview', null, `完成第 ${userAnswers.length} 题模拟面试`);
  await badgeService.checkAndGrant(userId);

  return reportModel.findBySession(sessionId);
}

async function getReport(sessionId, userId) {
  const session = await getSession(sessionId, userId);
  const report = await reportModel.findBySession(sessionId);
  if (!report) throw new AppError(3001, '报告尚未生成', 404);
  return report;
}

function buildEvalSystem(session, scenario) {
  const persona =
    (scenario && scenario.system_prompt) ||
    '你是一位资深结构化面试考官，评分客观、点评专业。';
  return [
    persona,
    `请为「${session.position || DEFAULT_POSITION} · ${session.region || DEFAULT_REGION}」岗位的模拟面试作答进行多维评分。`,
    `评分维度（每项 0-100 整数）：${SCORE_DIMENSIONS.join('、')}。`,
    '必须严格按以下 JSON 结构输出，不要输出任何其它内容：',
    JSON.stringify({
      total_score: 0,
      dimension_scores: Object.fromEntries(SCORE_DIMENSIONS.map((d) => [d, 0])),
      highlights: ['优点1', '优点2'],
      improvements: ['建议1', '建议2'],
      per_question: [{ index: 0, score: 0, comment: '本题点评' }],
    }),
    'total_score 为 0-100 的加权总分；per_question 与题目逐一对应（index 从 0 开始）。',
  ].join('\n');
}

function buildEvalTranscript(session, plan, transcript) {
  const lines = [`岗位：${session.position}，地区：${session.region}，共 ${plan.length} 题。`];
  plan.forEach((p, i) => { lines.push(`${i + 1}. 【题目】${p.content}`); });
  lines.push('');
  lines.push('【面试实录】');
  for (const m of transcript) {
    const who = m.role === 2 ? '求职者' : '面试官';
    lines.push(`${who}：${m.content}`);
  }
  return lines.join('\n');
}

/** Agent 模式：聚合每轮 score_answer 的 tool_scores → per_question 附 agentScore/agentComment */
async function mergeToolScores(report, sessionId) {
  try {
    const toolScores = await agentToolLogModel.getScoresBySession(sessionId);
    if (!toolScores.length) return;
    const byIndex = new Map(toolScores.map((t) => [t.questionIndex, t]));
    report.perQuestion = report.perQuestion.map((pq, i) => {
      const t = byIndex.get(i);
      return t ? { ...pq, agentScore: t.totalScore, agentComment: t.comment } : pq;
    });
  } catch (e) {
    // 报告生成不受工具分数聚合失败影响
    logger.error('tool_scores 合并失败:', e.message);
  }
}

function num(value, fallback) {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

/** 清洗/兜底 AI 评分 JSON */
function normalizeReport(raw, session, plan, transcript, userId) {
  const rawDims = (raw && raw.dimension_scores) || {};
  const dimensions = {};
  for (const name of SCORE_DIMENSIONS) {
    const v = clamp(Math.round(num(rawDims[name], 60)), 0, 100);
    dimensions[name] = v;
  }

  const totalScore = clamp(Math.round(num(raw.total_score,
    Math.round(Object.values(dimensions).reduce((a, b) => a + b, 0) / dimensions.length)), 0), 0, 100);

  const highlights = Array.isArray(raw.highlights) && raw.highlights.length
    ? raw.highlights.map(String).slice(0, 5)
    : ['作答思路清晰，态度积极端正'];
  const improvements = Array.isArray(raw.improvements) && raw.improvements.length
    ? raw.improvements.map(String).slice(0, 5)
    : ['可进一步积累岗位相关的政策与案例素材'];

  // 逐题回顾：题目 × 用户作答 × AI 评分
  const answers = transcript.filter((m) => m.role === 2).map((m) => m.content);
  const rawPer = Array.isArray(raw.per_question) ? raw.per_question : [];
  const perQuestion = plan.map((p, i) => ({
    index: i,
    question: p.content,
    category: p.category || null,
    answer: answers[i] || '',
    score: clamp(Math.round(num(rawPer[i] && rawPer[i].score, 60)), 0, 100),
    comment: (rawPer[i] && rawPer[i].comment) || '（未生成点评）',
  }));

  return {
    sessionId: session.id,
    userId,
    totalScore,
    dimensions,
    highlights,
    improvements,
    perQuestion,
  };
}

module.exports = {
  SCORE_DIMENSIONS,
  DEFAULT_POSITION,
  DEFAULT_REGION,
  createInterview,
  listInterviews,
  getSession,
  prepareTurn,
  commitTurn,
  endInterview,
  getReport,
};
