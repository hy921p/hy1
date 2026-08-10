/**
 * AI 智面平台 · 后端服务启动入口
 * 数据库连接失败不阻塞启动，仅告警（便于本地先跑通接口）
 */
const app = require('./app');
const config = require('./config');
const { testConnection } = require('./models');
const logger = require('./utils/logger');

const port = config.port;

async function start() {
  const dbOk = await testConnection();
  if (!dbOk) {
    logger.warn('数据库连接失败，服务仍将启动；请检查 MySQL 与 .env 配置');
  }

  app.listen(port, () => {
    logger.info(`AI 智面后端服务已启动: http://localhost:${port}`);
  });
}

start();
