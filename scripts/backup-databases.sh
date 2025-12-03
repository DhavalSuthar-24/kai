#!/bin/bash

# Database Backup Script for Kai Backend
# This script creates backups of all PostgreSQL databases

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"

# Database names
DATABASES=("kai_auth" "kai_content" "kai_learning" "kai_gamification" "kai_notification")

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo "🔄 Starting database backup at $(date)"

# Backup each database
for DB in "${DATABASES[@]}"; do
  echo "📦 Backing up database: $DB"
  
  BACKUP_FILE="$BACKUP_DIR/${DB}_${TIMESTAMP}.sql.gz"
  
  # Create backup with pg_dump and compress
  PGPASSWORD="$POSTGRES_PASSWORD" pg_dump \
    -h "$POSTGRES_HOST" \
    -p "$POSTGRES_PORT" \
    -U "$POSTGRES_USER" \
    -d "$DB" \
    --format=custom \
    --compress=9 \
    --file="$BACKUP_FILE"
  
  if [ $? -eq 0 ]; then
    echo "✅ Backup created: $BACKUP_FILE"
    
    # Get file size
    SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "   Size: $SIZE"
  else
    echo "❌ Failed to backup $DB"
    exit 1
  fi
done

# Clean up old backups
echo "🧹 Cleaning up backups older than $RETENTION_DAYS days"
find "$BACKUP_DIR" -name "*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete

# List remaining backups
echo "📋 Current backups:"
ls -lh "$BACKUP_DIR"/*.sql.gz 2>/dev/null || echo "No backups found"

echo "✅ Backup completed successfully at $(date)"

# Optional: Upload to cloud storage (uncomment and configure as needed)
# aws s3 sync "$BACKUP_DIR" s3://your-bucket/kai-backups/
# gsutil -m rsync -r "$BACKUP_DIR" gs://your-bucket/kai-backups/
