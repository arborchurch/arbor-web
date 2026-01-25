#!/bin/bash

# Exit on error
set -e

echo "📅 Fetching calendar events from Planning Center..."

# Navigate to the planning-center scripts directory
cd scripts/planning-center

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm install
fi

# Fetch calendar events
npm run fetch-calendar
npm run fetch-events

# Return to root directory
cd ../..

echo "🏗️  Building Hugo site..."

# Navigate to site directory and build
cd site

# Build Hugo with any additional arguments passed to the script
# Also add the deploy URL if it's set (for Netlify previews)
HUGO_ARGS="--gc --minify"

# Add any arguments passed to this script
if [ "$#" -gt 0 ]; then
  HUGO_ARGS="$HUGO_ARGS $@"
fi

# Add deploy URL if set (Netlify environment variable)
if [ -n "$DEPLOY_PRIME_URL" ]; then
  HUGO_ARGS="$HUGO_ARGS -b $DEPLOY_PRIME_URL"
fi

hugo $HUGO_ARGS

echo "✅ Site build complete!"
