# 📖 AI Business Bot - API Documentation

## 🚀 Быстрый старт

### Установка зависимостей

```bash
npm install
```

### Запуск сервера

```bash
# Установите переменные окружения в .env файле
cp .env.example .env

# Запустите сервер
npm run server

# Или с автоматической перезагрузкой для разработки
npm run server:dev
```

Сервер запустится на порту, указанном в `.env` (по умолчанию 3000).

## 📡 API Endpoints

### Health Check

#### `GET /health`

Проверка работоспособности сервера.

**Ответ:**
```json
{
  "status": "ok",
  "timestamp": "2025-12-25T10:00:00.000Z",
  "uptime": 123.45,
  "environment": "production"
}
```

---

### Root Endpoint

#### `GET /`

Получение информации о доступных endpoints.

**Ответ:**
```json
{
  "message": "🤖 AI Business Bot API",
  "version": "1.0.0",
  "endpoints": {
    "health": "GET /health",
    "bot": {
      "status": "GET /api/bot/status",
      "run": "POST /api/bot/run",
      "publish": "POST /api/bot/publish"
    },
    "content": {
      "stats": "GET /api/content/stats",
      "queue": "GET /api/content/queue",
      "collect": "POST /api/content/collect"
    },
    "scheduler": {
      "start": "POST /api/scheduler/start",
      "stop": "POST /api/scheduler/stop",
      "status": "GET /api/scheduler/status"
    }
  }
}
```

---

## 🤖 Bot API

### Получить статус бота

#### `GET /api/bot/status`

Проверка статуса бота и настроек.

**Ответ:**
```json
{
  "running": true,
  "config": {
    "telegramConfigured": true,
    "openaiConfigured": true,
    "anthropicConfigured": true
  }
}
```

---

### Запустить бота

#### `POST /api/bot/run`

Запускает бота для сбора новостей и публикации одного поста.

**Ответ:**
```json
{
  "status": "started",
  "message": "Бот запущен, выполняется сбор новостей и публикация..."
}
```

**Пример:**
```bash
curl -X POST http://localhost:3000/api/bot/run
```

---

### Опубликовать следующий пост

#### `POST /api/bot/publish`

Публикует следующий пост из очереди контент-плана.

**Ответ:**
```json
{
  "status": "publishing",
  "message": "Публикация поста началась..."
}
```

**Пример:**
```bash
curl -X POST http://localhost:3000/api/bot/publish
```

---

## 📚 Content API

### Получить статистику

#### `GET /api/content/stats`

Получение статистики контент-плана.

**Ответ:**
```json
{
  "pending": 15,
  "published": 5,
  "totalPublished": 127,
  "lastPublished": "2025-12-25T10:00:00.000Z"
}
```

**Пример:**
```bash
curl http://localhost:3000/api/content/stats
```

---

### Получить очередь постов

#### `GET /api/content/queue`

Получение списка постов в очереди (первые 10).

**Ответ:**
```json
{
  "total": 15,
  "queue": [
    {
      "id": "post_123",
      "articlesCount": 5,
      "createdAt": "2025-12-25T09:00:00.000Z"
    },
    {
      "id": "post_124",
      "articlesCount": 3,
      "createdAt": "2025-12-25T09:30:00.000Z"
    }
  ]
}
```

**Пример:**
```bash
curl http://localhost:3000/api/content/queue
```

---

### Собрать новости

#### `POST /api/content/collect`

Запускает сбор новостей и добавление их в контент-план.

**Ответ:**
```json
{
  "status": "collecting",
  "message": "Сбор новостей начался..."
}
```

**Пример:**
```bash
curl -X POST http://localhost:3000/api/content/collect
```

---

## ⏰ Scheduler API

### Запустить планировщик

#### `POST /api/scheduler/start`

Запускает автоматический планировщик публикаций по расписанию.

**Ответ:**
```json
{
  "status": "started",
  "message": "Планировщик запущен",
  "schedules": [
    {
      "time": "0 */3 * * *",
      "name": "Пост каждые 3 часа"
    }
  ]
}
```

**Пример:**
```bash
curl -X POST http://localhost:3000/api/scheduler/start
```

---

### Получить статус планировщика

#### `GET /api/scheduler/status`

Проверка статуса планировщика.

**Ответ:**
```json
{
  "running": true,
  "schedules": [
    {
      "time": "0 */3 * * *",
      "name": "Пост каждые 3 часа"
    }
  ]
}
```

**Пример:**
```bash
curl http://localhost:3000/api/scheduler/status
```

---

