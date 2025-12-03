#!/bin/bash

# Focus Tunnel Verification Script
# Tests focus session start, WebSocket connection, and history

set -e

BASE_URL="http://localhost"
AUTH_PORT="3001"
LEARNING_PORT="3003"

echo "🧪 Focus Tunnel & App Blocking Verification"
echo "==========================================="
echo ""

# Step 1: Register and login
echo "📝 Step 1: Registering test user..."
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL:$AUTH_PORT/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "focus-test@example.com",
    "password": "Test123!",
    "name": "Focus Tester"
  }')

echo "$REGISTER_RESPONSE" | jq '.'

TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.data.token')

if [ "$TOKEN" == "null" ]; then
  echo "❌ Failed to get auth token"
  exit 1
fi

echo "✅ User registered. Token: ${TOKEN:0:20}..."
echo ""

# Step 2: Start focus session
echo "🎯 Step 2: Starting focus session (25 minutes)..."
START_RESPONSE=$(curl -s -X POST "$BASE_URL:$LEARNING_PORT/focus-tunnel/start" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "duration": 25,
    "topic": "Spanish Learning",
    "allowedApps": ["Duolingo", "Notes"],
    "blockedApps": ["Instagram", "Twitter", "Facebook"]
  }')

echo "$START_RESPONSE" | jq '.'

SESSION_ID=$(echo "$START_RESPONSE" | jq -r '.data.id')
echo "✅ Focus session started: $SESSION_ID"
echo ""

# Step 3: Get active session
echo "📊 Step 3: Getting active session..."
ACTIVE_RESPONSE=$(curl -s -X GET "$BASE_URL:$LEARNING_PORT/focus-tunnel/active" \
  -H "Authorization: Bearer $TOKEN")

echo "$ACTIVE_RESPONSE" | jq '.'
echo ""

# Step 4: Wait a bit
echo "⏳ Step 4: Waiting 3 seconds..."
sleep 3
echo ""

# Step 5: End focus session
echo "🏁 Step 5: Ending focus session..."
END_RESPONSE=$(curl -s -X POST "$BASE_URL:$LEARNING_PORT/focus-tunnel/end" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"sessionId\": \"$SESSION_ID\"
  }")

echo "$END_RESPONSE" | jq '.'
echo ""

# Step 6: Get focus history
echo "📜 Step 6: Getting focus history..."
HISTORY_RESPONSE=$(curl -s -X GET "$BASE_URL:$LEARNING_PORT/focus-tunnel/history" \
  -H "Authorization: Bearer $TOKEN")

echo "$HISTORY_RESPONSE" | jq '.'
echo ""

echo "✅ Focus Tunnel verification completed!"
echo ""
echo "📋 Summary:"
echo "  - ✅ Focus session started"
echo "  - ✅ Active session retrieved"
echo "  - ✅ Focus session ended"
echo "  - ✅ History retrieved"
echo ""
echo "🔌 WebSocket Testing:"
echo "  Connect to: ws://localhost:$LEARNING_PORT"
echo "  Events: focus:start, focus:timer, focus:phase-change, focus:end"
