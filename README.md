# 🎯 AI 智面平台（AI Interview Coach）

AI 模拟面试 + 备考学习一体化平台。覆盖 **面试模拟（V2.0 Agent 面试官）、AI 答疑（V1.1 RAG 知识库）、题库刷题、晨读/素材/课程、成长激励、社区、管理后台** 七大模块，三端完整交付。

## ✨ 核心特性

| 模块 | 说明 |
| --- | --- |
| 🗣️ **V2.0 Agent 面试官** | DeepSeek 函数调用驱动 5 个工具（`retrieve_knowledge` 检索知识库 / `score_answer` 逐轮评分 / `generate_followup` 主动追问 / `next_question` 推进 / `finish_interview` 收尾），SSE 流式输出 + 工具调用实时提示；每轮即时评分合并进报告 |
| 📚 **V1.1 RAG 知识库** | 5 类内容（素材/题库/晨读/通识/热点）自动分块 + embedding 索引；混合检索（向量 Top-K + 关键词 + RRF 合并）；回答带引用来源；MySQL 向量列兜底 / 可切换 Qdrant |
| 📝 **题库刷题** | 九大题型、四入口（热点/真题/模拟/专项）、三级岗位回退、随机练习 |
| 🎓 **备考学习** | 晨读、面试素材、通识基础、课程、学习笔记 |
| 🌱 **成长激励** | 成长值体系（6 档成长树）、连续打卡、勋章成就 |
| 💬 **社区** | 经验帖 + AI 答疑评论（n-gram + RAG 混合检索） |
| 🔔 **通知推送** | 系统/点赞/AI答疑/成就/打卡 多类型 |
| 🛠️ **管理后台** | 数据看板、题库/内容/学习规划/勋章/通知维护、Agent 工具启停 |

## 🏗️ 架构

```
web (Vue3 + Element Plus, 8081)
admin (Vue3 + Ant Design Vue, 8082)
        │  /api → 反向代理
        ▼
server (Express 4 + mysql2 + OpenAI SDK, 3000)
   ├── MySQL 8（业务表 + 向量 JSON 列兜底）
   ├── Qdrant（部署时启用，REST，零额外依赖）
   ├── DeepSeek（对话/评分/Agent 工具）
   └── DashScope（embedding，失败自动降级本地哈希）
```

- **认证**：JWT（C 端 7d / 管理端 12h）；统一响应 `{code, data, message}`（code 0=成功）
- **流式**：面试一问一答走 SSE（`text` / `tool` / `done` / `error` 帧）
- **RAG 降级链**：向量检索 → 关键词检索 → 裸调；embedding 远程失败 → 哈希向量，索引永不中断

## 🚀 快速启动（本地开发）

要求：Node 18+、MySQL 8（root/123456 或改 `.env`）。

```bash
# 1) 后端
cd server
npm install
cp .env.example .env   # 项目内已有 .env，请补 AI_API_KEY
npm run migrate        # 建表（幂等）
npm run seed           # 种子数据（含 RAG 重建 + Agent 工具注册）
npm run dev            # :3000

# 2) C 端（另一终端）
cd web && npm install && npm run dev   # :8081

# 3) 管理端（另一终端）
cd admin && npm install && npm run dev # :8082
```

- C 端登录：任意手机号 + 验证码 `123456`
- 管理端：`http://localhost:8082`，账号 `admin / admin123`

> 首次体验面试：进入「模拟面试」→ 创建（3 题）→ 逐题作答 → 观察 AI 面试官的追问/评分 → 生成 6 维评分报告。

## 🐳 Docker 生产部署

```bash
cp .env.example .env        # 填写 AI_API_KEY 等
bash scripts/deploy.sh              # 一键构建启动 → http://IP/
bash scripts/deploy.sh 你的域名     # 启动并自动签发 HTTPS（certbot）
```

- 服务编排：`mysql:8` + `qdrant` + `server` + `nginx`（80/443）
- 首次启动自动执行迁移 + 种子（幂等）；C 端挂 `/`，管理端挂 `/admin/`，`/api` 反代后端
- 向量库生产默认 Qdrant（`VECTOR_MODE=qdrant`）；资源受限可改 `mysql`

## 📁 目录结构

```
AIzhimian/
├── server/            # Express 后端（controllers/services/models/routes/middleware）
│   ├── migrations/    # 011 个幂等迁移（含 RAG 与 Agent 表）
│   ├── seeders/       # 008 个种子（含知识库重建与 Agent 工具注册）
│   └── scripts/       # run-migrations / run-seeders / rebuild-knowledge
├── web/               # C 端（Vue3 + Element Plus + Vite）
├── admin/             # 管理端（Vue3 + Ant Design Vue 4 + Vite）
├── nginx/             # 网关配置（多阶段构建 + 反代 + HTTPS 说明）
├── docker-compose.yml        # 生产编排
├── scripts/deploy.sh         # 一键部署
└── 1AI智面平台技术文档__SDD.md # 技术文档（SDD，含 RAG §10.2 / Agent §10.3 设计）
```

## ⚙️ 环境变量（详见 `.env.example`）

`AI_API_KEY`（DeepSeek，必填）· `DB_*` / `MYSQL_ROOT_PASSWORD` · `JWT_SECRET` / `ADMIN_JWT_SECRET` · `EMBEDDING_*`（DashScope + 降级）· `VECTOR_MODE` / `QDRANT_*` · `AGENT_ENABLED` / `AGENT_MAX_TOOL_CALLS`

## ✅ 质量

- 后端 Jest 单测 **138 个用例全过**；端到端流程 19/19 通过
- 双前端 `vue-tsc --noEmit` 零类型错误
- 关键链路均有降级与兜底（AI 超时重试、RAG 降级、Agent 回退 V1.0、工具日志 fail-open）

## 📄 许可

仅供学习交流。AI 能力依赖第三方 API（DeepSeek / DashScope），需自行申请 Key 并按服务商条款使用。
