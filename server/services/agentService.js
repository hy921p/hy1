/**
 * V2.0 Agent 面试官服务（技术文档 §10.3）
 * runTurn：一轮消息 = 工具调用循环（OpenAI function-calling）
 *   1) 组装 system（面试官角色 + 岗位/地区 + 当前题目 + 调用策略）+ 历史 + 当前作答
 *   2) LLM 返回 tool_calls → 白名单校验 → 执行 → 以 tool role 回填 → 再次入 LLM
 *   3) 无 tool_calls → 返回最终文本；单轮最多 config.ai.agent.maxToolCalls 次工具轮次
 * 每次工具调用写 agent_tool_logs（fail-open）；任一处抛错由 controller 回退 V1.0 规则编排。
 *
 * 与 V1.0 的兼容点：
 * - turn 形状对齐 prepareTurn（currentIndex/nextIndex/isOpening/isWrapUp/hasNext/questionIndex/plan）
 * - 推进 current_index 只在调用 next_question/finish_interview 时发生（与 V1.0 每轮 +1 不同）
 */
const config = require('../config');
const aiService = require('./aiService');
const ragService = require('./ragService');
const agentToolLogModel = require('../models/agentTool');
const logger = require('../utils/logger');
const { SCORE_DIMENSIONS, DEFAULT_POSITION, DEFAULT_REGION } = require('./interview');

/** 解析 question_plan（mysql2 可能返回字符串或对象） */
function parsePlan(raw) {
  if (!raw) return [];
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch (e) { return []; }
  }
  return Array.isArray(raw) ? raw : [];
}

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

/** 工具参数若被 LLM 乱传，解析失败则置空对象 */
function parseArgs(raw) {
  if (!raw) return {};
  try { return JSON.parse(raw); } catch (e) { return {}; }
}

/** 结果摘要入库：是 JSON 就存对象，否则包一层 {text} */
function safeSummary(summary) {
  if (typeof summary !== 'string') return summary;
  try { return JSON.parse(summary); } catch (e) { return { text: summary.slice(0, 1000) }; }
}

/**
 * 执行一轮 Agent 面试官回复
 * @param {{session:object, transcript:Array, answer:string, onTool?:Function}} params
 * @returns {Promise<{finalText:string, turn:object}>}
 */
async function runTurn({ session, transcript, answer, onTool }) {
  const plan = parsePlan(session.question_plan);
  const currentIndex = session.current_index || 0;
  const isWrapUp = currentIndex >= plan.length;
  const questionIndex = Math.min(currentIndex, Math.max(plan.length - 1, 0));
  const currentQuestion = plan[questionIndex] || null;

  const state = {
    session,
    plan,
    currentIndex,
    currentQuestion,
    toolScores: [],
    nextIndex: null,   // null = 由下方决策规则推算
    wrapUp: false,
    followedUp: false, // 本轮是否发起过追问（追问轮不推进题目）
  };

  const messages = buildMessages(session, transcript, answer, currentQuestion, isWrapUp);
  const tools = await agentToolLogModel.getEnabledTools();
  const enabledKeys = new Set(tools.map((t) => t.function.name));

  const finalText = await runToolLoop({ messages, tools, enabledKeys, state, onTool });

  // 收敛 nextIndex（与 prepareTurn 对齐，供 commitTurn / SSE done 使用）
  // 规则：finish→plan 末尾；显式 next_question→+1；开场/空作答/追问轮→停留；其余→确定性 +1 兜底
  const hasAnswer = !!(answer && String(answer).trim());
  let nextIndex;
  if (state.wrapUp) nextIndex = plan.length;
  else if (state.nextIndex !== null) nextIndex = state.nextIndex;
  else if (isOpening || !hasAnswer) nextIndex = currentIndex;
  else if (state.followedUp) nextIndex = currentIndex;
  else nextIndex = Math.min(currentIndex + 1, plan.length);
  const turn = {
    currentIndex,
    nextIndex,
    isOpening: currentIndex === 0,
    isWrapUp: state.wrapUp,
    hasNext: nextIndex < plan.length,
    questionIndex,
    plan,
  };
  return { finalText, turn };
}

