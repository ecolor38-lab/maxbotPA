#!/bin/bash
# backup.sh — бэкап данных на S3 (Timeweb)
set -euo pipefail

APP_DIR="/opt/maxbot"
BUCKET="s3://maxbot-storage"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/tmp/maxbot-backup-${TIMESTAMP}"

echo "=== MaxBot Backup (${TIMESTAMP}) ==="

mkdir -p "$BACKUP_DIR"

# Копируем данные для бэкапа
cd "$APP_DIR"

for file in content-plan.json published-urls.json; do
  if [ -f "$file" ]; then
    cp "$file" "$BACKUP_DIR/"
    echo "  + $file"
  fi
done

# SQLite backup (consistent copy with WAL checkpoint)
if [ -f "data/maxbot.db" ]; then
  mkdir -p "$BACKUP_DIR/data"
  if command -v sqlite3 &>/dev/null; then
    sqlite3 data/maxbot.db ".backup $BACKUP_DIR/data/maxbot.db"
  else
    cp data/maxbot.db data/maxbot.db-wal data/maxbot.db-shm "$BACKUP_DIR/data/" 2>/dev/null
  fi
  echo "  + data/maxbot.db"
fi

if [ -d posts ]; then
  cp -r posts "$BACKUP_DIR/"
  echo "  + posts/"
fi

# Загружаем на S3
echo "Загрузка в ${BUCKET}..."
s3cmd sync "$BACKUP_DIR/" "${BUCKET}/backups/${TIMESTAMP}/" --no-mime-magic

# Сохраняем latest
s3cmd sync "$BACKUP_DIR/" "${BUCKET}/backups/latest/" --no-mime-magic --delete-removed

# Удаляем старые бэкапы (>30 дней)
echo "Очистка старых бэкапов..."
CUTOFF=$(date -d "-30 days" +%Y%m%d 2>/dev/null || date -v-30d +%Y%m%d)
s3cmd ls "${BUCKET}/backups/" | while read -r line; do
  dir=$(echo "$line" | awk '{print $NF}')
  dir_date=$(basename "$dir" | grep -oP '^\d{8}' || true)
  if [ -n "$dir_date" ] && [ "$dir_date" -lt "$CUTOFF" ] 2>/dev/null; then
    echo "  Удаляю: $dir"
    s3cmd del --recursive "$dir"
  fi
done

# Очистка tmp
rm -rf "$BACKUP_DIR"

echo "=== Backup завершён ==="
