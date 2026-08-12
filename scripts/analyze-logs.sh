#!/usr/bin/env bash
# AI 智面 · 访问日志分析（运维用）
# 用法: bash scripts/analyze-logs.sh [日志目录]
#   默认分析 server/logs/access-*.log（由 utils/requestLogger.js 产生，一行一条 JSON）
# 输出: 总请求 / 4xx·5xx 错误率 / 平均·P95 耗时 / 状态码分布 / TOP 慢接口 / TOP 报错接口
# 依赖: jq（Ubuntu: apt install jq / 阿里云镜像内网 yum install jq）
set -euo pipefail

LOG_DIR="${1:-$(cd "$(dirname "$0")/.." && pwd)/server/logs}"
shopt -s nullglob
FILES=("${LOG_DIR}"/access-*.log)

if [ ${#FILES[@]} -eq 0 ]; then
  echo "❌ 未找到日志: ${LOG_DIR}/access-*.log（先启动服务产生日志，或跑一次 npm test）"
  exit 1
fi
if ! command -v jq >/dev/null 2>&1; then
  echo "❌ 缺少 jq，请先安装: apt install -y jq"
  exit 1
fi

echo "分析文件:"
printf '  %s\n' "${FILES[@]}"
echo "----------------------------------------------"

TOTAL=$(jq -s 'length' "${FILES[@]}")
ERR4=$(jq -s '[.[] | select(.status >= 400 and .status < 500)] | length' "${FILES[@]}")
ERR5=$(jq -s '[.[] | select(.status >= 500)] | length' "${FILES[@]}")
AVG=$(jq -s '([.[].duration_ms] | add) / length' "${FILES[@]}")
P95=$(jq -sr '[.[].duration_ms] | sort | .[((length * 95) / 100 | floor)]' "${FILES[@]}")

echo "总请求: ${TOTAL}"
echo "4xx: ${ERR4}   5xx: ${ERR5}   错误率: $(awk "BEGIN{printf \"%.2f%%\", (${ERR4}+${ERR5})/${TOTAL}*100}")"
echo "平均耗时: ${AVG} ms   P95 耗时: ${P95} ms"
echo ""
echo "--- 状态码分布 ---"
jq -r '.status' "${FILES[@]}" | sort | uniq -c | sort -rn | awk '{printf "  HTTP %s: %s 次\n", $2, $1}'
echo ""
echo "--- TOP 10 最慢接口 ---"
jq -sr 'group_by(.path) | map({path: .[0].path, n: length, avg: ([.[].duration_ms] | add / length)}) | sort_by(-.avg) | .[:10][] | "  \(.avg | floor)ms x\(.n)次  \(.path)"' "${FILES[@]}"
echo ""
echo "--- TOP 5 报错接口（5xx） ---"
jq -sr '[.[] | select(.status >= 500)] | group_by(.path) | map({path: .[0].path, n: length}) | sort_by(-.n) | .[:5][] | "  x\(.n)次  \(.path)"' "${FILES[@]}"
echo ""
echo "✅ 分析完成"
