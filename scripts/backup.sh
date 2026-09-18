#!/usr/bin/env bash
# AI 智面 · MySQL 备份（运维用）
# 用法: bash scripts/backup.sh
#   - 本地/Docker 通用：设 MYSQL_CONTAINER 则走 docker exec（服务器部署典型），否则直连 mysqldump
#   - 保留最近 KEEP_DAYS=7 天，自动清理更旧备份
#   - 定时（服务器 crontab）: 0 3 * * * bash /root/ai-zhimian/scripts/backup.sh >> /var/log/ai-zhimian-backup.log 2>&1
set -euo pipefail
cd "$(dirname "$0")/.."

# 从 .env 读取 DB 连接信息（不打印明文）
if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source <(grep -E '^(DB_|MYSQL_|MYSQL_ROOT)' .env | sed 's/^export //' | grep -v '^#')
  set +a
fi

DB_NAME="${DB_NAME:-ai_interview_coach}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
KEEP_DAYS="${KEEP_DAYS:-7}"
MYSQL_CONTAINER="${MYSQL_CONTAINER:-}"

mkdir -p "${BACKUP_DIR}"
TS="$(date +%Y%m%d_%H%M%S)"
OUT="${BACKUP_DIR}/${DB_NAME}_${TS}.sql.gz"
echo "🔄 备份 ${DB_NAME} → ${OUT}"

if [ -n "${MYSQL_CONTAINER}" ]; then
  # Docker 部署：容器内执行 mysqldump（容器名如 ai-zhimian-mysql-1）
  docker exec "${MYSQL_CONTAINER}" sh -c "MYSQL_PWD='${DB_PASSWORD:-}' mysqldump -uroot --single-transaction --set-gtid-purged=OFF '${DB_NAME}'" | gzip > "${OUT}"
else
  # 本地：直连 mysqldump（需 mysqldump 在 PATH）
  MYSQL_PWD="${DB_PASSWORD:-}" mysqldump \
    -h"${DB_HOST:-127.0.0.1}" -P"${DB_PORT:-3306}" -u"${DB_USER:-root}" \
    --single-transaction --set-gtid-purged=OFF \
    "${DB_NAME}" | gzip > "${OUT}"
fi

echo "✅ 完成：$(du -h "${OUT}" | cut -f1)"
find "${BACKUP_DIR}" -name "${DB_NAME}_*.sql.gz" -mtime +"${KEEP_DAYS}" -delete
echo "🗑  已清理 ${KEEP_DAYS} 天前的旧备份"
