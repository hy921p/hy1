/**
 * aiService 单元测试（不依赖网络/数据库，OpenAI SDK 全 mock）
 * 覆盖：chatText 文本返回 / chatJSON 解析（含代码围栏）/ 无法解析报错 /
 *      chatWithTools 工具调用映射 / 超时映射 504 / AI 未启用映射 503
 */
jest.mock('openai', () => {
  const create = jest.fn();
  const OpenAI = jest.fn(function () {
    this.chat = { completions: { create } };
  });
  // 把 create mock 挂到构造函数上，测试直接取，避免被 clearAllMocks 清掉 instances
  OpenAI.createMock = create;
  return { OpenAI };
});

const { OpenAI } = require('openai');
const aiService = require('../../services/aiService');
const AppError = require('../../utils/app-error');
const config = require('../../config');

/** 取 aiService 模块内创建的 client 的 create mock */
function mockCreate() {
  return OpenAI.createMock;
}

/** 让 create 返回一个普通消息完成 */
function resolveMessage(content, toolCalls = null) {
  mockCreate().mockResolvedValue({
    choices: [{ message: { content, tool_calls: toolCalls } }],
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

afterAll(() => {
  // 恢复 config（防止影响其他文件，虽然 jest 默认隔离模块注册表，仍保持干净）
  config.ai.enabled = true;
});

describe('aiService.chatText', () => {
  test('返回 trim 后的纯文本，且 stream=false', async () => {
    resolveMessage('  你好，面试官  ');
    const text = await aiService.chatText([{ role: 'user', content: 'hi' }]);
    expect(text).toBe('你好，面试官');
    expect(mockCreate()).toHaveBeenCalledWith(
      expect.objectContaining({ stream: false }),
      expect.any(Object)
    );
  });
});

describe('aiService.chatJSON', () => {
  test('解析普通 JSON 对象', async () => {
    resolveMessage('{"score": 82, "advice": "好"}');
    const data = await aiService.chatJSON([{ role: 'user', content: 'x' }]);
    expect(data).toEqual({ score: 82, advice: '好' });
  });

  test('兼容 ```json 代码围栏包裹', async () => {
    resolveMessage('```json\n{"dimension_scores": {"综合分析": 80}}\n```');
    const data = await aiService.chatJSON([{ role: 'user', content: 'x' }]);
    expect(data.dimension_scores['综合分析']).toBe(80);
  });

  test('返回内容无法解析 → AppError 5000（parseJSON 的 502 被 catch 重映射为 503）', async () => {
    resolveMessage('抱歉，我无法理解');
    await expect(aiService.chatJSON([{ role: 'user', content: 'x' }])).rejects.toMatchObject({
      code: 5000,
      status: 503,
    });
  });
});

describe('aiService.chatWithTools', () => {
  test('把 tool_calls 映射为 {id,name,arguments}', async () => {
    resolveMessage(null, [
      {
        id: 'call_1',
        function: { name: 'score_answer', arguments: '{"answer":"x"}' },
      },
    ]);
    const { content, toolCalls } = await aiService.chatWithTools(
      [{ role: 'user', content: 'hi' }],
      [{ type: 'function', function: { name: 'score_answer' } }]
    );
    expect(content).toBe('');
    expect(toolCalls).toHaveLength(1);
    expect(toolCalls[0]).toEqual({ id: 'call_1', name: 'score_answer', arguments: '{"answer":"x"}' });
    // tools 已传给 SDK
    expect(mockCreate()).toHaveBeenCalledWith(
      expect.objectContaining({ tools: [{ type: 'function', function: { name: 'score_answer' } }] }),
      expect.any(Object)
    );
  });

  test('无 tool_calls → 返回纯文本', async () => {
    resolveMessage('下一题：……');
    const { content, toolCalls } = await aiService.chatWithTools([{ role: 'user', content: 'hi' }]);
    expect(content).toBe('下一题：……');
    expect(toolCalls).toEqual([]);
  });
});

describe('aiService 异常映射', () => {
  test('超时（AbortError）→ AppError 504', async () => {
    const err = new Error('aborted');
    err.name = 'AbortError';
    mockCreate().mockRejectedValue(err);
    await expect(aiService.chatText([{ role: 'user', content: 'x' }])).rejects.toMatchObject({
      code: 5000,
      status: 504,
    });
  });

  test('AI 未启用 → AppError 503', async () => {
    config.ai.enabled = false;
    resolveMessage('ok');
    await expect(aiService.chatText([{ role: 'user', content: 'x' }])).rejects.toMatchObject({
      code: 5000,
      status: 503,
    });
    config.ai.enabled = true;
  });
});
