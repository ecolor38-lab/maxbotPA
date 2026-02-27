#!/bin/bash
# setup.sh — первоначальная настройка VPS для maxbotPA
set -euo pipefail

REPO_URL="https://github.com/ecolor38-lab/maxbotPA.git"
APP_DIR="/opt/maxbot"
NODE_VERSION="20"

echo "=== MaxBot VPS Setup ==="

# 1. Обновление системы
echo "[1/6] Обновление системы..."
apt-get update && apt-get upgrade -y

# 2. Установка Node.js 20 LTS
echo "[2/6] Установка Node.js ${NODE_VERSION}..."
if ! command -v node &>/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
  apt-get install -y nodejs
fi
echo "Node.js $(node -v), npm $(npm -v)"

# 3. Установка PM2
echo "[3/6] Установка PM2..."
npm install -g pm2

# 4. Установка s3cmd для бэкапов
echo "[4/6] Установка s3cmd..."
apt-get install -y s3cmd

# 5. Клонирование и настройка проекта
echo "[5/6] Клонирование проекта..."
if [ -d "$APP_DIR" ]; then
  echo "Директория $APP_DIR уже существует, обновляю..."
  cd "$APP_DIR"
  git pull
else
  git clone "$REPO_URL" "$APP_DIR"
  cd "$APP_DIR"
fi

npm ci --production

# 6. Создание .env файла
echo "[6/6] Настройка .env..."
if [ ! -f .env ]; then
  cp .env.example .env
  echo ""
  echo "================================================"
  echo "  ВАЖНО: Отредактируйте /opt/maxbot/.env"
  echo "  nano /opt/maxbot/.env"
  echo "================================================"
  echo ""
  echo "Обязательные переменные:"
  echo "  MAX_BOT_TOKEN=..."
  echo "  MAX_CHAT_LINK=..."
  echo "  ANTHROPIC_API_KEY=..."
  echo "  AUTO_START_SCHEDULER=true"
  echo "  NODE_ENV=production"
  echo ""
else
  echo ".env уже существует, пропускаю"
fi

# Настройка PM2 автозапуска
pm2 startup systemd -u root --hp /root
echo ""

echo "=== Настройка завершена ==="
echo ""
echo "Следующие шаги:"
echo "  1. nano /opt/maxbot/.env  — заполнить переменные"
echo "  2. cd /opt/maxbot && pm2 start ecosystem.config.cjs"
echo "  3. pm2 save"
echo "  4. curl http://localhost:3000/health"
