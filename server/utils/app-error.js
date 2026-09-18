/**
 * 自定义业务异常类
 * 携带业务 code、HTTP status 和人类可读 message
 * 由全局错误处理中间件统一捕获并返回
 */
class AppError extends Error {
  /**
   * @param {number} code - 业务错误码（参见 api-spec.md）
   * @param {string} message - 人类可读的错误描述
   * @param {number} [status=200] - HTTP 状态码
   */
  constructor(code, message, status = 200) {
    super(message);
    this.code = code;
    this.status = status;
    this.name = 'AppError';
  }
}

module.exports = AppError;
