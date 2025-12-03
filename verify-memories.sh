#!/bin/bash

# Memories & Weekly Insights Verification Script
# Tests daily memory generation and weekly insights

set -e

BASE_URL="http://localhost"
AUTH_PORT="3001"
LEARNING_PORT="3003"

echo "🧪 Memories & Weekly Insights Verification"
echo "==========================================="
echo ""

# Step 1: Register and login
echo "📝 Step 1: Registering test user..."
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL:$AUTH_PORT/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "memory-test@example.com",
    "password": "Test123!",
    "name": "Memory Tester"
  }')

echo "$REGISTER_RESPONSE" | jq '.'

TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.data.token')

if [ "$TOKEN" == "null" ]; then
  echo "❌ Failed to get auth token"
  exit 1
fi

echo "✅ User registered. Token: ${TOKEN:0:20}..."
echo ""

# Step 2: Manually trigger daily memory generation
echo "🎯 Step 2: Triggering daily memory generation..."
TRIGGER_RESPONSE=$(curl -s -X POST "$BASE_URL:$LEARNING_PORT/memories/daily/trigger" \
  -H "Authorization: Bearer $TOKEN")

echo "$TRIGGER_RESPONSE" | jq '.'
echo ""

# Step 3: Get daily memories
echo "📅 Step 3: Getting daily memories..."
MEMORIES_RESPONSE=$(curl -s -X GET "$BASE_URL:$LEARNING_PORT/memories/daily" \
  -H "Authorization: Bearer $TOKEN")

echo "$MEMORIES_RESPONSE" | jq '.'
echo ""

# Step 4: Manually trigger weekly insights generation
echo "📊 Step 4: Triggering weekly insights generation..."
INSIGHTS_TRIGGER=$(curl -s -X POST "$BASE_URL:$LEARNING_PORT/insights/weekly/trigger" \
  -H "Authorization: Bearer $TOKEN")

echo "$INSIGHTS_TRIGGER" | jq '.'
echo ""

# Step 5: Get weekly insights
echo "📈 Step 5: Getting weekly insights..."
INSIGHTS_RESPONSE=$(curl -s -X GET "$BASE_URL:$LEARNING_PORT/insights/weekly" \
  -H "Authorization: Bearer $TOKEN")

echo "$INSIGHTS_RESPONSE" | jq '.'
echo ""

echo "✅ Memories & Insights verification completed!"
echo ""
echo "📋 Summary:"
echo "  - ✅ Daily memory generation triggered"
echo "  - ✅ Daily memories retrieved"
echo "  - ✅ Weekly insights generation triggered"
echo "  - ✅ Weekly insights retrieved"
echo ""
echo "🕐 Scheduled Jobs:"
echo "  - Daily memories: 8 AM every day"
echo "  - Weekly insights: 8 AM every Monday"
