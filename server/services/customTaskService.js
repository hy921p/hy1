/**
 * 今日任务服务（§7.5）
 * 封装校验与业务判断，控制器不直接触碰模型。
 */
const customTaskModel = require('../models/customTask');
const AppError = require('../utils/app-error');

const customTaskService = {
  /** 新增：标题必填，截断 120 字；预计耗时非负整数可空 */
  async create(userId, { title, estMinutes }) {
    const cleanTitle = String(title || '').trim().slice(0, 120);
    if (!cleanTitle) throw new AppError(1001, '任务标题不能为空');
    let minutes = null;
    if (estMinutes !== undefined && estMinutes !== null && estMinutes !== '') {
      minutes = Math.max(0, parseInt(estMinutes, 10) || 0) || null;
    }
    const row = await customTaskModel.create(userId, { title: cleanTitle, estMinutes: minutes });
    return {
      id: row.id,
      title: row.title,
      estMinutes: row.est_minutes,
      isDefault: row.is_default === 1,
      status: row.status,
      createdAt: row.created_at,
    };
  },

  /** 确保默认任务存在（首页今日任务初始化） */
  async ensureDefaults(userId) {
    return customTaskModel.ensureDefaults(userId);
  },

  async list(userId, status) {
    const rows = await customTaskModel.findByUser(userId, { status });
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      estMinutes: r.est_minutes,
      isDefault: r.is_default === 1,
      status: r.status,
      createdAt: r.created_at,
    }));
  },

  /** 设置勾选状态（done=true 勾选完成 / false 取消勾选）；未命中（不存在/非本人）抛错 */
  async markDone(userId, id, done) {
    const ok = await customTaskModel.setStatus(Number(id), userId, done ? 1 : 0);
    if (!ok) throw new AppError(1001, '任务不存在');
    return true;
  },

  /** 删除 */
  async remove(userId, id) {
    const ok = await customTaskModel.remove(Number(id), userId);
    if (!ok) throw new AppError(1001, '任务不存在');
    return true;
  },
};

module.exports = customTaskService;
