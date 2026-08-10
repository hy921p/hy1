/**
 * 全局错误处理中间件
 * 捕获 AppError 按业务码返回，未预料异常返回 500 并记录日志
 */
const { fail } = require('../utils/response');
const logger = require('../utils/logger');
const AppError = require('../utils/app-error');

/**
 * Express 全局错误处理中间件
 * @param {Error} err - 错误对象
 * @param {object} req - Express 请求对象
 * @param {object} res - Express 响应对象
 * @param {Function} _next - Express next 函数（未使用）
 */
function errorHandler(err, req, res, _next) {
  if (err instanceof AppError) {
    logger.warn(`[${err.code}] ${err.message}`, { path: req.path });
    return fail(res, err.code, err.message, err.status);
  }

  logger.error('Unhandled error', { path: req.path, error: err.message, stack: err.stack });
  return fail(res, 5000, '服务器内部错误', 500);
}

module.exports = errorHandler;
