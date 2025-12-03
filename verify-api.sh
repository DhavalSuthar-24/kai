#!/bin/bash

# Test script for Preferences & Goals API

echo "🔄 Waiting for services to start..."
sleep 10

echo "🔑 Logging in..."
TOKEN=$(curl -s -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}' \
  | jq -r '.data.token')

if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ Login failed. Creating user first..."
  curl -s -X POST http://localhost:3001/auth/register \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"password","name":"Test User"}'
  
  TOKEN=$(curl -s -X POST http://localhost:3001/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"password"}' \
    | jq -r '.data.token')
fi

echo "✅ Token received"

echo "📝 Testing Preferences API..."
echo "Setting preferences..."
curl -s -X POST http://localhost:3001/preferences \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"theme":"DARK","doomscrollAlerts":true}' | jq

echo "Getting preferences..."
curl -s http://localhost:3001/preferences \
  -H "Authorization: Bearer $TOKEN" | jq

echo "🎯 Testing Goals API..."
echo "Creating goal..."
curl -s -X POST http://localhost:3001/goals \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Learn Spanish",
    "targetValue": 30,
    "unit": "MINUTES",
    "category": "LEARNING"
  }' | jq

echo "Getting goals..."
curl -s http://localhost:3001/goals \
  -H "Authorization: Bearer $TOKEN" | jq

echo "Getting goal progress..."
curl -s http://localhost:3001/goals/progress \
  -H "Authorization: Bearer $TOKEN" | jq

echo "🧘 Testing Focus Modes API..."
echo "Creating focus mode..."
FOCUS_MODE_ID=$(curl -s -X POST http://localhost:3001/focus-modes \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Deep Work",
    "duration": 90,
    "blockedApps": ["twitter", "instagram"],
    "allowedApps": ["vscode", "notion"]
  }' | jq -r '.data.id')

echo "Focus Mode ID: $FOCUS_MODE_ID"

echo "Getting focus modes..."
curl -s http://localhost:3001/focus-modes \
  -H "Authorization: Bearer $TOKEN" | jq

echo "Activating focus mode..."
curl -s -X PUT http://localhost:3001/focus-modes/$FOCUS_MODE_ID/activate \
  -H "Authorization: Bearer $TOKEN" | jq

echo "Getting current focus mode..."
curl -s http://localhost:3001/focus-modes/current \
  -H "Authorization: Bearer $TOKEN" | jq

echo "✅ Tests completed!"