## 🔗 Webhook API (опционально)

### Telegram Webhook

#### `POST /webhook/telegram`

Endpoint для обработки webhook от Telegram Bot API.

**Использование:**

1. Настройте webhook в Telegram:
```bash
curl -F "url=https://yourdomain.com/webhook/telegram" \
     https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook
```

2. Telegram будет отправлять обновления на этот endpoint

---

## 🌍 Деплой

### Деплой на Render.com

1. Создайте Web Service на [render.com](https://render.com)
2. Подключите ваш GitHub репозиторий
3. Настройте:
   - **Build Command:** `npm install`
   - **Start Command:** `npm run server`
4. Добавьте переменные окружения из `.env.example`
5. Deploy!

### Деплой на Railway.app

1. Создайте проект на [railway.app](https://railway.app)
2. Подключите GitHub репозиторий
3. Railway автоматически обнаружит `package.json`
4. Добавьте переменные окружения
5. Измените Start Command на: `npm run server`
6. Deploy!

### Деплой на Heroku

1. Создайте приложение:
```bash
heroku create your-app-name
```

2. Добавьте переменные окружения:
```bash
heroku config:set TELEGRAM_BOT_TOKEN=your_token
heroku config:set OPENAI_API_KEY=your_key
heroku config:set ANTHROPIC_API_KEY=your_key
# и т.д.
```

3. Создайте `Procfile`:
```
web: npm run server
```

4. Deploy:
```bash
git push heroku main
```

### Деплой на VPS (Ubuntu)

1. Установите Node.js:
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

2. Клонируйте репозиторий:
```bash
git clone https://github.com/yourusername/maxbotPA.git
cd maxbotPA
```

3. Установите зависимости:
```bash
npm install
```

4. Создайте `.env` файл с настройками

5. Используйте PM2 для запуска:
```bash
npm install -g pm2
pm2 start server.js --name "ai-bot"
pm2 save
pm2 startup
```

6. Настройте Nginx как reverse proxy (опционально)

---

## 🔐 Переменные окружения

Все необходимые переменные описаны в файле `.env.example`. 

Основные:
- `PORT` - порт сервера (по умолчанию 3000)
- `AUTO_START_SCHEDULER` - автозапуск планировщика (true/false)
- `TELEGRAM_BOT_TOKEN` - токен бота
- `TELEGRAM_CHANNEL_ID` - ID канала для публикации
- `OPENAI_API_KEY` - ключ OpenAI
- `ANTHROPIC_API_KEY` - ключ Anthropic
- `CRON_SCHEDULE_1` - расписание публикаций (cron формат)

---

## 📊 Примеры использования

### Полный цикл работы

```bash
# 1. Запустить сервер
npm run server

# 2. Проверить здоровье
curl http://localhost:3000/health

# 3. Собрать новости
curl -X POST http://localhost:3000/api/content/collect

# 4. Проверить очередь
curl http://localhost:3000/api/content/queue

# 5. Опубликовать пост
curl -X POST http://localhost:3000/api/bot/publish

# 6. Запустить автоматический планировщик
curl -X POST http://localhost:3000/api/scheduler/start
```

### С помощью JavaScript/Node.js

```javascript
import axios from 'axios';

const API_URL = 'http://localhost:3000';

// Получить статистику
const stats = await axios.get(`${API_URL}/api/content/stats`);
console.log(stats.data);

// Опубликовать пост
await axios.post(`${API_URL}/api/bot/publish`);

// Запустить планировщик
await axios.post(`${API_URL}/api/scheduler/start`);
```

---

## ⚙️ Troubleshooting

### Сервер не запускается

1. Проверьте, что все зависимости установлены: `npm install`
2. Проверьте файл `.env` - все необходимые переменные должны быть заполнены
3. Проверьте логи: запустите с `NODE_ENV=development npm run server`

### Бот не публикует в Telegram

1. Проверьте `TELEGRAM_BOT_TOKEN` - должен быть валидным
2. Проверьте `TELEGRAM_CHANNEL_ID` - бот должен быть администратором канала
3. Проверьте API endpoint: `GET /api/bot/status`

### Планировщик не работает

1. Проверьте формат cron в `CRON_SCHEDULE_1`
2. Убедитесь, что планировщик запущен: `GET /api/scheduler/status`
3. Установите `AUTO_START_SCHEDULER=true` для автозапуска

---

## 📞 Поддержка

Если у вас возникли вопросы или проблемы, создайте Issue в GitHub репозитории.

---

**Успешного деплоя! 🚀**








