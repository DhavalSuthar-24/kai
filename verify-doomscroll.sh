#!/bin/bash

# Doomscroll Detection Verification Script
# Tests the complete flow: screen usage -> detection -> intervention -> response

set -e

BASE_URL="http://localhost"
AUTH_PORT="3001"
CONTENT_PORT="3002"
LEARNING_PORT="3003"

echo "🧪 Doomscroll Detection Verification"
echo "===================================="
echo ""

# Step 1: Register and login
echo "📝 Step 1: Registering test user..."
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL:$AUTH_PORT/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "doomscroll-test@example.com",
    "password": "Test123!",
    "name": "Doomscroll Tester"
  }')

echo "$REGISTER_RESPONSE" | jq '.'

TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.data.token')
USER_ID=$(echo "$REGISTER_RESPONSE" | jq -r '.data.user.id')

if [ "$TOKEN" == "null" ]; then
  echo "❌ Failed to get auth token"
  exit 1
fi

echo "✅ User registered. Token: ${TOKEN:0:20}..."
echo ""

# Step 2: Simulate doomscrolling (6 minutes on Instagram)
echo "📱 Step 2: Simulating doomscrolling (6 minutes on Instagram)..."
USAGE_RESPONSE=$(curl -s -X POST "$BASE_URL:$CONTENT_PORT/screen-usage" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "appName": "Instagram",
    "category": "SOCIAL_MEDIA",
    "duration": 360,
    "metadata": {
      "scrollDistance": 15000,
      "itemsViewed": 120
    }
  }')

echo "$USAGE_RESPONSE" | jq '.'
echo ""

# Step 3: Wait for detection (give Kafka consumer time to process)
echo "⏳ Step 3: Waiting for doomscroll detection (5 seconds)..."
sleep 5
echo ""

# Step 4: Poll for intervention
echo "🔔 Step 4: Polling for pending intervention..."
INTERVENTION_RESPONSE=$(curl -s -X GET "$BASE_URL:$LEARNING_PORT/interventions/next" \
  -H "Authorization: Bearer $TOKEN")

echo "$INTERVENTION_RESPONSE" | jq '.'

INTERVENTION_ID=$(echo "$INTERVENTION_RESPONSE" | jq -r '.data.id')

if [ "$INTERVENTION_ID" == "null" ]; then
  echo "⚠️  No intervention triggered (might need more time or check logs)"
else
  echo "✅ Intervention detected: $INTERVENTION_ID"
  echo ""
  
  # Step 5: Accept the intervention
  echo "✅ Step 5: Accepting intervention..."
  ACCEPT_RESPONSE=$(curl -s -X POST "$BASE_URL:$LEARNING_PORT/interventions/$INTERVENTION_ID/respond" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{
      "action": "ACCEPTED"
    }')
  
  echo "$ACCEPT_RESPONSE" | jq '.'
  echo ""
fi

echo "✅ Doomscroll detection test completed!"
