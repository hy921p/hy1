/**
 * 岗位/地区偏好服务（§7.4）
 * 枚举校验集中在 config.preference（岗位/地区白名单），不合法 → 1001。
 */
const config = require('../config');
const AppError = require('../utils/app-error');
const User = require('../models/user');

/** 读取偏好：登录取用户字段（NULL 回退默认），未登录返回默认 */
async function getPreference(userId) {
  const defaults = {
    position: config.preference.defaultPosition,
    region: config.preference.defaultRegion,
  };
  if (!userId) return defaults;
  const user = await User.findById(userId);
  if (!user) return defaults;
  return {
    position: user.target_position || defaults.position,
    region: user.preferred_region || defaults.region,
  };
}

/** 更新偏好：枚举校验 + 白名单更新 users 两列 */
async function updatePreference(userId, { position, region } = {}) {
  const fields = {};
  if (position !== undefined) {
    if (!config.preference.positions.includes(position)) {
      throw new AppError(1001, '参数错误：岗位不在支持范围内');
    }
    fields.targetPosition = position;
  }
  if (region !== undefined) {
    if (!config.preference.regions.includes(region)) {
      throw new AppError(1001, '参数错误：地区不在支持范围内');
    }
    fields.preferredRegion = region;
  }
  if (!Object.keys(fields).length) {
    throw new AppError(1001, '参数错误：缺少 position 或 region');
  }
  await User.update(userId, fields);
  return getPreference(userId);
}

module.exports = { getPreference, updatePreference };
