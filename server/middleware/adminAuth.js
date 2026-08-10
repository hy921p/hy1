/**
 * Admin JWT 鉴权中间件
 * 校验 Bearer token（adminSecret 签发），通过则挂 req.admin = { id, username, role }
 * 无/无效 token → 2003 无权限
 */
const jwt = require('jsonwebtoken');
const config = require('../config');
const { fail } = require('../utils/response');

function adminAuth(req, res, next) {
  const header = req.headers.authorization;
  const token = header && header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) return fail(res, 2003, '未登录，请先登录');

  try {
    const decoded = jwt.verify(token, config.jwt.adminSecret);
    req.admin = { id: decoded.adminId, username: decoded.username, role: decoded.role };
    next();
  } catch (err) {
    return fail(res, 2003, '登录已过期，请重新登录');
  }
}

module.exports = adminAuth;
