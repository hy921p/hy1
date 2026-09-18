/**
 * Jest 全局初始化（setupFiles，早于所有测试文件加载）
 * 关键作用：在 config/index.js（加载 .env）之前把测试库环境变量写进 process.env。
 * dotenv 不会覆盖已存在的环境变量，因此 pool 会连到测试库而不是开发/生产库，
 * 防止误操作（创建用户/帖子/打卡等）污染真实数据。
 */
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.DB_NAME = process.env.TEST_DB_NAME || 'ai_interview_coach_test';
// 测试一律走本地哈希 embedding，不请求远程、不花钱、结果确定
process.env.EMBEDDING_MODE = process.env.EMBEDDING_MODE || 'hash';
// 集成测试不触发 Agent 工具循环；AI SDK 在单元测试中 mock
process.env.AGENT_ENABLED = 'false';
