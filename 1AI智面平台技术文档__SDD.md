# AI智面 — 平台技术文档

> 项目名称：AI智面（AI Interview Coach）
> 文档版本：v2.1 | 编写日期：2026-08-08

> 产品形态：Web 端（用户）+ Web 后台（管理）+ 服务端
> 前端技术：Vue 3 + TypeScript + Vite + Element Plus / Ant Design Vue
> 后端技术：Node.js + Express | 数据库：MySQL（`ai_interview_coach`）
> 认证方式：JWT + bcrypt
> AI 能力：统一 aiService（面试 / 答疑 / 摘要）+ RAG 知识库（V1.1）+ Agent 面试官（V2.0）

## 将来你的项目里可以更进一步：把 AI智面的题库/答疑封装成一个 MCP server

## 目录

### 第一部分 · 项目总览

- [1. 项目概述](#1-项目概述)
- [2. 系统架构](#2-系统架构)
- [3. 技术选型](#3-技术选型)

### 第二部分 · 服务端（Backend）

- [4. 服务端架构与目录结构](#4-服务端架构与目录结构)
- [5. 数据模型设计](#5-数据模型设计)
- [6. 响应格式规范](#6-响应格式规范)
- [7. Web 端 API 设计](#7-web-端-api-设计)
- [8. 管理端 API 设计](#8-管理端-api-设计)
- [9. 认证与安全设计](#9-认证与安全设计)
- [10. AI 能力进阶（RAG + Agent）](#10-ai-能力进阶rag-agent)

### 第三部分 · Web 前端（Frontend）

- [11. Web 端架构与目录结构](#11-web-端架构与目录结构)
- [12. 路由与页面](#12-路由与页面)
- [13. 状态管理与接口封装](#13-状态管理与接口封装)
- [14. 前端功能模块](#14-前端功能模块)

### 第四部分 · Web 后台（Admin Frontend）

- [15. 后台架构与目录结构](#15-后台架构与目录结构)
- [16. 后台路由与权限](#16-后台路由与权限)
- [17. 后台功能模块](#17-后台功能模块)

### 第五部分 · 规范与规划

- [18. 非功能需求](#18-非功能需求)
- [19. 验收标准](#19-验收标准)
- [20. 版本规划](#20-版本规划)
- [21. 项目启动与开发](#21-项目启动与开发)

---

# 第一部分 · 项目总览

## 1. 项目概述

### 1.1 产品定位

AI智面是一款 **AI 驱动的智能面试训练平台**，为公考 / 求职用户提供全流程的面试训练与学习服务：

- **岗位/地区个性化**：用户按岗位（公务员 / 事业单位 / 国企央企面试 / 教资面试）与地区（各省份）设定偏好，系统据此个性化推送题目、热点、面试内容与评分标准
- **全真模拟面试**：AI 面试官一对一模拟，按岗位 / 地区自动匹配面试题型与评分标准
- **智能题库练习**：四入口（热点习题 / 历年真题 / 模拟试卷 / AI 错题本）+ 九大题型分型训练
- **系统化学习**：晨读、面试通识、在线课程、素材库、学习笔记，支持 AI 摘要同步到笔记
- **社区经验共享**：热点话题 / 最新话题 / AI 答疑 三分区，面经发布与点赞互动
- **个人成长追踪**：打卡、成长树、勋章墙、学习报告、能力评估、会员订阅、消息通知
- **AI 能力进阶**：RAG 知识库让答疑 / 面试回答可引用素材与题库（可溯源、减幻觉）；Agent 面试官可主动追问、调用评分工具、检索知识库

### 1.2 产品形态与范围

系统整体分为**三端**，通过 HTTP/HTTPS 通信：

| 端       | 面向对象        | 职责                                 |
| -------- | --------------- | ------------------------------------ |
| Web 端   | 普通用户 / 会员 | 面试训练、题库、学习、社区、个人中心 |
| Web 后台 | 平台管理员      | 数据维护、内容管理、数据看板         |
| 服务端   | —               | 提供 API 接口与数据存储，对接 MySQL  |

**Web 端功能范围**（六大模块，与顶部导航一一对应）：

| 模块 | 说明                                                                      |
| ---- | ------------------------------------------------------------------------- |
| 首页 | 岗位 / 地区筛选器、打卡、学习进度、智能学习规划路径、今日推荐（题目）     |
| 题库 | 搜索框、四入口卡片、九大题型标签、按岗位 / 地区联动出题                   |
| 智学 | 晨读 / 面试通识 / 在线课程 / 素材库 / 我的笔记、今日推荐热点、AI 摘要同步 |
| 智考 | AI 模拟面试、历史考试两入口，按岗位 / 地区匹配题型与评分标准              |
| 社区 | 热点话题 / 最新话题 / AI 答疑 三分区、发布面经、点赞                      |
| 我的 | 个人资料、学习报告、能力评估、勋章墙、消息通知、成长树、会员、设置        |

### 1.3 技术特点

| 维度        | 说明                                                                                         |
| ----------- | -------------------------------------------------------------------------------------------- |
| 前端框架    | Vue 3 Composition API + `<script setup>`                                                     |
| 语言        | TypeScript 严格模式                                                                          |
| UI 组件库   | Web 端 Element Plus；Web 后台 Ant Design Vue + vue-echarts                                   |
| 状态管理    | Pinia（用户 / 岗位地区偏好 / 通知）                                                          |
| 路由模式    | Hash History                                                                                 |
| HTTP 客户端 | Axios（统一请求/响应拦截）                                                                   |
| 后端框架    | Node.js + Express，Controller / Service / Model 分层                                         |
| AI 能力     | 统一 `aiService`（面试 / 答疑 / 摘要）+ `ragService`（检索引用）+ `agentService`（工具调用） |
| 数据库      | MySQL 8 + mysql2 驱动                                                                        |
| 构建工具    | Vite 5                                                                                       |

---

## 2. 系统架构

### 2.1 总体架构

```
┌────────────────────┐     ┌────────────────────┐
│   Web 端（用户）     │     │   Web 后台（管理）   │
│  Vue3 + ElementPlus │     │  Vue3 + AntDesign  │
└─────────┬──────────┘     └─────────┬──────────┘
          │        HTTP / API        │
          └───────────┬──────────────┘
                      ▼
            ┌──────────────────────┐
            │      Node.js 服务端     │
            │   Express · JWT 鉴权    │
            │  aiService + ragService │
            │ embedding + agent      │
            └──────┬───────┬─────┬───┘
                   ▼       ▼     ▼
          ┌─────────────┐ ┌──────────────┐ ┌─────────────┐  ┌─────────────┐
          │   MySQL 数据库 │ │   向量库       │ │  本地文件存储  │  │  大模型 API    │
          │ ai_interview │ │ Qdrant/Milvus│ │  /uploads    │  │ DeepSeek 等  │
          └─────────────┘ └──────────────┘ └─────────────┘  └─────────────┘
```

> **说明**：`aiService` 为统一 AI 抽象层，AI 模拟面试（多轮流式）、AI 答疑（单轮）、AI 摘要（笔记）共用同一底层 LLM 调用，仅 prompt 模板与流式策略不同；对 LLM 调用做按用户限流与超时降级。
> `ragService` 负责知识检索（向量 + 关键词混合）与引用组装；`agentService` 负责 Agent 面试官的工具调用编排。三者分层协作，详见 [10. AI 能力进阶（RAG + Agent）](#10-ai-能力进阶rag-agent)。

### 2.2 服务端分层架构

| 层次                     | 说明                                                          |
| ------------------------ | ------------------------------------------------------------- |
| 路由层（routes）         | 定义 RESTful 接口：C 端 `/api/v1/*`，管理端 `/api/admin/*`    |
| 控制层（controllers）    | 参数校验、调用服务、统一响应包装                              |
| 服务层（services）       | 业务逻辑、事务控制、状态流转、`aiService`、`growthService`    |
| 模型层（models）         | 数据访问（SQL 查询封装）                                      |
| 中间件（middleware）     | JWT 鉴权、管理员鉴权、权限点校验、错误处理、请求日志、AI 限流 |
| 公共模块（utils/config） | 配置管理、统一响应、日志、业务异常                            |

### 2.3 端到端请求链路

```
Web端/后台 → Axios 拦截器（注入 Token + 岗位地区偏好）→ Express 路由
    → 鉴权中间件 → Controller → Service → Model → MySQL
    → 统一响应 { code, data, message }
    → AI 类接口：Service → aiService → 大模型 API → 流式/非流式返回
```

开发环境下，Web 端通过 Vite 代理将 `/api` 转发到 `http://localhost:3000`（后端端口）。

### 2.4 AI 能力架构（aiService / ragService / agentService）

| 服务               | 职责                                                           | 归属版本 |
| ------------------ | -------------------------------------------------------------- | -------- |
| `aiService`        | LLM 底层封装：模型调用、流式 / 非流式、超时、限流、降级        | V1.0     |
| `ragService`       | 知识检索：向量 + 关键词混合、岗位 / 地区过滤、上下文与引用组装 | V1.1     |
| `embeddingService` | 文本向量化：分块 → embedding → 向量库读写，被 ragService 依赖  | V1.1     |
| `agentService`     | Agent 面试官：工具定义解析、工具调用循环、日志与回退           | V2.0     |

> 版本增量启用：V1.0 仅启用 `aiService`（规则编排版面试）；V1.1 接入 `ragService` 增强 AI 答疑；V2.0 启用 `agentService` 将面试官升级为工具调用型 Agent。各服务对外接口与数据模型向后兼容。

---

## 3. 技术选型

### 3.1 前端

| 端       | 技术栈                      | 说明                                                  |
| -------- | --------------------------- | ----------------------------------------------------- |
| Web 端   | Vue 3 + TypeScript + Vite 5 | Element Plus + @element-plus/icons-vue                |
| Web 端   | Pinia + Vue Router 4        | Hash 路由，导航守卫控制登录态                         |
| Web 端   | Axios                       | 统一封装，Token 注入，401 自动跳登录                  |
| Web 端   | Tailwind CSS                | 样式方案（utility-first）                             |
| Web 端   | setInterval 轮询            | 消息通知未读数 30s 轮询（V1.0 不引入 WebSocket/推送） |
| Web 后台 | Vue 3 + TypeScript + Vite   | Ant Design Vue + @ant-design/icons-vue                |
| Web 后台 | vue-echarts + echarts       | 数据看板图表                                          |
| Web 后台 | dayjs                       | 日期处理                                              |

### 3.2 后端

| 技术              | 说明                                                                                      |
| ----------------- | ----------------------------------------------------------------------------------------- |
| Node.js + Express | RESTful API 服务框架                                                                      |
| mysql2            | MySQL 驱动                                                                                |
| jsonwebtoken      | JWT 签发与校验（C 端 7 天 / 管理端 12 小时）                                              |
| bcryptjs          | 密码加密                                                                                  |
| dotenv            | 环境配置管理                                                                              |
| cors              | 跨域配置                                                                                  |
| jest + supertest  | 单元测试与接口测试                                                                        |
| 大模型 SDK        | DeepSeek / OpenAI 兼容接口，统一 `aiService` 封装（流式、超时、限流、工具调用）           |
| 向量库            | Qdrant（Docker，开发 / 生产默认）/ Milvus（生产大规模可选）；无 Docker 时 sqlite-vec 降级 |
| Embedding 模型    | 文本向量化（如 BGE-M3 / text-embedding），统一封装于 `embeddingService`                   |
| 工具调用          | 大模型 function calling / tool use，支撑 Agent 面试官（V2.0）                             |

---

# 第二部分 · 服务端（Backend）

## 4. 服务端架构与目录结构

### 4.1 目录结构

```
server/
├── index.js                   # 启动入口
├── app.js                     # Express 应用（中间件 + 路由注册）
├── config/index.js            # 配置（端口、数据库、JWT、AI、日志）
├── middleware/                # 中间件
│   ├── auth.js                # C 端 JWT 鉴权
│   ├── admin-auth.js          # 管理端 JWT 鉴权（role: admin）
│   ├── require-permission.js  # 权限点校验
│   ├── preference.js          # 岗位/地区默认注入（读偏好，未登录回退 公务员/四川）
│   ├── ai-rate-limit.js       # AI 接口限流（按用户/频率）
│   └── error-handler.js       # 全局错误处理
├── routes/                    # 路由定义
│   ├── auth.js  user.js  preference.js  checkin.js
│   ├── recommendation.js  study-plan.js  interview.js
│   ├── question.js  mock-paper.js  scenario.js
│   ├── community.js  ai.js  membership.js  notification.js
│   ├── learn.js               # 晨读/素材/通识/课程/笔记/AI 摘要/进度
│   ├── admin-auth.js  admin-dashboard.js  admin-users.js
│   ├── admin-scenarios.js  admin-questions.js  admin-interviews.js
│   ├── admin-posts.js  admin-membership.js
│   ├── admin-content.js       # 晨读/素材/通识/课程/热点内容
│   ├── admin-mock-papers.js  admin-study-plans.js  admin-badges.js
│   ├── admin-notifications.js  admin-behavior.js  # 打卡/答题/AI答疑/笔记/成长规则
│   ├── admin-knowledge.js     # RAG 知识库管理（文档 / 索引重建）
│   ├── admin-agent.js         # Agent 工具配置 / 工具调用日志
│   └── admin-roles.js  admin-permissions.js  admin-admins.js
├── controllers/               # 控制器
├── services/                  # 业务逻辑
│   ├── aiService.js           # AI 底层封装（面试/答疑/摘要，prompt 模板 + 流式 + 限流 + 工具回调）
│   ├── ragService.js          # RAG 检索（向量 + 关键词混合、岗位/地区过滤、上下文与引用组装）
│   ├── embeddingService.js    # 文本向量化（分块 → embedding → 向量库读写）
│   ├── agentService.js        # Agent 面试官（工具白名单校验、工具调用循环、日志与回退）
│   ├── growthService.js       # 成长值统一发放（grant 入口）
│   ├── badgeService.js        # 勋章判定 + 懒扫描补发
│   └── ...
├── models/                    # 数据访问
├── migrations/                # 数据库迁移脚本（先改表后建表）
├── seeders/                   # 种子数据（岗位/地区/九题型字典、默认规划、勋章规则等）
├── uploads/                   # 文件上传目录
├── utils/                     # response.js / app-error.js / logger.js
└── __tests__/                 # 测试
```

### 4.2 路由注册（app.js）

| 前缀                                     | 路由文件                   | 用途                                       |
| ---------------------------------------- | -------------------------- | ------------------------------------------ |
| `/api/v1/auth`                           | auth.js                    | C 端认证                                   |
| `/api/v1/user`                           | user.js                    | C 端用户                                   |
| `/api/v1/preferences`                    | preference.js              | 岗位/地区偏好                              |
| `/api/v1/checkins`                       | checkin.js                 | 打卡                                       |
| `/api/v1/recommendations`                | recommendation.js          | 今日推荐                                   |
| `/api/v1/study-plans`                    | study-plan.js              | 智能学习规划                               |
| `/api/v1/interviews` `/api/v1/scenarios` | interview.js / scenario.js | 智考                                       |
| `/api/v1/questions`                      | question.js                | 题库（四入口/九题型/AI 错题本）            |
| `/api/v1/mock-papers`                    | mock-paper.js              | 模拟试卷                                   |
| `/api/v1/community/posts`                | community.js               | 社区                                       |
| `/api/v1/ai`                             | ai.js                      | AI 答疑                                    |
| `/api/v1/learn`                          | learn.js                   | 智学（晨读/通识/课程/素材/笔记/摘要/进度） |
| `/api/v1/membership`                     | membership.js              | 会员                                       |
| `/api/v1/notifications`                  | notification.js            | 消息通知                                   |
| `/api/v1/ai/context`                     | ai.js                      | RAG 检索预览（展示可引用素材）             |
| `/api/admin/knowledge`                   | admin-knowledge.js         | 知识库文档管理 / 索引重建                  |
| `/api/admin/agent`                       | admin-agent.js             | Agent 工具配置 / 工具调用日志              |
| `/api/admin`                             | admin-\*.js                | 管理端全部模块                             |

### 4.3 配置项（config/index.js）

| 配置                             | 默认值                                                                                   | 说明                                  |
| -------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------- |
| port                             | 3000                                                                                     | 服务端口                              |
| db.host / port                   | 127.0.0.1 / 3306                                                                         | MySQL 连接                            |
| db.user / password               | root / ''                                                                                | 数据库账号                            |
| db.name                          | ai_interview_coach                                                                       | 数据库名                              |
| jwt.secret / expiresIn           | dev-secret / 7d                                                                          | C 端 JWT                              |
| jwt.adminSecret / adminExpiresIn | — / 12h                                                                                  | 管理端 JWT                            |
| jwt.adminRole                    | admin                                                                                    | 管理员角色标识                        |
| ai.baseURL / apiKey / model      | DeepSeek 兼容接口 / — / deepseek-chat                                                    | 大模型接入                            |
| ai.timeout / maxTokens           | 60000 / 4096                                                                             | AI 调用超时与上限                     |
| ai.rateLimit                     | 10 次/分钟/用户                                                                          | AI 接口限流                           |
| growth.rules                     | register:50 / checkin:10 / answer:5 / interview:100 / ai_summary:20                      | 成长值事件分值配置                    |
| preference.default               | 公务员 / 四川                                                                            | 岗位地区默认值                        |
| vector.db / url / apiKey         | qdrant / http://localhost:6333 / —                                                       | 向量库类型与连接                      |
| embedding.model / dim            | BGE-M3 / 1024                                                                            | 向量化模型与维度                      |
| rag.topK / chunkSize             | 5 / 500                                                                                  | 检索条数与分块大小                    |
| agent.enabled                    | false                                                                                    | Agent 面试官开关（V1.0 关 / V2.0 开） |
| agent.tools                      | retrieve_knowledge / score_answer / generate_followup / next_question / finish_interview | 工具白名单                            |

---

## 5. 数据模型设计

### 5.1 核心实体关系

```
Admin ──N:1── Role ──N:M── Permission                    （后台 RBAC）
User ──1:N── InterviewSession ──1:N── InterviewMessage
InterviewSession ──1:1── Report
User ──1:N── Post ──1:N── PostLike
User ──N:M── MembershipPlan（UserMembership 订阅）
User ──1:N── UserProgress
Scenario ──1:N── Question
User ──1:N── CheckIn            （打卡）
User ──1:N── AnswerRecord       （答题记录）
User ──1:N── WrongAnswer        （AI 错题本）
User ──1:N── LearningNote       （学习笔记）
User ──1:N── Notification       （消息通知）
User ──1:N── AiAnswer           （AI 答疑）
User ──1:N── GrowthRecord       （成长值日志）
User ──N:M── Badge（UserBadge）  （勋章）
StudyPlan ──1:N── StudyPlanNode  （学习规划）
MockPaper ──N:M── Question（MockPaperQuestion）  （模拟试卷）
Reading / Material / Basic / Course / HotTopic      （学习内容，按岗位/地区）
KnowledgeDoc ──1:N── KnowledgeChunk   （RAG 知识库：文档 → 分块 → 向量）
AgentTool ──1:N── AgentToolLog        （Agent 面试官：工具定义 → 调用日志）
InterviewSession ──1:N── AgentToolLog （工具调用归属面试会话，审计/看板）
```

### 5.2 字典与枚举

**岗位（position）**：`公务员`、`事业单位`、`国企央企面试`、`教资面试`、`通用`

**地区（region）**：全国 34 个省级行政区（北京、上海、广东、四川……），另设 `全国` 作为通用值

**九大题型（category）**：`社会现象`、`态度观点`、`组织管理`、`应急应变`、`人际关系`、`情景模拟`、`自我认知`、`专业题`、`开放论述`

**题目来源（source_type）**：`hot` 热点习题 / `real` 历年真题 / `mock` 模拟试卷 / `normal` 专项普通

**成长值事件类型（growth type）**：`register` 注册、`checkin` 打卡、`answer` 答题、`interview` 面试、`ai_summary` AI 摘要、`course` 课程、`note` 笔记

### 5.3 users（用户表）

| 字段                      | 类型              | 约束                      | 说明                         |
| ------------------------- | ----------------- | ------------------------- | ---------------------------- |
| id                        | BIGINT UNSIGNED   | PK, AUTO_INCREMENT        | 用户 ID                      |
| phone                     | VARCHAR(20)       | UNIQUE, NOT NULL          | 手机号（登录账号）           |
| nickname                  | VARCHAR(50)       | NOT NULL DEFAULT '学员'   | 昵称                         |
| avatar                    | VARCHAR(512)      | NULL                      | 头像地址                     |
| gender                    | TINYINT           | NULL                      | 性别                         |
| target_position           | VARCHAR(64)       | NOT NULL DEFAULT '公务员' | 岗位偏好（首页筛选器）       |
| preferred_region          | VARCHAR(50)       | NOT NULL DEFAULT '四川'   | 地区偏好（首页筛选器）       |
| target_industry           | VARCHAR(64)       | NULL                      | 目标行业（已废弃，兼容保留） |
| years_of_exp              | INT               | NULL                      | 工作年限                     |
| resume_url / resume_text  | VARCHAR(512)/TEXT | NULL                      | 简历文件 / 简历文本          |
| growth_points             | INT               | NOT NULL DEFAULT 0        | 成长值合计（缓存）           |
| check_in_streak           | INT               | NOT NULL DEFAULT 0        | 连续打卡天数（缓存）         |
| last_check_in_at          | DATETIME          | NULL                      | 最近打卡时间                 |
| banned_at / banned_reason | DATETIME/VARCHAR  | NULL                      | 封禁信息                     |
| created_at / updated_at   | DATETIME          | NOT NULL                  | 时间戳                       |

**索引：** `idx_phone` on `phone`；`idx_pos_reg` on `target_position, preferred_region`

### 5.4 admins（管理员表）

| 字段                    | 类型            | 约束               | 说明                    |
| ----------------------- | --------------- | ------------------ | ----------------------- |
| id                      | BIGINT UNSIGNED | PK, AUTO_INCREMENT | 管理员 ID               |
| username                | VARCHAR(50)     | UNIQUE, NOT NULL   | 登录用户名              |
| password_hash           | VARCHAR(128)    | NOT NULL           | 密码哈希（bcrypt）      |
| nickname                | VARCHAR(50)     | NULL               | 显示昵称                |
| role_id                 | BIGINT UNSIGNED | FK -> roles.id     | 所属角色                |
| status                  | TINYINT         | NOT NULL DEFAULT 1 | 状态（1 启用 / 0 停用） |
| created_at / updated_at | DATETIME        | NOT NULL           | 时间戳                  |

### 5.5 roles / permissions（角色 / 权限表）

**roles：** id、name（角色名）、code（角色编码）、description

**permissions：** id、name、code（权限点编码）、type（菜单 / 按钮 / 接口）

> 通过 `admin_roles`、`role_permissions` 关联表建立 RBAC 关系，`require-permission.js` 中间件按权限点 code 校验接口访问。内容管理类权限点示例：`content:reading:read`、`content:reading:write`、`plan:read`、`badge:write` 等。

### 5.6 scenarios（面试场景表）

| 字段                    | 类型            | 约束               | 说明                       |
| ----------------------- | --------------- | ------------------ | -------------------------- |
| id                      | BIGINT UNSIGNED | PK, AUTO_INCREMENT | 场景 ID                    |
| title                   | VARCHAR(100)    | NOT NULL           | 场景名称                   |
| position                | VARCHAR(50)     | NULL               | 岗位（公务员/事业单位/…）  |
| region                  | VARCHAR(50)     | NULL               | 地区（NULL/全国 表示通用） |
| industry                | VARCHAR(50)     | NULL               | 所属行业                   |
| type                    | TINYINT         | NULL               | 场景类型                   |
| difficulty              | TINYINT         | NULL               | 难度（初级/中级/高级）     |
| cover                   | VARCHAR(512)    | NULL               | 封面图                     |
| description             | TEXT            | NULL               | 场景描述                   |
| created_at / updated_at | DATETIME        | NOT NULL           | 时间戳                     |

**索引：** `idx_scenario_pos_reg` on `position, region`

### 5.7 questions（题目表）

| 字段                    | 类型            | 约束                      | 说明                                                 |
| ----------------------- | --------------- | ------------------------- | ---------------------------------------------------- |
| id                      | BIGINT UNSIGNED | PK, AUTO_INCREMENT        | 题目 ID                                              |
| content                 | TEXT            | NOT NULL                  | 题目内容                                             |
| category                | VARCHAR(50)     | NOT NULL                  | 九大题型（社会现象/态度观点/…）                      |
| position                | VARCHAR(50)     | NULL                      | 岗位（NULL/通用 = 全岗位）                           |
| region                  | VARCHAR(50)     | NULL                      | 地区（NULL/全国 = 通用）                             |
| source_type             | VARCHAR(20)     | NOT NULL DEFAULT 'normal' | 来源：hot 热点 / real 真题 / mock 试卷 / normal 专项 |
| difficulty              | TINYINT         | NULL                      | 难度（1 简单 / 2 中等 / 3 难）                       |
| answer                  | TEXT            | NULL                      | 参考回答                                             |
| year                    | INT             | NULL                      | 真题年份（source_type=real 时有效）                  |
| created_at / updated_at | DATETIME        | NOT NULL                  | 时间戳                                               |

**索引：** `idx_q_pos_reg_cat` on `position, region, category`；`idx_q_source` on `source_type`

> **出题规则**：按岗位 / 地区查询时，先精确匹配 `position=偏好岗位 AND region=偏好地区`，未命中则回退 `position=偏好岗位 AND (region='全国' OR region IS NULL)`，再回退 `position IS NULL/通用`。组合索引保证该回退查询走索引。

### 5.8 interview_sessions（面试会话表）

| 字段                    | 类型            | 约束                     | 说明                           |
| ----------------------- | --------------- | ------------------------ | ------------------------------ |
| id                      | BIGINT UNSIGNED | PK, AUTO_INCREMENT       | 会话 ID                        |
| user_id                 | BIGINT UNSIGNED | FK -> users.id, NOT NULL | 所属用户                       |
| scenario_id             | BIGINT UNSIGNED | FK -> scenarios.id       | 面试场景                       |
| scenario_name           | VARCHAR(100)    | NULL                     | 场景名称快照                   |
| position                | VARCHAR(50)     | NULL                     | 岗位快照（能力评估按岗位聚合） |
| region                  | VARCHAR(50)     | NULL                     | 地区快照                       |
| mode                    | TINYINT         | NOT NULL DEFAULT 0       | 面试模式                       |
| status                  | TINYINT         | NOT NULL DEFAULT 1       | 状态（1 进行中 / 3 已完成）    |
| current_index           | INT             | NOT NULL DEFAULT 0       | 当前题号                       |
| total_questions         | INT             | NOT NULL DEFAULT 0       | 题目总数                       |
| duration                | INT             | NOT NULL DEFAULT 0       | 时长（秒）                     |
| score                   | DECIMAL         | NULL                     | 最终得分                       |
| finished_at             | DATETIME        | NULL                     | 完成时间                       |
| created_at / updated_at | DATETIME        | NOT NULL                 | 时间戳                         |

**索引：** `idx_user_created` on `user_id, created_at DESC`

### 5.9 interview_messages（面试消息表）

| 字段         | 类型            | 约束                                  | 说明      |
| ------------ | --------------- | ------------------------------------- | --------- |
| id           | BIGINT UNSIGNED | PK, AUTO_INCREMENT                    | 消息 ID   |
| interview_id | BIGINT UNSIGNED | FK -> interview_sessions.id, NOT NULL | 所属会话  |
| role         | VARCHAR(10)     | NOT NULL                              | ai / user |
| content      | TEXT            | NOT NULL                              | 消息内容  |
| created_at   | DATETIME        | NOT NULL                              | 时间戳    |

### 5.10 reports（面试报告表）

| 字段                    | 类型            | 约束               | 说明       |
| ----------------------- | --------------- | ------------------ | ---------- |
| id                      | BIGINT UNSIGNED | PK, AUTO_INCREMENT | 报告 ID    |
| interview_id            | BIGINT UNSIGNED | FK, NOT NULL       | 关联会话   |
| dimensions              | JSON / TEXT     | NULL               | 多维度评分 |
| strengths               | TEXT            | NULL               | 优势分析   |
| improvements            | TEXT            | NULL               | 待改进项   |
| created_at / updated_at | DATETIME        | NOT NULL           | 时间戳     |

### 5.11 posts / post_likes（帖子 / 点赞表）

**posts：** id、user_id（FK）、title、content、position（岗位标签）、region（地区标签）、view_count（INT DEFAULT 0）、like_count（INT DEFAULT 0）、status、created_at、updated_at

**post_likes：** id、post_id（FK）、user_id（FK），唯一约束 `uk_post_user` on `post_id, user_id`

> 社区热度计算型排序：热点话题按 `like_count * 2 + view_count` 加权，最新话题按 `created_at DESC`。

### 5.12 membership_plans / user_memberships（会员方案 / 订阅表）

**membership_plans：** id、name（方案名）、price（DECIMAL）、duration（INT，天数）、features（TEXT，权益说明）

**user_memberships：** id、user_id（FK）、plan_id（FK）、status（订阅状态）、start_date、end_date、auto_renew（TINYINT，是否自动续费）、created_at、updated_at

### 5.13 user_progress（学习进度表）

| 字段                    | 类型            | 约束               | 说明                                                                |
| ----------------------- | --------------- | ------------------ | ------------------------------------------------------------------- |
| id                      | BIGINT UNSIGNED | PK, AUTO_INCREMENT | 主键                                                                |
| user_id                 | BIGINT UNSIGNED | FK, NOT NULL       | 所属用户                                                            |
| type                    | VARCHAR(20)     | NOT NULL           | 进度类型（reading / question / course / interview / study_plan 等） |
| target_id               | BIGINT          | NULL               | 目标对象 ID                                                         |
| progress                | INT             | DEFAULT 0          | 进度值                                                              |
| created_at / updated_at | DATETIME        | NOT NULL           | 时间戳                                                              |

> 智能学习规划的节点完成状态复用本表（type='study_plan'，target_id=节点 ID，progress=100）。

### 5.14 check_ins（打卡表）

| 字段       | 类型            | 约束                     | 说明           |
| ---------- | --------------- | ------------------------ | -------------- |
| id         | BIGINT UNSIGNED | PK, AUTO_INCREMENT       | 打卡 ID        |
| user_id    | BIGINT UNSIGNED | FK -> users.id, NOT NULL | 所属用户       |
| check_date | DATE            | NOT NULL                 | 打卡日期       |
| points     | INT             | NOT NULL DEFAULT 10      | 本次获得成长值 |
| created_at | DATETIME        | NOT NULL                 | 时间戳         |

**唯一约束：** `uk_user_date` on `user_id, check_date`（当天重复打卡返回业务码 3001）

> 连续打卡天数在打卡时计算：若 `last_check_in_at` 为昨天则 `check_in_streak + 1`，否则重置为 1；写入 users 缓存字段。

### 5.15 answer_records / wrong_answers（答题记录 / AI 错题本）

**answer_records：** id、user_id（FK）、question_id（FK）、is_correct（TINYINT）、answer_time（INT 秒）、category（题型快照）、position（岗位快照）、created_at。索引 `idx_ar_user` on `user_id, created_at`、`idx_ar_q` on `question_id`

**wrong_answers：** id、user_id（FK）、question_id（FK）、wrong_count（INT 错次数）、ai_analysis（TEXT，AI 错题解析）、mastered（TINYINT 是否掌握）、last_wrong_at、created_at/updated_at。唯一约束 `uk_wrong_user_q` on `user_id, question_id`

> 答题提交时：答对写 answer_records 并加分；答错写/累加 wrong_answers，并触发 `aiService` 生成错题解析写入 ai_analysis。

### 5.16 mock_papers / mock_paper_questions（模拟试卷）

**mock_papers：** id、title、position、region、difficulty、total_questions、duration（分钟）、cover、is_active、created_at/updated_at。索引 `idx_paper_pos` on `position, region, is_active`

**mock_paper_questions：** id、paper_id（FK）、question_id（FK）、sort_order。唯一约束 `uk_paper_q` on `paper_id, question_id`

### 5.17 学习内容表 readings / materials / basics / courses / hot_topics

| 表         | 关键字段                                                                                                     | 说明                                                                            |
| ---------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| readings   | id、title、position、region、summary、content、cover、publish_date、is_hot、is_active、created_at/updated_at | 晨读，索引 `idx_read_pos` on `publish_date, position, region`                   |
| materials  | id、title、position、type（金句/案例/名言）、content、is_active、created_at/updated_at                       | 素材库                                                                          |
| basics     | id、title、position、category、content、is_active、created_at/updated_at                                     | 面试通识                                                                        |
| courses    | id、title、position、cover、video_url、duration、teacher、description、is_active、created_at/updated_at      | 在线课程                                                                        |
| hot_topics | id、title、summary、content、position、region、cover、views、publish_date、is_active、created_at/updated_at  | 热点内容（智学今日推荐），索引 `idx_ht_pos` on `publish_date, position, region` |

### 5.18 learning_notes（学习笔记表）

| 字段                    | 类型            | 约束                     | 说明                                   |
| ----------------------- | --------------- | ------------------------ | -------------------------------------- |
| id                      | BIGINT UNSIGNED | PK, AUTO_INCREMENT       | 笔记 ID                                |
| user_id                 | BIGINT UNSIGNED | FK -> users.id, NOT NULL | 所属用户                               |
| title                   | VARCHAR(200)    | NOT NULL                 | 标题                                   |
| content                 | TEXT            | NOT NULL                 | 内容                                   |
| source_type             | VARCHAR(20)     | NULL                     | 来源：manual 手写 / ai_summary AI 摘要 |
| source_id               | BIGINT          | NULL                     | 来源内容 ID（晨读/热点/题目等）        |
| source_title            | VARCHAR(200)    | NULL                     | 来源标题                               |
| is_ai_summary           | TINYINT         | NOT NULL DEFAULT 0       | 是否 AI 摘要生成                       |
| status                  | TINYINT         | NOT NULL DEFAULT 1       | 状态                                   |
| created_at / updated_at | DATETIME        | NOT NULL                 | 时间戳                                 |

**索引：** `idx_note_user` on `user_id, created_at`

### 5.19 notifications（消息通知表）

| 字段       | 类型            | 约束                     | 说明                                                                 |
| ---------- | --------------- | ------------------------ | -------------------------------------------------------------------- |
| id         | BIGINT UNSIGNED | PK, AUTO_INCREMENT       | 通知 ID                                                              |
| user_id    | BIGINT UNSIGNED | FK -> users.id, NOT NULL | 接收用户                                                             |
| type       | VARCHAR(20)     | NOT NULL                 | 类型：system / like / ai_answer / achievement / membership / checkin |
| title      | VARCHAR(200)    | NOT NULL                 | 标题                                                                 |
| content    | TEXT            | NOT NULL                 | 内容                                                                 |
| payload    | JSON            | NULL                     | 跳转数据（路由、对象 ID）                                            |
| is_read    | TINYINT         | NOT NULL DEFAULT 0       | 是否已读                                                             |
| read_at    | DATETIME        | NULL                     | 已读时间                                                             |
| created_at | DATETIME        | NOT NULL                 | 时间戳                                                               |

**索引：** `idx_noti_user` on `user_id, is_read, created_at`

### 5.20 ai_answers（AI 答疑表）

| 字段       | 类型            | 约束                     | 说明                                        |
| ---------- | --------------- | ------------------------ | ------------------------------------------- |
| id         | BIGINT UNSIGNED | PK, AUTO_INCREMENT       | 答疑 ID                                     |
| user_id    | BIGINT UNSIGNED | FK -> users.id, NOT NULL | 提问用户                                    |
| question   | TEXT            | NOT NULL                 | 问题                                        |
| answer     | TEXT            | NOT NULL                 | AI 回答                                     |
| category   | VARCHAR(20)     | NULL                     | 来源分区：community / interview / knowledge |
| ref_type   | VARCHAR(20)     | NULL                     | 关联对象类型（post / question）             |
| ref_id     | BIGINT          | NULL                     | 关联对象 ID                                 |
| entry      | VARCHAR(20)     | NULL                     | 入口：home / learn / community              |
| created_at | DATETIME        | NOT NULL                 | 时间戳                                      |

**索引：** `idx_ai_user` on `user_id, created_at`

### 5.21 badges / user_badges（勋章表）

**badges：** id、name、code（UNIQUE）、icon、description、condition_type（checkin_days / interview_count / score_threshold / growth_points / answer_count）、condition_value（INT）、sort、is_active

**user_badges：** id、user_id（FK）、badge_id（FK）、earned_at，唯一约束 `uk_user_badge` on `user_id, badge_id`

> 颁发机制：事件触发判定 + 进入勋章墙页面时懒扫描补发（双保险，防事件漏发）。

### 5.22 growth_records（成长值日志表）

| 字段       | 类型            | 约束                     | 说明               |
| ---------- | --------------- | ------------------------ | ------------------ |
| id         | BIGINT UNSIGNED | PK, AUTO_INCREMENT       | 日志 ID            |
| user_id    | BIGINT UNSIGNED | FK -> users.id, NOT NULL | 所属用户           |
| type       | VARCHAR(20)     | NOT NULL                 | 事件类型（见 5.2） |
| points     | INT             | NOT NULL                 | 本次成长值         |
| remark     | VARCHAR(200)    | NULL                     | 备注               |
| created_at | DATETIME        | NOT NULL                 | 时间戳             |

**索引：** `idx_growth_user` on `user_id, created_at`

> 统一通过 `growthService.grant(userId, type, points, remark)` 写日志并累加到 users.growth_points，加分逻辑不散落各业务。

### 5.23 study_plans / study_plan_nodes（智能学习规划）

**study_plans：** id、name、position、region（可空 = 通用）、description、is_default、is_active、created_at/updated_at。索引 `idx_plan_pos` on `position, is_active`

**study_plan_nodes：** id、plan_id（FK）、title、node_type（checkin / reading / question / course / interview / review）、target_type、target_id（可空）、est_minutes、sort_order、required、created_at/updated_at。索引 `idx_plan_node` on `plan_id, sort_order`

> 节点完成状态写入 user_progress（type='study_plan'）。查询时按岗位/地区匹配规划，未命中回退通用规划。

### 5.24 计算型 vs 落表设计

| 功能         | 方案                                                                    | 理由                                                        |
| ------------ | ----------------------------------------------------------------------- | ----------------------------------------------------------- |
| 成长树等级   | 计算型：由 users.growth_points 映射阈值                                 | 等级是成长值的纯函数；growth_records 落表仅作明细审计       |
| 勋章         | 半落表：badges 定义 + user_badges 已获记录落表                          | 可展示获得时间与勋章墙历史，后台可配规则；事件触发 + 懒扫描 |
| 能力评估     | 计算型：answer_records 分题型正确率 + reports 维度分聚合，可加 60s 缓存 | 无新增表、口径实时；高频页用缓存兜底                        |
| 学习规划路径 | 落表：study_plans + study_plan_nodes                                    | 规划是后台可编辑的内容资产；节点进度复用 user_progress      |
| 今日推荐     | 计算型：按岗位/地区从 questions(source_type=hot) 与 hot_topics 加权取   | 联动动态变化，免每日生成任务；后台用 is_hot/权重间接干预    |
| 社区热点话题 | 计算型：posts 按 like/view 加权排序                                     | 仅排序参数不同，无额外表                                    |

### 5.25 knowledge_docs / knowledge_chunks（RAG 知识库表）

**knowledge_docs：** id、source_type（materials / questions / readings / basics / hot_topics）、source_id（来源记录 ID，可空）、title、content（TEXT，全文）、position（岗位，可空）、region（地区，可空）、status（VARCHAR，pending / embedding / indexed / failed）、chunk_count（INT DEFAULT 0）、is_active（TINYINT）、created_at/updated_at。唯一约束 `uk_kdoc_source` on `source_type, source_id`（同一来源内容重复导入走更新而非重复插入）；索引 `idx_kdoc_type` on `source_type, status`

**knowledge_chunks：** id、doc_id（FK -> knowledge_docs.id）、chunk_index（INT，分块序号）、content（TEXT，分块文本）、vector_id（VARCHAR，向量库中的 Point ID，用于增量同步删除 / 更新）、token_count（INT）、created_at/updated_at。索引 `idx_kchunk_doc` on `doc_id`

> **向量本体不落 MySQL**：向量存于向量库（Qdrant / Milvus），Point payload 携带 `doc_id`、`chunk_id`、`source_type`、`position`、`region`，检索时按岗位 / 地区过滤；`knowledge_chunks.vector_id` 记录向量库 Point ID 以便同步维护。完整流程见 [10.2 RAG 知识库架构](#102-rag-知识库架构)。

### 5.26 agent_tools / agent_tool_logs（Agent 面试官工具表）

**agent_tools：** id、key（UNIQUE：retrieve_knowledge / score_answer / generate_followup / next_question / finish_interview）、name、description（给 LLM 看的"何时该调用"说明，直接影响工具决策质量）、params_schema（JSON，入参定义）、enabled（TINYINT DEFAULT 1）、sort、created_at/updated_at

**agent_tool_logs：** id、interview_id（FK -> interview_sessions.id）、user_id（FK -> users.id）、tool_key（VARCHAR）、request_payload（JSON，入参）、response_summary（JSON，结果摘要）、latency_ms（INT，耗时）、status（VARCHAR，success / error）、created_at。索引 `idx_aglog_int` on `interview_id`、`idx_aglog_user` on `user_id, created_at`

> 工具定义后台可配置（启用 / 禁用 / 改描述，见 8.15）；调用日志用于审计、问题定位与看板统计（工具调用次数 / 成功率）。

---

## 6. 响应格式规范

### 6.1 统一响应壳

所有 API 统一返回以下格式（`utils/response.js`）：

```json
{
  "code": 0,
  "data": { ... },
  "message": "success"
}
```

### 6.2 业务 code 定义

| code | 含义                | 说明                       |
| ---- | ------------------- | -------------------------- |
| 0    | 成功                | 正常返回                   |
| 1001 | 参数错误            | 缺少必填参数或参数格式不符 |
| 1002 | 资源不存在          | 请求的资源不存在           |
| 2001 | 未登录 / Token 失效 | 需要重新登录               |
| 2002 | 无权限              | 无权执行此操作             |
| 2003 | 非管理员角色        | token 有效但不是管理员角色 |
| 3001 | 重复操作            | 幂等冲突（如当天已打卡）   |
| 4001 | 请求过于频繁        | AI 接口触发限流            |
| 5000 | 服务器内部错误      | 未预期的服务端异常         |

- `message` 为人类可读描述，前端可直接 `message.error(message)` 提示
- 前端根据 `code` 判断业务结果，不依赖 HTTP 状态码

### 6.3 列表分页格式

```json
{
  "code": 0,
  "data": {
    "list": [ ... ],
    "total": 42,
    "page": 1,
    "pageSize": 20,
    "hasMore": true
  },
  "message": "success"
}
```

- `page` 从 1 开始；`pageSize` 默认 20，上限 100
- `hasMore` 等价于 `page * pageSize < total`，用于控制「加载更多」

### 6.4 错误格式

```json
{
  "code": 1002,
  "data": null,
  "message": "资源不存在"
}
```

错误时 `data` 统一为 `null`，由全局错误处理中间件（`error-handler.js`）统一输出。

### 6.5 HTTP 状态码使用规则

| HTTP 状态码 | 使用场景                           |
| ----------- | ---------------------------------- |
| 200         | 正常返回（含业务失败，code !== 0） |
| 400         | 请求格式错误（JSON 解析失败等）    |
| 401         | Token 缺失或已过期                 |
| 403         | 无权访问（非管理员 / 越权）        |
| 404         | 路由不存在                         |
| 500         | 服务器未捕获的异常                 |

---

## 7. Web 端 API 设计

> 前缀：`/api/v1` | 认证：`Authorization: Bearer <token>`

### 7.1 岗位/地区参数规则（全模块统一）

- 所有内容类列表接口（题库 / 智学 / 智考 / 社区 / 今日推荐）统一支持 `position`、`region` 查询参数
- **缺省取值**：登录用户取 users 表偏好（target_position / preferred_region）；未登录回退默认值 `公务员` / `四川`
- **未命中回退**：先精确匹配岗位 + 地区；未命中回退 岗位 + `全国/通用`；再回退 `通用/全岗位`（见 5.7 出题规则）
- 前端将偏好存入 `stores/preference.ts`（localStorage 持久化 + 登录后写后端），首页筛选器变更即全局联动
- 首页筛选器岗位枚举：公务员 / 事业单位 / 国企央企面试 / 教资面试；地区枚举：全国各省份

### 7.2 认证模块

| 接口                   | 方法 | 认证 | 功能                                    |
| ---------------------- | ---- | ---- | --------------------------------------- |
| `/api/v1/auth/login`   | POST | 否   | 手机号 + 验证码登录，返回 JWT           |
| `/api/v1/auth/logout`  | POST | 是   | 登出，使当前 token 失效                 |
| `/api/v1/auth/session` | GET  | 是   | 检查登录态，返回 `{ isLoggedIn: true }` |

**登录请求：** `{ "phone": "13800138000", "code": "123456" }`

**登录响应：** `{ "code": 0, "data": { "token": "eyJhbGciOiJIUzI1NiIs..." } }`

> 登录成功后前端调用 `/user/profile` 获取用户信息（含岗位地区偏好），写入 Pinia 完成本地持久化。

### 7.3 用户模块

| 接口                              | 方法 | 认证 | 功能                          |
| --------------------------------- | ---- | ---- | ----------------------------- |
| `/api/v1/user/profile`            | GET  | 是   | 获取个人资料                  |
| `/api/v1/user/profile`            | PUT  | 是   | 更新个人资料（可部分更新）    |
| `/api/v1/user/progress-trend`     | GET  | 是   | 进步趋势                      |
| `/api/v1/user/learning-report`    | GET  | 是   | 学习报告                      |
| `/api/v1/user/ability-assessment` | GET  | 是   | 能力评估（计算型聚合）        |
| `/api/v1/user/badges`             | GET  | 是   | 勋章列表（已获 + 下一枚进度） |
| `/api/v1/user/badges/refresh`     | POST | 是   | 勋章懒扫描补发                |
| `/api/v1/user/growth-tree`        | GET  | 是   | 成长树（等级/阈值/进度）      |
| `/api/v1/user/growth-records`     | GET  | 是   | 成长值明细（分页）            |

**示例 — 获取个人资料：**

```json
{
  "code": 0,
  "data": {
    "id": 1,
    "nickname": "小王学员",
    "avatar": "",
    "phone": "138****8000",
    "targetPosition": "公务员",
    "preferredRegion": "四川",
    "growthPoints": 320,
    "checkInStreak": 5,
    "avgScore": 82.5
  },
  "message": "success"
}
```

> 手机号按中间四位掩码脱敏返回。`avgScore` 为最近面试平均分（供"我的"页"xx面试xx均分"展示）。

**示例 — 成长树：**

```json
{
  "code": 0,
  "data": {
    "level": 3,
    "levelName": "茁壮小树",
    "currentPoints": 320,
    "nextLevelPoints": 500,
    "progress": 64,
    "recent": [
      {
        "type": "checkin",
        "points": 10,
        "remark": "连续打卡第 5 天",
        "createdAt": "..."
      }
    ]
  },
  "message": "success"
}
```

### 7.4 岗位/地区偏好

| 接口                  | 方法 | 认证 | 功能                                     |
| --------------------- | ---- | ---- | ---------------------------------------- |
| `/api/v1/preferences` | GET  | 否   | 读当前偏好（未登录返回默认 公务员/四川） |
| `/api/v1/preferences` | PUT  | 是   | 保存首页筛选器所选岗位/地区              |

**保存请求：** `{ "position": "事业单位", "region": "广东" }` — 更新 users.target_position / preferred_region。

### 7.5 首页聚合

| 接口                                      | 方法 | 认证 | 功能                                                                |
| ----------------------------------------- | ---- | ---- | ------------------------------------------------------------------- |
| `/api/v1/home/overview?position=&region=` | GET  | 否   | 首屏聚合：打卡状态 + 学习进度 + 学习规划概览 + 今日推荐题目（前 N） |

> 保留各子接口（打卡 / 规划 / 推荐）供单模块刷新；未登录时返回默认岗位地区内容。

### 7.6 打卡模块

| 接口                                      | 方法 | 认证 | 功能                      |
| ----------------------------------------- | ---- | ---- | ------------------------- |
| `/api/v1/checkins`                        | POST | 是   | 今日打卡（重复返回 3001） |
| `/api/v1/checkins/today`                  | GET  | 是   | 今日是否已打卡            |
| `/api/v1/checkins/calendar?month=YYYY-MM` | GET  | 是   | 月度打卡日历              |
| `/api/v1/checkins/stats`                  | GET  | 是   | 累计 / 连续打卡统计       |
| `/api/v1/checkins`                        | GET  | 是   | 打卡记录（分页）          |

**示例 — 打卡：**

```json
{
  "code": 0,
  "data": {
    "checkDate": "2026-08-08",
    "streak": 5,
    "points": 10,
    "totalPoints": 320
  },
  "message": "success"
}
```

### 7.7 今日推荐

| 接口                                              | 方法 | 认证 | 功能                                        |
| ------------------------------------------------- | ---- | ---- | ------------------------------------------- |
| `/api/v1/recommendations/today?position=&region=` | GET  | 否   | 首页"今日推荐（题目）"列表                  |
| `/api/v1/recommendations/hot?position=&region=`   | GET  | 否   | 智学"今日推荐（最新热点）"，来自 hot_topics |

> 题目推荐来源：questions 中 `source_type='hot'` + 最新；缺省岗位地区取偏好（7.1 规则）。

### 7.8 智能学习规划

| 接口                                            | 方法 | 认证 | 功能                                                  |
| ----------------------------------------------- | ---- | ---- | ----------------------------------------------------- |
| `/api/v1/study-plans/current?position=&region=` | GET  | 否   | 匹配的规划（节点树 + 每节点完成状态 + 总进度）        |
| `/api/v1/study-plans/nodes/:nodeId/complete`    | PUT  | 是   | 标记节点完成（写 user_progress，触发勋章/成长值判定） |
| `/api/v1/study-plans/progress`                  | GET  | 是   | 规划整体进度                                          |

### 7.9 场景模块

| 接口                                  | 方法 | 认证 | 功能                                       |
| ------------------------------------- | ---- | ---- | ------------------------------------------ |
| `/api/v1/scenarios?position=&region=` | GET  | 否   | 场景列表（按岗位/地区/行业/类型/难度筛选） |
| `/api/v1/scenarios/:id`               | GET  | 否   | 场景详情                                   |

### 7.10 面试模块（智考）

| 接口                                 | 方法 | 认证 | 功能                                                                                             |
| ------------------------------------ | ---- | ---- | ------------------------------------------------------------------------------------------------ |
| `/api/v1/interviews?position=&type=` | GET  | 是   | 面试历史（分页，历史考试入口）                                                                   |
| `/api/v1/interviews`                 | POST | 是   | 创建 AI 模拟面试（V1.0 规则编排多轮流式；V2.0 升级 Agent 面试官，可主动追问 / 调用评分检索工具） |
| `/api/v1/interviews/:id`             | GET  | 是   | 面试详情（含消息列表）                                                                           |
| `/api/v1/interviews/:id/end`         | PUT  | 是   | 结束面试（计算得分）                                                                             |
| `/api/v1/interviews/:id/report`      | GET  | 是   | 获取面试报告                                                                                     |

**示例 — 创建面试会话：**

```json
{
  "code": 0,
  "data": {
    "id": 101,
    "scenarioId": 3,
    "scenarioName": "四川公务员结构化面试",
    "position": "公务员",
    "region": "四川",
    "mode": 0,
    "status": 1,
    "totalQuestions": 5
  },
  "message": "success"
}
```

> AI 面试对话流式接口：`POST /api/v1/interviews/:id/message`，SSE 流式返回 AI 作答，同时将一问一答落库 interview_messages。V2.0 Agent 模式下，SSE 消息追加 `type` 字段（`text` 面试官回复 / `tool` 工具调用说明 / `done`），面试官回复前可能先调用检索 / 评分工具（见 10.3）。

### 7.11 题库模块

| 接口                                                                                             | 方法 | 认证 | 功能                                                                    |
| ------------------------------------------------------------------------------------------------ | ---- | ---- | ----------------------------------------------------------------------- |
| `/api/v1/questions?position=&region=&category=&source_type=&year=&paperId=&difficulty=&keyword=` | GET  | 否   | 题目列表（分页、多条件筛选）                                            |
| `/api/v1/questions/search`                                                                       | GET  | 否   | 题目搜索（顶部搜索框）                                                  |
| `/api/v1/questions/categories`                                                                   | GET  | 否   | 九大题型分类列表                                                        |
| `/api/v1/questions/source-types`                                                                 | GET  | 否   | 四入口枚举（hot/real/mock/normal）                                      |
| `/api/v1/questions/hot?position=&region=`                                                        | GET  | 否   | 热点习题列表                                                            |
| `/api/v1/questions/real?year=&province=`                                                         | GET  | 否   | 历年真题列表                                                            |
| `/api/v1/questions/:id`                                                                          | GET  | 否   | 题目详情                                                                |
| `/api/v1/questions/:id/submit`                                                                   | POST | 是   | 提交作答（写 answer_records；答错写/更新 wrong_answers 并生成 AI 解析） |
| `/api/v1/questions/favorites`                                                                    | GET  | 是   | 收藏题目                                                                |
| `/api/v1/questions/wrong`                                                                        | GET  | 是   | AI 错题本（含 ai_analysis）                                             |
| `/api/v1/questions/wrong/:id/mastered`                                                           | PUT  | 是   | 标记错题已掌握                                                          |
| `/api/v1/questions/practice?category=&position=&region=`                                         | GET  | 是   | 专项练习按题型出题                                                      |

**示例 — 提交作答：**

```json
{
  "code": 0,
  "data": {
    "isCorrect": false,
    "wrong": {
      "questionId": 42,
      "wrongCount": 2,
      "aiAnalysis": "此题考察社会现象类综合分析能力，作答时需先表明观点…"
    }
  },
  "message": "success"
}
```

### 7.12 模拟试卷

| 接口                                    | 方法 | 认证 | 功能               |
| --------------------------------------- | ---- | ---- | ------------------ |
| `/api/v1/mock-papers?position=&region=` | GET  | 否   | 模拟试卷列表       |
| `/api/v1/mock-papers/:id`               | GET  | 否   | 试卷详情（含题目） |

### 7.13 社区模块

| 接口                               | 方法                      | 认证 | 功能                          |
| ---------------------------------- | ------------------------- | ---- | ----------------------------- | --------------------------------- |
| `/api/v1/community/posts?sort=hot  | latest&position=&region=` | GET  | 否                            | 帖子列表（热点话题/最新话题分区） |
| `/api/v1/community/posts`          | POST                      | 是   | 发布面经（可带岗位/地区标签） |
| `/api/v1/community/posts/:id`      | GET                       | 否   | 帖子详情                      |
| `/api/v1/community/posts/:id/like` | POST                      | 是   | 点赞 / 取消点赞（触发通知）   |

### 7.14 AI 答疑

| 接口                     | 方法   | 认证 | 功能                                                                             |
| ------------------------ | ------ | ---- | -------------------------------------------------------------------------------- |
| `/api/v1/ai/ask`         | POST   | 是   | 单轮 AI 问答（V1.1 起回答前经 RAG 检索素材库 / 题库，返回 citations 引用来源）   |
| `/api/v1/ai/context`     | GET    | 否   | RAG 检索预览：返回与问题相关的高相关知识分块（不消耗 LLM，供前端展示可引用素材） |
| `/api/v1/ai/answers`     | GET    | 是   | 我的答疑记录（分页）                                                             |
| `/api/v1/ai/answers/:id` | GET    | 是   | 答疑详情                                                                         |
| `/api/v1/ai/answers/:id` | DELETE | 是   | 删除答疑记录                                                                     |

**示例 — AI 答疑请求：**

```json
{
  "question": "四川省考如何组织一次社区反诈宣传活动？",
  "entry": "community",
  "refType": "post",
  "refId": 88
}
```

**响应（V1.1 起含引用来源）：**

```json
{
  "code": 0,
  "data": {
    "answer": "可从三方面组织活动：一是…（参考《社区宣传活动的组织实施要点》…）",
    "retrieved": true,
    "citations": [
      {
        "sourceType": "materials",
        "sourceId": 12,
        "title": "社区宣传活动的组织实施要点",
        "snippet": "组织宣传活动需先明确对象与目标，再定形式、排分工、设预案……"
      }
    ]
  },
  "message": "success"
}
```

> `retrieved=false` 表示本次未命中检索（向量库不可用或相关度过低），回答走无检索裸调，前端可弱化"引用来源"展示。

### 7.15 智学模块

| 接口                                       | 方法       | 认证 | 功能                                       |
| ------------------------------------------ | ---------- | ---- | ------------------------------------------ |
| `/api/v1/learn/readings?position=&region=` | GET        | 否   | 晨读列表（按岗位/地区）                    |
| `/api/v1/learn/readings/stats`             | GET        | 是   | 晨读统计（已读/连续）                      |
| `/api/v1/learn/readings/:id`               | GET        | 否   | 晨读详情（含可"同步到笔记"的 source 信息） |
| `/api/v1/learn/materials?position=`        | GET        | 否   | 素材库                                     |
| `/api/v1/learn/basics?position=`           | GET        | 否   | 面试通识                                   |
| `/api/v1/learn/courses?position=`          | GET        | 否   | 在线课程                                   |
| `/api/v1/learn/notes`                      | GET/POST   | 是   | 学习笔记查询 / 新增                        |
| `/api/v1/learn/notes/:id`                  | PUT/DELETE | 是   | 更新 / 删除笔记                            |
| `/api/v1/learn/notes/ai`                   | GET        | 是   | 我的 AI 摘要笔记列表                       |
| `/api/v1/learn/ai-summary`                 | POST       | 是   | 内容 → AI 摘要（可选 saveToNote 落笔记）   |
| `/api/v1/learn/notes/:id/ai-summary`       | POST       | 是   | 对既有笔记生成摘要并回写                   |
| `/api/v1/learn/progress`                   | GET        | 是   | 学习进度汇总                               |

**示例 — AI 摘要同步到笔记：**

```json
{
  "content": "……晨读文章正文……",
  "sourceType": "reading",
  "sourceId": 12,
  "sourceTitle": "基层治理新趋势",
  "saveToNote": true
}
```

**响应：** `{ "code": 0, "data": { "summary": "……AI 生成的摘要……", "noteId": 99 } }`

### 7.16 会员模块

| 接口                                   | 方法 | 认证 | 功能         |
| -------------------------------------- | ---- | ---- | ------------ |
| `/api/v1/membership/plans`             | GET  | 否   | 会员方案列表 |
| `/api/v1/membership/status`            | GET  | 是   | 当前会员状态 |
| `/api/v1/membership/subscribe`         | POST | 是   | 订阅会员     |
| `/api/v1/membership/cancel-auto-renew` | POST | 是   | 取消自动续费 |

### 7.17 消息通知

| 接口                                 | 方法   | 认证 | 功能                    |
| ------------------------------------ | ------ | ---- | ----------------------- |
| `/api/v1/notifications?type=&page=`  | GET    | 是   | 通知列表（分页）        |
| `/api/v1/notifications/unread-count` | GET    | 是   | 未读数（前端 30s 轮询） |
| `/api/v1/notifications/:id/read`     | PUT    | 是   | 标记已读                |
| `/api/v1/notifications/read-all`     | PUT    | 是   | 全部已读                |
| `/api/v1/notifications/:id`          | DELETE | 是   | 删除通知                |

---

## 8. 管理端 API 设计

> 前缀：`/api/admin` | 认证：`Authorization: Bearer <admin-token>`（含 `role: admin`）

### 8.1 接口总览

| 模块     | 路径前缀                   | 功能                                   |
| -------- | -------------------------- | -------------------------------------- | ------ | ------- | ----------- | ---------------------------- |
| 认证     | `/api/admin/auth`          | 管理员登录 / 登出 / 信息               |
| 仪表盘   | `/api/admin/dashboard`     | 数据总览                               |
| 用户     | `/api/admin/users`         | 用户列表 / 详情 / 封禁 / 解封          |
| 场景     | `/api/admin/scenarios`     | 场景管理                               |
| 题库     | `/api/admin/questions`     | 题目管理（含岗位/来源/题型）           |
| 面试     | `/api/admin/interviews`    | 面试记录管理                           |
| 帖子     | `/api/admin/posts`         | 帖子管理                               |
| 内容     | `/api/admin/readings       | materials                              | basics | courses | hot-topics` | 晨读/素材/通识/课程/热点管理 |
| 试卷     | `/api/admin/mock-papers`   | 模拟试卷管理                           |
| 规划     | `/api/admin/study-plans`   | 学习规划管理（含节点）                 |
| 勋章     | `/api/admin/badges`        | 勋章定义管理                           |
| 会员     | `/api/admin/membership`    | 方案 / 订阅管理                        |
| 通知     | `/api/admin/notifications` | 通知推送 / 发送记录                    |
| 行为数据 | `/api/admin/behavior`      | 打卡 / 答题 / AI答疑 / 笔记 / 成长规则 |
| 知识库   | `/api/admin/knowledge`     | RAG 文档管理、索引重建、规模统计       |
| Agent    | `/api/admin/agent`         | 面试官工具配置、工具调用日志           |
| 角色     | `/api/admin/roles`         | 角色管理                               |
| 权限     | `/api/admin/permissions`   | 权限点管理                             |
| 管理员   | `/api/admin/admins`        | 后台账号管理                           |

### 8.2 管理员认证

| 接口                      | 方法 | 认证 | 功能                                     |
| ------------------------- | ---- | ---- | ---------------------------------------- |
| `/api/admin/auth/login`   | POST | 否   | 账号密码登录，返回 JWT（含 role: admin） |
| `/api/admin/auth/logout`  | POST | 是   | 登出                                     |
| `/api/admin/auth/profile` | GET  | 是   | 获取当前管理员信息                       |

### 8.3 仪表盘

| 接口                         | 方法 | 认证 | 功能                                                                                                |
| ---------------------------- | ---- | ---- | --------------------------------------------------------------------------------------------------- |
| `/api/admin/dashboard/stats` | GET  | 是   | 平台统计（面试、用户、题目、帖子、打卡、AI 答疑、勋章发放、规划激活、知识库规模、Agent 工具调用量） |

**响应示例：**

```json
{
  "code": 0,
  "data": {
    "totalInterviews": 320,
    "completedInterviews": 280,
    "avgScore": 82.5,
    "totalUsers": 1280,
    "totalQuestions": 156,
    "totalPosts": 85,
    "todayCheckIns": 46,
    "totalAiAnswers": 213,
    "totalBadgesIssued": 540,
    "activePlans": 18,
    "knowledgeChunks": 4820,
    "agentToolCalls": 96
  },
  "message": "success"
}
```

### 8.4 用户管理

| 接口                         | 方法 | 认证 | 功能                                         |
| ---------------------------- | ---- | ---- | -------------------------------------------- |
| `/api/admin/users`           | GET  | 是   | 用户列表（关键词 / 封禁状态 / 岗位地区筛选） |
| `/api/admin/users/:id`       | GET  | 是   | 用户详情                                     |
| `/api/admin/users/:id/ban`   | PUT  | 是   | 封禁用户                                     |
| `/api/admin/users/:id/unban` | PUT  | 是   | 解封用户                                     |

### 8.5 场景 / 题库 / 面试 / 帖子管理

| 接口                               | 方法       | 认证 | 功能                                                       |
| ---------------------------------- | ---------- | ---- | ---------------------------------------------------------- |
| `/api/admin/scenarios`             | GET/POST   | 是   | 场景列表 / 新增（含岗位/地区）                             |
| `/api/admin/scenarios/:id`         | PUT/DELETE | 是   | 编辑 / 删除场景                                            |
| `/api/admin/questions`             | GET/POST   | 是   | 题目列表 / 新增（含 position/source_type/region/category） |
| `/api/admin/questions/:id`         | PUT/DELETE | 是   | 编辑 / 删除题目                                            |
| `/api/admin/questions/import-real` | POST       | 是   | 历年真题按省/年份批量导入                                  |
| `/api/admin/interviews`            | GET        | 是   | 面试记录（多条件筛选）                                     |
| `/api/admin/interviews/:sessionId` | GET        | 是   | 面试详情                                                   |
| `/api/admin/posts`                 | GET/DELETE | 是   | 帖子列表 / 删除                                            |

### 8.6 内容管理（晨读 / 素材 / 通识 / 课程 / 热点）

| 接口                                                | 方法                | 认证 | 功能                                         |
| --------------------------------------------------- | ------------------- | ---- | -------------------------------------------- |
| `/api/admin/readings`                               | GET/POST            | 是   | 晨读列表 / 新增（含 position/region/is_hot） |
| `/api/admin/readings/:id`                           | PUT/DELETE          | 是   | 编辑 / 删除晨读                              |
| `/api/admin/materials` `/api/admin/materials/:id`   | GET/POST/PUT/DELETE | 是   | 素材库管理                                   |
| `/api/admin/basics` `/api/admin/basics/:id`         | GET/POST/PUT/DELETE | 是   | 面试通识管理                                 |
| `/api/admin/courses` `/api/admin/courses/:id`       | GET/POST/PUT/DELETE | 是   | 在线课程管理                                 |
| `/api/admin/hot-topics` `/api/admin/hot-topics/:id` | GET/POST/PUT/DELETE | 是   | 热点内容管理                                 |

### 8.7 模拟试卷管理

| 接口                                             | 方法       | 认证 | 功能                |
| ------------------------------------------------ | ---------- | ---- | ------------------- |
| `/api/admin/mock-papers`                         | GET/POST   | 是   | 试卷列表 / 新增     |
| `/api/admin/mock-papers/:id`                     | PUT/DELETE | 是   | 编辑 / 删除试卷     |
| `/api/admin/mock-papers/:id/questions`           | GET/POST   | 是   | 试卷题目列表 / 添加 |
| `/api/admin/mock-papers/:id/questions/:paperQid` | PUT/DELETE | 是   | 调整 / 移除题目     |

### 8.8 学习规划管理

| 接口                                       | 方法       | 认证 | 功能            |
| ------------------------------------------ | ---------- | ---- | --------------- |
| `/api/admin/study-plans`                   | GET/POST   | 是   | 规划列表 / 新增 |
| `/api/admin/study-plans/:id`               | PUT/DELETE | 是   | 编辑 / 删除规划 |
| `/api/admin/study-plans/:id/nodes`         | GET/POST   | 是   | 节点列表 / 新增 |
| `/api/admin/study-plans/:id/nodes/:nodeId` | PUT/DELETE | 是   | 编辑 / 删除节点 |

### 8.9 勋章管理

| 接口                    | 方法       | 认证 | 功能                                                 |
| ----------------------- | ---------- | ---- | ---------------------------------------------------- |
| `/api/admin/badges`     | GET/POST   | 是   | 勋章列表 / 新增（含 condition_type/condition_value） |
| `/api/admin/badges/:id` | PUT/DELETE | 是   | 编辑 / 删除勋章                                      |

### 8.10 会员管理

| 接口                                  | 方法       | 认证 | 功能            |
| ------------------------------------- | ---------- | ---- | --------------- |
| `/api/admin/membership/plans`         | GET/POST   | 是   | 方案列表 / 新增 |
| `/api/admin/membership/plans/:id`     | PUT/DELETE | 是   | 编辑 / 删除方案 |
| `/api/admin/membership/subscriptions` | GET        | 是   | 订阅记录        |

### 8.11 通知推送

| 接口                       | 方法 | 认证 | 功能                        |
| -------------------------- | ---- | ---- | --------------------------- |
| `/api/admin/notifications` | POST | 是   | 向单个用户 / 全体发系统通知 |
| `/api/admin/notifications` | GET  | 是   | 发送记录查询                |

### 8.12 用户行为数据（治理 / 看板）

| 接口                                 | 方法       | 认证 | 功能                      |
| ------------------------------------ | ---------- | ---- | ------------------------- |
| `/api/admin/behavior/checkins`       | GET        | 是   | 打卡数据（日聚合 / 明细） |
| `/api/admin/behavior/answer-records` | GET        | 是   | 答题记录看板              |
| `/api/admin/behavior/ai-answers`     | GET        | 是   | AI 答疑记录（风控）       |
| `/api/admin/behavior/ai-answers/:id` | DELETE     | 是   | 删除答疑记录（违规）      |
| `/api/admin/behavior/notes`          | GET/DELETE | 是   | 学习笔记治理              |
| `/api/admin/behavior/growth-rules`   | GET/PUT    | 是   | 成长值事件分值配置        |

### 8.13 角色 / 权限 / 管理员

| 接口                            | 方法       | 认证 | 功能              |
| ------------------------------- | ---------- | ---- | ----------------- |
| `/api/admin/roles`              | GET/POST   | 是   | 角色列表 / 新增   |
| `/api/admin/roles/:id`          | PUT/DELETE | 是   | 编辑 / 删除角色   |
| `/api/admin/permissions`        | GET        | 是   | 权限点列表        |
| `/api/admin/permissions/assign` | POST       | 是   | 角色分配权限      |
| `/api/admin/admins`             | GET/POST   | 是   | 管理员列表 / 新增 |
| `/api/admin/admins/:id`         | PUT/DELETE | 是   | 编辑 / 删除管理员 |

### 8.14 知识库管理（RAG）

| 接口                                        | 方法   | 认证 | 功能                                                                       |
| ------------------------------------------- | ------ | ---- | -------------------------------------------------------------------------- |
| `/api/admin/knowledge`                      | GET    | 是   | 知识库文档列表（按 source_type / status / 岗位地区筛选）                   |
| `/api/admin/knowledge/:id`                  | GET    | 是   | 文档详情（含分块列表）                                                     |
| `/api/admin/knowledge/:id`                  | DELETE | 是   | 删除文档（同步删除向量库中对应 Point）                                     |
| `/api/admin/knowledge/reindex`              | POST   | 是   | 全量重建索引（重新分块 + 向量化）                                          |
| `/api/admin/knowledge/reindex/:source_type` | POST   | 是   | 指定来源增量重建（materials / questions / readings / basics / hot_topics） |
| `/api/admin/knowledge/stats`                | GET    | 是   | 索引规模统计（文档数 / 分块数 / 向量数 / 失败数）                          |

> 管理端在内容管理（晨读 / 素材 / 通识 / 课程 / 热点 / 题库）保存后异步触发对应来源的增量索引，不要求人工重建。

### 8.15 Agent 工具配置

| 接口                             | 方法    | 认证 | 功能                                                |
| -------------------------------- | ------- | ---- | --------------------------------------------------- |
| `/api/admin/agent/tools`         | GET/PUT | 是   | 工具列表 / 全局启用状态与参数配置                   |
| `/api/admin/agent/tools/:key`    | PUT     | 是   | 单个工具启用 / 禁用、编辑描述与入参定义             |
| `/api/admin/agent/tool-logs`     | GET     | 是   | 工具调用日志（按 interview / user / tool_key 筛选） |
| `/api/admin/agent/tool-logs/:id` | GET     | 是   | 工具调用详情（入参 / 结果摘要 / 耗时 / 状态）       |

---

## 9. 认证与安全设计

| 维度         | 方案                                                                                                                 |
| ------------ | -------------------------------------------------------------------------------------------------------------------- |
| 身份认证     | C 端手机号 + 验证码登录，返回 JWT；管理端账号密码登录，返回独立 JWT                                                  |
| JWT 鉴权     | `middleware/auth.js` 解析 Token 并挂载到请求对象                                                                     |
| 密码安全     | bcrypt 加密存储                                                                                                      |
| Token 策略   | C 端 JWT 有效期 7 天；管理端 12 小时                                                                                 |
| 权限控制     | C 端登录态鉴权；管理端 `role: admin` 校验（admin-auth）+ RBAC 权限点校验（require-permission）                       |
| AI 限流      | `ai-rate-limit.js` 按用户 / 频率限流（默认 10 次/分钟），超限返回 code 4001；AI 调用超时降级（60s 超时返回友好提示） |
| 越权处理     | 无权访问返回 403                                                                                                     |
| 传输安全     | 生产环境 HTTPS；开发环境 Vite 代理                                                                                   |
| 请求日志     | 请求日志中间件记录方法、路径                                                                                         |
| 错误处理     | 全局错误处理中间件（error-handler），统一返回规范错误结构                                                            |
| 敏感字段     | 手机号脱敏显示（中间四位掩码）；AI 答疑内容管理端可删除（风控）                                                      |
| 用户治理     | 管理端支持封禁 / 解封用户                                                                                            |
| 通知安全     | 未读数轮询接口按登录态鉴权，仅返回本人数据                                                                           |
| RAG 权限     | 检索按登录用户岗位 / 地区过滤；会员专属素材仅对会员返回，引用不泄露未授权内容                                        |
| 工具调用安全 | Agent 工具白名单校验 + 入参校验，工具仅执行内部定义动作（评分 / 检索 / 推进 / 收尾），不暴露任意外部动作             |
| 引用安全     | AI 回答引用仅来自知识库内已授权来源；管理端可下线违规文档（同步清理向量）                                            |

---

## 10. AI 能力进阶（RAG + Agent）

> 本章定义两项 AI 进阶能力，是平台区别于普通管理系统、并向"大模型应用工程"方向展示的核心设计：
>
> - **RAG（检索增强生成）**：把素材库、题库、晨读等知识内容向量化，AI 答疑与 AI 面试官在回答前先检索、回答中引用，做到可溯源、可降级
> - **Agent 面试官**：面试官从"固定多轮流式问答"升级为"工具调用型 Agent"，可主动追问、调用评分工具、检索知识库、自主推进面试流程
>
> **版本归属与兼容**：RAG 于 V1.1 落地（先接入 AI 答疑，再接入面试官），Agent 面试官于 V2.0 落地。V1.0 的 `aiService` 预留检索钩子与工具回调接口，升级不破坏既有接口与数据（详见 [20. 版本规划](#20-版本规划)）。

### 10.1 为什么引入 RAG 与 Agent

| 能力     | 解决的问题                                                       | 用户可见价值                                     |
| -------- | ---------------------------------------------------------------- | ------------------------------------------------ |
| RAG      | 大模型通用知识不足、易编造；平台自有素材 / 题库 / 热点无法被利用 | 答疑与面试回答有依据、引用真实素材，显著减少幻觉 |
| RAG 过滤 | 回答不符合岗位 / 地区考情（如四川公考 vs 上海事业单位）          | 检索按岗位 / 地区过滤，回答更贴近本地考情        |
| Agent    | 固定流程无法"追问到底"、无法实时打分                             | 面试更接近真人考官：追问、即时反馈、可控节奏     |

### 10.2 RAG 知识库架构

**10.2.1 知识来源与向量化流水线**

| 来源（source_type） | 内容表   | 说明                           |
| ------------------- | -------- | ------------------------------ |
| materials           | 素材库   | 金句 / 案例 / 名言             |
| questions           | 题库     | 题目 + 参考回答（含 hot 热点） |
| readings            | 晨读     | 时政 / 基层治理等文章          |
| basics              | 面试通识 | 答题方法论                     |
| hot_topics          | 热点内容 | 智学今日推荐热点               |

```
内容变更（新增 / 编辑）──► 写入业务表 ──► 知识库导入任务
    ──► 清洗 + 分块（chunking，默认 ~500 token/块，按段落与标题切分）
    ──► embeddingService 向量化 ──► 写入向量库（payload 携带
         doc_id / chunk_id / source_type / position / region）
    ──► 更新 knowledge_docs / knowledge_chunks（记录 vector_id 与状态）
```

- **导入触发**：管理端手动导入 / 重建索引（见 [8.14 知识库管理](#814-知识库管理rag)）；内容后台保存后异步增量导入
- **幂等**：`knowledge_docs` 以 `source_type + source_id` 唯一约束，重复导入走更新而非重复插入
- **失败重试**：分块或向量化失败的文档置 `status=failed`，管理端可重试

**10.2.2 向量库选型**

| 方案       | 定位                    | 说明                                                                |
| ---------- | ----------------------- | ------------------------------------------------------------------- |
| Qdrant     | 开发 / 生产默认（推荐） | Docker 单机部署，HTTP / gRPC 接口，支持 payload 过滤（岗位 / 地区） |
| Milvus     | 生产大规模可选          | 向量规模大、高可用；部署成本高                                      |
| sqlite-vec | 本地开发降级            | 无 Docker 环境时兜底，功能与生产对齐但规模受限                      |

> 不默认选用 pgvector：本项目关系库为 MySQL，若引入 Postgres 会割裂数据层。Qdrant 独立于 MySQL 部署：MySQL 承担业务数据与向量元数据，向量本体与过滤字段放向量库。

**10.2.3 混合检索与上下文组装**

```
用户问题 / 面试作答 ──► 解析（关键词 + 岗位地区偏好）
    ├─ 向量检索：embedding 后 Top-K（默认 5）
    └─ 关键词检索：MySQL 全文 / 关键词匹配（岗位地区过滤）
    ──► 合并去重（RRF 或加权）──► 按相关性排序 ──► 组装"参考资料"上下文
```

- **过滤**：检索前按用户 `position / region` 过滤 payload，未命中再放宽到 `全国 / 通用`（与 5.7 出题回退规则一致）
- **上下文模板**：参考资料 + 检索到的分块（含来源标题），注入系统提示词，并控制单次注入 token 上限
- **可选重排**：生产可加 cross-encoder rerank；V1.1 先用 Top-K 直接拼接

**10.2.4 引用与降级**

- **引用**：AI 回答中以 `[素材#12]` 形式标注来源，响应体返回 `citations` 数组（source_type / source_id / title / snippet），前端可点击跳转
- **降级链**：向量库可用 → 关键词检索 → 无检索裸调（记录 `retrieved=false` 标记）；LLM 不可用时沿用 V1.0 超时降级

### 10.3 Agent 面试官（工具调用型）

**10.3.1 工具集定义**

| 工具 key           | 触发时机                | 功能与入参                                                     |
| ------------------ | ----------------------- | -------------------------------------------------------------- |
| retrieve_knowledge | 需要引用素材 / 政策原文 | 检索知识库（query、top_k），结果注入下一轮上下文               |
| score_answer       | 考生作答完成一轮        | 按评分标准打分（rubric_id、answer），返回分维度分值            |
| generate_followup  | 作答深度不足 / 想深挖   | 生成追问（answer、已问题目列表），返回追问文本                 |
| next_question      | 结束当前题              | 抽下一题（category、difficulty、已用题目），返回题目与参考要点 |
| finish_interview   | 全部题目完成 / 超时     | 汇总作答 → 生成报告（session_id）                              |

> 工具定义存 `agent_tools` 表（后台可启用 / 禁用 / 改描述，见 [8.15 Agent 工具配置](#815-agent-工具配置)）；`description` 是给 LLM 看的"何时该调用"说明，直接影响工具决策质量。

**10.3.2 工具调用执行循环**

```
用户作答 ──► 组装消息（系统提示 + 面试上下文 + 参考资料）
    ──► LLM：判断是否需要工具（tool_calls）
        ├─ 需要 → 白名单校验 → 执行工具 → 结果回填 → 再次入 LLM
        └─ 不需要 → 生成面试官回复（SSE 流式输出）
    ──► 每次工具调用写 agent_tool_logs（入参 / 结果 / 耗时 / 状态）
```

- 单轮最多执行 N 次工具调用（默认 4），防止死循环
- 工具执行失败不中断面试：结果标记 `error`，LLM 依据失败信息继续或走兜底路径
- 评分工具每次作答即时给分，面试结束时聚合生成报告（与 V1.0 报告结构兼容，新增 `tool_scores` 明细）

**10.3.3 与流式输出的配合**

- SSE 消息追加 `type` 字段：`text`（面试官回复）/ `tool`（工具调用说明，如"已调用评分工具"）/ `done`
- 前端在 `tool` 事件展示轻提示（如"面试官正在评分…"），不阻塞文本流
- 落库：`interview_messages` 仍存一问一答文本；工具调用结果单独存 `agent_tool_logs` 与报告

**10.3.4 从 V1.0 平滑升级**

- **V1.0（规则编排版）**：创建面试时由服务端按题型顺序出题，面试官按固定模板作答，不调用工具
- **V2.0（工具调用版）**：打开 `agent.enabled`，出题、追问、评分改由 LLM 决策 + 工具执行；`interviews`、`interview_messages`、`reports` 结构不变
- **过渡策略**：`agent.enabled` 支持按用户 / 灰度开启，失败自动回退规则编排

### 10.4 接入点与提示词要点

| 接入点      | 是否启用 RAG       | 说明                                               |
| ----------- | ------------------ | -------------------------------------------------- |
| AI 答疑     | V1.1 启用          | `POST /api/v1/ai/ask` 回答前检索，返回 citations   |
| AI 模拟面试 | V2.0 随 Agent 启用 | 面试官通过 `retrieve_knowledge` 工具检索，引用素材 |
| AI 错题解析 | 可选               | 解析前检索同类题目参考回答，提升解析质量           |
| AI 摘要     | 不启用             | 摘要针对用户提供的文本，无需检索                   |

**提示词结构（要点）：**

- **系统提示固定段**：角色设定（岗位 × 地区 × 场景）+ 检索说明（"仅引用参考资料，未检索到则明确说明"）+ 输出约束（引用格式、禁止编造）
- **上下文段**：最近 N 轮对话 + 本次检索结果（source 标注）
- **温度与长度**：答疑 `temperature=0.3`、max_tokens=1024；面试 `temperature=0.7` 流式

---

# 第三部分 · Web 前端（Frontend）

## 11. Web 端架构与目录结构

### 11.1 目录结构

```
web/
├── index.html                  # HTML 入口
├── vite.config.ts              # Vite 配置（端口 8081，/api 代理到 :3000）
├── package.json
├── public/
└── src/
    ├── main.ts                 # 应用入口（注册 ElementPlus、Pinia、Router）
    ├── App.vue                 # 根组件（router-view）
    ├── env.d.ts
    ├── router/index.ts         # 路由 + 登录守卫
    ├── stores/
    │   ├── user.ts             # 用户状态（Pinia）
    │   ├── preference.ts       # 岗位/地区偏好（localStorage 持久化 + 写后端）
    │   └── notification.ts     # 通知未读数（30s 轮询）
    ├── api/                    # 接口层
    │   ├── request.ts          # Axios 封装（拦截器）
    │   ├── auth.ts  user.ts  preference.ts
    │   ├── checkin.ts  notification.ts  ai.ts
    │   ├── recommendation.ts  studyPlan.ts  growth.ts
    │   ├── interview.ts  question.ts  mockPaper.ts
    │   ├── community.ts  membership.ts  learn.ts  home.ts
    ├── types/                  # TypeScript 类型定义
    ├── utils/                  # auth.ts / message.ts / index.ts
    ├── components/             # 公共组件
    │   ├── MainLayout.vue  Card.vue  BaseButton.vue  BaseInput.vue  Pagination.vue
    │   ├── PreferenceFilter.vue  CheckInCard.vue  GrowthTree.vue
    │   ├── ModuleCard.vue  NineCategoryTabs.vue  EntryCards.vue
    │   ├── RecommendationList.vue  ScenarioCard.vue  QuestionCard.vue  PostCard.vue
    └── views/                  # 页面
        ├── login/  home/
        ├── questions/          # index / hot / real / mock / wrong / detail
        ├── learn/              # index / reading / reading-detail / material-lib
        │                       # basics / basics-detail / courses / note
        ├── exam/               # index / room / report
        ├── community/          # index / create-post / post-detail
        ├── profile/            # index / report / assessment / badges
        │                       # notifications / growth-tree / settings
        ├── checkin/
        └── membership/
```

### 11.2 构建配置

| 配置     | 值                               | 说明               |
| -------- | -------------------------------- | ------------------ |
| 端口     | 8081                             | 开发服务器         |
| 代理     | `/api` → `http://localhost:3000` | 开发环境转发到后端 |
| 别名     | `@` → `src/`                     | 路径别名           |
| 类型检查 | vue-tsc --noEmit                 | 构建前类型校验     |

---

## 12. 路由与页面

### 12.1 路由表

| 路由                                  | 页面      | 说明                                    |
| ------------------------------------- | --------- | --------------------------------------- |
| `/login`                              | 登录页    | 手机号验证码登录                        |
| `/`                                   | 主布局    | MainLayout（顶部导航 + 岗位地区筛选器） |
| `/home`                               | 首页      | 打卡 / 学习进度 / 规划路径 / 今日推荐   |
| `/questions`                          | 题库      | 搜索框 + 四入口卡片 + 九题型标签 + 列表 |
| `/questions/hot`                      | 热点习题  | 热点题目列表                            |
| `/questions/real`                     | 历年真题  | 按年份/省份浏览真题                     |
| `/questions/mock`                     | 模拟试卷  | 试卷列表 / 作答                         |
| `/questions/wrong`                    | AI 错题本 | 错题记录 + AI 解析 + 标记掌握           |
| `/questions/detail/:id`               | 题目详情  | 题目 + 作答 + 参考回答 + AI 解析        |
| `/learn`                              | 智学      | 5 模块卡片 + 今日推荐热点 + AI 摘要入口 |
| `/learn/reading` `/learn/reading/:id` | 每日晨读  | 晨读列表 / 详情（可 AI 摘要同步笔记）   |
| `/learn/material`                     | 素材库    | 面试素材                                |
| `/learn/basics` `/learn/basics/:id`   | 面试通识  | 基础知识文章                            |
| `/learn/courses`                      | 在线课程  | 课程列表                                |
| `/learn/notes`                        | 学习笔记  | 笔记管理（手写 + AI 摘要）              |
| `/exam`                               | 智考      | AI 模拟面试 + 历史考试两入口            |
| `/exam/room`                          | 面试室    | AI 面试对话（流式）                     |
| `/exam/report/:sessionId`             | 面试报告  | 报告详情                                |
| `/community`                          | 社区      | 热点话题 / 最新话题 / AI 答疑三分区     |
| `/community/create`                   | 发布帖子  | 面经分享                                |
| `/community/:id`                      | 帖子详情  | 内容 + 点赞                             |
| `/profile`                            | 我的      | 头像/昵称/均分 + 四卡片 + 成长树        |
| `/profile/report`                     | 学习报告  | 综合数据                                |
| `/profile/assessment`                 | 能力评估  | 多维评估可视化                          |
| `/profile/badges`                     | 勋章墙    | 成就徽章                                |
| `/profile/notifications`              | 消息通知  | 通知列表 / 已读管理                     |
| `/profile/growth-tree`                | 成长树    | 成长等级 / 进度 / 明细                  |
| `/profile/settings`                   | 设置      | 个人资料编辑                            |
| `/checkin`                            | 打卡      | 打卡日历 / 连续天数                     |
| `/membership`                         | 会员中心  | 方案订阅                                |

### 12.2 导航守卫

- 顶部导航固定六项：**首页 / 题库 / 智学 / 智考 / 社区 / 我的**，按当前路由高亮
- 路由守卫检查登录态（`utils/auth.ts` 中的 token），未登录访问需鉴权页面跳转 `/login`
- 主布局（MainLayout）注入 `stores/preference.ts`：加载偏好并随首页筛选器变更全局联动

---

## 13. 状态管理与接口封装

### 13.1 Pinia Store

**stores/user.ts：**

```typescript
export const useUserStore = defineStore('user', {
  state: () => ({
    token: string | null,
    userInfo: UserInfo | null,   // 含 targetPosition / preferredRegion / growthPoints / checkInStreak
  }),
  getters: {
    isLoggedIn: boolean,
    isVip: boolean,
  },
  actions: {
    login(token, profile),   // 保存 token + 用户信息
    logout(),                // 清除状态 + 跳转登录
    setProfile(profile),
  },
})
```

**stores/preference.ts：**

```typescript
export const usePreferenceStore = defineStore('preference', {
  state: () => ({
    position: '公务员',   // localStorage 持久化
    region: '四川',
  }),
  actions: {
    init(),                // 启动时读 localStorage → 登录后写后端
    update(position, region),  // 首页筛选器变更：更新本地 + 调 PUT /preferences
  },
})
```

**stores/notification.ts：** state 为 `unreadCount`；`startPolling()` 每 30s 调 `/notifications/unread-count`，页面卸载时停止。

### 13.2 Axios 封装（api/request.ts）

| 能力     | 说明                                                                                                 |
| -------- | ---------------------------------------------------------------------------------------------------- |
| 请求拦截 | 从 store 读取 token，注入 `Authorization: Bearer`；从 preference store 自动附加 position/region 参数 |
| 响应拦截 | 统一处理 `code !== 0` 的业务错误提示                                                                 |
| 401 处理 | Token 失效时清除登录态并跳转登录页                                                                   |
| 分页参数 | 统一 page / pageSize 参数封装                                                                        |

### 13.3 通知轮询

- `stores/notification.ts` 在登录后启动 `setInterval` 每 30s 拉取未读数，更新顶部/我的页角标
- V1.0 不引入 WebSocket / 推送，实时性为"秒级 ~ 30 秒级"

---

## 14. 前端功能模块

### 14.1 首页（Home）

**布局（自上而下）：**

1. 顶部：应用名称 **"AI智面"** + 导航菜单（首页 / 题库 / 智学 / 智考 / 社区 / 我的）
2. **岗位与地区筛选器**：岗位（公务员 / 事业单位 / 国企央企面试 / 教资面试）+ 地区（各省份），默认 公务员 / 四川；变更即保存偏好并全局联动
3. **打卡入口**：今日是否已打卡 + 连续天数
4. **学习进度**：各模块进度汇总
5. **智能学习规划路径**：当前阶段 / 节点 + 总进度
6. **今日推荐（题目）** 列表：按岗位/地区推荐，点击进题目详情

**功能：** 打卡（`POST /checkins`）、学习进度（`GET /learn/progress`）、规划概览（`GET /study-plans/current`）、今日推荐（`GET /recommendations/today`），未登录访问返回默认 公务员/四川 内容。

**文件：** `views/home/index.vue`，组件 `PreferenceFilter`、`CheckInCard`、`RecommendationList`。

### 14.2 题库（Questions）

**布局（自上而下）：**

1. 顶部**搜索框**（搜索试题，`GET /questions/search`）
2. **四个入口卡片**：热点习题 / 历年真题 / 模拟试卷 / AI 错题本，点击跳转对应页（`/questions/hot`、`/questions/real`、`/questions/mock`、`/questions/wrong`）
3. **专项练习分类标签栏**：九大题型（社会现象、态度观点、组织管理、应急应变、人际关系、情景模拟、自我认知、专业题、开放论述），默认高亮 **"社会现象"**
4. 标签下方**题目列表**：点击标签筛选题型；按岗位/地区联动出题（默认 公务员/四川）

**功能：** 题目列表 / 搜索 / 详情（作答 + 参考回答 + AI 错题解析）、四入口落地、九题型筛选、答题提交进错题本。

**文件：** `views/questions/`（index、hot、real、mock、wrong、detail），组件 `EntryCards`、`NineCategoryTabs`、`QuestionCard`。

### 14.3 智学（Learn）

**布局（自上而下）：**

1. 顶部**5 个模块卡片**：晨读 / 面试通识 / 在线课程 / 素材库 / 我的笔记，点击跳转对应页面
2. **今日推荐**区域：展示最新热点内容（`GET /recommendations/hot`），按岗位/地区推送
3. **AI 摘要同步到我的笔记**功能按钮 / 提示

**功能：** 晨读（列表 / 详情 / 已读统计）、面试通识、在线课程、素材库、学习笔记（手写 + AI 摘要同步）、AI 摘要生成与保存、学习进度汇总。

**文件：** `views/learn/`（reading、reading-detail、material-lib、basics、basics-detail、courses、note），组件 `ModuleCard`。

### 14.4 智考（Exam）

**布局：** 两个核心入口卡片——**AI 模拟面试** 和 **历史考试**，其余区域简洁，直接基于岗位/地区定位面试内容。

**功能：**

- AI 模拟面试：按岗位/地区自动匹配场景、题型与评分标准，进入流式对话面试室（`POST /interviews` → `views/exam/room`）
- 历史考试：查看过往模拟面试记录、成绩与复盘（`GET /interviews`，`views/exam/report`）

**文件：** `views/exam/`（index、room、report），组件 `EntryCards`。

### 14.5 社区（Community）

**布局：** 三个分区——**热点话题** / **最新话题** / **AI 答疑**；右侧 **"发布面试经验"** 按钮；下方帖子列表默认显示热点话题，点击"最新话题"切换排序。

**功能：** 帖子列表（sort=hot|latest，默认热点）、发布面经（带岗位/地区标签）、帖子详情、点赞（触发通知）、AI 答疑入口（复用 `POST /ai/ask`）。

**文件：** `views/community/`（index、create-post、post-detail），组件 `PostCard`。

### 14.6 我的（Profile）

**布局（自上而下）：**

1. **设置**入口（`/profile/settings`）
2. 用户头像、昵称（如"小王学员"）、简要信息（如"公务员面试 82.5 均分"）
3. **四张功能卡片**：学习报告 / 能力评估 / 勋章墙 / 消息通知
4. 底部**成长树**：以可视化树形记录学习成长轨迹（等级、当前成长值、距下一级进度、成长明细）

**功能：** 个人资料、学习报告（`/profile/report`）、能力评估（`/profile/assessment`）、勋章墙（`/profile/badges`）、消息通知（`/profile/notifications`）、成长树（`/profile/growth-tree`）、会员中心（`/membership`）、设置。

**文件：** `views/profile/`（index、report、assessment、badges、notifications、growth-tree、settings）、`views/checkin/index.vue`、`views/membership/index.vue`，组件 `GrowthTree`。

---

# 第四部分 · Web 后台（Admin Frontend）

## 15. 后台架构与目录结构

### 15.1 目录结构

```
admin/
├── index.html
├── vite.config.ts
├── package.json
└── src/
    ├── main.ts / App.vue
    ├── router/                  # 路由 + 权限守卫
    ├── stores/                  # 用户 / 权限状态
    ├── api/                     # 接口层（/api/admin/*）
    ├── components/              # 公共组件
    ├── layouts/                 # 后台布局
    └── views/
        ├── login/  dashboard/
        ├── user/                # 用户列表 / 详情
        ├── scenario/  question/  interview/
        ├── post/                # 帖子管理
        ├── content/             # 晨读 / 素材 / 通识 / 课程 / 热点内容
        ├── mock-paper/          # 模拟试卷管理
        ├── study-plan/          # 学习规划（含节点）
        ├── badge/               # 勋章管理
        ├── notification/        # 通知推送 / 记录
        ├── behavior/            # 打卡 / 答题 / AI答疑 / 笔记 / 成长规则
        ├── membership/          # 方案 / 订阅
        ├── role/  admin-mgmt/   # 角色 / 权限 / 管理员
        ├── profile/
        └── error/               # 403 / 404
```

### 15.2 技术要点

| 项        | 说明                                      |
| --------- | ----------------------------------------- |
| UI 组件库 | Ant Design Vue                            |
| 图表      | vue-echarts + echarts（仪表盘）           |
| 状态管理  | Pinia（管理员信息、权限菜单）             |
| 路由      | Hash History + 权限守卫（按角色过滤菜单） |

---

## 16. 后台路由与权限

### 16.1 路由表

| 路由                                                                                                       | 页面       | 说明                                   |
| ---------------------------------------------------------------------------------------------------------- | ---------- | -------------------------------------- |
| `/login`                                                                                                   | 登录       | 管理员登录                             |
| `/dashboard`                                                                                               | 仪表盘     | 数据总览                               |
| `/users` `/users/:id`                                                                                      | 用户管理   | 用户列表 / 详情                        |
| `/scenarios`                                                                                               | 场景管理   | 面试场景                               |
| `/questions`                                                                                               | 题库管理   | 题目维护（含岗位/来源/题型）           |
| `/interviews` `/interviews/:sessionId`                                                                     | 面试管理   | 会话 / 详情                            |
| `/posts`                                                                                                   | 帖子管理   | 帖子维护                               |
| `/content/readings` `/content/materials` `/content/basics` `/content/courses` `/content/hot-topics`        | 内容管理   | 晨读 / 素材 / 通识 / 课程 / 热点       |
| `/mock-papers` `/mock-papers/:id`                                                                          | 试卷管理   | 模拟试卷 / 组卷                        |
| `/study-plans` `/study-plans/:id`                                                                          | 规划管理   | 学习规划 / 节点                        |
| `/badges`                                                                                                  | 勋章管理   | 勋章定义                               |
| `/notifications`                                                                                           | 通知管理   | 推送 / 记录                            |
| `/behavior/checkins` `/behavior/answers` `/behavior/ai-answers` `/behavior/notes` `/behavior/growth-rules` | 行为数据   | 打卡 / 答题 / AI答疑 / 笔记 / 成长规则 |
| `/membership/plans`                                                                                        | 会员方案   | 方案维护                               |
| `/membership/subscriptions`                                                                                | 订阅管理   | 订阅记录                               |
| `/roles`                                                                                                   | 角色管理   | RBAC 角色                              |
| `/admins`                                                                                                  | 管理员管理 | 后台账号                               |
| `/profile`                                                                                                 | 个人中心   | 账号资料                               |
| `/403` `/404`                                                                                              | 错误页     | 权限不足 / 不存在                      |

### 16.2 权限控制

- 登录后按角色加载可访问菜单与操作权限
- 路由守卫：无权限访问返回 403
- 接口层配合后端权限点校验（`require-permission.js` 中间件），内容类权限点如 `content:reading:*`、`plan:*`、`badge:*` 等

---

## 17. 后台功能模块

| 模块     | 页面               | 功能                                                 |
| -------- | ------------------ | ---------------------------------------------------- |
| 仪表盘   | dashboard          | 平台数据总览（ECharts 图表，含打卡/AI答疑/勋章指标） |
| 用户管理 | user/              | 用户列表、详情、封禁 / 解封                          |
| 场景管理 | scenario/          | 面试场景增删改查（含岗位/地区）                      |
| 题库管理 | question/          | 题目增删改查（岗位/来源/九题型）、真题批量导入       |
| 面试管理 | interview/         | 面试记录查看、报告详情                               |
| 帖子管理 | post/              | 帖子查看、删除                                       |
| 内容管理 | content/           | 晨读 / 素材 / 通识 / 课程 / 热点维护                 |
| 试卷管理 | mock-paper/        | 模拟试卷维护、组卷                                   |
| 规划管理 | study-plan/        | 学习规划与节点维护                                   |
| 勋章管理 | badge/             | 勋章定义与达成条件                                   |
| 通知管理 | notification/      | 系统通知推送、发送记录                               |
| 行为数据 | behavior/          | 打卡/答题/AI答疑/笔记查看、成长规则配置              |
| 会员管理 | membership/        | 会员方案维护、订阅记录                               |
| 权限管理 | role/、admin-mgmt/ | 角色管理、权限分配、管理员账号                       |
| 个人中心 | profile/           | 后台账号资料                                         |

---

# 第五部分 · 规范与规划

## 18. 非功能需求

| 类别     | 指标项     | 要求                                                                           |
| -------- | ---------- | ------------------------------------------------------------------------------ |
| 性能     | 页面加载   | 首页首屏加载 ≤ 3 秒                                                            |
| 性能     | API 响应   | 普通查询接口 ≤ 500ms；AI 接口 ≤ 5s（超时降级）                                 |
| 性能     | 并发       | AI 接口按用户限流（默认 10 次/分钟）                                           |
| 兼容性   | 浏览器     | Chrome / Edge / Firefox 主流现代浏览器                                         |
| 可维护性 | 代码规范   | 前端 ESLint + vue-tsc 类型检查；后端分层清晰                                   |
| 可测试性 | 自动化测试 | 后端 jest + supertest 接口测试                                                 |
| 可维护性 | 数据库     | 提供迁移脚本（migrations）与种子数据（seeders）                                |
| 部署     | 构建产物   | `npm run build` 产出静态资源，可部署至任意静态服务器                           |
| 可扩展性 | 模块化     | 前端按功能模块分包；后端路由 / 服务分层                                        |
| 成本控制 | AI 调用    | 统一 aiService 计费/用量统计；答疑走非流式控成本                               |
| 成本控制 | Embedding  | 内容变更时增量向量化，避免全量重复调用；embedding 用量与 AI 调用统一统计       |
| 性能     | RAG 检索   | 检索延迟 ≤ 200ms（向量 + 关键词混合）；向量库不可用自动降级为关键词 / 全文检索 |
| 可维护性 | 索引       | 管理端一键重建索引；分块 / 向量化失败可重试（status=failed）                   |
| 实时性   | 通知       | 未读数 30s 轮询，V1.0 不引入 WebSocket                                         |

---

## 19. 验收标准

| 模块             | 验收标准                                                                                                                       |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| 登录认证         | 手机号验证码登录可走通；Token 过期自动跳转登录；管理员账号密码登录 + 角色权限生效                                              |
| 用户档案         | 用户可查看 / 编辑本人资料；手机号脱敏显示；"我的"页展示昵称、均分信息                                                          |
| **岗位地区联动** | 首页筛选器变更后，今日推荐 / 题库列表 / 智学内容 / 智考匹配 / 社区帖子联动；未登录默认 公务员/四川；偏好保存与复用生效         |
| 打卡             | 打卡 → 连续天数 / 成长值 → 日历回显全链路；当天重复打卡返回 3001                                                               |
| 今日推荐         | 按岗位 / 地区返回题目与热点，内容非空                                                                                          |
| 学习规划         | 匹配岗位 / 地区返回规划路径；节点完成 → 进度更新 → 首页回显                                                                    |
| 面试训练         | 创建 AI 模拟面试（按岗位/地区匹配题型与评分）→ 流式对话 → 结束 → 报告；历史考试可回看                                          |
| 题库             | 四入口分别命中对应数据；九题型切换正确且默认"社会现象"；搜索 / 筛选 / 详情正常；AI 错题本展示 AI 解析                          |
| 智学             | 5 模块卡片跳转；晨读已读标记；素材 / 课程 / 通识正常；笔记 CRUD；AI 摘要生成并可同步保存为笔记                                 |
| AI 答疑          | 首页 / 智学 / 社区三入口均可问答；记录可查可删                                                                                 |
| 社区             | 热点话题 / 最新话题分区切换正确；发布面经；点赞可用并触发通知                                                                  |
| 消息通知         | 点赞 / AI答疑 / 系统推送触发通知；未读数角标与 30s 轮询正确；已读 / 全部已读生效                                               |
| 勋章             | 达成条件（如连续打卡 7 天）自动颁发；勋章墙与达成进度正确                                                                      |
| 成长树           | 打卡 / 答题 / 面试等累计成长值；等级 / 进度 / 明细正确                                                                         |
| 会员             | 方案展示、订阅、取消自动续费流程可用                                                                                           |
| 后台管理         | 管理员登录后各模块（含内容 / 规划 / 勋章 / 通知 / 行为数据）数据可维护；无权限访问返回 403                                     |
| 权限控制         | 非管理员访问后台接口被拒（code 2003 / HTTP 403）                                                                               |
| 数据一致性       | 删除操作为逻辑删除或保留关联数据；分页字段完整                                                                                 |
| RAG 知识库       | 管理端导入 / 重建索引后，AI 答疑回答正确引用素材库与题库内容并附来源（citations）；按岗位 / 地区过滤生效；向量库不可用自动降级 |
| Agent 面试官     | 面试中面试官可主动追问（基于上一轮作答）；可调用评分工具实时给分；结束报告含工具评分明细；工具调用日志在管理端可查             |

---

## 20. 版本规划

| 版本         | 功能                                                                                                                                                                                  |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| V1.0（当前） | 六大模块 + 岗位/地区联动 + 打卡 + 成长树 + 勋章 + 消息通知 + AI 答疑 + 今日推荐 + 智能学习规划 + 题库四入口/九题型 + AI 摘要笔记 + AI 模拟面试 + Web 后台全模块 + 服务端 API 全量打通 |
| V1.1         | 社区评论系统、面试报告增强（维度细化、AI 示范作答）、通知推送增强（邮件/短信）、**RAG 知识库（AI 答疑检索引用）**                                                                     |
| V2.0         | **Agent 面试官（工具调用：主动追问 / 实时评分 / 知识检索）**、数字人面试官（3D/视频渲染）、语音作答（STT/TTS）、数据统计看板增强                                                      |

---

## 21. 项目启动与开发

### 服务端

```bash
cd server
# 配置 .env（数据库连接、JWT 密钥、AI 配置）
npm install
npm run dev        # node --watch index.js，端口 3000
npm test           # jest 测试
npm run migrate    # 数据库迁移（先改表后建表）
npm run seed       # 种子数据
```

**迁移顺序**：先对 users / questions / scenarios / interview_sessions / posts 执行 ALTER 加字段，再按依赖创建新表（check_ins → answer_records → wrong_answers → 内容表 → mock_papers → study_plans → badges → notifications → ai_answers → growth_records → learning_notes → knowledge_docs → knowledge_chunks → agent_tools → agent_tool_logs）。

**种子数据**：岗位/地区/九大题型字典、默认管理员与超级管理员角色权限、面试场景、四入口题目样例、会员套餐、成长值事件分值、默认学习规划、默认勋章规则、Agent 工具默认定义、少量素材/题目示例（用于演示 RAG 检索）。

### Web 端

```bash
cd web
npm install
npm run dev        # Vite，端口 8081，/api 代理到 localhost:3000
npm run build      # vue-tsc --noEmit && vite build
```

### Web 后台

```bash
cd admin
npm install
npm run dev        # Vite，/api/admin 代理到后端
npm run build
```

### 环境变量

| 文件 / 配置            | 用途                                                          |
| ---------------------- | ------------------------------------------------------------- |
| `web/.env.development` | Web 端开发环境 API 地址（`http://localhost:3000`）            |
| `web/.env.production`  | Web 端生产环境 API 地址                                       |
| `server/.env`          | 服务端配置（数据库、JWT、AI、向量库、Embedding、Agent、端口） |

---

## 附：文档说明

本文档为 **v2.1 版**，在 v2.0 完整重写基础上新增 RAG 知识库与 Agent 面试官设计，依据以下资料编写：

1. **六页面产品设计**（首页 / 题库 / 智学 / 智考 / 社区 / 我的，含岗位/地区筛选器、打卡、成长树、消息通知、AI 答疑等新需求）
2. **《锋行软件工作室管理系统-完整PRD-V1.0.docx》** — 提供技术文档的结构框架（系统架构、数据模型、接口设计、安全、非功能、验收、版本规划）
3. **`D:\gtit\7.24\code\code\` 下的技术文档**（`docs/api-spec.md`、`docs/api-admin.md`）— 提供接口规格、数据库表设计、响应格式规范等文档标准
4. **AI智面 平台**（`web/`、`admin/` 前端代码 + `server/` 服务端代码）— 内容依据实际实现整理
5. **RAG / Agent 进阶设计**（对应求职方向的大模型应用能力：检索增强生成、工具调用、工程化降级）— 见 §10

_文档版本：v2.1 | 最后更新：2026-08-08_
