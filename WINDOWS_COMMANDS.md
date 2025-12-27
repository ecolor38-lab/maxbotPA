# 🪟 Команды для Windows (PowerShell)

## 🚀 БЫСТРЫЙ СТАРТ на Windows

### Установка инструментов
```powershell
# Установить Node.js
# Скачать с https://nodejs.org/

# Проверить установку
node --version
npm --version

# Установить PM2 глобально
npm install -g pm2
pm2 --version

# Установить PM2 Windows service
npm install -g pm2-windows-service
pm2-service-install
```

### Первый запуск проекта
```powershell
# Перейти в директорию проекта
cd C:\Users\Андрей\OneDrive\Документы\GitHub\maxbotPA

# Установить зависимости
npm ci

# Создать .env файл
Copy-Item .env.example .env
notepad .env  # Заполнить переменные

# Запустить через PM2
pm2 start ecosystem.config.cjs
pm2 save
```

---

## 📦 NPM КОМАНДЫ (Windows)

### Установка и обновление
```powershell
# Установить зависимости
npm ci

# Обычная установка
npm install

# Обновить все пакеты
npm update

# Проверить устаревшие
npm outdated

# Очистить кэш
npm cache clean --force
```

### Запуск локально
```powershell
# Запустить сервер
npm run server

# Запустить только бота
npm start

# Запустить планировщик
npm run schedule

# Запустить сбор новостей
npm run collect
```

---

## 🔄 PM2 КОМАНДЫ (Windows)

### Запуск приложения
```powershell
# Запустить через конфигурацию
pm2 start ecosystem.config.cjs

# Запустить напрямую
pm2 start server.js --name ai-bot

# Запустить в dev режиме с автоперезагрузкой
pm2 start server.js --name ai-bot --watch
```

### Управление процессами
```powershell
# Список процессов
pm2 list

# Информация о процессе
pm2 show ai-bot

# Остановить
pm2 stop ai-bot

# Перезапустить
pm2 restart ai-bot

# Удалить из PM2
pm2 delete ai-bot

# Остановить все
pm2 stop all

# Удалить все
pm2 delete all
```

### Логи
```powershell
# Смотреть логи
pm2 logs ai-bot

# Последние 100 строк
pm2 logs ai-bot --lines 100

# Сохранить логи в файл
pm2 logs ai-bot --lines 500 --nostream > bot-logs.txt

# Очистить логи
pm2 flush
```

### Мониторинг
```powershell
# Интерактивный мониторинг
pm2 monit

# Статус процессов
pm2 status

# Детальная информация
pm2 info ai-bot
```

---

## 🐛 ДИАГНОСТИКА ПРОБЛЕМ (Windows)

### Проверить занят ли порт
```powershell
# Найти процесс на порту 3001
netstat -ano | findstr :3001

# Убить процесс по PID
Stop-Process -Id <PID> -Force

# Пример:
# netstat -ano | findstr :3001
# TCP    0.0.0.0:3001    0.0.0.0:0    LISTENING    12345
Stop-Process -Id 12345 -Force
```

### Проверить процессы Node.js
```powershell
# Все процессы Node
Get-Process node

# Убить все процессы Node
Get-Process node | Stop-Process -Force

# Убить PM2
Get-Process pm2 | Stop-Process -Force
```

### Проверить здоровье сервера
```powershell
# Health check (PowerShell 7+)
Invoke-RestMethod http://localhost:3001/health

# Альтернатива для старого PowerShell
(Invoke-WebRequest http://localhost:3001/health).Content

# Или используйте curl (если установлен)
curl http://localhost:3001/health
```

### Просмотр логов с фильтрацией
```powershell
# Найти ошибки в логах
pm2 logs ai-bot --lines 200 --nostream | Select-String "error" -CaseSensitive

# Найти SIGTERM
pm2 logs ai-bot --lines 200 --nostream | Select-String "SIGTERM"

# Найти проблемы с портом
pm2 logs ai-bot --lines 200 --nostream | Select-String "EADDRINUSE"
```

---

## 🔧 ТИПИЧНЫЕ СЦЕНАРИИ (Windows)

### 1. Обновление кода с Git
```powershell
# Остановить бота
pm2 stop ai-bot

# Получить обновления
git pull origin main

# Обновить зависимости
npm ci

# Перезапустить
pm2 restart ai-bot

# Проверить логи
pm2 logs ai-bot --lines 50
```

### 2. Полный перезапуск
```powershell
# Удалить из PM2
pm2 delete ai-bot

# Убить все процессы Node (на всякий случай)
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

# Переустановить зависимости
Remove-Item -Recurse -Force node_modules
npm ci

# Запустить заново
pm2 start ecosystem.config.cjs
pm2 save

# Проверить
pm2 logs ai-bot
```

