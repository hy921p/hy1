# AI 智面 · 后端镜像（Express + mysql2 + OpenAI SDK）
# 首次启动自动执行迁移 + 种子（幂等），再启动服务
FROM node:20-alpine

WORKDIR /app

# 先装依赖（利用层缓存）
COPY package.json package-lock.json ./
RUN npm config set registry https://registry.npmmirror.com && npm ci --omit=dev

# 拷贝源码
COPY . .

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# migrate/seed 幂等可重复执行；种子含 RAG 全量重建（007）与 Agent 工具注册（008）
CMD ["sh", "-c", "npm run migrate && npm run seed && node index.js"]
