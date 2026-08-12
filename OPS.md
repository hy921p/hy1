# AI 智面平台 · 运维手册（OPS）

> 配套运维能力：健康巡检 / 日志系统与日志分析 / 备份与回滚 / 一键部署。
> 适用对象：服务器管理员、项目维护者。
> 服务器：阿里云 ECS（2G 内存，Docker Compose 部署），nginx 80/443 → server 3000。

---

## 1. 环境与架构

```
                    ┌─────────────────────────────┐
 用户浏览器 ──80/443──►  nginx（SPA + /api 反代）    │
                    └─────────────┬───────────────┘
                                  │ /api/v1、/api/admin
                          ┌───────▼────────┐
                          │   server:3000   │  Express + mysql2/promise
                          └───────┬────────┘
                          ┌───────▼────────┐
                          │    mysql:8      │  库：ai_interview_coach
                          └────────────────┘
```

| 项 | 值 |
|---|---|
| 服务器 IP | 47.109.179.18 |
| 部署目录 | `/root/ai-zhimian` |
| C 端入口 | `http://<IP>/` |
| 管理端入口 | `http://<IP>/admin/`（admin / admin123，上线后请改） |
| 后端容器 | `server`（端口 3000，不对外暴露，仅 nginx 反代） |
| 数据库 | `mysql` 容器，库 `ai_interview_coach`，root 密码见 `.env` 的 `MYSQL_ROOT_PASSWORD` |
| 向量库 | **当前 ECS 为 `VECTOR_MODE=mysql`**（2G 内存跑不动 Qdrant）；想用 Qdrant 需在 compose 加 qdrant 服务并切 `VECTOR_MODE=qdrant` |
| 本地开发 | `server/` 下 `node index.js`，端口 3000；数据库直连 `127.0.0.1:3306` |

---

## 2. 启动 / 停止 / 查看状态

### 生产（Docker Compose）
```bash
cd /root/ai-zhimian
docker compose up -d --build   # 构建并启动（迁移/种子首次自动执行，幂等）
docker compose ps              # 查看各容器状态（mysql/server/nginx）
docker compose logs -f server  # 跟踪后端日志
docker compose down            # 停止（-v 会删数据卷，慎用！）
```

### 本地开发（无 Docker）
```bash
cd server
npm run migrate && npm run seed   # 首次或改表后
node index.js                     # 启动，日志输出到 server/logs/
```

### 就绪自检
```bash
curl -s http://localhost/api/v1/health
# → {"code":0,"data":{"status":"ok","db":true,"uptime":...,"rss":...,"timestamp":...}}
```

---

## 3. 配置管理（.env）

| 变量 | 说明 | 注意 |
|---|---|---|
| `AI_API_KEY` | DeepSeek key（必填） | 部署脚本会拒绝占位符；**不要提交到 git** |
| `AI_ENABLED` | AI 开关 | 关闭后 AI 端点返回 503 |
| `MYSQL_ROOT_PASSWORD` | MySQL root 密码 | compose 初始化用，改后需重建数据卷才生效 |
| `DB_NAME` | 库名 | 默认 `ai_interview_coach` |
| `VECTOR_MODE` | `mysql` / `qdrant` | **ECS 2G 内存用 mysql**；与 compose 实际服务一致 |
| `EMBEDDING_MODE` | `auto`/`remote`/`hash` | 远程失败自动降级本地哈希，流水线不断 |
| `AGENT_ENABLED` | Agent 面试官开关 | 关闭则退回 V1.0 规则编排 |

> 修改 `.env` 后需重建容器才生效：`docker compose up -d --build`。

---

## 4. 日志系统

### 4.1 产生位置
| 日志 | 路径 | 内容 |
|---|---|---|
| 访问日志 | `server/logs/access-YYYY-MM-DD.log` | 每请求一行 JSON：`{ts, method, path, status, duration_ms, user, ip}` |
| 错误日志 | `server/logs/error-*.log` | `status>=500` 的请求行 + 应用 error 级日志 |
| 容器 stdout | `docker compose logs -f server` | 启动信息、未定向文件的关键日志 |

访问日志由中间件 `server/utils/requestLogger.js` 写入：按天分文件、自动清理 14 天前旧文件（启动时 `sweepOld()`）、**fail-open**（日志写失败不影响业务）。`logs/` 已在 `.gitignore`，不入库。

### 4.2 日志分析
```bash
bash scripts/analyze-logs.sh            # 分析默认 server/logs/access-*.log
bash scripts/analyze-logs.sh /path/to/logs
```
输出：总请求 / 4xx·5xx 错误率 / 平均·P95 耗时 / 状态码分布 / TOP10 最慢接口 / TOP5 报错接口。
依赖 `jq`：`apt install -y jq`（服务器 Ubuntu）。
**用法示例**：面试时被问「怎么发现慢接口」，回答「跑 analyze-logs.sh，看 P95 和 TOP 慢接口，定位瓶颈」。
> 本地无 jq 也可用：`node scripts/analyze-logs.mjs`（可选；本仓库以 bash+jq 为准）。

---

## 5. 健康巡检

