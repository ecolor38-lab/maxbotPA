# 🚀 Руководство по деплою AI Business Bot

Этот документ содержит пошаговые инструкции для деплоя бота на различные платформы.

## 📋 Содержание

1. [Подготовка к деплою](#подготовка-к-деплою)
2. [Render.com](#rendercom-рекомендуется)
3. [Railway.app](#railwayapp)
4. [Heroku](#heroku)
5. [VPS (Ubuntu)](#vps-ubuntu)
6. [Docker](#docker)
7. [Настройка после деплоя](#настройка-после-деплоя)

---

## 🔧 Подготовка к деплою

### 1. Проверьте наличие всех необходимых файлов

```bash
✓ server.js              # Express сервер
✓ package.json           # Зависимости
✓ Procfile               # Для Heroku
✓ src/                   # Исходный код бота
✓ .env.example           # Пример переменных окружения
```

### 2. Соберите необходимые API ключи

- **Telegram Bot Token** - получите у [@BotFather](https://t.me/BotFather)
- **OpenAI API Key** - получите на [platform.openai.com](https://platform.openai.com)
- **Anthropic API Key** - получите на [console.anthropic.com](https://console.anthropic.com)
- **Telegram Channel ID** - получите с помощью `npm run get-channel-id`

### 3. Настройте репозиторий Git

```bash
git init
git add .
git commit -m "Initial commit for deployment"
```

Создайте репозиторий на GitHub:
```bash
git remote add origin https://github.com/yourusername/your-repo.git
git branch -M main
git push -u origin main
```

---

## 🌐 Render.com (Рекомендуется)

**Плюсы:** Бесплатный план, простая настройка, автоматический SSL
**Минусы:** Засыпает через 15 минут неактивности на бесплатном плане

### Шаги деплоя:

1. **Зарегистрируйтесь на [render.com](https://render.com)**

2. **Создайте новый Web Service:**
   - Нажмите "New +" → "Web Service"
   - Подключите ваш GitHub репозиторий
   - Выберите репозиторий с ботом

3. **Настройте сервис:**
   ```
   Name: ai-business-bot
   Environment: Node
   Region: Frankfurt (EU Central) или ближайший к вам
   Branch: main
   Build Command: npm install
   Start Command: npm run server
   ```

4. **Выберите план:**
   - Free (бесплатно, но засыпает)
   - или Starter ($7/месяц, работает 24/7)

5. **Добавьте переменные окружения:**
   
   Нажмите "Environment" и добавьте:
   ```
   NODE_ENV=production
   PORT=10000
   AUTO_START_SCHEDULER=true
   
   TELEGRAM_BOT_TOKEN=ваш_токен
   TELEGRAM_CHANNEL_ID=@ваш_канал
   
   OPENAI_API_KEY=ваш_ключ
   ANTHROPIC_API_KEY=ваш_ключ
   
   CRON_SCHEDULE_1=0 */3 * * *
   TIMEZONE=Asia/Irkutsk
   POSTS_PER_BATCH=3
   
   SEARCH_DAYS_BACK=7
   MAX_NEWS_ITEMS=5
   LANGUAGE=ru
   ```

6. **Нажмите "Create Web Service"**

7. **Дождитесь завершения деплоя** (2-5 минут)

8. **Проверьте работу:**
   ```bash
   curl https://your-app.onrender.com/health
   ```

### Избежание "засыпания" на бесплатном плане:

Используйте [Cron-job.org](https://cron-job.org) для пинга каждые 10 минут:
```
URL: https://your-app.onrender.com/health
Schedule: */10 * * * *
```

---

## 🚂 Railway.app

**Плюсы:** $5 бесплатных кредитов в месяц, не засыпает, простая настройка
**Минусы:** Требуется привязка карты

### Шаги деплоя:

1. **Зарегистрируйтесь на [railway.app](https://railway.app)**

2. **Создайте новый проект:**
   - Нажмите "New Project"
   - Выберите "Deploy from GitHub repo"
   - Подключите GitHub и выберите репозиторий

3. **Railway автоматически обнаружит Node.js проект**

4. **Настройте переменные окружения:**
   - Нажмите на проект → "Variables"
   - Добавьте все переменные из списка выше

5. **Настройте Start Command:**
   - Settings → Deploy → Start Command
   - Введите: `npm run server`

6. **Сгенерируйте домен:**
   - Settings → Networking → Generate Domain

7. **Проверьте работу:**
   ```bash
   curl https://your-app.up.railway.app/health
   ```

---

## 🟣 Heroku

**Плюсы:** Надежная платформа, много интеграций
**Минусы:** Платный ($7/месяц минимум)

### Шаги деплоя:

1. **Установите Heroku CLI:**
   ```bash
   # Windows (через Chocolatey)
   choco install heroku-cli
   
   # macOS
   brew tap heroku/brew && brew install heroku
   
   # Linux
   curl https://cli-assets.heroku.com/install.sh | sh
   ```

2. **Войдите в Heroku:**
   ```bash
   heroku login
   ```

3. **Создайте приложение:**
   ```bash
   heroku create ai-business-bot
   ```

4. **Добавьте переменные окружения:**
   ```bash
   heroku config:set NODE_ENV=production
   heroku config:set AUTO_START_SCHEDULER=true
   heroku config:set TELEGRAM_BOT_TOKEN=ваш_токен
   heroku config:set TELEGRAM_CHANNEL_ID=@ваш_канал
   heroku config:set OPENAI_API_KEY=ваш_ключ
   heroku config:set ANTHROPIC_API_KEY=ваш_ключ
   heroku config:set CRON_SCHEDULE_1="0 */3 * * *"
   heroku config:set TIMEZONE=Asia/Irkutsk
   heroku config:set POSTS_PER_BATCH=3
   heroku config:set SEARCH_DAYS_BACK=7
   heroku config:set MAX_NEWS_ITEMS=5
   heroku config:set LANGUAGE=ru
   ```

5. **Убедитесь что есть Procfile:**
   ```bash
   echo "web: npm run server" > Procfile
   git add Procfile
   git commit -m "Add Procfile"
   ```

6. **Deploy:**
   ```bash
   git push heroku main
   ```

7. **Откройте приложение:**
   ```bash
   heroku open
   ```

8. **Посмотрите логи:**
   ```bash
   heroku logs --tail
   ```

---

## 🖥️ VPS (Ubuntu)

**Плюсы:** Полный контроль, не засыпает, можно установить любое ПО
**Минусы:** Требует базовых навыков администрирования

### Шаги деплоя:

1. **Подключитесь к VPS:**
   ```bash
   ssh root@your-server-ip
   ```

2. **Обновите систему:**
   ```bash
   apt update && apt upgrade -y
   ```

3. **Установите Node.js 20:**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
   apt install -y nodejs
   node --version  # Проверка
   ```

4. **Установите Git и PM2:**
   ```bash
   apt install -y git
   npm install -g pm2
   ```

5. **Клонируйте репозиторий:**
   ```bash
   cd /opt
   git clone https://github.com/yourusername/maxbotPA.git
   cd maxbotPA
   ```

6. **Установите зависимости:**
   ```bash
   npm install --production
   ```

7. **Создайте .env файл:**
   ```bash
   nano .env
   ```
   
   Вставьте все переменные окружения и сохраните (Ctrl+X, Y, Enter)

8. **Запустите через PM2:**
   ```bash
   pm2 start server.js --name "ai-bot"
   pm2 save
   pm2 startup
   ```
   
   Скопируйте и выполните команду, которую выдаст PM2

9. **Проверьте статус:**
   ```bash
   pm2 status
   pm2 logs ai-bot
   ```

10. **Настройте Nginx (опционально):**
    ```bash
    apt install -y nginx
    nano /etc/nginx/sites-available/ai-bot
    ```
    
    Вставьте конфигурацию:
    ```nginx
    server {
        listen 80;
        server_name your-domain.com;
        
        location / {
            proxy_pass http://localhost:3000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }
    }
    ```
    
    Активируйте:
    ```bash
    ln -s /etc/nginx/sites-available/ai-bot /etc/nginx/sites-enabled/
    nginx -t
    systemctl restart nginx
    ```

11. **Настройте SSL с Certbot:**
    ```bash
    apt install -y certbot python3-certbot-nginx
    certbot --nginx -d your-domain.com
    ```

---

## 🐳 Docker

### Создайте Dockerfile:

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["npm", "run", "server"]
```

### Создайте docker-compose.yml:

```yaml
version: '3.8'

services:
  ai-bot:
    build: .
    ports:
      - "3000:3000"
    env_file:
      - .env
    restart: unless-stopped
    volumes:
      - ./posts:/app/posts
      - ./images:/app/images
      - ./content-plan.json:/app/content-plan.json
```

### Запустите:

```bash
docker-compose up -d
```

---

## ✅ Настройка после деплоя

### 1. Проверьте health check:

```bash
curl https://your-domain.com/health
```

Ожидаемый ответ:
```json
{
  "status": "ok",
  "timestamp": "2025-12-25T10:00:00.000Z",
  "uptime": 123.45,
  "environment": "production"
}
```

### 2. Проверьте статус бота:

```bash
curl https://your-domain.com/api/bot/status
```

Все должно быть `true`.

### 3. Соберите первые новости:

```bash
curl -X POST https://your-domain.com/api/content/collect
```

### 4. Проверьте очередь:

```bash
curl https://your-domain.com/api/content/queue
```

### 5. Опубликуйте тестовый пост:

```bash
curl -X POST https://your-domain.com/api/bot/publish
```

### 6. Запустите планировщик (если не установлен AUTO_START_SCHEDULER):

```bash
curl -X POST https://your-domain.com/api/scheduler/start
```

---

## 🔍 Мониторинг

### Логи на Render:

- Dashboard → Logs (в реальном времени)

### Логи на Railway:

- Dashboard → Deployments → View Logs

### Логи на Heroku:

```bash
heroku logs --tail
```

### Логи на VPS:

```bash
pm2 logs ai-bot
pm2 monit  # Интерактивный монитор
```

---

## 🆘 Troubleshooting

### Проблема: Бот не публикует в Telegram

**Решение:**
1. Проверьте токен: `GET /api/bot/status`
2. Убедитесь, что бот администратор канала
3. Проверьте формат CHANNEL_ID (должен начинаться с @ или -)

### Проблема: Сервер падает с ошибкой памяти

**Решение:**
1. Увеличьте лимит памяти на платформе
2. Или используйте: `node --max-old-space-size=512 server.js`

### Проблема: Планировщик не запускается

**Решение:**
1. Проверьте формат cron: используйте [crontab.guru](https://crontab.guru)
2. Установите `AUTO_START_SCHEDULER=true`
3. Или запустите вручную: `POST /api/scheduler/start`

### Проблема: Засыпает на Render бесплатном плане

**Решение:**
Настройте внешний cron для пинга:
```bash
# Каждые 10 минут
*/10 * * * * curl https://your-app.onrender.com/health
```

---

## 📊 Рекомендации по выбору платформы

| Платформа | Цена | Сложность | Рекомендация |
|-----------|------|-----------|--------------|
| **Render** | Бесплатно/$7 | ⭐ Легко | Для начала |
| **Railway** | $5 кредитов | ⭐ Легко | Лучший выбор |
| **Heroku** | От $7 | ⭐⭐ Средне | Для продакшена |
| **VPS** | От $5 | ⭐⭐⭐ Сложно | Для опытных |
| **Docker** | Зависит | ⭐⭐ Средне | Универсально |

---

## 🎉 Готово!

Ваш бот теперь работает 24/7 и автоматически публикует посты по расписанию!

Для дополнительной помощи см. [API_DOCS.md](./API_DOCS.md)


