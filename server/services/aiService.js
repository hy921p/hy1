/**
 * AI 统一服务层（技术文档 §4.3 / §9）
 * 封装 DeepSeek（OpenAI 兼容协议）：
 * - chatStream：流式对话，逐段产出文本（面试官一问一答用）
 * - chatJSON：非流式对话并解析 JSON（报告/摘要/错题解析用）
 * - chatText：非流式纯文本对话（AI 答疑用）
 * 统一超时（默认 60s）、限流在 middleware/ai-rate-limit 单独做。
 */
const { OpenAI } = require('openai');
const config = require('../config');
const AppError = require('../utils/app-error');
const logger = require('../utils/logger');

const client = new OpenAI({
  baseURL: config.ai.baseURL,
  apiKey: config.ai.apiKey,
  timeout: config.ai.timeout,
  maxRetries: 1,
});

function assertEnabled() {
  if (!config.ai.enabled || !config.ai.apiKey) {
    throw new AppError(5000, 'AI 服务未配置（缺少 API Key），请检查 server/.env 的 AI_API_KEY', 503);
  }
}

/**
 * 流式对话
 * @param {Array<{role:string, content:string}>} messages - OpenAI 消息数组
 * @param {{model?:string, temperature?:number, maxTokens?:number, timeout?:number}} [opts]
 * @returns {AsyncGenerator<string>} 逐段产出文本
 */
async function* chatStream(messages, opts = {}) {
  assertEnabled();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeout || config.ai.timeout);
  try {
    const stream = await client.chat.completions.create(
      {
        model: opts.model || config.ai.model,
        messages,
        stream: true,
        temperature: opts.temperature ?? 0.7,
        max_tokens: opts.maxTokens || config.ai.maxTokens,
      },
      { signal: controller.signal }
    );
    for await (const chunk of stream) {
      const delta = chunk.choices && chunk.choices[0] && chunk.choices[0].delta;
      const text = (delta && delta.content) || '';
      if (text) yield text;
    }
  } catch (err) {
    throw mapAiError(err);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 非流式对话并携带工具（OpenAI function-calling，阶段6 §10.3 Agent 面试官）
 * 返回模型消息：可能带 tool_calls（需执行工具后回填再调），也可能是最终文本。
 * @param {Array<{role:string, content:string}>} messages
 * @param {Array<object>} [tools] - OpenAI 格式 tools
 * @param {{model?:string, temperature?:number, maxTokens?:number, timeout?:number, toolChoice?:string}} [opts]
 * @returns {Promise<{content:string, toolCalls:Array<{id:string, name:string, arguments:string}>}>}
 */
async function chatWithTools(messages, tools = [], opts = {}) {
  assertEnabled();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeout || config.ai.timeout);
  try {
    const body = {
      model: opts.model || config.ai.model,
      messages,
      stream: false,
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.maxTokens || config.ai.maxTokens,
    };
    if (tools && tools.length) {
      body.tools = tools;
      body.tool_choice = opts.toolChoice || 'auto';
    }
    const completion = await client.chat.completions.create(body, { signal: controller.signal });
    const msg = completion.choices && completion.choices[0] ? completion.choices[0].message : null;
    const toolCalls = ((msg && msg.tool_calls) || []).map((tc) => ({
      id: tc.id,
      name: tc.function && tc.function.name,
      arguments: tc.function && tc.function.arguments,
    }));
    return { content: (msg && msg.content) || '', toolCalls };
  } catch (err) {
    throw mapAiError(err);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 非流式对话并解析 JSON 对象（结构化输出）
 * @param {Array<{role:string, content:string}>} messages
 * @param {{model?:string, temperature?:number, maxTokens?:number, timeout?:number}} [opts]
 * @returns {Promise<object>} 解析后的 JSON 对象
 */
async function chatJSON(messages, opts = {}) {
  assertEnabled();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeout || config.ai.timeout);
  try {
    const completion = await client.chat.completions.create(
      {
        model: opts.model || config.ai.model,
        messages,
        stream: false,
        temperature: opts.temperature ?? 0.3,
        max_tokens: opts.maxTokens || config.ai.maxTokens,
        response_format: { type: 'json_object' },
      },
      { signal: controller.signal }
    );
    const content =
      completion.choices && completion.choices[0]
        ? completion.choices[0].message.content || ''
        : '';
    return parseJSON(content);
  } catch (err) {
    throw mapAiError(err);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 非流式纯文本对话（AI 答疑等自由文本输出）
 * @param {Array<{role:string, content:string}>} messages
 * @param {{model?:string, temperature?:number, maxTokens?:number, timeout?:number}} [opts]
 * @returns {Promise<string>} 回答纯文本（trim 后）
 */
async function chatText(messages, opts = {}) {
  assertEnabled();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeout || config.ai.timeout);
  try {
    const completion = await client.chat.completions.create(
      {
        model: opts.model || config.ai.model,
        messages,
        stream: false,
        temperature: opts.temperature ?? 0.5,
        max_tokens: opts.maxTokens || config.ai.maxTokens,
      },
      { signal: controller.signal }
    );
    const content =
      completion.choices && completion.choices[0]
        ? completion.choices[0].message.content || ''
        : '';
    return String(content).trim();
  } catch (err) {
    throw mapAiError(err);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 容错 JSON 解析：去 ```json 围栏，取第一个 {...}，最后 JSON.parse
 */
function parseJSON(content) {
  let text = String(content).trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fence) text = fence[1].trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start >= 0 && end > start) text = text.slice(start, end + 1);
  try {
    return JSON.parse(text);
  } catch (e) {
    logger.error('aiService JSON 解析失败，原文片段:', text.slice(0, 300));
    throw new AppError(5000, 'AI 返回内容无法解析，请重试', 502);
  }
}

function mapAiError(err) {
  const msg = (err && err.message) || '';
  logger.error('aiService 调用失败:', msg);
  const isTimeout =
    err && err.name === 'AbortError' ||
    msg.includes('timeout') ||
    msg.includes('abort') ||
    msg.includes('ETIMEDOUT') ||
    msg.includes('socket hang up');
  if (isTimeout) return new AppError(5000, 'AI 响应超时，请重试', 504);
  return new AppError(5000, `AI 服务不可用：${msg || '未知错误'}`, 503);
}

module.exports = { chatStream, chatJSON, chatText, chatWithTools };
