/**
 * 今日任务数据访问（custom_tasks，§7.5 今日任务）
 * 用户任务：增、查、勾选/取消勾选、删除，均限定 userId 防越权。
 * 默认任务（is_default=1）：每日打卡/每日晨读/学习通识知识/模拟考试，首次访问时播种。
 */
const { query } = require('./index');

/** 默认任务集：作为每个用户今日任务的初始清单 */
const DEFAULT_TASKS = [
  { title: '每日打卡', estMinutes: 5 },
  { title: '每日晨读', estMinutes: 15 },
  { title: '学习通识知识', estMinutes: 20 },
  { title: '模拟考试', estMinutes: 30 },
];

const customTaskModel = {
  /** 新增用户任务（is_default=0） */
  async create(userId, { title, estMinutes }) {
    const res = await query(
      'INSERT INTO custom_tasks (user_id, title, est_minutes, is_default, status) VALUES (?, ?, ?, 0, 0)',
      [userId, title, estMinutes || null],
    );
    return this.findById(res.insertId);
  },

  async findById(id) {
    const rows = await query('SELECT * FROM custom_tasks WHERE id = ? LIMIT 1', [id]);
    return rows[0] || null;
  },

  /**
   * 播种默认任务：用户还没有任何默认任务时插入 4 条默认任务。
   * 默认任务删除后下次加载会补回（它们是固定默认集，始终在）。
   */
  async ensureDefaults(userId) {
    const rows = await query('SELECT id FROM custom_tasks WHERE user_id = ? AND is_default = 1 LIMIT 1', [userId]);
    if (rows.length) return;
    for (const d of DEFAULT_TASKS) {
      await query(
        'INSERT INTO custom_tasks (user_id, title, est_minutes, is_default, status) VALUES (?, ?, ?, 1, 0)',
        [userId, d.title, d.estMinutes],
      );
    }
  },

  /** 列表：默认任务在前，其余按创建先后 */
  async findByUser(userId, { status } = {}) {
    if (status === 0 || status === 1) {
      return query(
        'SELECT * FROM custom_tasks WHERE user_id = ? AND status = ? ORDER BY is_default DESC, id ASC',
        [userId, status],
      );
    }
    return query('SELECT * FROM custom_tasks WHERE user_id = ? ORDER BY is_default DESC, id ASC', [userId]);
  },

  /** 设置勾选状态（0 待办 / 1 完成；可来回切换，返回是否命中本人的记录） */
  async setStatus(id, userId, status) {
    const res = await query(
      'UPDATE custom_tasks SET status = ?, finished_at = IF(? = 1, NOW(), NULL) WHERE id = ? AND user_id = ?',
      [status, status, id, userId],
    );
    return res.affectedRows > 0;
  },

  /** 删除（返回是否命中本人的记录） */
  async remove(id, userId) {
    const res = await query('DELETE FROM custom_tasks WHERE id = ? AND user_id = ?', [id, userId]);
    return res.affectedRows > 0;
  },

  /**
   * 每日重置：把「昨天及以前完成」的勾选清掉。
   * 今日任务语义 = 今天当天要做的事，跨天应默认回到未勾选状态。
   * 读取首页总览前调用，保证用户每天登录看到的今日任务都是未打勾的。
   */
  async resetStaleDone(userId) {
    await query(
      'UPDATE custom_tasks SET status = 0, finished_at = NULL WHERE user_id = ? AND status = 1 AND (finished_at IS NULL OR finished_at < CURDATE())',
      [userId],
    );
  },
};

module.exports = customTaskModel;
module.exports.DEFAULT_TASKS = DEFAULT_TASKS;
