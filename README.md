# AI Business Bot for MAX Messenger

Бот для автоматического сбора AI-новостей и публикации в канал MAX Messenger.

## Быстрый старт

```bash
# 1. Установка
npm install

# 2. Настройка
cp .env.example .env
# Заполни MAX_BOT_TOKEN и ANTHROPIC_API_KEY

# 3. Запуск
npm start          # Одиночный запуск
npm run server     # API сервер
npm run schedule   # Автопостинг по расписанию
```

## Команды

| Команда | Описание |
|---------|----------|
| `npm start` | Собрать новости и опубликовать |
| `npm run server` | Запустить API сервер (порт 3000) |
| `npm run schedule` | Запустить планировщик |
| `npm run collect` | Только сбор новостей |
| `npm run lint` | Проверка кода |
| `npm run format` | Форматирование |

## Переменные окружения

```env
# MAX Messenger
MAX_BOT_TOKEN=your_bot_token
MAX_CHAT_ID=-69347057172676
MAX_CHAT_LINK=https://max.ru/your_channel

# AI (нужен хотя бы один)
ANTHROPIC_API_KEY=your_key
ANTHROPIC_MODEL=claude-sonnet-4-20250514

# Опционально
LANGUAGE=ru
CRON_SCHEDULE_1=0 9 * * *
AUTO_START_SCHEDULER=true
```

## API Endpoints

- `GET /health` — статус
- `GET /api/bot/status` — статус бота
- `POST /api/bot/run` — запустить бота
- `GET /api/content/stats` — статистика
- `POST /api/content/collect` — собрать новости

## Структура

```
src/
  config/config.js               # Конфигурация
  services/
    aiBusinessNewsCollector.js   # Сбор новостей (RSS)
    aiSummarizer.js              # Генерация текста (Claude/GPT)
    hashtagGenerator.js          # Хештеги для MAX
    maxPublisher.js              # Публикация в MAX
    contentPlanner.js            # Контент-план и дедупликация
    factChecker.js               # Проверка фактов
  index.js                       # Главный модуль
  scheduler.js                   # Планировщик
  collector.js                   # CLI сбор
server.js                        # Express API
```

## Лицензия

MIT
