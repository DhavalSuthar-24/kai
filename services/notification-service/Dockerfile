FROM oven/bun:1

WORKDIR /app

# Copy root files
COPY package.json bun.lockb ./

# Copy common package
COPY packages/common ./packages/common

# Copy service
COPY services/notification-service ./services/notification-service

# Install dependencies
RUN bun install

# Expose port
EXPOSE 3005

# Start command
CMD ["bun", "run", "src/index.ts"]
