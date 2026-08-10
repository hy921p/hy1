/**
 * AI 智面平台 · 应用组装
 * 中间件顺序：CORS → JSON → 文件上传 → 静态资源 → 请求日志 → 路由 → 404 → 全局错误处理
 */
const express = require('express');
const cors = require('cors');
const fileUpload = require('express-fileupload');
const path = require('path');
const config = require('./config');
const logger = require('./utils/logger');
const { success } = require('./utils/response');
const errorHandler = require('./middleware/error-handler');
const { pool } = require('./models');

const app = express();

// CORS（支持多来源）
app.use(cors({
  origin: (config.cors.origin || '*').split(',').map((s) => s.trim()),
  credentials: true,
}));

// 请求体解析
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 文件上传
app.use(fileUpload({ limits: { fileSize: 10 * 1024 * 1024 } }));

// 静态资源（上传文件）
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 请求日志
app.use((req, res, next) => {
  logger.debug(`${req.method} ${req.path}`);
  next();
});

// 健康检查（含数据库连通性探测）
app.get('/api/v1/health', async (req, res, next) => {
  try {
    await pool.query('SELECT 1');
    return success(res, { status: 'ok', db: true, timestamp: Date.now() }, 'success');
  } catch (err) {
    logger.error('health check db failed', err.message);
    return success(res, { status: 'degraded', db: false, timestamp: Date.now() }, '数据库不可用');
  }
});

// Admin 路由（技术文档 §8，统一前缀 /api/admin）
app.use('/api/admin', require('./routes/admin'));

// 业务路由
app.use('/api/v1/auth', require('./routes/auth'));
app.use('/api/v1/user', require('./routes/user'));
app.use('/api/v1/interviews', require('./routes/interview'));
app.use('/api/v1/preferences', require('./routes/preference'));
app.use('/api/v1/checkins', require('./routes/checkin'));
app.use('/api/v1/recommendations', require('./routes/recommendation'));
app.use('/api/v1/study-plans', require('./routes/studyPlan'));
app.use('/api/v1/home', require('./routes/home'));
app.use('/api/v1/questions', require('./routes/question'));
app.use('/api/v1/learn', require('./routes/learn'));
app.use('/api/v1/community', require('./routes/community'));
app.use('/api/v1/ai', require('./routes/ai'));
app.use('/api/v1/notifications', require('./routes/notification'));

// 404 兜底
app.use((req, res) => {
  res.status(404).json({ code: 1002, data: null, message: '接口不存在' });
});

// 全局错误处理
app.use(errorHandler);

module.exports = app;
