/**
 * 岗位/地区偏好路由（§7.4）
 */
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const controller = require('../controllers/preference');

// GET 可选鉴权：未登录返回默认偏好；PUT 需登录
router.get('/', auth(false), controller.getPreference);
router.put('/', auth(), controller.updatePreference);

module.exports = router;
