/**
 * 面试控制器
 * 普通接口走统一响应；message 接口返回 SSE 流（技术文档 §7.10）
 */
const config = require('../config');
const interviewService = require('../services/interview');
const { messageModel } = require('../models/interview');
const { success, paginated } = require('../utils/response');
const AppError = require('../utils/app-error');
const logger = require('../utils/logger');

/** 写一条 SSE data 帧 */
function sseSend(res, obj) {
  res.write(`data: ${JSON.stringify(obj)}\n\n`);
}

/** 创建面试 */
async function create(req, res, next) {
  try {
    const data = await interviewService.createInterview(req.user.id, req.body);
    return success(res, data, '面试创建成功');
  } catch (err) {
    return next(err);
  }
}

/** 面试历史列表 */
async function list(req, res, next) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const pageSize = parseInt(req.query.pageSize, 10) || 10;
    const { list, total } = await interviewService.listInterviews(req.user.id, page, pageSize);
    return paginated(res, { list, total, page, pageSize });
  } catch (err) {
    return next(err);
  }
}

/** 面试详情（含当前进度） */
async function get(req, res, next) {
  try {
    const session = await interviewService.getSession(req.params.id, req.user.id);
    return success(res, {
      id: session.id,
      scenarioName: session.scenario_name,
      mode: session.mode,
      status: session.status,
      currentIndex: session.current_index,
      totalQuestions: session.total_questions,
      score: session.score,
      position: session.position,
      region: session.region,
      startedAt: session.started_at,
      finishedAt: session.finished_at,
    }, 'success');
  } catch (err) {
    return next(err);
  }
}

/**
 * SSE 一问一答
 * POST /interviews/:id/message  body: { answer?: string }
 * 帧格式：data: {"type":"tool","data":{…}}（Agent）→  data: {"type":"text","content":"…"}  →  data: {"type":"done","data":{…}}
 * 失败：流未开始走统一错误；已开始则发 error 帧后结束
 * Agent 模式（config.ai.agent.enabled）：走 agentService.runTurn 工具循环；任一处抛错回退 V1.0 规则编排。
 */
async function message(req, res, next) {
  const { id } = req.params;
  const answer = (req.body && req.body.answer) || '';
  let session;
  try {
    session = await interviewService.getSession(id, req.user.id);
    if (Number(session.status) !== 1) {
      throw new AppError(3001, '面试已结束或尚未开始，无法继续作答', 400);
    }

    const transcript = await messageModel.findBySession(session.id);

    // 开始 SSE 响应（Agent 路径的工具帧依赖此头）
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const agentEnabled = config.ai.agent.enabled;
    let turn;
    let full = '';

    if (agentEnabled) {
      const agentService = require('../services/agentService');
      try {
        const result = await agentService.runTurn({
          session, transcript, answer,
          onTool: (tool) => sseSend(res, { type: 'tool', data: tool }),
        });
        turn = result.turn;
        full = result.finalText || '';
        if (full) sseSend(res, { type: 'text', content: full });
      } catch (agentErr) {
        // 回退 V1.0：工具循环失败不中断面试（§10.3.4）
        logger.error('Agent 面试官调用失败，回退 V1.0 规则编排', agentErr.message);
        turn = await interviewService.prepareTurn(session, transcript, answer);
        const stream = require('../services/aiService').chatStream(turn.messages);
        for await (const chunk of stream) {
          full += chunk;
          sseSend(res, { type: 'text', content: chunk });
        }
      }
    } else {
      turn = await interviewService.prepareTurn(session, transcript, answer);
      const stream = require('../services/aiService').chatStream(turn.messages);
      for await (const chunk of stream) {
        full += chunk;
        sseSend(res, { type: 'text', content: chunk });
      }
    }

    if (!full.trim()) {
      throw Object.assign(new Error('AI 未返回有效内容'), { code: 5000, status: 502 });
    }

    await interviewService.commitTurn(session, answer, full, turn);

    sseSend(res, {
      type: 'done',
      data: {
        hasNext: turn.hasNext,
        currentIndex: turn.currentIndex,
        totalQuestions: turn.plan.length,
      },
    });
    res.end();
  } catch (err) {
    const code = err.code || 5000;
    const messageText = err.message || 'AI 服务异常，请重试';
    if (res.headersSent) {
      logger.error('interview message 流中断', { message: messageText, stack: err.stack });
      try {
        sseSend(res, { type: 'error', data: { code, message: messageText } });
        res.end();
      } catch (e) { /* 客户端已断开 */ }
    } else {
      next(err);
    }
  }
}

/** 结束面试并生成报告 */
async function end(req, res, next) {
  try {
    const report = await interviewService.endInterview(req.params.id, req.user.id);
    return success(res, { reportId: report.id, totalScore: report.total_score }, '面试已结束，报告生成成功');
  } catch (err) {
    return next(err);
  }
}

/** 获取报告 */
async function report(req, res, next) {
  try {
    const row = await interviewService.getReport(req.params.id, req.user.id);
    return success(res, {
      id: row.id,
      sessionId: row.session_id,
      totalScore: row.total_score,
      dimensions: row.dimension_scores,
      highlights: row.highlights,
      improvements: row.improvements,
      perQuestion: row.per_question,
      generatedAt: row.generated_at,
    }, 'success');
  } catch (err) {
    return next(err);
  }
}

module.exports = { create, list, get, message, end, report };
