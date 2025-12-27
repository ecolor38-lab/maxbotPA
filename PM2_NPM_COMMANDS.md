# 📚 Команды PM2 и NPM для maxbotPA

## 💻 ВАЖНО: Windows vs Linux

Этот файл содержит команды для **Linux/Mac** и **Windows**.

### Для пользователей Windows:
- Используйте **PowerShell** вместо bash
- Пути: `\` вместо `/` (но PM2 работает с обоими)
- Вместо `nano` используйте `notepad` или VS Code
- Вместо `cron` используйте **Task Scheduler** (Планировщик заданий)
- Готовые скрипты: `monitor-bot.bat` и `monitor-bot.ps1`

### Для пользователей Linux/Mac:
- Используйте **bash/zsh** терминал
- Все команды работают как есть
- Используйте `cron` для автоматизации

---

## 🚀 БЫСТРЫЙ СТАРТ

### Первый запуск на сервере
```bash
# 1. Клонировать проект
git clone https://github.com/your-username/maxbotPA.git
cd maxbotPA

# 2. Установить зависимости
npm ci

# 3. Создать .env файл
cp .env.example .env
nano .env  # Заполнить переменные

# 4. Запустить через PM2
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup

# 5. Проверить логи
pm2 logs ai-bot --lines 50
```

---

## 📦 NPM КОМАНДЫ

### Установка зависимостей
```bash
# Установить все зависимости (использует package-lock.json)
npm ci

# Обычная установка (обновляет package-lock.json)
npm install

# Установить конкретный пакет
npm install axios
npm install nodemon --save-dev

# Обновить все пакеты
npm update

# Проверить устаревшие пакеты
npm outdated
```

### Запуск локально (без PM2)
```bash
# Запустить сервер
npm run server

# Запустить с автоперезагрузкой
npm run server:dev

# Запустить бота один раз (без сервера)
npm start

# Запустить планировщик
npm run schedule

# Запустить только сбор новостей
npm run collect
```

### Проверка и исправление
```bash
# Проверить безопасность зависимостей
npm audit

# Исправить уязвимости
npm audit fix

# Очистить кэш
npm cache clean --force

# Переустановить всё с нуля
rm -rf node_modules package-lock.json
npm install
```

---

## 🔄 PM2 КОМАНДЫ

### Запуск приложения
```bash
# Запустить через ecosystem файл (рекомендуется)
pm2 start ecosystem.config.cjs

# Запустить напрямую
pm2 start server.js --name ai-bot

# Запустить с переменными окружения
pm2 start server.js --name ai-bot --env production

# Запустить с автоперезапуском при изменениях (для разработки)
pm2 start server.js --name ai-bot --watch
```

### Управление процессами
```bash
# Остановить приложение
pm2 stop ai-bot

# Перезапустить приложение
pm2 restart ai-bot

# Перезагрузить (0 downtime, graceful reload)
pm2 reload ai-bot

# Удалить из PM2
pm2 delete ai-bot

# Остановить ВСЕ процессы
pm2 stop all

# Перезапустить ВСЕ
pm2 restart all

# Удалить ВСЕ
pm2 delete all

# Убить PM2 daemon
pm2 kill
```

### Мониторинг и логи
```bash
# Список всех процессов
pm2 list
pm2 ls
pm2 status

# Подробная информация о процессе
pm2 show ai-bot
pm2 describe ai-bot

# Мониторинг в реальном времени
pm2 monit

# Логи (все процессы)
pm2 logs

# Логи конкретного приложения
pm2 logs ai-bot

# Последние 100 строк логов
pm2 logs ai-bot --lines 100

# Логи без потока (для grep)
pm2 logs ai-bot --lines 200 --nostream

# Только ошибки
pm2 logs ai-bot --err

# Очистить все логи
pm2 flush

# Сохранить логи в файл
pm2 logs ai-bot --lines 1000 --nostream > bot-logs.txt
```

### Автозапуск при перезагрузке
```bash
# Сохранить текущий список процессов
pm2 save

# Настроить автозапуск (выполнить команду из вывода)
pm2 startup

# Пример вывода:
# sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u username --hp /home/username

# Удалить автозапуск
pm2 unstartup

# Воскресить сохраненные процессы
pm2 resurrect
```

### Обновление PM2
```bash
# Обновить PM2
npm install pm2@latest -g

# Обновить PM2 и процессы без даунтайма
pm2 update
```

### Дополнительные команды
```bash
# Сбросить счетчики перезапусков
pm2 reset ai-bot

