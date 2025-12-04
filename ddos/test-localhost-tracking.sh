#!/bin/bash

echo "🧪 Testing Localhost IP Tracking..."
echo ""

# Start server in background
node server/app.js > /tmp/server-test.log 2>&1 &
SERVER_PID=$!

# Wait for server to start
sleep 3

echo "✅ Server started (PID: $SERVER_PID)"
echo ""

# Make some requests
echo "📡 Making test requests..."
for i in {1..5}; do
  curl -s http://localhost:8080/test > /dev/null
  echo "  Request $i sent"
  sleep 0.2
done

echo ""
echo "📡 Making suspicious request..."
curl -s http://localhost:8080/admin > /dev/null
echo "  Suspicious request sent"

sleep 1

echo ""
echo "📊 Checking NFTs created..."
RESPONSE=$(curl -s http://localhost:8080/api/nfts)

echo "$RESPONSE" | jq -r '.nfts[] | "IP: \(.ipAddress) | Threat: \(.threatLevel) | Confidence: \(.confidenceScore)% | ML: \(.mlPrediction)"'

echo ""
echo "📊 Stats:"
curl -s http://localhost:8080/api/stats | jq '{totalRequests, uniqueIPs, mlPredictions, mlModelLoaded}'

# Cleanup
kill $SERVER_PID 2>/dev/null
wait $SERVER_PID 2>/dev/null

echo ""
echo "✅ Test complete!"
