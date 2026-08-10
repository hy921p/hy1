/**
 * 管理员认证控制器
 */
const { success } = require('../utils/response');
const adminAuthService = require('../services/adminAuthService');
const adminModel = require('../models/admin');

/** POST /api/admin/auth/login */
async function login(req, res, next) {
  try {
    const { username, password } = req.body || {};
    const result = await adminAuthService.login(username, password);
    return success(res, result, '登录成功');
  } catch (err) {
    next(err);
  }
}

/** POST /api/admin/auth/logout（JWT 无状态，客户端丢弃 token 即可） */
function logout(_req, res) {
  return success(res, null, '已退出登录');
}

/** GET /api/admin/auth/profile */
async function profile(req, res, next) {
  try {
    const admin = await adminModel.findById(req.admin.id);
    return success(res, admin, 'success');
  } catch (err) {
    next(err);
  }
}

module.exports = { login, logout, profile };
