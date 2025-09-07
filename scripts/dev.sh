#!/bin/bash

set -e

echo "🚀 Starting ninja-bot in development mode..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found"
    echo "📝 Please copy .env.example to .env and fill in your credentials"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build TypeScript
echo "🔨 Building TypeScript..."
npm run build

# Start in development mode
echo "🎯 Starting bot in development mode..."
npm run dev