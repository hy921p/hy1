/**
 * 首页路由（§7.5，可选鉴权）
 */
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const controller = require('../controllers/home');

router.get('/overview', auth(false), controller.overview);

module.exports = router;
