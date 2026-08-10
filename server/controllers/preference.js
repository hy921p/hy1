/**
 * 岗位/地区偏好控制器（§7.4）
 */
const { success } = require('../utils/response');
const preferenceService = require('../services/preferenceService');

/** GET /api/v1/preferences（可选鉴权） */
async function getPreference(req, res, next) {
  try {
    const data = await preferenceService.getPreference(req.user ? req.user.id : null);
    return success(res, data, 'success');
  } catch (err) {
    next(err);
  }
}

/** PUT /api/v1/preferences（需登录） */
async function updatePreference(req, res, next) {
  try {
    const data = await preferenceService.updatePreference(req.user.id, req.body || {});
    return success(res, data, '更新成功');
  } catch (err) {
    next(err);
  }
}

module.exports = { getPreference, updatePreference };
