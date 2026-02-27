#!/bin/bash
# deploy.sh — обновление бота на VPS
set -euo pipefail

APP_DIR="/opt/maxbot"

echo "=== MaxBot Deploy ==="

cd "$APP_DIR"

# Сохраняем текущий коммит
OLD_COMMIT=$(git rev-parse --short HEAD)

# Обновляем код
echo "[1/3] Обновление кода..."
git pull origin main

NEW_COMMIT=$(git rev-parse --short HEAD)

if [ "$OLD_COMMIT" = "$NEW_COMMIT" ]; then
  echo "Код не изменился ($OLD_COMMIT), пропускаю."
  exit 0
fi

echo "Обновление: $OLD_COMMIT → $NEW_COMMIT"

# Обновляем зависимости
echo "[2/3] Установка зависимостей..."
npm ci --production

# Перезапускаем PM2
echo "[3/3] Перезапуск бота..."
pm2 restart ecosystem.config.cjs

echo ""
echo "=== Deploy завершён ==="
echo "Коммит: $NEW_COMMIT"
pm2 status
