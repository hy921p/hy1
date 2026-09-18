/**
 * 认证路由
 * 与文档 §7.1 对齐
 */
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const controller = require('../controllers/auth');

// 登录（手机号 + 验证码）
router.post('/login', controller.login);

// 会话状态（可选鉴权：带 token 返回用户，未登录返回 isLoggedIn=false）
router.get('/session', auth(false), controller.session);

// 退出登录
router.post('/logout', auth(false), controller.logout);

module.exports = router;