### 3. Проблема с портом (EADDRINUSE)
```powershell
# Способ 1: Найти и убить процесс на порту
$port = 3001
$process = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
if ($process) {
    Stop-Process -Id $process.OwningProcess -Force
    Write-Host "Процесс на порту $port остановлен"
} else {
    Write-Host "Порт $port свободен"
}

# Способ 2: Убить все PM2 процессы
pm2 delete all
pm2 kill

# Способ 3: Изменить порт в ecosystem.config.cjs
# Открыть файл
notepad ecosystem.config.cjs
# Изменить PORT: 3002
# Сохранить и запустить
pm2 start ecosystem.config.cjs
```

### 4. Редактирование .env файла
```powershell
# Открыть в блокноте
notepad .env

# Или в VS Code
code .env

# После изменения - перезапустить
pm2 restart ai-bot
```

### 5. Тестирование API
```powershell
# Запустить бота вручную
Invoke-RestMethod -Uri http://localhost:3001/api/bot/run -Method Post

# Опубликовать пост
Invoke-RestMethod -Uri http://localhost:3001/api/bot/publish -Method Post

# Собрать новости
Invoke-RestMethod -Uri http://localhost:3001/api/content/collect -Method Post

# Запустить планировщик
Invoke-RestMethod -Uri http://localhost:3001/api/scheduler/start -Method Post

# Получить статус
Invoke-RestMethod -Uri http://localhost:3001/api/bot/status

# Получить статистику
Invoke-RestMethod -Uri http://localhost:3001/api/content/stats
```

---

## 🔁 АВТОМАТИЗАЦИЯ (Windows)

### Создать .bat файл для быстрого запуска

**start-bot.bat:**
```batch
@echo off
cd /d "C:\Users\Андрей\OneDrive\Документы\GitHub\maxbotPA"
pm2 start ecosystem.config.cjs
pm2 save
pm2 logs ai-bot
pause
```

**stop-bot.bat:**
```batch
@echo off
pm2 stop ai-bot
pm2 save
pause
```

**restart-bot.bat:**
```batch
@echo off
cd /d "C:\Users\Андрей\OneDrive\Документы\GitHub\maxbotPA"
pm2 restart ai-bot
pm2 logs ai-bot --lines 50
pause
```

**update-and-restart.bat:**
```batch
@echo off
echo Обновление бота...
cd /d "C:\Users\Андрей\OneDrive\Документы\GitHub\maxbotPA"

echo Остановка бота...
pm2 stop ai-bot

echo Получение обновлений...
git pull origin main

echo Установка зависимостей...
npm ci

echo Перезапуск бота...
pm2 restart ai-bot

echo Логи:
pm2 logs ai-bot --lines 30
pause
```

### Создать PowerShell скрипт для мониторинга

**monitor-bot.ps1:**
```powershell
# Мониторинг бота
function Check-Bot {
    try {
        $response = Invoke-RestMethod http://localhost:3001/health -TimeoutSec 5
        Write-Host "✅ Бот работает" -ForegroundColor Green
        Write-Host "Uptime: $($response.uptime) секунд"
        return $true
    } catch {
        Write-Host "❌ Бот не отвечает" -ForegroundColor Red
        return $false
    }
}

function Restart-Bot {
    Write-Host "🔄 Перезапуск бота..." -ForegroundColor Yellow
    pm2 restart ai-bot
    Start-Sleep 5
}

# Проверка каждые 30 секунд
while ($true) {
    if (-not (Check-Bot)) {
        Restart-Bot
    }
    Start-Sleep 30
}
```

**Запустить:**
```powershell
# Разрешить выполнение скриптов (один раз)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Запустить мониторинг
.\monitor-bot.ps1
```

### Автозапуск при включении Windows

1. **Через Task Scheduler (Планировщик заданий):**

```powershell
# Создать задачу в планировщике
$action = New-ScheduledTaskAction -Execute "pm2" -Argument "start ecosystem.config.cjs"
$trigger = New-ScheduledTaskTrigger -AtStartup
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERNAME" -LogonType ServiceAccount
Register-ScheduledTask -TaskName "AI Bot Startup" -Action $action -Trigger $trigger -Principal $principal
```

2. **Через pm2-windows-service:**

```powershell
# Установить службу
npm install -g pm2-windows-service
pm2-service-install

# Настроить
# Откроется окно, укажите:
# - PM2_HOME: C:\Users\Андрей\.pm2
# - PM2_SERVICE_SCRIPTS: C:\Users\Андрей\OneDrive\Документы\GitHub\maxbotPA

# Сохранить процессы
cd C:\Users\Андрей\OneDrive\Документы\GitHub\maxbotPA
pm2 start ecosystem.config.cjs
pm2 save

# Служба теперь запустится автоматически при старте Windows
```

---

## 🎯 БЫСТРЫЕ КОМАНДЫ

### Полный рестарт одной командой
```powershell
pm2 delete all; npm ci; pm2 start ecosystem.config.cjs; pm2 save; pm2 logs
```

### Быстрая диагностика
```powershell
pm2 list; pm2 logs ai-bot --lines 20; curl http://localhost:3001/health
```

### Очистка и перезапуск
```powershell
pm2 delete all; pm2 kill; Remove-Item -Recurse -Force node_modules; npm ci; pm2 start ecosystem.config.cjs; pm2 save
```

---

