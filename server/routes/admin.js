/**
 * Admin 路由
 * 统一前缀 /api/admin；除 auth/login 外全部走 adminAuth 鉴权。
 * 技术文档 §8：管理端 API 设计。
 */
const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/adminAuth');
const adminAuthCtrl = require('../controllers/adminAuth');
const adminDashboardCtrl = require('../controllers/adminDashboard');
const adminQuestionCtrl = require('../controllers/adminQuestion');
const adminContentCtrl = require('../controllers/adminContent');
const adminStudyPlanCtrl = require('../controllers/adminStudyPlan');
const adminBadgeCtrl = require('../controllers/adminBadge');
const adminNotificationCtrl = require('../controllers/adminNotification');
const adminAgentToolCtrl = require('../controllers/adminAgentTool');

// —— 认证（login 公开，其余鉴权）——
router.post('/auth/login', adminAuthCtrl.login);
router.post('/auth/logout', adminAuth, adminAuthCtrl.logout);
router.get('/auth/profile', adminAuth, adminAuthCtrl.profile);

// —— 数据看板 ——
router.get('/dashboard/stats', adminAuth, adminDashboardCtrl.stats);

// —— 题库维护 ——
router.get('/questions', adminAuth, adminQuestionCtrl.list);
router.post('/questions', adminAuth, adminQuestionCtrl.create);
router.get('/questions/:id', adminAuth, adminQuestionCtrl.detail);
router.put('/questions/:id', adminAuth, adminQuestionCtrl.update);
router.delete('/questions/:id', adminAuth, adminQuestionCtrl.remove);

// —— 内容管理（readings/materials/basics/courses/hot-topics）——
router.get('/content/:type', adminAuth, adminContentCtrl.list);
router.post('/content/:type', adminAuth, adminContentCtrl.create);
router.get('/content/:type/:id', adminAuth, adminContentCtrl.detail);
router.put('/content/:type/:id', adminAuth, adminContentCtrl.update);
router.delete('/content/:type/:id', adminAuth, adminContentCtrl.remove);

// —— 学习规划 ——
router.get('/study-plans', adminAuth, adminStudyPlanCtrl.list);
router.post('/study-plans', adminAuth, adminStudyPlanCtrl.create);
router.put('/study-plans/:id', adminAuth, adminStudyPlanCtrl.update);
router.delete('/study-plans/:id', adminAuth, adminStudyPlanCtrl.remove);
router.get('/study-plans/:id/nodes', adminAuth, adminStudyPlanCtrl.listNodes);
router.post('/study-plans/:id/nodes', adminAuth, adminStudyPlanCtrl.addNode);
router.put('/study-plans/:id/nodes/:nodeId', adminAuth, adminStudyPlanCtrl.updateNode);
router.delete('/study-plans/:id/nodes/:nodeId', adminAuth, adminStudyPlanCtrl.removeNode);

// —— 勋章 ——
router.get('/badges', adminAuth, adminBadgeCtrl.list);
router.post('/badges', adminAuth, adminBadgeCtrl.create);
router.put('/badges/:id', adminAuth, adminBadgeCtrl.update);
router.delete('/badges/:id', adminAuth, adminBadgeCtrl.remove);

// —— 通知推送 ——
router.post('/notifications', adminAuth, adminNotificationCtrl.push);
router.get('/notifications', adminAuth, adminNotificationCtrl.records);

// —— Agent 工具启停（阶段6 §10.3）——
router.get('/agent-tools', adminAuth, adminAgentToolCtrl.list);
router.put('/agent-tools/:id', adminAuth, adminAgentToolCtrl.toggle);

module.exports = router;
