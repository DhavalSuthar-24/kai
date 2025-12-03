FROM oven/bun:1

WORKDIR /app

# Copy root files
COPY package.json bun.lockb ./

# Copy common package
COPY packages/common ./packages/common

# Copy service
COPY services/gamification-service ./services/gamification-service

# Install dependencies
RUN bun install

# Generate Prisma Client
WORKDIR /app/services/gamification-service
RUN bun x prisma generate

# Expose port
EXPOSE 3004

# Start command
CMD ["bun", "run", "src/index.ts"]