/** 组装 system + 历史 + 当前作答 */
function buildMessages(session, transcript, answer, currentQuestion, isWrapUp) {
  const currentQText = currentQuestion ? currentQuestion.content : '';
  const system = [
    '你是一位资深结构化面试官，专业、亲切、点评具体有建设性。',
    `正在为求职者进行「${session.position || DEFAULT_POSITION} · ${session.region || DEFAULT_REGION}」岗位的模拟面试。`,
    currentQText ? `当前待答题目（第 ${(session.current_index || 0) + 1} 题）：${currentQText}` : '',
    '【工作流程】',
    '1. 开场（第一轮）：一句开场白后直接抛出第 1 题（即上面的题目），不要额外提问。',
    '2. 求职者每轮作答后：先调用 score_answer 对该作答评分（必须）；需要依据或想引经据典时可调用 retrieve_knowledge 检索知识库；',
    '   若作答浅薄、缺少细节或想测试应变，调用 generate_followup 生成 1 个追问并当场追问（本轮不推进到下一题）；',
    '   若作答已充分，务必调用 next_question 获取下一题并在发言中自然过渡（不要替求职者跳到下一题而不调用工具）。',
    '3. 全部题目作答完毕时调用 finish_interview，给出总结收尾语，不再提问。',
    '4. 发言用自然专业的中文，点评简短具体，每次只问一个问题，不要罗列多个问题。',
  ].filter(Boolean).join('\n');

  const messages = [{ role: 'system', content: system }];
  for (const m of transcript) {
    messages.push({ role: m.role === 2 ? 'user' : 'assistant', content: m.content });
  }

  const answerTrimmed = (answer || '').trim();
  if (answerTrimmed) messages.push({ role: 'user', content: answerTrimmed });
  // 保证末尾是 user，避免空作答时模型不知所措
  const last = messages[messages.length - 1];
  if (!last || last.role !== 'user') {
    messages.push({
      role: 'user',
      content: isWrapUp ? '这是最后一题的作答，请点评并收尾。' : '请继续面试。',
    });
  }
  return messages;
}

/** 工具调用循环：最多 maxToolCalls 轮工具执行，最后一次无 tool_calls 的即为最终文本 */
async function runToolLoop({ messages, tools, enabledKeys, state, onTool }) {
  const maxCalls = config.ai.agent.maxToolCalls || 4;
  for (let i = 0; i <= maxCalls; i++) {
    const resp = await aiService.chatWithTools(messages, tools, { temperature: 0.7, timeout: 45000 });
    const toolCalls = resp.toolCalls || [];
    if (!toolCalls.length) {
      return (resp.content || '').trim();
    }
    if (i >= maxCalls) {
      // 到达上限：不再执行工具，直接以当前 content 兜底（内容可能为空）
      return (resp.content || '（本轮处理已完成，请继续作答）').trim();
    }
    for (const tc of toolCalls) {
      const name = tc.name;
      const args = parseArgs(tc.arguments);
      const start = Date.now();
      let summary = '';
      let status = 'success';
      try {
        assertWhitelist(name, enabledKeys);
        summary = await executeTool(name, args, state);
        onTool && onTool({ tool_key: name, status: 'success', latency_ms: Date.now() - start });
      } catch (e) {
        status = 'error';
        summary = `工具调用失败：${e.message}`;
        logger.error(`agent 工具 ${name} 执行失败:`, e.message);
        onTool && onTool({ tool_key: name, status: 'error', latency_ms: Date.now() - start, error: e.message });
      }
      // 日志 fail-open：入库失败不打断流程
      agentToolLogModel.insertLog({
        interviewId: state.session.id,
        userId: state.session.user_id,
        toolKey: name,
        requestPayload: args,
        responseSummary: safeSummary(summary),
        latencyMs: Date.now() - start,
        status,
      }).catch((err) => logger.error('agent_tool_logs 写入失败:', err.message));
      messages.push({ role: 'tool', tool_call_id: tc.id, content: String(summary) });
    }
  }
  return '';
}

/** 白名单校验：必须是已注册工具且当前处于启用状态（admin 停用后即使模型点名也不执行） */
function assertWhitelist(name, enabledKeys) {
  if (!TOOL_IMPLS[name]) {
    throw new Error(`未知工具：${name}`);
  }
  if (enabledKeys && !enabledKeys.has(name)) {
    throw new Error(`工具「${name}」已停用，请直接作答或调用其它可用工具`);
  }
}

