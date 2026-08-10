/**
 * 简单日志工具
 * 支持 debug / info / warn / error 四级日志
 * 可根据配置动态调整日志级别
 */
const config = require('../config');

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const currentLevel = LEVELS[config.log.level] || LEVELS.debug;

const logger = {
  /**
   * @param {...*} args - 调试日志参数
   */
  debug(...args) {
    if (currentLevel <= LEVELS.debug) console.log('[DEBUG]', ...args);
  },

  /**
   * @param {...*} args - 信息日志参数
   */
  info(...args) {
    if (currentLevel <= LEVELS.info) console.log('[INFO]', ...args);
  },

  /**
   * @param {...*} args - 警告日志参数
   */
  warn(...args) {
    if (currentLevel <= LEVELS.warn) console.log('[WARN]', ...args);
  },

  /**
   * @param {...*} args - 错误日志参数
   */
  error(...args) {
    if (currentLevel <= LEVELS.error) console.error('[ERROR]', ...args);
  },
};

module.exports = logger;