# Показать метрики
pm2 show ai-bot

# Экспортировать конфигурацию
pm2 ecosystem

# Запустить несколько инстансов (cluster mode)
pm2 start server.js -i 4
pm2 start server.js -i max  # по количеству CPU
```

---

## 🔧 ТИПИЧНЫЕ СЦЕНАРИИ

### 1. Обновление кода с Git
```bash
# Остановить бота
pm2 stop ai-bot

# Получить обновления
git pull origin main

# Обновить зависимости (если изменился package.json)
npm ci

# Перезапустить
pm2 restart ai-bot

# Проверить логи
pm2 logs ai-bot --lines 50
```

### 2. Полный перезапуск
```bash
# Удалить из PM2
pm2 delete ai-bot

# Переустановить зависимости
npm ci

# Запустить заново
pm2 start ecosystem.config.cjs

# Сохранить
pm2 save

# Проверить
pm2 logs ai-bot
```

### 3. Диагностика проблем
```bash
# Проверить статус
pm2 status

# Проверить детали процесса
pm2 show ai-bot

# Проверить последние логи
pm2 logs ai-bot --lines 200 --nostream

# Проверить использование памяти
pm2 info ai-bot | grep memory

# Перезапустить если зависло
pm2 restart ai-bot

# Если не помогает - убить и запустить заново
pm2 delete ai-bot
pm2 start ecosystem.config.cjs
```

### 4. Изменение переменных окружения
```bash
# Способ 1: Через .env файл
nano .env
pm2 restart ai-bot

# Способ 2: Через ecosystem.config.cjs
nano ecosystem.config.cjs
# Изменить секцию env:
#   env: {
#     PORT: 3001,
#     AUTO_START_SCHEDULER: 'true'
#   }
pm2 restart ai-bot

# Способ 3: Напрямую при запуске
pm2 start server.js --name ai-bot -- PORT=3001
```

### 5. Отладка памяти (memory leak)
```bash
# Проверить потребление памяти
pm2 info ai-bot

# Настроить автоперезапуск при превышении
# В ecosystem.config.cjs:
max_memory_restart: '512M'

# Перезапустить с новыми настройками
pm2 delete ai-bot
pm2 start ecosystem.config.cjs

# Мониторить память
watch -n 1 'pm2 info ai-bot | grep memory'
```

### 6. Несколько окружений
```bash
# Запустить в development
pm2 start ecosystem.config.cjs --env development

# Запустить в production
pm2 start ecosystem.config.cjs --env production

# Конфигурация в ecosystem.config.cjs:
#   env: {
#     NODE_ENV: 'development',
#     PORT: 3000
#   },
#   env_production: {
#     NODE_ENV: 'production',
#     PORT: 3001
#   }
```

---

## 🪟 WINDOWS СПЕЦИФИЧНЫЕ КОМАНДЫ

### Базовые команды PowerShell

```powershell
# Проверить статус бота
pm2 status

# Посмотреть логи (последние 50 строк)
pm2 logs ai-bot --lines 50

# Перезапустить бота
pm2 restart ai-bot

# Остановить бота
pm2 stop ai-bot

# Удалить из PM2
pm2 delete ai-bot

# Запустить бота
pm2 start ecosystem.config.cjs

# Сохранить конфигурацию
pm2 save
```

### Работа с файлами (PowerShell)

```powershell
# Редактировать .env файл
notepad .env
# или
code .env  # Если установлен VS Code

# Просмотр содержимого файла
Get-Content .env
Get-Content server.js

# Поиск в файлах
Select-String -Path "src\*.js" -Pattern "TELEGRAM"

# Список файлов
Get-ChildItem -Recurse -Filter "*.js"
```

### Мониторинг бота (Windows)

```powershell
# Запустить скрипт мониторинга вручную
.\monitor-bot.ps1

# Или batch версию
.\monitor-bot.bat

# Посмотреть лог перезапусков
Get-Content bot-restart.log -Tail 20

