/**
 * 自定义任务路由（§7.5 今日任务加号自添加）
 */
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const controller = require('../controllers/customTask');

router.post('/', auth(), controller.create);
router.get('/', auth(), controller.list);
router.put('/:id/done', auth(), controller.markDone);
router.delete('/:id', auth(), controller.remove);

module.exports = router;
