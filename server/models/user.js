/**
 * 用户模型
 * 对应 users 表（阶段 0 最小结构，字段随阶段 2 迁移补全）
 */
const { query, getConnection } = require('./index');

const User = {
  /** 按手机号查询用户 */
  async findByPhone(phone) {
    const rows = await query('SELECT * FROM users WHERE phone = ? LIMIT 1', [phone]);
    return rows[0] || null;
  },

  /** 按 ID 查询用户（仅返回前端可见字段） */
  async findById(id) {
    const rows = await query(
      `SELECT id, phone, nickname, avatar, gender, target_position, preferred_region,
              growth_points, check_in_streak, last_check_in_at, total_interviews, avg_score, created_at
       FROM users WHERE id = ? LIMIT 1`,
      [id],
    );
    return rows[0] || null;
  },

  /** 创建用户（注册时自动建号） */
  async create(data) {
    const conn = await getConnection();
    try {
      const [result] = await conn.query(
        `INSERT INTO users (phone, nickname, target_position, preferred_region)
         VALUES (?, ?, ?, ?)`,
        [data.phone, data.nickname, data.targetPosition || '公务员', data.preferredRegion || '四川'],
      );
      return result.insertId;
    } finally {
      conn.release();
    }
  },

  /** 更新用户资料（仅允许白名单字段） */
  async update(id, fields) {
    const allowed = {
      nickname: 'nickname',
      avatar: 'avatar',
      gender: 'gender',
      targetPosition: 'target_position',
      preferredRegion: 'preferred_region',
    };
    const sets = [];
    const params = [];
    for (const [key, col] of Object.entries(allowed)) {
      if (fields[key] !== undefined) {
        sets.push(`${col} = ?`);
        params.push(fields[key]);
      }
    }
    if (!sets.length) return;
    params.push(id);
    await query(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, params);
  },

  /** 更新打卡连续天数（打卡成功后调用） */
  async applyStreak(id, streak) {
    await query(
      'UPDATE users SET check_in_streak = ?, last_check_in_at = NOW() WHERE id = ?',
      [streak, id],
    );
  },

  /** 面试完成次数 +1 且滚动更新平均分（面试结束闭环） */
  async incInterview(id, score) {
    await query(
      `UPDATE users SET total_interviews = total_interviews + 1,
        avg_score = ROUND((avg_score * total_interviews + ?) / (total_interviews + 1), 1)
       WHERE id = ?`,
      [score, id],
    );
  },
};

module.exports = User;