## 🔒 БЕЗОПАСНОСТЬ (Windows)

### Проверить что .env не в Git
```powershell
# Должен вывести: .env
git check-ignore .env

# Если не игнорируется - добавить в .gitignore
Add-Content .gitignore "`n.env"
```

### Просмотреть переменные окружения (без секретов)
```powershell
Get-Content .env | Select-String -Pattern "KEY|TOKEN|SECRET" -NotMatch
```

---

## 📊 МОНИТОРИНГ (Windows)

### Создать дашборд мониторинга

**dashboard.ps1:**
```powershell
Clear-Host
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "   AI BOT MONITORING DASHBOARD" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# PM2 статус
Write-Host "PM2 Processes:" -ForegroundColor Yellow
pm2 list

Write-Host "`n"

# Health check
Write-Host "Health Check:" -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod http://localhost:3001/health
    Write-Host "Status: $($health.status)" -ForegroundColor Green
    Write-Host "Uptime: $($health.uptime) sec"
} catch {
    Write-Host "Status: OFFLINE" -ForegroundColor Red
}

Write-Host "`n"

# Статус бота
Write-Host "Bot Status:" -ForegroundColor Yellow
try {
    $botStatus = Invoke-RestMethod http://localhost:3001/api/bot/status
    Write-Host "Running: $($botStatus.running)" -ForegroundColor Green
} catch {
    Write-Host "Cannot connect to bot API" -ForegroundColor Red
}

Write-Host "`n"

# Последние логи
Write-Host "Last 10 log lines:" -ForegroundColor Yellow
pm2 logs ai-bot --lines 10 --nostream
```

**Запустить:**
```powershell
.\dashboard.ps1
```

---

## 🆘 ЭКСТРЕННАЯ ПОМОЩЬ

### Всё сломалось - полный сброс
```powershell
# 1. Убить все процессы
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process pm2 -ErrorAction SilentlyContinue | Stop-Process -Force

# 2. Очистить PM2
pm2 kill
Remove-Item -Recurse -Force $env:USERPROFILE\.pm2 -ErrorAction SilentlyContinue

# 3. Очистить node_modules
cd C:\Users\Андрей\OneDrive\Документы\GitHub\maxbotPA
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item package-lock.json -ErrorAction SilentlyContinue

# 4. Переустановить всё
npm install

# 5. Запустить заново
pm2 start ecosystem.config.cjs
pm2 save

# 6. Проверить
Start-Sleep 5
pm2 logs ai-bot --lines 30
```

### Порт занят - освободить
```powershell
# Найти и убить процесс
$port = 3001
Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | 
    ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
Write-Host "Порт $port освобожден"

# Или убить все Node процессы
Get-Process node | Stop-Process -Force
```

### Проверка работоспособности
```powershell
# Тест всех эндпоинтов
$baseUrl = "http://localhost:3001"

Write-Host "Testing /health..." -ForegroundColor Yellow
Invoke-RestMethod "$baseUrl/health" | ConvertTo-Json

Write-Host "`nTesting /api/bot/status..." -ForegroundColor Yellow
Invoke-RestMethod "$baseUrl/api/bot/status" | ConvertTo-Json

Write-Host "`nTesting /api/scheduler/status..." -ForegroundColor Yellow
Invoke-RestMethod "$baseUrl/api/scheduler/status" | ConvertTo-Json

Write-Host "`nTesting /api/content/stats..." -ForegroundColor Yellow
Invoke-RestMethod "$baseUrl/api/content/stats" | ConvertTo-Json
```

---

## ✅ ЕЖЕДНЕВНЫЙ ЧЕКЛИСТ (Windows)

**daily-check.ps1:**
```powershell
Write-Host "🔍 Ежедневная проверка бота" -ForegroundColor Cyan
Write-Host ""

# 1. Проверка статуса PM2
Write-Host "1. PM2 статус:" -ForegroundColor Yellow
pm2 list

# 2. Health check
Write-Host "`n2. Health check:" -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod http://localhost:3001/health
    Write-Host "   ✅ Сервер работает (uptime: $($health.uptime) sec)" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Сервер не отвечает!" -ForegroundColor Red
}

# 3. Проверка ошибок в логах
Write-Host "`n3. Ошибки за последние 24 часа:" -ForegroundColor Yellow
$errors = pm2 logs ai-bot --lines 500 --nostream | Select-String "error|Error|ERROR"
if ($errors.Count -gt 0) {
    Write-Host "   ⚠️ Найдено ошибок: $($errors.Count)" -ForegroundColor Yellow
    Write-Host "   Последние 5 ошибок:"
    $errors | Select-Object -Last 5 | ForEach-Object { Write-Host "     $_" }
} else {
    Write-Host "   ✅ Ошибок не найдено" -ForegroundColor Green
}

# 4. Использование памяти
Write-Host "`n4. Использование памяти:" -ForegroundColor Yellow
pm2 info ai-bot | Select-String "memory"

Write-Host "`n✅ Проверка завершена`n" -ForegroundColor Cyan
```

---

**Готово! Теперь у вас есть полный набор команд для Windows! 🎉**


