/**
 * 题库路由（阶段3 §7.11）
 * 静态路径先于 /:id；浏览类可选鉴权，写操作强制鉴权。
 */
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const controller = require('../controllers/question');

router.get('/search', auth(false), controller.search);
router.get('/categories', auth(false), controller.categories);
router.get('/source-types', auth(false), controller.sourceTypes);
router.get('/hot', auth(false), controller.hotList);
router.get('/real', auth(false), controller.realList);
router.get('/favorites', auth(), controller.favorites);
router.get('/wrong', auth(), controller.wrongList);
router.get('/practice', auth(), controller.practice);
router.put('/wrong/:id/mastered', auth(), controller.markMastered);

router.post('/:id/submit', auth(), controller.submit);
router.post('/:id/favorite', auth(), controller.toggleFavorite);
router.get('/:id', auth(false), controller.detail);
router.get('/', auth(false), controller.list);

module.exports = router;
