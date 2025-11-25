#!/bin/bash
# Development script - Run all apps in development mode

echo "🚀 Starting DocsTalk Development Environment..."
echo ""

# Run both API and Web in parallel
pnpm --parallel -r dev
