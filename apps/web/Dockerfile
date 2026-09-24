# syntax=docker/dockerfile:1.7
FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@11.20.0 --activate
WORKDIR /app

FROM base AS pruner
COPY . .
RUN pnpm dlx turbo@2.11.3 prune @onboard/web --docker

FROM base AS installer
COPY --from=pruner /app/out/json/ .
RUN pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=installer /app/ .
COPY --from=pruner /app/out/full/ .
COPY --from=pruner /app/docs/references.md ./docs/references.md
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm turbo run build --filter=@onboard/web

FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup -S -g 1001 nodejs \
  && adduser -S -u 1001 -G nodejs webuser
COPY --from=builder --chown=webuser:nodejs /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=webuser:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=webuser:nodejs /app/apps/web/.next/static ./apps/web/.next/static
USER webuser
WORKDIR /app/apps/web
EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0
CMD ["node", "server.js"]
