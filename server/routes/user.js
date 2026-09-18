/**
 * 用户路由（§7.3 资料 + 画像/成长/勋章，全部需登录）
 */
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const controller = require('../controllers/user');

// 资料
router.get('/profile', auth(), controller.getProfile);
router.put('/profile', auth(), controller.updateProfile);

// 画像（计算型）
router.get('/progress-trend', auth(), controller.progressTrend);
router.get('/learning-report', auth(), controller.learningReport);
router.get('/ability-assessment', auth(), controller.abilityAssessment);

// 勋章（静态路径放在含 :id 的动态路径之前）
router.get('/badges', auth(), controller.badges);
router.post('/badges/refresh', auth(), controller.refreshBadges);

// 成长
router.get('/growth-tree', auth(), controller.growthTree);
router.get('/growth-records', auth(), controller.growthRecords);

module.exports = router;
