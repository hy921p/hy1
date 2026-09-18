/**
 * 数据库连接池初始化
 * 使用 mysql2/promise 创建连接池，提供 query 方法供 Model 层使用
 */
const mysql = require('mysql2/promise');
const config = require('../config');
const logger = require('../utils/logger');

const pool = mysql.createPool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.name,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

/**
 * 执行 SQL 查询
 * @param {string} sql - SQL 语句（使用 ? 占位符）
 * @param {Array} [params=[]] - 参数列表
 * @returns {Promise<Array>} 查询结果行
 */
async function query(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows;
}

/**
 * 获取数据库连接（用于事务）
 * @returns {Promise<import('mysql2/promise').PoolConnection>} 数据库连接
 */
async function getConnection() {
  return pool.getConnection();
}

/**
 * 测试数据库连接是否正常
 * @returns {Promise<boolean>} 连接是否成功
 */
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    logger.info('数据库连接成功');
    connection.release();
    return true;
  } catch (err) {
    logger.error('数据库连接失败', err.message);
    return false;
  }
}

module.exports = { pool, query, getConnection, testConnection };
