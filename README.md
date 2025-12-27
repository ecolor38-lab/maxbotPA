# AI Business Bot 🤖

Телеграм-бот для автоматического сбора AI-новостей и публикации в канал.

## Быстрый старт

```bash
# 1. Установка
npm install

# 2. Настройка
cp .env.example .env
# Заполни TELEGRAM_BOT_TOKEN и ANTHROPIC_API_KEY (или OPENAI_API_KEY)

# 3. Запуск
npm start          # Одиночный запуск
npm run server     # API сервер
npm run schedule   # Автопостинг по расписанию
```

## Команды

| Команда | Описание |
|---------|----------|
| `npm start` | Собрать новости и опубликовать |
| `npm run server` | Запустить API сервер (порт 3001) |
| `npm run schedule` | Запустить планировщик |
| `npm run collect` | Только сбор новостей |
| `npm run lint` | Проверка кода |
| `npm run format` | Форматирование |

## Переменные окружения

```env
# Telegram
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHANNEL_ID=@your_channel

# AI (нужен хотя бы один)
ANTHROPIC_API_KEY=your_key
OPENAI_API_KEY=your_key

# Опционально
LANGUAGE=ru
CRON_SCHEDULE_1=0 * * * *
AUTO_START_SCHEDULER=true
```

## API Endpoints

- `GET /health` - статус
- `GET /api/bot/status` - статус бота
- `POST /api/bot/run` - запустить бота
- `GET /api/content/stats` - статистика
- `POST /api/content/collect` - собрать новости

## Структура

```
src/
  config/config.js        # Конфигурация
  services/
    aiBusinessNewsCollector.js  # Сбор новостей
    aiSummarizer.js             # Генерация текста
    hashtagGenerator.js         # Хештеги
    telegramPublisherNative.js  # Публикация
    contentPlanner.js           # Контент-план
  index.js                # Главный модуль
  scheduler.js            # Планировщик
  collector.js            # CLI сбор
server.js                 # Express API
```

## Лицензия

MIT