### 5.1 健康接口
```bash
curl -s http://localhost/api/v1/health
```
返回：`status`（ok/error）、`db`（数据库连通性）、`uptime`（秒）、`rss`（进程内存字节）、`timestamp`。

### 5.2 巡检脚本
```bash
bash scripts/inspect.sh
```
检查项：系统负载 / 内存 / 磁盘 / Docker 容器 / 3000·8081·8082 端口 / 健康接口 / 最近 20 行错误日志。

### 5.3 定时巡检（crontab，服务器）
```bash
crontab -e
# 每 10 分钟一次巡检，追加到日志
*/10 * * * * bash /root/ai-zhimian/scripts/inspect.sh >> /var/log/ai-zhimian-inspect.log 2>&1
```

---

## 6. 备份 / 恢复 / 回滚

### 6.1 备份
```bash
bash scripts/backup.sh          # 默认输出 ./backups/{DB_NAME}_时间戳.sql.gz，保留 7 天
# Docker 部署：先设容器名
MYSQL_CONTAINER=ai-zhimian-mysql-1 bash scripts/backup.sh
```
定时（每天 3 点）：
```bash
0 3 * * * bash /root/ai-zhimian/scripts/backup.sh >> /var/log/ai-zhimian-backup.log 2>&1
```

### 6.2 恢复（危险，会覆盖当前库）
```bash
bash scripts/restore.sh backups/ai_interview_coach_20260812_030000.sql.gz
# 会提示输入 yes 确认，才用备份覆盖当前 DB_NAME 全部数据
```

### 6.3 版本回滚
```bash
# ① 代码先回退到目标版本
git checkout <目标tag/commit>
# ② 一键回滚：先恢复 DB 备份，再重建并重启服务
bash scripts/deploy.sh rollback backups/ai_interview_coach_20260812_030000.sql.gz
```
> 说明：`rollback` 只负责「数据回滚 + 服务重建」；代码回滚需先 `git checkout/reset` 再执行。

---

## 7. 数据库操作

| 操作 | 命令 | 说明 |
|---|---|---|
| 迁移 | `cd server && npm run migrate` | 幂等，可反复跑 |
| 种子 | `cd server && npm run seed` | 幂等；含知识库索引重建 |
| 重建知识索引 | `node server/scripts/rebuild-knowledge.js` | 向量/关键词索引全量重建 |
| 进入 MySQL | `docker compose exec mysql mysql -uroot -p` | 密码见 `.env` |

---

## 8. 测试（自动化回归）

```bash
cd server
npm run test:all    # 准备隔离测试库 + 跑全部用例（单元 8 + 集成 32）
```
- 测试跑在**独立库 `ai_interview_coach_test`**，不动开发/生产数据；
- AI 端点全 mock，不产生真实调用与费用；
- 用例清单见 `TEST_CASES.md`。

---

## 9. 常见故障排查

| 现象 | 排查 | 处理 |
|---|---|---|
| 端口 3000 被占 / `EADDRINUSE` | `netstat -ano \| grep :3000`（Windows）或 `ss -lntp \| grep 3000`（Linux） | 杀残留进程后重启（Windows: `taskkill //F //PID <pid>`） |
| 服务无响应 | `curl http://localhost/api/v1/health`；`docker compose ps` | 看容器是否 Exited；`docker compose logs -f server` 找堆栈 |
| `logs/` 一直没有访问日志 | 确认请求真的到了后端（非 404/静态）；`ls -la server/logs/` | requestLogger 已挂到 app 全局中间件；写失败是 fail-open 不报错，可临时在 utils 加 debug 输出 |
| AI 端点报 503 | `AI_ENABLED` 是否 false；DeepSeek key/余额 | 检查 `.env`，`AI_BASE_URL` 是否可达；看 `error-*.log` |
| AI 超时 504 | `AI_TIMEOUT` 过小或上游慢 | 调大 `AI_TIMEOUT`（默认 60000） |
| 接口变慢 | `bash scripts/analyze-logs.sh` 看 TOP 慢接口 | 定位慢 SQL/慢依赖 |
| 向量检索不生效 | 确认 `VECTOR_MODE` 与部署一致（ECS 用 mysql）；`knowledge_chunks` 是否有数据 | `node server/scripts/rebuild-knowledge.js` 重建索引 |
| 磁盘打满 | `df -h /`；`du -sh server/logs backups` | 备份保留 7 天自动清理；日志保留 14 天自动清理；必要时手动删 |
| 内存不足（2G ECS） | `free -m` | 一次只启一个重服务；已移除 Qdrant 用 mysql 向量 |
| 登录后提示未登录 | JWT 过期（`JWT_EXPIRES_IN`） | 重新登录；检查服务器与本地时间是否同步 |

---

## 10. 发布 / 回滚速查

```
发布新版本： git pull → bash scripts/deploy.sh [域名]
出问题回滚： git checkout <旧版本> → bash scripts/deploy.sh rollback <最近备份>
数据保命：  每天 3 点 backup.sh 定时备份；恢复前先确认备份时间点
```

---
*版本 v1.0 · 配套阶段 6 运维能力增强（巡检/日志/备份回滚/测试）*
