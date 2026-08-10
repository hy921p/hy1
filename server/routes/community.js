/**
 * 社区路由（阶段3 §7.13）
 * 浏览类可选鉴权；发帖/点赞需登录。
 */
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const controller = require('../controllers/community');

router.get('/posts/:id', auth(false), controller.postDetail);
router.get('/posts', auth(false), controller.listPosts);
router.post('/posts', auth(), controller.createPost);
router.post('/posts/:id/like', auth(), controller.toggleLike);

module.exports = router;
