# ⚡ Шпаргалка команд - maxbotPA

## 🎯 САМЫЕ ЧАСТЫЕ КОМАНДЫ

### 🚀 Запуск
```bash
# Запустить бота
pm2 start ecosystem.config.cjs

# Или на Windows
pm2 start ecosystem.config.cjs
```

### 📊 Мониторинг
```bash
# Посмотреть статус
pm2 list

# Посмотреть логи
pm2 logs ai-bot --lines 50

# Проверить здоровье
curl http://localhost:3001/health
```

### 🔄 Перезапуск
```bash
# Перезапустить
pm2 restart ai-bot

# Остановить
pm2 stop ai-bot

# Удалить из PM2
pm2 delete ai-bot
```

### 🔧 Обновление с Git
```bash
pm2 stop ai-bot
git pull origin main
npm ci
pm2 restart ai-bot
pm2 logs ai-bot --lines 30
```

---

## 🐛 ДИАГНОСТИКА ПРОБЛЕМ

### Ошибка: SIGTERM
```bash
# 1. Проверить логи
pm2 logs ai-bot --lines 200

# 2. Убедиться что Procfile правильный:
# web: node server.js (БЕЗ npm!)

# 3. Перезапустить
pm2 restart ai-bot
```

### Ошибка: Port already in use
```bash
# Linux/Mac:
pm2 delete all

# Windows PowerShell:
Get-Process node | Stop-Process -Force
pm2 delete all

# Затем:
pm2 start ecosystem.config.cjs
```

### Ошибка: Out of memory
```bash
# В .env добавить:
AUTO_START_SCHEDULER=false

# Перезапустить
pm2 restart ai-bot
```

### Посмотреть только ошибки
```bash
# Linux/Mac:
pm2 logs ai-bot --lines 200 --nostream | grep -i "error"

# Windows PowerShell:
pm2 logs ai-bot --lines 200 --nostream | Select-String "error"
```

---

## 📦 NPM

```bash
# Установить зависимости
npm ci

# Обновить пакеты
npm update

# Проверить безопасность
npm audit
npm audit fix

# Очистить кэш
npm cache clean --force
```

---

## 🌐 API

```bash
# Запустить бота вручную
curl -X POST http://localhost:3001/api/bot/run

# Опубликовать пост
curl -X POST http://localhost:3001/api/bot/publish

# Собрать новости
curl -X POST http://localhost:3001/api/content/collect

# Запустить планировщик
curl -X POST http://localhost:3001/api/scheduler/start

# Статус
curl http://localhost:3001/api/bot/status
curl http://localhost:3001/api/scheduler/status
curl http://localhost:3001/api/content/stats
```

---

## 🔥 ЭКСТРЕННЫЙ ПЕРЕЗАПУСК

### Вариант 1: Быстрый
```bash
pm2 restart ai-bot
pm2 logs ai-bot
```

### Вариант 2: Полный
```bash
pm2 delete ai-bot
npm ci
pm2 start ecosystem.config.cjs
pm2 save
pm2 logs ai-bot
```

### Вариант 3: Ядерный (всё сломалось)
```bash
# Linux/Mac:
pm2 kill
rm -rf node_modules package-lock.json
npm install
pm2 start ecosystem.config.cjs
pm2 save

# Windows PowerShell:
Get-Process node | Stop-Process -Force
pm2 kill
Remove-Item -Recurse -Force node_modules
npm install
pm2 start ecosystem.config.cjs
pm2 save
```

---

## 💾 БЭКАПЫ

```bash
# Сохранить конфигурацию PM2
pm2 save

# Создать бэкап данных
tar -czf backup-$(date +%Y%m%d).tar.gz content-plan.json published-posts.json posts/ images/

# Windows PowerShell:
Compress-Archive -Path content-plan.json,published-posts.json,posts,images -DestinationPath "backup-$(Get-Date -Format 'yyyyMMdd').zip"
```

---

## ⚙️ ПЕРЕМЕННЫЕ ОКРУЖЕНИЯ

### Обязательные в .env:
```bash
# API ключи
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHANNEL_ID=@...

# Настройки
PORT=3001
NODE_ENV=production
AUTO_START_SCHEDULER=true
```

### Применить изменения:
```bash
pm2 restart ai-bot
```

---

## 📁 СТРУКТУРА ВАЖНЫХ ФАЙЛОВ

```
maxbotPA/
├── server.js                  # Основной сервер
├── ecosystem.config.cjs       # Конфигурация PM2
├── .env                       # Переменные окружения (НЕ коммитить!)
├── Procfile                   # Для деплоя (должен быть: web: node server.js)
├── content-plan.json          # Контент-план (создаётся автоматически)
├── published-posts.json       # Опубликованные посты
├── posts/                     # Сохранённые посты
└── images/                    # Сгенерированные изображения
```

---

## 🔗 ССЫЛКИ НА ПОЛНЫЕ ГАЙДЫ

- **Полное руководство PM2/NPM:** `PM2_NPM_COMMANDS.md`
- **Исправление SIGTERM:** `FIX_SIGTERM_COMPLETE.md`
- **Быстрое исправление:** `SIGTERM_QUICK_FIX.md`
- **Команды для Windows:** `WINDOWS_COMMANDS.md`

---

## 📞 БЫСТРАЯ ПОМОЩЬ

### Проблема: Бот не запускается
1. Смотрим логи: `pm2 logs ai-bot --lines 100`
2. Ищем ошибку перед SIGTERM
3. Гуглим ошибку или смотрим гайды выше

### Проблема: Бот не публикует
1. Проверяем планировщик: `curl http://localhost:3001/api/scheduler/status`
2. Запускаем вручную: `curl -X POST http://localhost:3001/api/scheduler/start`
3. Смотрим логи: `pm2 logs ai-bot --lines 50`

### Проблема: Много перезапусков
1. Смотрим: `pm2 info ai-bot`
2. Если restarts > 10 - ищем ошибку в логах
3. Исправляем и делаем: `pm2 reset ai-bot`

---

## ✅ ЕЖЕДНЕВНАЯ ПРОВЕРКА (1 минута)

```bash
pm2 status                           # Всё работает?
pm2 logs ai-bot --lines 20          # Есть ошибки?
curl http://localhost:3001/health    # Отвечает сервер?
```

---

**Сохраните эту шпаргалку - пригодится каждый день! 📌**

---

## 🎯 ОДНОЙ КОМАНДОЙ

### Полная диагностика:
```bash
pm2 list && pm2 info ai-bot && pm2 logs ai-bot --lines 30 && curl http://localhost:3001/health
```

### Обновление и перезапуск:
```bash
pm2 stop ai-bot && git pull && npm ci && pm2 restart ai-bot && pm2 logs ai-bot
```

### Полный сброс:
```bash
pm2 delete all && pm2 kill && npm ci && pm2 start ecosystem.config.cjs && pm2 save && pm2 logs
```

---

**Готово! Работайте эффективно! 🚀**

