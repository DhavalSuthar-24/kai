#!/bin/bash

# Migration script for all microservices
# Run this after starting Docker: docker compose up -d postgres

set -e

echo "🔄 Starting migrations for all services..."
echo ""

# Auth Service
echo "📦 Migrating Auth Service..."
cd services/auth-service
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/auth_db?schema=public" bun run prisma migrate dev --name add_ai_features
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/auth_db?schema=public" bun run prisma generate
cd ../..

# Content Service
echo "📦 Migrating Content Service..."
cd services/content-service
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/content_db?schema=public" bun run prisma migrate dev --name add_ai_features
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/content_db?schema=public" bun run prisma generate
cd ../..

# Learning Service
echo "📦 Migrating Learning Service..."
cd services/learning-service
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/learning_db?schema=public" bun run prisma migrate dev --name add_ai_features
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/learning_db?schema=public" bun run prisma generate
cd ../..

# Gamification Service
echo "📦 Migrating Gamification Service..."
cd services/gamification-service
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/gamification_db?schema=public" bun run prisma migrate dev --name add_ai_features
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/gamification_db?schema=public" bun run prisma generate
cd ../..

echo ""
echo "✅ All migrations completed successfully!"
echo ""
echo "Next steps:"
echo "1. Start all services: docker compose up --build"
echo "2. Verify services are running: docker compose ps"
echo "3. Test API endpoints"
