/**
 * 请求日志中间件（运维用，配合 scripts/analyze-logs.sh）
 * 每个请求写一行 JSON 到 logs/access-YYYY-MM-DD.log：
 *   { ts, method, path, status, duration_ms, user, ip }
 * status >= 500 额外写 logs/error-YYYY-MM-DD.log，供日志分析 / 巡检 / 告警。
 *
 * 特性：
 *   - fail-open：任何日志写入异常都不影响业务（只吞掉错误）；
 *   - 按天分文件 + 换天自动清理旧 stream；
 *   - 首次加载清理 14 天前的旧日志（KEEP_DAYS 可调）。
 * 日志目录已被 .gitignore 排除，不会入库/进镜像。
 */
const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '..', 'logs');
const KEEP_DAYS = 14;

/** 写文件流缓存：key = "日期:文件名" */
const streams = new Map();

function dayStr() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** 获取（或创建）某文件当天的追加流，换天后回收旧流 */
function getStream(name) {
  const day = dayStr();
  const key = `${day}:${name}`;
  let stream = streams.get(key);
  if (!stream) {
    for (const [k, old] of streams) {
      if (!k.startsWith(day)) {
        try { old.end(); } catch (_) { /* ignore */ }
        streams.delete(k);
      }
    }
    if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
    stream = fs.createWriteStream(path.join(LOG_DIR, `${name}-${day}.log`), { flags: 'a' });
    streams.set(key, stream);
  }
  return stream;
}

/** 清理 KEEP_DAYS 天前的日志文件 */
function sweepOld() {
  try {
    const files = fs.readdirSync(LOG_DIR);
    const cutoff = Date.now() - KEEP_DAYS * 24 * 3600 * 1000;
    for (const file of files) {
      const full = path.join(LOG_DIR, file);
      const st = fs.statSync(full);
      if (st.isFile() && st.mtimeMs < cutoff) fs.unlinkSync(full);
    }
  } catch (_) { /* ignore */ }
}

/** Express 中间件：记录请求耗时与状态码 */
function requestLogger(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    try {
      const entry = {
        ts: new Date().toISOString(),
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        duration_ms: Date.now() - start,
        user: req.user ? req.user.id : null,
        ip: req.ip,
      };
      const line = JSON.stringify(entry);
      getStream('access').write(`${line}\n`);
      if (res.statusCode >= 500) getStream('error').write(`${line}\n`);
    } catch (_) { /* fail-open */ }
  });
  next();
}

sweepOld();

module.exports = requestLogger;
