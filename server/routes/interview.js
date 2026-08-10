/**
 * 面试路由（技术文档 §7.10）
 * 全部需要 C 端 JWT；message 与 end 挂 AI 限流（§9：10次/分/用户）
 */
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const aiRateLimit = require('../middleware/ai-rate-limit');
const controller = require('../controllers/interview');

// 创建面试 / 历史列表
router.post('/', auth(), controller.create);
router.get('/', auth(), controller.list);

// 面试详情
router.get('/:id', auth(), controller.get);

// SSE 一问一答（流式）
router.post('/:id/message', auth(), aiRateLimit, controller.message);

// 结束面试并生成报告（也消耗 AI 调用额度）
router.put('/:id/end', auth(), aiRateLimit, controller.end);

// 获取报告
router.get('/:id/report', auth(), controller.report);

module.exports = router;
