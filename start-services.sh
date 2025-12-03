#!/bin/bash

# Start all Kai services
# This script starts Auth, Content, and Learning services in the background

echo "🚀 Starting Kai Services..."
echo ""

# Check if PostgreSQL is running
if ! pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
  echo "❌ PostgreSQL is not running. Please start it first."
  exit 1
fi

# Check if Kafka is running
if ! nc -z localhost 9092 > /dev/null 2>&1; then
  echo "⚠️  Warning: Kafka may not be running on localhost:9092"
fi

# Start Auth Service
echo "📝 Starting Auth Service (port 3001)..."
cd services/auth-service
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/auth_db?schema=public" \
  JWT_SECRET="your-secret-key" \
  bun run src/index.ts > ../../logs/auth.log 2>&1 &
AUTH_PID=$!
echo "   PID: $AUTH_PID"
cd ../..

# Wait a bit
sleep 2

# Start Content Service
echo "📸 Starting Content Service (port 3002)..."
cd services/content-service
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/content_db?schema=public" \
  KAFKA_BROKERS="localhost:9092" \
  bun run src/index.ts > ../../logs/content.log 2>&1 &
CONTENT_PID=$!
echo "   PID: $CONTENT_PID"
cd ../..

# Wait a bit
sleep 2

# Start Learning Service
echo "🎓 Starting Learning Service (port 3003)..."
cd services/learning-service
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/learning_db?schema=public" \
  KAFKA_BROKERS="localhost:9092" \
  bun run src/index.ts > ../../logs/learning.log 2>&1 &
LEARNING_PID=$!
echo "   PID: $LEARNING_PID"
cd ../..

# Wait for services to start
echo ""
echo "⏳ Waiting for services to start..."
sleep 5

# Check service health
echo ""
echo "🔍 Checking service health..."

if curl -s http://localhost:3001/auth/health > /dev/null 2>&1 || [ $? -eq 52 ]; then
  echo "✅ Auth Service: Running"
else
  echo "❌ Auth Service: Not responding"
fi

if curl -s http://localhost:3002/content > /dev/null 2>&1 || [ $? -eq 52 ]; then
  echo "✅ Content Service: Running"
else
  echo "❌ Content Service: Not responding"
fi

if curl -s http://localhost:3003/learning > /dev/null 2>&1 || [ $? -eq 52 ]; then
  echo "✅ Learning Service: Running"
else
  echo "❌ Learning Service: Not responding"
fi

echo ""
echo "📋 Service PIDs:"
echo "   Auth: $AUTH_PID"
echo "   Content: $CONTENT_PID"
echo "   Learning: $LEARNING_PID"
echo ""
echo "📝 Logs available in ./logs/"
echo ""
echo "To stop services:"
echo "   kill $AUTH_PID $CONTENT_PID $LEARNING_PID"
