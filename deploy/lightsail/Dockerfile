FROM node:24.20.0-bookworm-slim AS maintenance
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/* && corepack enable
WORKDIR /build
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/package.json
RUN corepack pnpm install --frozen-lockfile --prod=false
COPY apps/api/dist ./apps/api/dist
COPY apps/api/src ./apps/api/src
COPY apps/api/prisma ./apps/api/prisma
COPY apps/api/prisma.config.ts ./apps/api/prisma.config.ts
COPY apps/api/scripts/create-portfolio-demo.mjs ./apps/api/scripts/create-portfolio-demo.mjs
RUN corepack pnpm --filter @sensor-mes/api deploy --legacy --prod /runtime
WORKDIR /build/apps/api

FROM node:24.20.0-bookworm-slim AS runtime
WORKDIR /app/apps/api
COPY --from=maintenance --chown=node:node /runtime ./
COPY --chown=node:node apps/web/dist /app/apps/web/dist
ENV NODE_ENV=production PORT=3000 DB_POOL_MAX=5 NODE_OPTIONS=--max-old-space-size=256
USER node
EXPOSE 3000
CMD ["node", "dist/main.js"]
