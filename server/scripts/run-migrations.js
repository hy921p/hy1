/**
 * 数据库迁移运行器
 * 按序执行所有迁移文件的 up() 方法
 * 使用方式：node scripts/run-migrations.js
 */
const fs = require('fs');
const path = require('path');

async function run() {
  const migrationsDir = path.join(__dirname, '..', 'migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.js'))
    .sort();

  for (const file of files) {
    console.log(`[migration] 执行: ${file}`);
    const migration = require(path.join(migrationsDir, file));
    try {
      await migration.up();
      delete require.cache[require.resolve(path.join(migrationsDir, file))];
    } catch (err) {
      console.error(`[migration] 失败: ${file}`, err.message);
      process.exit(1);
    }
  }

  console.log('[migration] 全部迁移完成');
  process.exit(0);
}

run();
