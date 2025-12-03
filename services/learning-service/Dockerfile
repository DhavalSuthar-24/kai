FROM oven/bun:1

WORKDIR /app

# Copy root files
COPY package.json bun.lockb ./

# Copy common package
COPY packages/common ./packages/common

# Copy service
COPY services/learning-service ./services/learning-service

# Install dependencies
RUN bun install

# Generate Prisma Client
WORKDIR /app/services/learning-service
RUN bun x prisma generate

# Expose port
EXPOSE 3003

# Start command
CMD ["bun", "run", "src/index.ts"]
