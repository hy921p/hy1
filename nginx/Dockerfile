# AI 智面 · 网关镜像（多阶段：构建 web + admin → nginx 提供静态与反代）
# web 挂在 /，admin 挂在 /admin/（hash 路由，VITE_BASE=/admin/）

# —— 阶段 1：web 构建 ——
FROM node:20-alpine AS web-build
WORKDIR /app
COPY web/package.json web/package-lock.json ./web/
RUN cd web && npm ci
COPY web/ ./web/
RUN cd web && npm run build

# —— 阶段 2：admin 构建 ——
FROM node:20-alpine AS admin-build
WORKDIR /app
COPY admin/package.json admin/package-lock.json ./admin/
RUN cd admin && npm ci
COPY admin/ ./admin/
RUN cd admin && VITE_BASE=/admin/ npm run build

# —— 阶段 3：运行镜像 ——
FROM nginx:alpine
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=web-build /app/web/dist /usr/share/nginx/html/web
COPY --from=admin-build /app/admin/dist /usr/share/nginx/html/admin
EXPOSE 80 443
