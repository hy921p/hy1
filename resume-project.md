# AI 智面平台 · 简历项目描述

## 中文版（项目经历）

### AI 智面平台（大模型应用开发方向）｜独立开发

**技术栈**：Vue 3 + TypeScript + Vite + Element Plus / Ant Design Vue、Express 4 + mysql2、MySQL 8、DeepSeek/通义千问 API、Qdrant（可切换 MySQL 向量）、Docker Compose + Nginx、Jest + Supertest、Shell + jq

**项目简介**：面向公考/事业编等结构化面试的「AI 模拟面试 + 备考学习」一体化平台，三端完整交付（C 端学习/面试、管理后台、后端 138 个接口），本地与 Docker 均可一键部署。

**核心职责与成果**：

1. **V2.0 Agent 面试官（函数调用）**：基于 DeepSeek function-calling 实现 Agent 工具循环（检索知识库 / 六维逐轮评分 / 主动追问 / 推进下一题 / 结束面试），单轮最多 4 次工具调用防死循环；SSE 流式输出并新增 `tool` 帧实时展示「正在评分/追问」；每轮 `score_answer` 分数聚合进最终报告；任一工具失败自动回退 V1.0 规则编排，面试不中断；管理后台可对 5 个工具启停，停用工具即使被模型点名也会被白名单拦截不执行。
2. **V1.1 RAG 知识库（先答疑后面试官）**：5 类备考内容自动分块（~1200 字符/块）+ embedding（DashScope 远程优先，失败自动降级为本地 2/3-gram 哈希向量，维度归一化 1024）；向量库可插拔（本地 MySQL JSON 列 + JS 余弦兜底，部署切 Qdrant REST，零新依赖）；混合检索 = 向量 Top-K + n-gram 关键词 + RRF 合并，按文档去重；AI 答疑回答自动附带引用来源；回答位置/地区偏好过滤；管理端增删改内容自动增量重建索引。
3. **面试全流程（V1.0）**：创建面试 → 三级岗位回退出题 → SSE 流式一问一答 → 六维评分报告（总评/维度分/逐题点评/优缺点）；包含状态机（未开始/进行中/暂停/完成/中断）、防重复结束、成长值/勋章联动。
4. **备考与社区**：题库四入口刷题、晨读/素材/通识/课程学习与笔记、连续打卡、经验帖社区 + AI 答疑（n-gram + RAG 混合检索）、成长树与勋章激励、多类型通知推送。
5. **工程与质量**：自动化测试套件（Jest + Supertest，单元 + 集成共 35 条用例，跑在**独立测试库** `ai_interview_coach_test`，不污染生产数据；AI 端点全 mock 零成本）；双前端 `vue-tsc` 零类型错误；端到端流程 19/19；全部关键链路有降级兜底；Docker Compose（MySQL+Qdrant+后端+Nginx）一键部署 + HTTPS。
6. **运维能力（运维/测试方向）**：请求级 JSON 日志中间件（按天分文件、14 天轮转、fail-open）+ `jq` 日志分析脚本（错误率 / P95 / TOP 慢接口定位）；健康接口增强（uptime / rss / DB 连通）+ 巡检脚本（负载/内存/磁盘/容器/端口）+ crontab 定时巡检；MySQL 定时备份（mysqldump + gzip + 保留 7 天）、恢复脚本（二次确认防误覆盖）、`deploy.sh rollback` 一键回滚；配套 OPS.md 运维手册 + TEST_CASES.md 测试用例文档（含 6 条缺陷排查实录）。

## 英文要点（English bullets）

- Built a full-stack **AI interview-coaching platform** (Vue3/TS + Express + MySQL) with a **function-calling Agent interviewer** on DeepSeek: a tool loop over `retrieve_knowledge / score_answer / generate_followup / next_question / finish_interview` with SSE tool frames, per-turn 6-dimension scoring merged into the final report, graceful fallback to rule-based orchestration, and admin on/off for each tool (disabled tools are blocked by whitelist even if the model names them).
- Implemented a **hybrid RAG knowledge base**: 5 content sources chunked (~1200 chars) and embedded (DashScope remote with local n-gram hash fallback, dim-1024 normalized); pluggable vector store (MySQL JSON+cosine locally, Qdrant REST in production, zero new deps); vector top-K + keyword + RRF retrieval with de-duplication, position/region filtering, and source citations on every AI answer.
- Delivered the full interview lifecycle (question matching, SSE streaming, 6-dimension report) plus learning/community/growth/notification modules and an admin console (dashboard, content CRUD, agent-tool toggles).
- Engineering: automated test suite (Jest + Supertest, **35 unit/integration cases on an isolated test DB** — production data untouched, AI endpoints fully mocked), 19/19 E2E, `vue-tsc` clean on both SPAs, fail-open logs and degradation chains throughout, one-command Docker Compose + Nginx deployment with HTTPS.
- Ops/testing: per-request JSON request logging with daily rotation + jq analytics (error rate / P95 / slowest endpoints); enhanced health endpoint (uptime/rss/DB) + an inspection script for cron-based monitoring; scheduled MySQL backups with restore confirmation and one-command rollback (`deploy.sh rollback`); documented in OPS.md and TEST_CASES.md (including a defect-tracking log).
