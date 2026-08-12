#!/usr/bin/env bash
# AI 智面 · 数据库恢复（危险操作，必须确认）
# 用法: bash scripts/restore.sh <备份文件>
#   例: bash scripts/restore.sh backups/ai_interview_coach_20260812_030000.sql.gz
# 说明: 会用备份覆盖当前 DB_NAME 全部数据！执行前先看 OPS.md「备份与恢复」。
set -euo pipefail
cd "$(dirname "$0")/.."

FILE="${1:-}"
if [ -z "${FILE}" ] || [ ! -f "${FILE}" ]; then
  echo "❌ 用法: bash scripts/restore.sh <备份文件>"
  exit 1
fi

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source <(grep -E '^(DB_|MYSQL_|MYSQL_ROOT)' .env | sed 's/^export //' | grep -v '^#')
  set +a
fi

DB_NAME="${DB_NAME:-ai_interview_coach}"
MYSQL_CONTAINER="${MYSQL_CONTAINER:-}"

echo "⚠️  将用 $(basename "${FILE}") 覆盖 ${DB_NAME} 全部数据，输入 yes 继续："
read -r CONFIRM
[ "${CONFIRM}" = "yes" ] || { echo "已取消"; exit 1; }

if [ -n "${MYSQL_CONTAINER}" ]; then
  gunzip -c "${FILE}" | docker exec -i "${MYSQL_CONTAINER}" sh -c "MYSQL_PWD='${DB_PASSWORD:-}' mysql -uroot '${DB_NAME}'"
else
  gunzip -c "${FILE}" | MYSQL_PWD="${DB_PASSWORD:-}" mysql \
    -h"${DB_HOST:-127.0.0.1}" -P"${DB_PORT:-3306}" -u"${DB_USER:-root}" "${DB_NAME}"
fi

echo "✅ 恢复完成"