async function executeTool(name, args, state) {
  const raw = await TOOL_IMPLS[name](args, state);
  return String(raw);
}

/* ============ 5 工具实现（§10.3.1） ============ */

const TOOL_IMPLS = {
  /** 检索知识库（RAG 复用 Block 1） */
  retrieve_knowledge: async ({ query }, state) => {
    const q = String(query || (state.currentQuestion && state.currentQuestion.content) || '').trim();
    const r = await ragService.search(q, {
      position: state.session.position,
      region: state.session.region,
      topK: 3,
    });
    if (!r.retrieved || !r.citations.length) return '知识库未检索到相关内容。';
    return r.citations.map((c, i) => `[来源${i + 1}]（${c.refType}#${c.refId}）${c.title}\n${c.snippet}`).join('\n');
  },

  /** 逐轮评分：chatJSON 按 6 维评分，聚合进 state.toolScores 供报告 */
  score_answer: async ({ answer }, state) => {
    const q = state.currentQuestion ? state.currentQuestion.content : '';
    const raw = await aiService.chatJSON([
      {
        role: 'system',
        content:
          `你是资深结构化面试考官。请对求职者作答按 6 个维度评分（每项 0-100 整数）：${SCORE_DIMENSIONS.join('、')}。` +
          '只输出 JSON：{"dimension_scores":{"维度":0,...},"total_score":80,"comment":"一句话点评"}',
      },
      { role: 'user', content: `题目：${q}\n作答：${answer || ''}` },
    ], { temperature: 0.3, timeout: 30000 });

    const rawDims = (raw && raw.dimension_scores) || {};
    const dims = {};
    for (const name of SCORE_DIMENSIONS) {
      const n = parseFloat(rawDims[name]);
      dims[name] = clamp(Math.round(Number.isFinite(n) ? n : 70), 0, 100);
    }
    const avg = Object.values(dims).reduce((a, b) => a + b, 0) / (dims.length || 1);
    const totalRaw = raw && raw.total_score;
    const total = clamp(Math.round(Number.isFinite(parseFloat(totalRaw)) ? parseFloat(totalRaw) : avg), 0, 100);

    const result = {
      questionIndex: state.currentIndex,
      total_score: total,
      dimensions: dims,
      comment: String((raw && raw.comment) || ''),
    };
    state.toolScores.push(result);
    // 带 questionIndex 落库，供 end 聚合逐轮分（report agentScore/agentComment）
    return JSON.stringify({
      questionIndex: state.currentIndex,
      total_score: total,
      comment: result.comment,
    });
  },

  /** 生成追问（深挖），不推进题目 */
  generate_followup: async ({ answer, asked_questions }, state) => {
    state.followedUp = true;
    const q = state.currentQuestion ? state.currentQuestion.content : '';
    const text = await aiService.chatText([
      {
        role: 'system',
        content: '你是结构化面试官。针对求职者的作答生成 1 个具有深挖性的追问（一句话即可），只输出追问本身，不要点评。',
      },
      {
        role: 'user',
        content: `题目：${q}\n作答：${answer || ''}${asked_questions ? '\n已追问过：' + asked_questions : ''}`,
      },
    ], { temperature: 0.7, timeout: 30000 });
    return text;
  },

  /** 获取下一题：取自会话 question_plan（创建面试时已匹配），并标记推进 */
  next_question: async ({ used_ids }, state) => {
    const idx = state.currentIndex + 1;
    if (idx >= state.plan.length) {
      state.nextIndex = state.currentIndex;
      return JSON.stringify({ done: true, message: '已无更多题目，请总结并调用 finish_interview' });
    }
    const q = state.plan[idx];
    state.nextIndex = idx;
    return JSON.stringify({
      index: idx,
      question: q.content,
      detail: q.detail || null,
      reference_answer: q.referenceAnswer || null,
      category: q.category || null,
    });
  },

  /** 结束面试：标记收尾，本轮推进到 plan 末尾 */
  finish_interview: async ({ session_id }, state) => {
    state.wrapUp = true;
    state.nextIndex = state.plan.length;
    return JSON.stringify({ done: true, message: '面试已标记为结束，请给出总结收尾语，不再提问' });
  },
};

module.exports = { runTurn };
