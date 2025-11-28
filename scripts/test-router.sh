#!/bin/bash

# AI Router System - API Test Script
# Tests auto-detect endpoints locally

API_URL="http://localhost:3001"
echo "🧪 Testing AI Router System Endpoints"
echo "======================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Auto-detect React query
echo -e "${YELLOW}Test 1: Auto-detect React query (useState)${NC}"
curl -X POST "$API_URL/api/v1/chat/auto" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "How to use useState hook?",
    "userId": "test_user_123",
    "userEmail": "test@example.com"
  }' \
  -s | jq '.routing'

echo ""
echo "---"
echo ""

# Test 2: Auto-detect Next.js query
echo -e "${YELLOW}Test 2: Auto-detect Next.js query (App Router)${NC}"
curl -X POST "$API_URL/api/v1/chat/auto" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What is App Router in Next.js?",
    "userId": "test_user_123",
    "userEmail": "test@example.com"
  }' \
  -s | jq '.routing'

echo ""
echo "---"
echo ""

# Test 3: Auto-detect TypeScript query
echo -e "${YELLOW}Test 3: Auto-detect TypeScript query (interfaces)${NC}"
curl -X POST "$API_URL/api/v1/chat/auto" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "How do I define interfaces in TypeScript?",
    "userId": "test_user_123",
    "userEmail": "test@example.com"
  }' \
  -s | jq '.routing'

echo ""
echo "---"
echo ""

# Test 4: Meta query
echo -e "${YELLOW}Test 4: Meta query (platform info)${NC}"
curl -X POST "$API_URL/api/v1/chat/auto" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What documentation sources do you support?",
    "userId": "test_user_123",
    "userEmail": "test@example.com"
  }' \
  -s | jq '{answer: .answer, routing: .routing}'

echo ""
echo "---"
echo ""

# Test 5: Ambiguous query
echo -e "${YELLOW}Test 5: Ambiguous query (needs clarification)${NC}"
curl -X POST "$API_URL/api/v1/chat/auto" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "How to create components?",
    "userId": "test_user_123",
    "userEmail": "test@example.com"
  }' \
  -s | jq '{needsClarification: .needsClarification, clarification: .clarification}'

echo ""
echo "---"
echo ""

# Test 6: Get available doc sources
echo -e "${YELLOW}Test 6: Get available doc sources${NC}"
curl -X GET "$API_URL/api/v1/docs/sources" -s | jq '.sources[] | {id, name, keywords: (.keywords | length)}'

echo ""
echo "======================================"
echo -e "${GREEN}✅ Tests Complete${NC}"
echo ""
echo "Next: Start API server with 'cd apps/api && pnpm run dev' and run this script"
