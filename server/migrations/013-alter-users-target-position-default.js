/**
 * 013 用户默认目标岗位改为「国企央企面试」
 * 原因：题库按需求改造后默认岗位为国企央企面试，用户表 target_position 列默认值
 *       仍为「公务员」，导致新注册用户服务端默认岗位是公务员，覆盖前端初始化偏好。
 * 幂等：重复执行结果一致。
 */
const { pool } = require('../models');

async function up() {
  await pool.query(
    "ALTER TABLE users MODIFY `target_position` VARCHAR(64) NOT NULL DEFAULT '国企央企面试' COMMENT '目标岗位（岗位筛选器默认值）'"
  );
  // 存量用户：旧默认值「公务员」全部回填为新默认「国企央企面试」（新用户走列默认值）
  const [r] = await pool.query(
    "UPDATE users SET target_position = '国企央企面试' WHERE target_position = '公务员'"
  );
  console.log(`[migration] 013 users.target_position 默认值已改为 国企央企面试（回填 ${r.affectedRows} 行）`);
}

module.exports = { up };
