/**
 * 种子数据运行器
 * 按序执行所有 seeder 文件的 seed() 方法
 * 使用方式：node scripts/run-seeders.js
 */
const fs = require('fs');
const path = require('path');

async function run() {
  const seedersDir = path.join(__dirname, '..', 'seeders');
  const files = fs.readdirSync(seedersDir)
    .filter(f => f.endsWith('.js'))
    .sort();

  for (const file of files) {
    console.log(`[seeder] 执行: ${file}`);
    const seeder = require(path.join(seedersDir, file));
    try {
      await seeder.seed();
      delete require.cache[require.resolve(path.join(seedersDir, file))];
    } catch (err) {
      console.error(`[seeder] 失败: ${file}`, err.message);
      process.exit(1);
    }
  }

  console.log('[seeder] 全部种子数据执行完成');
  process.exit(0);
}

run();
