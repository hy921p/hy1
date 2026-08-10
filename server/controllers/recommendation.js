/**
 * 今日推荐控制器（§7.7，可选鉴权）
 */
const { success } = require('../utils/response');
const recommendationService = require('../services/recommendationService');

/** GET /api/v1/recommendations/today 今日推荐题目 */
async function today(req, res, next) {
  try {
    const { position, region } = recommendationService.resolvePositionRegion(req.user, req.query);
    const limit = parseInt(req.query.limit, 10) || 5;
    const data = await recommendationService.today(position, region, limit);
    return success(res, data, 'success');
  } catch (err) {
    next(err);
  }
}

/** GET /api/v1/recommendations/hot 热点资讯 */
async function hot(req, res, next) {
  try {
    const { position, region } = recommendationService.resolvePositionRegion(req.user, req.query);
    const limit = parseInt(req.query.limit, 10) || 10;
    const data = await recommendationService.hot(position, region, limit);
    return success(res, data, 'success');
  } catch (err) {
    next(err);
  }
}

module.exports = { today, hot };
