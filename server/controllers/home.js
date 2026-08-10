/**
 * 首页控制器（§7.5，可选鉴权）
 */
const { success } = require('../utils/response');
const homeService = require('../services/homeService');

/** GET /api/v1/home/overview */
async function overview(req, res, next) {
  try {
    const data = await homeService.overview(req.user, req.query);
    return success(res, data, 'success');
  } catch (err) {
    next(err);
  }
}

module.exports = { overview };
