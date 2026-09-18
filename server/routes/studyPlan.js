/**
 * 学习规划路由（§7.8）
 */
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const controller = require('../controllers/studyPlan');

router.get('/current', auth(false), controller.current);
router.put('/nodes/:nodeId/complete', auth(), controller.completeNode);
router.get('/progress', auth(), controller.progress);

module.exports = router;
