#!/bin/sh
# rootslegx database restore script
# Usage: ./restore.sh <backup_file.sql.gz>

if [ -z "$1" ]; then
    echo "Usage: ./restore.sh <backup_file.sql.gz>"
    echo "Available backups:"
    ls -la /backups/rootslegx_*.sql.gz 2>/dev/null || echo "No backups found."
    exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "ERROR: Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "WARNING: This will overwrite the current database!"
echo "Restoring from: $BACKUP_FILE"

gunzip -c "$BACKUP_FILE" | psql

if [ $? -eq 0 ]; then
    echo "Restore complete."
else
    echo "ERROR: Restore failed!"
    exit 1
fi
