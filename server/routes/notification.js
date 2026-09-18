/**
 * 通知路由（阶段3 §7.17）
 * 静态路径先于 :id；全部需登录。
 */
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const controller = require('../controllers/notification');

router.get('/unread-count', auth(), controller.unreadCount);
router.put('/read-all', auth(), controller.markAllRead);
router.put('/:id/read', auth(), controller.markRead);
router.delete('/:id', auth(), controller.remove);
router.get('/', auth(), controller.list);

module.exports = router;
