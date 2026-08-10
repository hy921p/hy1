/**
 * JWT 鉴权中间件
 * 支持强制校验和可选校验两种模式
 * - required=true: 无 token 或无效 token 返回 2001 错误
 * - required=false: 可选解析，未登录时 req.user 设为 null
 */
const jwt = require('jsonwebtoken');
const config = require('../config');
const { fail } = require('../utils/response');

/**
 * 创建鉴权中间件
 * @param {boolean} [required=true] - true=强制校验，false=可选解析
 * @returns {Function} Express 中间件函数
 */
function auth(required = true) {
  return (req, res, next) => {
    const header = req.headers.authorization;
    const token = header && header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
      if (required) return fail(res, 2001, '未登录，请先登录');
      req.user = null;
      return next();
    }

    try {
      const decoded = jwt.verify(token, config.jwt.secret);
      req.user = { id: decoded.userId, phone: decoded.phone };
      next();
    } catch (err) {
      if (required) return fail(res, 2001, '登录已过期，请重新登录');
      req.user = null;
      next();
    }
  };
}

module.exports = auth;
