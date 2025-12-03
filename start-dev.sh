#!/bin/bash

echo "🚀 Starting Kai Microservices with Docker Compose..."

# Check if docker is running
if ! docker info > /dev/null 2>&1; then
  echo "❌ Docker is not running. Please start Docker and try again."
  exit 1
fi

# Build and start containers
echo "📦 Building and starting containers..."
docker-compose up --build -d

echo "✅ Services started in background!"
echo "   Auth Service: http://localhost:3001"
echo "   Content Service: http://localhost:3002"
echo "   Learning Service: http://localhost:3003"
echo "   Gamification Service: http://localhost:3004"
echo "   Notification Service: http://localhost:3005"
echo ""
echo "📝 Logs: docker-compose logs -f"
echo "🛑 Stop: docker-compose down"
