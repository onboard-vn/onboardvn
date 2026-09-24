# syntax=docker/dockerfile:1.7
FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@11.20.0 --activate
WORKDIR /app

FROM base AS pruner
COPY . .
RUN pnpm dlx turbo@2.11.3 prune @onboard/api --docker

FROM base AS installer
COPY --from=pruner /app/out/json/ .
RUN pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=installer /app/ .
COPY --from=pruner /app/out/full/ .
RUN pnpm turbo run build --filter=@onboard/api

FROM base AS runner
ENV NODE_ENV=production
COPY --from=pruner /app/out/json/ .
RUN pnpm install --prod --frozen-lockfile
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/drizzle ./apps/api/drizzle
COPY --from=builder /app/apps/api/data ./apps/api/data
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
RUN addgroup -S -g 1001 nodejs \
  && adduser -S -u 1001 -G nodejs apiuser \
  && mkdir -p /data/uploads \
  && chown -R apiuser:nodejs /app /data/uploads
USER apiuser
WORKDIR /app/apps/api
EXPOSE 8787
CMD ["node", "dist/server.js"]
