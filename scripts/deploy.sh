#!/usr/bin/env bash
# AI 智面 · 一键部署脚本（Docker Compose 全栈）
# 用法：bash scripts/deploy.sh [域名]
#   - 无参数：仅启动（http://<IP>/）
#   - 传域名：启动后自动签发 HTTPS（certbot --nginx）
set -euo pipefail
cd "$(dirname "$0")/.."

# 1) 准备 .env
if [ ! -f .env ]; then
  cp .env.example .env
  echo "⚠️  已生成 .env，请先编辑 AI_API_KEY（当前为占位符）"
  exit 1
fi

# 2) 检查必填 key（占位符视为未配置）
if grep -q "sk-你的DeepSeekKey\|sk-xxx\|<" .env; then
  echo "❌ 请在 .env 中填写 AI_API_KEY"
  exit 1
fi

# 3) 构建并启动
echo "🚀 开始构建并启动服务（首次构建约 3-5 分钟）…"
docker compose build
docker compose up -d

# 4) 等待后端就绪
echo "⏳ 等待后端初始化（迁移/种子自动执行）…"
for i in $(seq 1 30); do
  if curl -sf http://localhost/api/v1/home >/dev/null 2>&1; then
    echo "✅ 后端已就绪"
    break
  fi
  sleep 2
done

DOMAIN="${1:-}"
if [ -n "$DOMAIN" ]; then
  echo "🔐 为 $DOMAIN 签发 HTTPS…"
  docker compose exec nginx sh -c "apk add --no-cache certbot certbot-nginx && certbot --nginx -d $DOMAIN --non-interactive --agree-tos -m admin@$DOMAIN"
  echo "✅ HTTPS 配置完成：https://$DOMAIN/"
else
  echo "✅ 部署完成："
  echo "   C 端     http://<服务器IP>/"
  echo "  管理端    http://<服务器IP>/admin/  （admin / admin123，请尽快修改）"
  echo "  HTTPS：bash scripts/deploy.sh 你的域名"
fi
