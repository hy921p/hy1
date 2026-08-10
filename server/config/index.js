/**
 * 应用配置管理
 * 从 .env 读取配置并集中导出，所有模块通过此文件获取配置
 */
require('dotenv').config();

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,

  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    name: process.env.DB_NAME || 'fanqie_novel',
    dialect: process.env.DB_DIALECT || 'mysql',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    adminSecret: process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET || 'admin-dev-secret',
    adminExpiresIn: process.env.ADMIN_JWT_EXPIRES_IN || '12h',
  },

  redis: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB, 10) || 0,
  },

  log: {
    level: process.env.LOG_LEVEL || 'debug',
    file: process.env.LOG_FILE || 'logs/app.log',
  },

  cors: {
    origin: process.env.CORS_ORIGIN || '*',
  },

  // AI 服务（DeepSeek，OpenAI 兼容协议）— 技术文档 §4.3
  ai: {
    baseURL: process.env.AI_BASE_URL || 'https://api.deepseek.com',
    apiKey: process.env.AI_API_KEY || '',
    model: process.env.AI_MODEL || 'deepseek-chat',
    timeout: parseInt(process.env.AI_TIMEOUT, 10) || 60000,
    maxTokens: parseInt(process.env.AI_MAX_TOKENS, 10) || 4096,
    // 单用户 AI 调用限流：每 windowMs 最多 max 次（超过返回 4001）
    rateLimit: {
      windowMs: parseInt(process.env.AI_RATE_WINDOW, 10) || 60000,
      max: parseInt(process.env.AI_RATE_MAX, 10) || 10,
    },
    // false 时 aiService 直接抛错，用于无 key 环境快速失败
    enabled: process.env.AI_ENABLED !== 'false',

    // V1.1 RAG embedding（§10.2）：远程优先 + 哈希兜底
    embedding: {
      // auto=先远程失败降级哈希 / remote=仅远程 / hash=仅本地哈希
      mode: process.env.EMBEDDING_MODE || 'auto',
      baseURL: process.env.EMBEDDING_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      apiKey: process.env.EMBEDDING_API_KEY || process.env.DASHSCOPE_API_KEY || process.env.OPENAI_API_KEY || '',
      model: process.env.EMBEDDING_MODEL || 'qwen3.7-text-embedding',
      dim: parseInt(process.env.EMBEDDING_DIM, 10) || 1024,
    },
    // V1.1 RAG 向量库（§10.2）：mysql=JSON列+JS余弦（本地兜底） / qdrant=REST（部署）
    vector: {
      mode: process.env.VECTOR_MODE || 'mysql',
      url: process.env.QDRANT_URL || 'http://localhost:6333',
      collection: process.env.QDRANT_COLLECTION || 'knowledge',
      topK: parseInt(process.env.VECTOR_TOP_K, 10) || 5,
    },
    // V2.0 Agent 面试官（§10.3）
    agent: {
      enabled: process.env.AGENT_ENABLED !== 'false',
      maxToolCalls: parseInt(process.env.AGENT_MAX_TOOL_CALLS, 10) || 4,
    },
  },

  // 成长值体系（技术文档 §4.3 / §5.22）——规则与等级阈值集中在 config，不进 DB
  growth: {
    rules: { register: 50, checkin: 10, answer: 5, interview: 100, ai_summary: 20, course: 0, note: 0 },
    // 成长树六档等级：level = 第一个 points>=min 的最高档
    levels: [
      { min: 0, name: '萌芽小苗' },
      { min: 50, name: '稚嫩树苗' },
      { min: 150, name: '成长小树' },
      { min: 300, name: '茁壮小树' },
      { min: 500, name: '茂盛大树' },
      { min: 800, name: '参天大树' },
    ],
  },

  // 岗位/地区偏好默认值与枚举校验（技术文档 §7.1 / §7.4）
  preference: {
    defaultPosition: '公务员',
    defaultRegion: '四川',
    positions: ['公务员', '事业单位', '国企央企面试', '教资面试', '通用'],
    regions: [
      '四川', '广东', '北京', '上海', '浙江', '江苏', '山东', '河南', '湖北',
      '湖南', '重庆', '陕西', '云南', '贵州', '广西', '福建', '江西', '安徽',
      '河北', '山西', '辽宁', '吉林', '黑龙江', '内蒙古', '甘肃', '青海',
      '宁夏', '新疆', '西藏', '海南', '天津', '全国',
    ],
  },
};

module.exports = config;
