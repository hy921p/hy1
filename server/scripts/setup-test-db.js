/**
 * 测试库准备脚本：建库 + 迁移 + 种子（一次跑通）
 * 用法：node scripts/setup-test-db.js
 * 或：npm run test:setup
 * 说明：
 *   - 默认操作 ai_interview_coach_test（可用 TEST_DB_NAME 覆盖），不影响开发库；
 *   - 迁移/种子子进程强制 EMBEDDING_MODE=hash（离线确定，不请求远程 embedding）；
 *   - 全部幂等，重复执行无副作用。
 */
const { spawn } = require('child_process');
const mysql = require('mysql2/promise');
const config = require('../config');

const TEST_DB = process.env.TEST_DB_NAME || 'ai_interview_coach_test';

/** 在子进程中跑迁移/种子，继承父进程输出 */
function run(cmd) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, cmd, {
      env: {
        ...process.env,
        DB_NAME: TEST_DB,
        EMBEDDING_MODE: 'hash',
        AI_ENABLED: 'true',
      },
      stdio: 'inherit',
    });
    child.on('close', (code) => {
      if (code === 0) return resolve();
      reject(new Error(`[test-db] ${cmd.join(' ')} 退出码 ${code}`));
    });
  });
}

async function main() {
  // 1) 建库（用开发库连接信息，只建 test 库）
  const conn = await mysql.createConnection({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
  });
  await conn.query(
    `CREATE DATABASE IF NOT EXISTS \`${TEST_DB}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  await conn.end();
  console.log(`[test-db] 数据库就绪: ${TEST_DB}`);

  // 2) 迁移
  await run(['scripts/run-migrations.js']);
  // 3) 种子
  await run(['scripts/run-seeders.js']);
  console.log('[test-db] 迁移 + 种子完成，可以 npm test');
}

main().catch((err) => {
  console.error('[test-db] 失败:', err.message);
  process.exit(1);
});
