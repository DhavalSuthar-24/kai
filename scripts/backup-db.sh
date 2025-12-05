#!/bin/bash

# Database Backup Script
# Usage: ./backup-db.sh

TIMESTAMP=$(date +%Y%m%d%H%M%S)
BACKUP_DIR="./backups"
DB_NAME="kai"
DB_USER="${DB_USER:-postgres}"
DB_HOST="${DB_HOST:-localhost}"

mkdir -p $BACKUP_DIR

echo "Starting backup for database: $DB_NAME at $TIMESTAMP"

# Dump database
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME -F c -f "$BACKUP_DIR/kai_backup_$TIMESTAMP.dump"

if [ $? -eq 0 ]; then
  echo "Backup successful: $BACKUP_DIR/kai_backup_$TIMESTAMP.dump"
  
  # Retention policy: Delete backups older than 7 days
  find $BACKUP_DIR -name "kai_backup_*.dump" -mtime +7 -delete
else
  echo "Backup failed!"
  exit 1
fi
