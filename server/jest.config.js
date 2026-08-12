/**
 * Jest 测试配置
 * 说明：
 *   - setupFiles 先把环境变量指向测试库（ai_interview_coach_test），dotenv 不会覆盖已存在的值；
 *   - maxWorkers=2：本地内存吃紧，限制并行 worker 防 OOM；
 *   - 测试库准备：npm run test:setup（建库+迁移+种子）。
 */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  setupFiles: ['<rootDir>/jest.setup.js'],
  testTimeout: 15000,
  maxWorkers: 2,
  verbose: true,
};
