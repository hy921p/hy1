/**
 * AI 答疑路由（阶段3 §7.14）
 * /ask 需登录 + 限流；/context 仅检索不限流可选鉴权；记录 CRUD 需登录（仅本人）。
 */
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const aiRateLimit = require('../middleware/ai-rate-limit');
const controller = require('../controllers/ai');

router.get('/context', auth(false), controller.context);
router.post('/ask', auth(), aiRateLimit, controller.ask);
router.get('/answers', auth(), controller.listAnswers);
router.get('/answers/:id', auth(), controller.answerDetail);
router.delete('/answers/:id', auth(), controller.deleteAnswer);

module.exports = router;
