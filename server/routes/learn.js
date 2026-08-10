/**
 * 智学路由（阶段3 §7.15）
 * 静态路径先于 :id；浏览类可选鉴权，写操作与 AI 摘要强制鉴权 + 限流。
 */
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const aiRateLimit = require('../middleware/ai-rate-limit');
const controller = require('../controllers/learn');

router.get('/readings/stats', auth(), controller.readingStats);
router.get('/readings/:id', auth(false), controller.readingDetail);
router.get('/readings', auth(false), controller.readings);

router.get('/materials', auth(false), controller.materials);
router.get('/basics', auth(false), controller.basics);
router.get('/courses', auth(false), controller.courses);

router.post('/notes/:id/ai-summary', auth(), aiRateLimit, controller.summarizeNote);
router.get('/notes', auth(), controller.notes);
router.post('/notes', auth(), controller.createNote);
router.put('/notes/:id', auth(), controller.updateNote);
router.delete('/notes/:id', auth(), controller.deleteNote);

router.post('/ai-summary', auth(), aiRateLimit, controller.aiSummary);
router.get('/progress', auth(), controller.progress);

module.exports = router;
