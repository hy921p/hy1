/**
 * 热点内容数据访问（hot_topics）
 * 三级回退：position+region 精确 → position+(全国/NULL) → 通用
 */
const { query } = require('./index');

const hotTopicModel = {
  /** 最近热点（按发布日期与浏览量排序） */
  async latest(position, region, limit = 10) {
    const sql = `
      SELECT id, title, summary, cover, position, region, views, publish_date
      FROM hot_topics
      WHERE is_active = 1
        AND (
          (position = ? AND region = ?)
          OR (position = ? AND (region = '全国' OR region IS NULL))
          OR (position IS NULL OR position = '通用')
        )
      ORDER BY publish_date DESC, views DESC, id DESC
      LIMIT ?
    `;
    return query(sql, [position, region, position, limit]);
  },
};

module.exports = hotTopicModel;
