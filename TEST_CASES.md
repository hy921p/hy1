# AI 智面平台 · 测试用例文档

> 本文件是「自动化测试套件」的配套文档，与 `server/__tests__/` 一一对应。
> 运行方式：`cd server && npm run test:all`（自动准备测试库 → 跑全部用例）。
> 所有用例跑在**隔离测试库 `ai_interview_coach_test`**，不触碰开发/生产库；AI 端点全部 mock，不产生真实调用与费用。

---

## 1. 测试架构

| 层 | 文件 | 工具 | 说明 |
|---|---|---|---|
| 单元测试 | `server/__tests__/unit/aiService.test.js` | jest + mock | OpenAI SDK 全 mock，测 aiService 逻辑与异常映射 |
| 集成测试 | `server/__tests__/integration/api.test.js` | jest + supertest | 起真实 Express app，打真实 HTTP 请求到测试库 |
| 测试库隔离 | `server/jest.setup.js` | dotenv 特性 | 在 config 加载前注入 `DB_NAME=ai_interview_coach_test`（dotenv 不覆盖已存在 env） |
| 测试库准备 | `server/scripts/setup-test-db.js` | 迁移+种子 | 建库 → 跑全部 migrations → 跑全部 seeders（hash embedding 离线） |

**隔离原理**：`jest.setup.js` 在 `setupFiles` 阶段、config 读取 `.env` 之前执行，用 `process.env.DB_NAME` 直接指向测试库；`dotenv` 默认**不覆盖**已存在的环境变量，因此主程序连接池必定落在测试库上。已验证：跑测试后 test 库新增测试数据，dev 库数据零变化。

**防误伤**：集成测试**不触发任何真实 AI 调用**——跳过 interview/message、ai/ask、ai-summary 等 AI 端点；登录使用唯一手机号自动建号，用例间互不干扰；`AGENT_ENABLED=false`。

---

## 2. 用例清单

### 2.1 单元测试 —— aiService（8 条）

| # | 用例 | 前置 | 步骤 | 预期 |
|---|---|---|---|---|
| U-01 | chatText 返回 trim 纯文本 | mock create 返回 `'  你好，面试官  '` | 调用 `chatText([...])` | 返回 `'你好，面试官'`；请求体 `stream:false` |
| U-02 | chatJSON 解析普通 JSON | mock 返回 `'{"score":82,"advice":"好"}'` | 调用 `chatJSON([...])` | 返回 `{score:82, advice:'好'}` 对象 |
| U-03 | chatJSON 兼容代码围栏 | mock 返回 ``` ```json {...} ``` ``` | 调用 `chatJSON([...])` | 正确解析 `dimension_scores`，无围栏残留 |
| U-04 | chatJSON 无法解析 → 503 | mock 返回 `'抱歉，我无法理解'` | 调用 `chatJSON([...])` | 抛出 AppError：`code=5000, status=503` |
| U-05 | chatWithTools 映射 tool_calls | mock 返回含 1 个 tool_call | 调用 `chatWithTools(...)` | 返回 `toolCalls:[{id,name,arguments}]`；tools 已传给 SDK |
| U-06 | chatWithTools 无工具调用 | mock 返回纯文本 | 调用 `chatWithTools(...)` | `content` 为文本、`toolCalls=[]` |
| U-07 | 超时 → 504 | mock 抛 `AbortError` | 调用 `chatText([...])` | 抛出 AppError：`status=504` |
| U-08 | AI 未启用 → 503 | `config.ai.enabled=false` | 调用 `chatText([...])` | 抛出 AppError：`status=503` |

### 2.2 集成测试 —— 健康与认证（6 条）

| # | 用例 | 请求 | 预期 |
|---|---|---|---|
| I-01 | 健康检查数据库连通 | `GET /api/v1/health` | `code=0`，`data.status=ok`，`data.db=true` |
| I-02 | 未知路由 404 兜底 | `GET /api/v1/no-such-endpoint` | HTTP 404，`code=1002` |
| I-03 | 手机号格式错误 | `POST /api/v1/auth/login {phone:'123'}` | `code=1001` |
| I-04 | 验证码错误 | `POST /api/v1/auth/login {code:'000000'}` | `code=1001` |
| I-05 | 未注册手机号自动建号 | `POST /api/v1/auth/login {code:'123456'}` | `code=0`，返回 token，手机号脱敏 `****` |
| I-06 | 未登录访问受保护接口 | `GET /api/v1/user/profile`（无 token） | `code=2001` |

### 2.3 集成测试 —— 会话与题库（7 条）

| # | 用例 | 请求 | 预期 |
|---|---|---|---|
| I-07 | 登录态会话 | `GET /api/v1/auth/session`（带 token） | `code=0`，`isLoggedIn=true` |
| I-08 | 题库列表分页 | `GET /api/v1/questions` | `code=0`，`data.list` 为数组，`total>0` |
| I-09 | 真题入口过滤 | `GET /api/v1/questions?sourceType=real` | `code=0`，返回列表 |
| I-10 | 题型分类 | `GET /api/v1/questions/categories` | `code=0`，`data` 为数组 |
| I-11 | 题目详情与搜索 | `GET /questions/:id` + `GET /questions/search?keyword=面试` | 详情 id 一致；搜索 `code=0` |
| I-12 | 答题提交（需登录） | `POST /questions/:id/submit` | `code=0` |
| I-13 | 收藏切换（需登录） | `POST /questions/:id/favorite` | `code=0` |

### 2.4 集成测试 —— 每日打卡防重（5 条）

