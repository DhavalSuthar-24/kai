FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies stage
FROM base AS deps
COPY package.json bun.lockb ./
COPY packages/common ./packages/common
RUN bun install --frozen-lockfile --production

# Build stage
FROM base AS builder
COPY package.json bun.lockb ./
COPY packages/common ./packages/common
COPY services/notification-service ./services/notification-service
RUN bun install --frozen-lockfile
WORKDIR /app/services/notification-service
RUN bun x prisma generate

# Production stage
FROM oven/bun:1-alpine AS runner
WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 bunuser

# Copy dependencies
COPY --from=deps --chown=bunuser:nodejs /app/node_modules ./node_modules
COPY --from=deps --chown=bunuser:nodejs /app/packages/common ./packages/common

# Copy application
COPY --from=builder --chown=bunuser:nodejs /app/services/notification-service ./services/notification-service

# Switch to non-root user
USER bunuser

# Expose port
EXPOSE 3005

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD bun run -e "fetch('http://localhost:3005/health').then(r => r.ok ? process.exit(0) : process.exit(1))"

# Start command
WORKDIR /app/services/notification-service
CMD ["bun", "run", "src/index.ts"]
