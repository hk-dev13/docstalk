#!/bin/bash
# Build script - Build all packages and apps

echo "🏗️  Building DocsTalk Monorepo..."
echo ""

# Build in correct order (dependencies first)
echo "📦 Building shared packages..."
pnpm --filter @docstalk/types build
pnpm --filter @docstalk/config build
pnpm --filter @docstalk/rag build
pnpm --filter @docstalk/ui build

echo ""
echo "🔧 Building applications..."
pnpm --filter @docstalk/api build
pnpm --filter @docstalk/web build

echo ""
echo "✅ Build complete!"