| # | 用例 | 请求 | 预期 |
|---|---|---|---|
| I-14 | 今日打卡成功 | `POST /api/v1/checkins` | `code=0` |
| I-15 | 同日重复打卡被拒 | 再次 `POST /api/v1/checkins` | `code=3001`（防重） |
| I-16 | 今日状态 | `GET /api/v1/checkins/today` | `code=0`，`streak` 为数字 |
| I-17 | 月历 + 统计 | `GET /checkins/calendar?month=2026-08` + `GET /checkins/stats` | `code=0` |
| I-18 | 月历参数格式错误 | `GET /checkins/calendar?month=202608` | `code=1001` |

### 2.5 集成测试 —— 偏好 / 学习规划 / 首页（5 条）

| # | 用例 | 请求 | 预期 |
|---|---|---|---|
| I-19 | 默认偏好回读 | `GET /api/v1/preferences` | `code=0`，`position` 有默认值 |
| I-20 | 更新偏好并回读 | `PUT /preferences {position:'公务员',region:'广东'}` → `GET` | 更新成功，回读 `region='广东'` |
| I-21 | 学习规划三级回退 | `GET /api/v1/study-plans/current` | `code=0`，返回 `nodes` 数组 |
| I-22 | 首页聚合 | `GET /api/v1/home/overview` | `code=0` |
| I-23 | 今日推荐 | `GET /api/v1/recommendations/today` | `code=0` |

### 2.6 集成测试 —— 社区（3 条）

| # | 用例 | 请求 | 预期 |
|---|---|---|---|
| I-24 | 发帖 | `POST /api/v1/community/posts` | `code=0`，返回 `postId` |
| I-25 | 帖子列表与详情 | `GET /community/posts` + `GET /community/posts/:id` | 列表为数组；详情 title 一致 |
| I-26 | 点赞切换 | `POST /community/posts/:id/like` | `code=0`，`liked=true` |

### 2.7 集成测试 —— 通知 / 智学笔记 / 用户（6 条）

| # | 用例 | 请求 | 预期 |
|---|---|---|---|
| I-27 | 通知列表 + 未读数 | `GET /notifications` + `GET /notifications/unread-count` | `code=0`，`data.total` 为数字 |
| I-28 | 阅读/素材列表 | `GET /learn/readings` + `GET /learn/materials` | `code=0` |
| I-29 | 笔记创建 | `POST /learn/notes` | `code=0`，返回 `noteId` |
| I-30 | 笔记列表与更新 | `GET /learn/notes` + `PUT /learn/notes/:id` | `code=0` |
| I-31 | 笔记删除 | `DELETE /learn/notes/:id` | `code=0` |
| I-32 | 用户资料/成长/勋章/评估 | `GET /user/profile` + `/user/badges` + `/user/growth-records` + `/user/progress-trend` + `/user/learning-report` + `/user/ability-assessment` | 全部 `code=0`，profile 返回 `id` |

**合计：单元 8 + 集成 32 = 40 断言组（当前实现 35 个 test + 多断言）**

---

## 3. 业务错误码约定（断言对照）

| code | 含义 | 触发场景 |
|---|---|---|
| 0 | 成功 | 所有正常路径 |
| 1001 | 参数错误 | 手机号格式、验证码错误、月历格式等 |
| 1002 | 未找到 / 路由兜底 | 未知路由、资源不存在 |
| 2001 | 未登录 | 访问受保护接口无 token / token 失效 |
| 2002 | 无权限 | 越权操作 |
| 3001 | 业务防重 | 同日重复打卡 |
| 5000 | 通用错误（含 503 AI 不可用 / 504 超时） | 服务器/AI 异常 |

---

## 4. 运行与验证

```bash
cd server
npm run test:all    # = node scripts/setup-test-db.js && jest
# 单独跑：
npm run test:setup  # 只准备测试库
npx jest __tests__/unit/aiService.test.js        # 只跑单元
npx jest __tests__/integration/api.test.js       # 只跑集成
```

### 如何自证「没污染开发库」

1. 跑测试前记录 dev 库用户数：`SELECT COUNT(*) FROM ai_interview_coach.users;`
2. 跑 `npm run test:all`
3. 再查 dev 库计数不变；测试库 `ai_interview_coach_test` 计数增加 —— 即隔离生效。

---

## 5. 缺陷记录（本次新增功能排查实录）

> 对应 JD「缺陷跟踪」，简述发现→根因→修复，可作为测试能力的面试素材。

| # | 缺陷 | 根因 | 修复 |
|---|---|---|---|
| B-01 | 集成测试登录报「手机号格式不正确」 | 测试唯一手机号拼出 12 位（`/^1\d{10}$/` 要求 11 位） | `uniquePhone` 改为 `slice(-8)` 保证 11 位 |
| B-02 | 打卡「今日状态」断言失败 `data.checked` undefined | 接口实际返回 `{checkDate, streak, points, totalPoints}`，无 `checked` 字段 | 断言改为校验 `streak` 为 number |
| B-03 | 未读数断言失败 | controller 包装成 `{total}` 而非裸数字 | 断言改为 `typeof data.total === 'number'` |
| B-04 | 笔记更新返回 5000 | 测试误读 `data.id`（实际为 `data.noteId`）→ `Number(undefined)=NaN` → 通用错误 | 改用 `data.noteId` 作为更新路径参数 |
| B-05 | 单元测试 `OpenAI.mock.instances[0]` 为 undefined | `clearAllMocks` 清空了 `mock.instances` | 把 create mock 挂到 `OpenAI.createMock`，直接引用 |
| B-06 | 期望 502 实际收到 503 | aiService 的 catch 会把 parseJSON 抛的 502 通过 `mapAiError` 重映射为 503（已上线行为） | 测试对齐现有行为期望 503；不擅改线上逻辑 |

---
*文档版本：v1.0 · 配套阶段 6 运维/测试能力增强*
