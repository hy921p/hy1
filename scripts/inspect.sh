#!/usr/bin/env bash
# AI 智面 · 巡检脚本（运维用）
# 用法: bash scripts/inspect.sh
#   默认检查: 系统负载 / 内存 / 磁盘 / Docker 容器 / 三端端口 / 健康接口 / 最近错误日志
# 可调: HEALTH_URL / PORTS / LOG_DIR（环境变量覆盖）
# 定时巡检（服务器 crontab）:
#   */10 * * * * bash /root/ai-zhimian/scripts/inspect.sh >> /var/log/ai-zhimian-inspect.log 2>&1
set -uo pipefail

COMPOSE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1/api/v1/health}"
PORTS="${PORTS:-3000 8081 8082}"
LOG_DIR="${COMPOSE_DIR}/server/logs"

echo "===== AI 智面 · 巡检报告 $(date '+%Y-%m-%d %H:%M:%S') ====="

echo "---- 负载（1/5/15 分钟）----"
uptime

echo "---- 内存 ----"
free -m | awk 'NR<=2{print}'

echo "---- 磁盘 / ----"
df -h / | tail -1

echo "---- Docker 容器状态 ----"
(cd "${COMPOSE_DIR}" && docker compose ps 2>/dev/null) || echo "  ⚠️  Docker 不可用（本地开发环境可忽略）"

echo "---- 服务端口可达性 ----"
for p in ${PORTS}; do
  if curl -s -o /dev/null -m 3 "http://127.0.0.1:${p}/"; then
    echo "  ✅ :${p} 可达"
  else
    echo "  ❌ :${p} 不可达"
  fi
done

echo "---- 应用健康接口 ----"
if curl -sf -m 5 "${HEALTH_URL}"; then echo; else echo "  ❌ 健康接口无响应"; fi

echo "---- 最近 20 行错误日志 ----"
tail -20 "${LOG_DIR}"/error-*.log 2>/dev/null || echo "  （无错误日志）"

echo "===== 巡检结束 ====="
