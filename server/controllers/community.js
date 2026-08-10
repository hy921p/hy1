/**
 * 社区控制器（阶段3 §7.13）
 * 帖子列表/发布/详情（+浏览）/点赞切换
 */
const { success, paginated } = require('../utils/response');
const communityService = require('../services/communityService');

const PAGE = (v) => Math.max(1, Number(v) || 1);
const PAGE_SIZE = (v) => Math.min(50, Math.max(1, Number(v) || 10));

/** GET /api/v1/community/posts（可选鉴权） */
async function listPosts(req, res, next) {
  try {
    const page = PAGE(req.query.page);
    const pageSize = PAGE_SIZE(req.query.pageSize);
    const data = await communityService.listPosts({
      position: req.query.position,
      region: req.query.region,
      sort: req.query.sort || 'latest',
      page,
      pageSize,
    });
    return paginated(res, { list: data.list, total: data.total, page, pageSize });
  } catch (err) { next(err); }
}

/** POST /api/v1/community/posts（需登录） */
async function createPost(req, res, next) {
  try {
    const data = await communityService.createPost(req.user.id, {
      title: req.body.title,
      content: req.body.content,
      position: req.body.position,
      region: req.body.region,
      tags: req.body.tags,
      interviewType: req.body.interviewType,
      result: req.body.result,
    });
    return success(res, data, '发布成功');
  } catch (err) { next(err); }
}

/** GET /api/v1/community/posts/:id（可选鉴权，登录返回 liked） */
async function postDetail(req, res, next) {
  try {
    const data = await communityService.postDetail(req.user ? req.user.id : null, Number(req.params.id));
    return success(res, data, 'success');
  } catch (err) { next(err); }
}

/** POST /api/v1/community/posts/:id/like（需登录，切换） */
async function toggleLike(req, res, next) {
  try {
    const data = await communityService.toggleLike(req.user.id, Number(req.params.id));
    return success(res, data, data.liked ? '已点赞' : '已取消点赞');
  } catch (err) { next(err); }
}

module.exports = { listPosts, createPost, postDetail, toggleLike };
