# ⚡ БЫСТРОЕ ИСПРАВЛЕНИЕ SIGTERM

## 🚨 Срочные команды (выполнить по порядку)

### 1. Проверить логи (найти настоящую причину)
```bash
# Render:
render logs --tail 200 | grep -i "error\|sigterm\|failed\|timeout"

# Railway:
railway logs | grep -i "error\|sigterm\|failed\|timeout"

# Heroku:
heroku logs --tail --num 200 | grep -i "error\|sigterm\|failed\|timeout"

# PM2 (VPS):
pm2 logs --lines 200 --nostream | grep -i "error\|failed"
```

### 2. Проверить переменные окружения
```bash
# Render/Railway/Heroku dashboard -> Environment Variables
# Проверьте что есть:
PORT                  # НЕ УСТАНАВЛИВАЙТЕ вручную! Должен быть автоматический $PORT
NODE_ENV=production
ANTHROPIC_API_KEY=sk-ant-...
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHANNEL_ID=@...
```

### 3. Закоммитить исправления
```bash
git status
git add .
git commit -m "fix: SIGTERM - use node directly in Procfile"
git push origin main
```

### 4. Проверить что сервер запустился
```bash
# Подождите 30 секунд, затем:
curl https://ваш-домен.com/health

# Должны увидеть:
# {"status":"ok","timestamp":"...","uptime":XXX}
```

---

## 🔍 ДИАГНОСТИКА по симптомам

### Симптом: "Error: listen EADDRINUSE"
**Причина:** Порт занят  
**Решение:**
```bash
# PM2:
pm2 delete all
pm2 start ecosystem.config.cjs

# Или измените порт:
# В .env
PORT=3001
```

### Симптом: "Out of memory" или "ENOMEM"
**Причина:** Недостаточно RAM  
**Решение:**
```bash
# 1. Отключите автозапуск планировщика
# В .env:
AUTO_START_SCHEDULER=false

# 2. Уменьшите лимит памяти в ecosystem.config.cjs:
max_memory_restart: '512M'

# 3. Перезапустите
pm2 restart ai-bot
```

### Симптом: "Health check timeout" или "Failed to bind"
**Причина:** Сервер запускается слишком долго  
**Решение:**
```bash
# Увеличьте таймаут на платформе:
# Render -> Settings -> Health Check Timeout: 300 seconds
# Railway -> Settings -> Health Check Timeout: 300 seconds

# ИЛИ отключите автозапуск планировщика
AUTO_START_SCHEDULER=false
```

### Симптом: "Cannot find module" или "ENOENT"
**Причина:** Отсутствуют зависимости  
**Решение:**
```bash
# Убедитесь что package-lock.json в git:
git add package-lock.json
git commit -m "chore: add package-lock.json"
git push

# На сервере должна выполниться npm ci автоматически
# Если нет:
npm ci
pm2 restart ai-bot
```

### Симптом: "Cannot read property of undefined"
**Причина:** Ошибка в коде при инициализации  
**Решение:**
```bash
# Проверьте что все API ключи установлены:
echo $ANTHROPIC_API_KEY
echo $TELEGRAM_BOT_TOKEN

# Если пусто - установите в .env или dashboard платформы
```

---

## 🎯 БЫСТРЫЙ ТЕСТ

```bash
# 1. Проверьте что сервер отвечает
curl https://ваш-домен.com/health
# Ожидается: {"status":"ok",...}

# 2. Проверьте статус бота
curl https://ваш-домен.com/api/bot/status
# Ожидается: {"running":true,"config":{...}}

# 3. Проверьте статус планировщика
curl https://ваш-домен.com/api/scheduler/status
# Ожидается: {"running":true/false,"schedules":[...]}
```

---

## ✅ УСПЕХ - если видите в логах:

```
🚀 AI Business Bot Server запущен!
📡 Сервер слушает порт: 3000
💚 Health Check: http://localhost:3000/health
⏰ Автозапуск планировщика...
✅ Планировщик успешно запущен
```

---

## ❌ ПРОБЛЕМА - если видите:

```
npm error signal SIGTERM
Error: listen EADDRINUSE
Health check timeout
out of memory
```

→ Смотрите диагностику выше ☝️

---

## 📞 КОМАНДЫ ДЛЯ ПОДДЕРЖКИ

Если проблема не решается, соберите эту информацию:

```bash
# 1. Версия Node.js
node --version

# 2. Полные логи (последние 200 строк)
pm2 logs --lines 200 --nostream > logs.txt

# 3. Переменные окружения (БЕЗ секретных ключей!)
env | grep -v "KEY\|TOKEN\|SECRET"

# 4. Статус процессов
pm2 list

# 5. Использование памяти
pm2 info ai-bot
```

---

## 🔄 ПОЛНЫЙ ПЕРЕЗАПУСК (если всё сломалось)

```bash
# VPS с PM2:
pm2 delete all
pm2 kill
git pull origin main
npm ci
pm2 start ecosystem.config.cjs
pm2 save
pm2 logs

# Render/Railway/Heroku:
# Dashboard -> Manual Deploy -> Deploy Latest Commit
# ИЛИ
git commit --allow-empty -m "redeploy"
git push origin main
```

---

**Время выполнения: 2-5 минут ⚡**

