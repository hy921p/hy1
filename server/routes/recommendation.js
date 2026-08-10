/**
 * 今日推荐路由（§7.7，可选鉴权）
 */
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const controller = require('../controllers/recommendation');

router.get('/today', auth(false), controller.today);
router.get('/hot', auth(false), controller.hot);

module.exports = router;
