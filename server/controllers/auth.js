/**
 * 认证控制器
 */
const { success } = require('../utils/response');
const authService = require('../services/auth');

/** POST /api/v1/auth/login */
async function login(req, res, next) {
  try {
    const { phone, code } = req.body || {};
    const result = await authService.login(phone, code);
    return success(res, result, '登录成功');
  } catch (err) {
    next(err);
  }
}

/** GET /api/v1/auth/session（auth(false) 已解析 req.user） */
function session(req, res) {
  const user = req.user || null;
  return success(res, { isLoggedIn: !!user, user }, 'success');
}

/** POST /api/v1/auth/logout（JWT 无状态，客户端丢弃 token 即可） */
function logout(_req, res) {
  return success(res, null, '已退出登录');
}

module.exports = { login, session, logout };
