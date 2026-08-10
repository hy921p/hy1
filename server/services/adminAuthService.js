/**
 * 管理员认证服务
 * 登录 → bcrypt 校验 → 签发 admin JWT（adminSecret，12h）
 */
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const AppError = require('../utils/app-error');
const adminModel = require('../models/admin');

/** 管理员登录 */
async function login(username, password) {
  if (!username || !password) throw new AppError(1001, '账号和密码不能为空');
  const admin = await adminModel.findByUsername(username);
  if (!admin) throw new AppError(2003, '账号或密码错误');
  if (admin.status !== 1) throw new AppError(2003, '账号已被停用');
  const ok = await bcrypt.compare(password, admin.password_hash);
  if (!ok) throw new AppError(2003, '账号或密码错误');

  const token = jwt.sign(
    { adminId: admin.id, username: admin.username, role: admin.role },
    config.jwt.adminSecret,
    { expiresIn: config.jwt.adminExpiresIn },
  );
  await adminModel.updateLastLogin(admin.id);

  return {
    token,
    admin: { id: admin.id, username: admin.username, nickname: admin.nickname, role: admin.role },
  };
}

module.exports = { login };
