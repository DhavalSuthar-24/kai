#!/bin/bash

# Essential Space Verification Script
# Tests the smart sidebar API with curated content aggregation

set -e

BASE_URL="http://localhost"
AUTH_PORT="3001"
LEARNING_PORT="3003"

echo "🧪 Essential Space (Smart Sidebar) Verification"
echo "================================================"
echo ""

# Step 1: Register and login
echo "📝 Step 1: Registering test user..."
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL:$AUTH_PORT/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "essential-test@example.com",
    "password": "Test123!",
    "name": "Essential Space Tester"
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

# Step 2: Create some test data (flashcards)
echo "📚 Step 2: Creating test flashcards..."
# Note: This would require topic creation first, skipping for now
echo "⏭️  Skipping flashcard creation (requires topic setup)"
echo ""

# Step 3: Get essential space
echo "✨ Step 3: Getting essential space..."
ESSENTIAL_RESPONSE=$(curl -s -X GET "$BASE_URL:$LEARNING_PORT/essential-space" \
  -H "Authorization: Bearer $TOKEN")

echo "$ESSENTIAL_RESPONSE" | jq '.'
echo ""

# Step 4: Submit feedback
ITEM_COUNT=$(echo "$ESSENTIAL_RESPONSE" | jq '.data | length')
if [ "$ITEM_COUNT" -gt 0 ]; then
  FIRST_ITEM_ID=$(echo "$ESSENTIAL_RESPONSE" | jq -r '.data[0].id')
  FIRST_ITEM_TYPE=$(echo "$ESSENTIAL_RESPONSE" | jq -r '.data[0].type')
  
  echo "👍 Step 4: Submitting feedback for first item..."
  FEEDBACK_RESPONSE=$(curl -s -X POST "$BASE_URL:$LEARNING_PORT/essential-space/feedback" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{
      \"itemId\": \"$FIRST_ITEM_ID\",
      \"itemType\": \"$FIRST_ITEM_TYPE\",
      \"rating\": 5,
      \"feedback\": \"Very helpful!\"
    }")
  
  echo "$FEEDBACK_RESPONSE" | jq '.'
  echo ""
fi

# Step 5: Get history
echo "📜 Step 5: Getting essential space history..."
HISTORY_RESPONSE=$(curl -s -X GET "$BASE_URL:$LEARNING_PORT/essential-space/history?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN")

echo "$HISTORY_RESPONSE" | jq '.'
echo ""

# Step 6: Test cache (should return cached result)
echo "⚡ Step 6: Testing cache (second request should be faster)..."
time curl -s -X GET "$BASE_URL:$LEARNING_PORT/essential-space" \
  -H "Authorization: Bearer $TOKEN" > /dev/null
echo ""

echo "✅ Essential Space verification completed!"
