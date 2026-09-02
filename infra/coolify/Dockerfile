# Production image for apps/web (pnpm monorepo root build context).
# Used by infra/coolify/docker-compose.yml on Coolify.

FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@10.28.0 --activate

FROM base AS builder
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
COPY packages/embed/package.json packages/embed/
RUN pnpm install --frozen-lockfile
COPY apps/web apps/web
COPY packages packages
WORKDIR /app/apps/web
RUN pnpm prisma generate && pnpm build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app /app
WORKDIR /app/apps/web
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/ || exit 1
CMD ["sh", "-c", "pnpm prisma migrate deploy && pnpm start"]
