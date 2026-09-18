/**
 * 认证服务
 * 阶段 0：手机号 + 开发验证码（123456）登录，签发 JWT
 * 正式环境替换为短信验证码服务
 */
const jwt = require('jsonwebtoken');
const config = require('../config');
const User = require('../models/user');
const growthService = require('./growthService');
const AppError = require('../utils/app-error');

/** 阶段 0 开发验证码（上线前接入短信平台） */
const DEV_SMS_CODE = '123456';

/**
 * 登录：手机号 + 验证码 → 签发 JWT
 */
async function login(phone, code) {
  if (!phone || !/^1\d{10}$/.test(phone)) {
    throw new AppError(1001, '手机号格式不正确');
  }
  if (code !== DEV_SMS_CODE) {
    throw new AppError(1001, '验证码错误');
  }

  // 未注册手机号自动建号
  let user = await User.findByPhone(phone);
  if (!user) {
    const id = await User.create({ phone, nickname: `${phone.slice(-4)}学员` });
    // 阶段2：注册奖励成长值 +50（统一走 grant）
    await growthService.grant(id, 'register', null, '注册奖励');
    user = await User.findById(id);
  }

  const token = jwt.sign(
    { userId: user.id, phone: user.phone },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn },
  );

  return { token, user: sanitize(user) };
}

/** 脱敏后的用户信息（返回给前端） */
function sanitize(user) {
  return {
    id: user.id,
    phone: maskPhone(user.phone),
    nickname: user.nickname,
    avatar: user.avatar,
    gender: user.gender,
    targetPosition: user.target_position,
    preferredRegion: user.preferred_region,
    growthPoints: user.growth_points,
    checkInStreak: user.check_in_streak,
    totalInterviews: user.total_interviews,
    avgScore: user.avg_score,
    createdAt: user.created_at,
  };
}

function maskPhone(phone) {
  return phone ? phone.replace(/^(\d{3})\d{4}(\d{4})$/, '$1****$2') : '';
}

module.exports = { login, sanitize };
