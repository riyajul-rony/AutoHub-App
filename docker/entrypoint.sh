#!/bin/sh
set -e

echo "Starting Lead Reach AI entrypoint..."

# 1. Generate secrets if missing
if [ -z "$AUTH_SECRET" ] || [ -z "$APP_ENCRYPTION_KEY" ]; then
  mkdir -p /data
  if [ ! -f /data/.secrets ]; then
    echo "Generating new random secrets into /data/.secrets..."
    AUTH_SEC=$(head -c 32 /dev/urandom | base64)
    APP_KEY=$(head -c 32 /dev/urandom | base64)
    echo "AUTH_SECRET=$AUTH_SEC" >> /data/.secrets
    echo "APP_ENCRYPTION_KEY=$APP_KEY" >> /data/.secrets
    chmod 600 /data/.secrets
  fi
  # Export stored secrets
  export $(cat /data/.secrets | xargs)
fi

# 2. Run migrations only if we are the web service container
if [ "$SERVICE_ROLE" = "web" ]; then
  echo "Waiting for PostgreSQL database to be ready..."
  for i in $(seq 1 30); do
    if npx prisma migrate deploy; then
      echo "Prisma migrations applied successfully."
      break
    fi
    echo "Database not ready yet, retrying in 2 seconds... ($i/30)"
    sleep 2
  done
fi

exec "$@"
