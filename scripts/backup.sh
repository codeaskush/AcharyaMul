#!/bin/sh
# rootslegx daily database backup script
# Runs via cron in the backup Docker container

BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/rootslegx_${TIMESTAMP}.sql.gz"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"

# Create backup
echo "[$(date)] Starting backup..."
pg_dump | gzip > "${BACKUP_FILE}"

if [ $? -eq 0 ]; then
    echo "[$(date)] Backup created: ${BACKUP_FILE}"
else
    echo "[$(date)] ERROR: Backup failed!"
    exit 1
fi

# Clean old backups
echo "[$(date)] Removing backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -name "rootslegx_*.sql.gz" -mtime +${RETENTION_DAYS} -delete

echo "[$(date)] Backup complete."
