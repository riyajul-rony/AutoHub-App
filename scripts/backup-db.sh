#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./data/backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="autohub_db_${TIMESTAMP}.sql.gz"

mkdir -p "${BACKUP_DIR}"

echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Starting automated PostgreSQL backup..."

# Dump database through docker compose into compressed archive
docker compose exec -T db pg_dump -U autohub autohub | gzip > "${BACKUP_DIR}/${FILENAME}"

FILE_SIZE=$(du -h "${BACKUP_DIR}/${FILENAME}" | cut -f1)
echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Backup successful: ${BACKUP_DIR}/${FILENAME} (${FILE_SIZE})"

# Prune backups older than retention period
echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Cleaning up backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -name "autohub_db_*.sql.gz" -type f -mtime +"${RETENTION_DAYS}" -delete

echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Backup maintenance complete."
