/**
 * 打卡路由（§7.6）
 */
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const controller = require('../controllers/checkin');

router.post('/', auth(), controller.create);
router.get('/today', auth(), controller.today);
router.get('/calendar', auth(), controller.calendar);
router.get('/stats', auth(), controller.stats);
router.get('/', auth(), controller.list);

module.exports = router;
