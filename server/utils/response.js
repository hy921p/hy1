/**
 * 统一响应工具函数
 * 所有 API 响应遵循 { code, data, message } 格式
 */

/**
 * 成功响应
 * @param {object} res - Express response 对象
 * @param {*} [data=null] - 响应数据
 * @param {string} [message='success'] - 提示信息
 */
function success(res, data = null, message = 'success') {
  return res.json({ code: 0, data, message });
}

/**
 * 失败响应
 * @param {object} res - Express response 对象
 * @param {number} code - 业务错误码
 * @param {string} message - 错误描述
 * @param {number} [status=200] - HTTP 状态码
 */
function fail(res, code, message, status = 200) {
  return res.status(status).json({ code, data: null, message });
}

/**
 * 分页列表响应
 * @param {object} res - Express response 对象
 * @param {object} params - 分页参数
 * @param {Array} params.list - 当前页数据列表
 * @param {number} params.total - 总条目数
 * @param {number} params.page - 当前页码（从 1 开始）
 * @param {number} params.pageSize - 每页条数
 */
function paginated(res, { list, total, page, pageSize }) {
  const hasMore = page * pageSize < total;
  return res.json({
    code: 0,
    data: { list, total, page, pageSize, hasMore },
    message: 'success',
  });
}

module.exports = { success, fail, paginated };
