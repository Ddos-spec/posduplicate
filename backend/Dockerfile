# ==============================================
# OmniPilot AI Backend - Production Dockerfile
# ==============================================
# P1-ready EasyPanel image. Uses Node 22 and applies only forward P1 migrations
# through the audited suite migration runner before the API starts.

FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

# Keep the build deterministic against package-lock. Full deps are retained in
# the runtime image for now because this legacy package classifies Prisma client
# under devDependencies. We can slim this after dependency metadata is normalized.
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:22-alpine

RUN apk add --no-cache dumb-init

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/dist ./dist

RUN mkdir -p uploads && chown -R nodejs:nodejs uploads

USER nodejs

EXPOSE 3500

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD node -e "const port = process.env.PORT || 3000; require('http').get('http://localhost:' + port + '/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)}).on('error', () => process.exit(1))"

ENTRYPOINT ["dumb-init", "--"]

# Migration runner is idempotent, checksum-protected, transaction-scoped and
# protected by a PostgreSQL advisory lock. API starts only after schema is ready.
CMD ["sh", "-c", "node dist/scripts/apply-p1-migrations.js && exec node dist/server.js"]
