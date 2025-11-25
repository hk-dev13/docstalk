#!/bin/bash
# Deploy Web to production (Vercel recommended for Next.js)

echo "🚀 Deploying DocsTalk Web..."
echo ""

# Check if .env exists
if [ ! -f "apps/web/.env.local" ]; then
  echo "⚠️  Warning: apps/web/.env.local not found!"
  echo "Make sure environment variables are configured in your hosting platform."
fi

# Build Web
echo "📦 Building Web..."
pnpm --filter @docstalk/web build

# TODO: Add your deployment commands here
# Examples:
# - Vercel: vercel --prod
# - Netlify: netlify deploy --prod
# - Custom: rsync -av apps/web/.next/ user@server:/var/www/docstalk

echo ""
echo "✅ Web deployment complete!"
echo "🔗 Web should be available at your configured domain"
