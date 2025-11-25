#!/bin/bash
# Deploy API to production

echo "🚀 Deploying DocsTalk API..."
echo ""

# Check if .env exists
if [ ! -f "apps/api/.env" ]; then
  echo "❌ Error: apps/api/.env not found!"
  echo "Please create .env file with required variables."
  exit 1
fi

# Build API
echo "📦 Building API..."
pnpm --filter @docstalk/api build

# TODO: Add your deployment commands here
# Examples:
# - PM2: pm2 restart docstalk-api
# - Docker: docker-compose up -d api
# - Vercel: vercel --prod
# - Custom: ./deploy-to-server.sh

echo ""
echo "✅ API deployment complete!"
echo "🔗 API should be running at your configured URL"
