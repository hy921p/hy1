/**
 * 测试公共工具
 * - request/app/pool：supertest 实例与后端应用、连接池
 * - loginUser：用唯一手机号注册+登录，返回 {token, phone, user}
 * - auth：构造 Authorization 头
 * - closePool：afterAll 关闭连接池（每个测试文件独立模块注册表，需各自调用）
 */
const request = require('supertest');
const app = require('../app');
const { pool } = require('../models');

let phoneSeq = 0;

/** 生成 11 位唯一手机号（1 + 8位时间戳 + 2位计数） */
function uniquePhone() {
  phoneSeq += 1;
  const ts = Date.now().toString().slice(-8);
  const seq = String(phoneSeq % 100).padStart(2, '0');
  return `1${ts}${seq}`;
}

/** 登录（未注册手机号自动建号），开发验证码 123456 */
async function loginUser() {
  const phone = uniquePhone();
  const res = await request(app).post('/api/v1/auth/login').send({ phone, code: '123456' });
  if (res.body.code !== 0) {
    throw new Error(`[test] 登录失败: ${JSON.stringify(res.body)}`);
  }
  return { token: res.body.data.token, phone, user: res.body.data.user };
}

/** Authorization: Bearer 头 */
function auth(token) {
  return { Authorization: `Bearer ${token}` };
}

/** 关闭连接池（供 afterAll 使用，避免 jest 挂起） */
async function closePool() {
  try {
    await pool.end();
  } catch (_) {
    /* ignore */
  }
}

module.exports = { request, app, pool, uniquePhone, loginUser, auth, closePool };
