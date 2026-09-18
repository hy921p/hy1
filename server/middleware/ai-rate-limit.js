/**
 * AI 调用限流中间件（技术文档 §9：10 次/分钟/用户，超过返回 4001）
 * 单机内存滑动窗口，足够 demo 单节点部署。
 */
const config = require('../config');
const AppError = require('../utils/app-error');

// userId -> { timestamps: number[] }
const buckets = new Map();

function aiRateLimit(req, res, next) {
  // SSE 流中无法走统一错误处理，这里在流开始前直接 next(err) 走 JSON 错误
  if (!req.user) return next();
  const { windowMs, max } = config.ai.rateLimit;
  const now = Date.now();
  const userId = req.user.id;

  let bucket = buckets.get(userId);
  if (!bucket) {
    bucket = { timestamps: [] };
    buckets.set(userId, bucket);
  }
  bucket.timestamps = bucket.timestamps.filter((t) => now - t < windowMs);
  if (bucket.timestamps.length >= max) {
    return next(new AppError(4001, 'AI 调用频率过高，请 1 分钟后再试', 429));
  }
  bucket.timestamps.push(now);
  next();
}

module.exports = aiRateLimit;
