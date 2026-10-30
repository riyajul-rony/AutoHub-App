#!/usr/bin/env bash
set -euo pipefail

echo "=============================================="
echo "        Lead Reach AI SaaS VPS Deployment           "
echo "=============================================="

# 1. Environment validation
if [ ! -f .env ]; then
  echo "❌ Error: .env file not found."
  echo "   Please copy .env.example to .env and configure your secrets:"
  echo "   cp .env.example .env && nano .env"
  exit 1
fi

# Load environment variables
export $(grep -v '^#' .env | xargs)

if [ -z "${POSTGRES_PASSWORD:-}" ] || [ "${POSTGRES_PASSWORD:-}" = "change-me" ]; then
  echo "❌ Error: POSTGRES_PASSWORD in .env must be set to a secure custom password."
  exit 1
fi

# 2. Check Docker and Docker Compose
command -v docker >/dev/null 2>&1 || {
  echo "❌ Docker is not installed. Please install Docker first: curl -fsSL https://get.docker.com | sh"
  exit 1
}

# 3. Ensure 2 GB Swap space is active (critical for 1-2 vCPU VPS)
if [ -x "scripts/setup-swap.sh" ]; then
  echo "Checking swap space..."
  bash scripts/setup-swap.sh || echo "Notice: Swap setup skipped (requires root)"
fi

# 4. Pull and build containers
echo "📦 Building and pulling latest Lead Reach AI containers..."
docker compose build --pull web

# 5. Bring up core infrastructure (DB and Redis)
echo "🗄️ Starting database and Redis..."
docker compose up -d db redis

# Wait for database healthcheck
echo "Waiting for PostgreSQL to be healthy..."
until docker compose exec -T db pg_isready -U "${POSTGRES_USER:-leadreach}" -d "${POSTGRES_DB:-leadreach}" >/dev/null 2>&1; do
  sleep 2
done
echo "✅ Database is ready."

# 6. Run database migrations
echo "🔄 Applying Prisma migrations..."
docker compose run --rm --no-deps web npx prisma migrate deploy

# 7. Start Web and Background Workers
echo "🚀 Starting Web and Background Worker services..."
docker compose up -d --remove-orphans web worker caddy

# 8. Verify service health
echo "🩺 Verifying container health status..."
sleep 5
docker compose ps

echo "=============================================="
echo "🎉 Lead Reach AI SaaS successfully deployed!"
echo "   Domain: https://${APP_DOMAIN:-localhost}"
echo "=============================================="
