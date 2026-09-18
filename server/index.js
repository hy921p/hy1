/**
 * AI 智面平台 · 后端服务启动入口
 * 数据库连接失败不阻塞启动，仅告警（便于本地先跑通接口）
 */
const app = require('./app');
const config = require('./config');
const { testConnection } = require('./models');
const logger = require('./utils/logger');
const { autoFinalizeIdleSessions } = require('./services/interview');

const port = config.port;

/** 「进行中」面试超时自动收尾：每 60s 扫一次，带防重入锁 */
const IDLE_SWEEP_INTERVAL_MS = 60 * 1000;
let idleSweepRunning = false;

function scheduleIdleSweep() {
  setInterval(async () => {
    if (idleSweepRunning) return;
    idleSweepRunning = true;
    try {
      const results = await autoFinalizeIdleSessions();
      if (results.length) {
        logger.info(`自动收尾扫描完成，处理 ${results.length} 场面试:`, JSON.stringify(results));
      }
    } catch (e) {
      logger.error('自动收尾扫描失败:', e.message);
    } finally {
      idleSweepRunning = false;
    }
  }, IDLE_SWEEP_INTERVAL_MS);
}

async function start() {
  const dbOk = await testConnection();
  if (!dbOk) {
    logger.warn('数据库连接失败，服务仍将启动；请检查 MySQL 与 .env 配置');
  }

  scheduleIdleSweep();

  app.listen(port, () => {
    logger.info(`AI 智面后端服务已启动: http://localhost:${port}`);
  });
}

start();
