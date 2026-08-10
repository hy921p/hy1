/**
 * 今日推荐服务（§7.7）+ 岗位/地区统一解析（§7.1）
 * 三级回退：position+region 精确 → position+(全国/NULL) → 通用
 */
const config = require('../config');
const hotTopicModel = require('../models/hotTopic');
const { questionModel } = require('../models/interview');

/**
 * 岗位/地区解析（所有内容型接口共用）：
 * query 参数 > 用户偏好 > config 默认（公务员/四川）
 */
function resolvePositionRegion(user, query = {}) {
  const position = (query.position || (user && user.target_position) || config.preference.defaultPosition || '').trim() || config.preference.defaultPosition;
  const region = (query.region || (user && user.preferred_region) || config.preference.defaultRegion || '').trim() || config.preference.defaultRegion;
  return { position, region };
}

/** 今日推荐题目（前 N 道 hot 题） */
async function today(position, region, limit = 5) {
  const list = await questionModel.findHot(position, region, Math.min(limit, 10));
  return list.map((q) => ({
    id: q.id,
    content: q.content,
    category: q.category,
    position: q.position,
    region: q.region,
    difficulty: q.difficulty,
  }));
}

/** 热点资讯列表 */
async function hot(position, region, limit = 10) {
  const list = await hotTopicModel.latest(position, region, limit);
  return list.map((t) => ({
    id: t.id,
    title: t.title,
    summary: t.summary,
    cover: t.cover,
    position: t.position,
    region: t.region,
    views: t.views,
    publishDate: t.publish_date,
  }));
}

module.exports = { resolvePositionRegion, today, hot };