# Очистить лог
Remove-Item bot-restart.log
```

### Автозапуск через Task Scheduler

**Создание задачи через GUI:**
1. Нажмите `Win + R`, введите `taskschd.msc`
2. Action → Create Basic Task
3. Name: `Monitor AI Bot`
4. Trigger: Daily, повторять каждые 5 минут
5. Action: Start a program
   - Program: `C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe`
   - Arguments: `-ExecutionPolicy Bypass -File "C:\Users\Андрей\OneDrive\Документы\GitHub\maxbotPA\monitor-bot.ps1"`
   - Start in: `C:\Users\Андрей\OneDrive\Документы\GitHub\maxbotPA`

**Создание задачи через PowerShell:**
```powershell
# Создать задачу для мониторинга (запускать с правами админа)
$action = New-ScheduledTaskAction -Execute "powershell.exe" `
    -Argument "-ExecutionPolicy Bypass -File `"$PWD\monitor-bot.ps1`"" `
    -WorkingDirectory $PWD

$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) `
    -RepetitionInterval (New-TimeSpan -Minutes 5) `
    -RepetitionDuration ([TimeSpan]::MaxValue)

Register-ScheduledTask -TaskName "Monitor AI Bot" `
    -Action $action `
    -Trigger $trigger `
    -Description "Автоматический мониторинг и перезапуск бота"

# Проверить задачу
Get-ScheduledTask -TaskName "Monitor AI Bot"

# Удалить задачу
Unregister-ScheduledTask -TaskName "Monitor AI Bot" -Confirm:$false
```

### Диагностика на Windows

```powershell
# Проверить что PM2 установлен
pm2 --version

# Проверить Node.js версию
node --version

# Проверить npm версию
npm --version

# Найти процессы Node.js
Get-Process | Where-Object {$_.ProcessName -eq "node"}

# Убить все процессы Node.js (крайний случай!)
Get-Process | Where-Object {$_.ProcessName -eq "node"} | Stop-Process -Force

# Проверить занятость порта
netstat -ano | findstr :3001

# Убить процесс по порту (замените PID)
Stop-Process -Id <PID> -Force
```

### Git команды для Windows

```powershell
# Обновить код
git pull origin main

# Проверить статус
git status

# Посмотреть изменения
git diff

# Коммит изменений
git add .
git commit -m "Update: описание изменений"
git push origin main

# Отменить изменения
git restore .
```

---

## 📊 МОНИТОРИНГ

### Проверка здоровья приложения
```bash
# Проверить что сервер отвечает
curl http://localhost:3001/health

# Проверить статус бота
curl http://localhost:3001/api/bot/status

# Проверить статус планировщика
curl http://localhost:3001/api/scheduler/status

# Получить статистику контента
curl http://localhost:3001/api/content/stats

# Получить очередь постов
curl http://localhost:3001/api/content/queue
```

### Запуск действий через API
```bash
# Запустить бота вручную
curl -X POST http://localhost:3001/api/bot/run

# Опубликовать следующий пост
curl -X POST http://localhost:3001/api/bot/publish

# Собрать новости
curl -X POST http://localhost:3001/api/content/collect

# Запустить планировщик
curl -X POST http://localhost:3001/api/scheduler/start
```

### Автоматический мониторинг

#### Linux (cron)
```bash
# Создать скрипт мониторинга
nano /home/user/monitor-bot.sh

# Содержимое:
#!/bin/bash
if ! pm2 show ai-bot | grep -q "online"; then
    echo "Bot is down! Restarting..."
    pm2 restart ai-bot
    echo "Bot restarted at $(date)" >> ~/bot-restart.log
fi

# Сделать исполняемым
chmod +x /home/user/monitor-bot.sh

# Добавить в cron (каждые 5 минут)
crontab -e
# Добавить строку:
*/5 * * * * /home/user/monitor-bot.sh
```

#### Windows (Task Scheduler)
```powershell
# Использовать готовый скрипт из проекта
# Вариант 1: Batch скрипт
.\monitor-bot.bat

# Вариант 2: PowerShell скрипт (рекомендуется)
.\monitor-bot.ps1

# Настроить автозапуск через Task Scheduler:
# 1. Откройте Task Scheduler (Планировщик заданий)
# 2. Создать базовую задачу -> Имя: "Monitor AI Bot"
# 3. Триггер: повторять каждые 5 минут
# 4. Действие: Запустить программу
#    - Программа: powershell.exe
#    - Аргументы: -File "C:\path\to\maxbotPA\monitor-bot.ps1"
#    - Рабочая папка: "C:\path\to\maxbotPA"
```

---

## 🐛 ОТЛАДКА

### Включить подробные логи
```bash
# В .env добавить:
DEBUG=*
LOG_LEVEL=debug

# Перезапустить
pm2 restart ai-bot
```

