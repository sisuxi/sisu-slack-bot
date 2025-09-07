#!/bin/bash

set -e

echo "🚀 Starting deployment of ninja-bot..."

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Check required environment variables
required_vars=("SLACK_BOT_TOKEN" "SLACK_SIGNING_SECRET" "SLACK_APP_TOKEN" "ANTHROPIC_API_KEY")
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Error: $var is not set"
        exit 1
    fi
done

echo "✅ Environment variables validated"

# Build and start with Docker Compose
echo "🔨 Building Docker image..."
docker-compose build

echo "🎯 Starting services..."
docker-compose up -d

echo "⏳ Waiting for bot to start..."
sleep 5

# Check if container is running
if docker-compose ps | grep -q "Up"; then
    echo "✅ ninja-bot deployed successfully!"
    echo "📊 View logs: docker-compose logs -f"
else
    echo "❌ Deployment failed. Check logs with: docker-compose logs"
    exit 1
fi