### Поиск ошибок в логах
```bash
# Найти все ошибки
pm2 logs ai-bot --lines 500 --nostream | grep -i "error"

# Найти конкретную ошибку
pm2 logs ai-bot --lines 500 --nostream | grep "SIGTERM"

# Найти проблемы с памятью
pm2 logs ai-bot --lines 500 --nostream | grep -i "memory\|heap"

# Найти проблемы с портом
pm2 logs ai-bot --lines 500 --nostream | grep -i "EADDRINUSE\|port"
```

### Тестирование локально
```bash
# Запустить без PM2 для отладки
node server.js

# С детальными логами
DEBUG=* node server.js

# С автоперезагрузкой
npm run server:dev
```

---

## 💾 БЭКАПЫ

### Сохранить конфигурацию PM2
```bash
# Сохранить текущие процессы
pm2 save

# Дамп конфигурации
pm2 dump > pm2-backup.json

# Восстановить
pm2 resurrect
```

### Бэкап данных бота
```bash
# Создать бэкап файлов данных
tar -czf backup-$(date +%Y%m%d).tar.gz \
  content-plan.json \
  published-posts.json \
  source-stats.json \
  posts/ \
  images/

# Восстановить
tar -xzf backup-20250127.tar.gz
```

---

## 🔒 БЕЗОПАСНОСТЬ

### Просмотр переменных окружения (безопасно)
```bash
# НЕ показывать секретные ключи
pm2 show ai-bot | grep -v "KEY\|TOKEN\|SECRET"

# Проверить что .env не в git
git check-ignore .env
# Должно вывести: .env
```

### Ограничение доступа к логам
```bash
# Установить права на логи PM2
chmod 600 ~/.pm2/logs/*

# Ограничить доступ к директории PM2
chmod 700 ~/.pm2
```

---

## 📈 ПРОИЗВОДИТЕЛЬНОСТЬ

### Оптимизация памяти
```javascript
// В ecosystem.config.cjs
module.exports = {
  apps: [{
    name: 'ai-bot',
    script: 'server.js',
    instances: 1,
    max_memory_restart: '512M',  // Автоперезапуск при 512MB
    node_args: [
      '--max-old-space-size=512'  // Лимит heap памяти Node.js
    ]
  }]
};
```

### Cluster mode (несколько инстансов)
```bash
# Запустить 4 инстанса
pm2 start ecosystem.config.cjs -i 4

# Автоматически по числу CPU
pm2 start ecosystem.config.cjs -i max

# Обновить количество инстансов
pm2 scale ai-bot 2
```

---

## ✅ ЧЕКЛИСТ ЕЖЕДНЕВНОГО ОБСЛУЖИВАНИЯ

```bash
# Утром (5 минут):
pm2 status                           # Проверить что работает
pm2 logs ai-bot --lines 50          # Проверить логи на ошибки
curl http://localhost:3001/health    # Проверить health check
curl http://localhost:3001/api/content/stats  # Проверить статистику

# Вечером (2 минуты):
pm2 logs ai-bot --lines 100 --nostream | grep -i "error"  # Проверить ошибки за день

# Еженедельно (10 минут):
npm outdated                         # Проверить обновления
npm audit                            # Проверить безопасность
pm2 flush                            # Очистить старые логи
pm2 save                             # Сохранить конфигурацию

# Ежемесячно (30 минут):
npm update                           # Обновить зависимости
npm audit fix                        # Исправить уязвимости
git add package*.json
git commit -m "chore: update dependencies"
git push
pm2 restart ai-bot                   # Перезапустить с обновлениями
```

---

## 🆘 БЫСТРАЯ ПОМОЩЬ

### Бот не запускается
```bash
pm2 logs ai-bot --lines 200 --nostream  # Смотрим полные логи
pm2 delete ai-bot                       # Удаляем
npm ci                                  # Переустанавливаем пакеты
pm2 start ecosystem.config.cjs         # Запускаем заново
```

### Бот работает но не публикует
```bash
curl http://localhost:3001/api/scheduler/status  # Проверяем планировщик
curl -X POST http://localhost:3001/api/scheduler/start  # Запускаем вручную
pm2 logs ai-bot --lines 50  # Смотрим логи
```

### Много перезапусков
```bash
pm2 info ai-bot  # Смотрим количество рестартов
# Если > 10:
pm2 logs ai-bot --lines 500 --nostream | grep -i "error"  # Ищем ошибку
# Исправляем ошибку в коде
pm2 reset ai-bot  # Сбрасываем счетчик
```

---

**Сохраните этот файл - он понадобится! 📌**


