import express from 'express';
import { config } from './src/config/config.js';
import { AIBusinessBot } from './src/index.js';
import { BotScheduler } from './src/scheduler.js';
import { ContentPlanner } from './src/services/contentPlanner.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS для удобства работы с фронтендом
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  next();
});

// Инициализация сервисов
let scheduler = null;
let bot = null;
let contentPlanner = null;

try {
  bot = new AIBusinessBot();
  scheduler = new BotScheduler();
  contentPlanner = new ContentPlanner();
  console.log('✅ Сервисы инициализированы');
} catch (error) {
  console.error('❌ Ошибка инициализации сервисов:', error.message);
}

// ====================
// HEALTH CHECK
// ====================

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/', (req, res) => {
  res.json({
    message: '🤖 AI Business Bot API',
    version: '1.0.0',
    endpoints: {
      health: 'GET /health',
      bot: {
        status: 'GET /api/bot/status',
        run: 'POST /api/bot/run',
        publish: 'POST /api/bot/publish'
      },
      content: {
        stats: 'GET /api/content/stats',
        queue: 'GET /api/content/queue',
        collect: 'POST /api/content/collect'
      },
      scheduler: {
        start: 'POST /api/scheduler/start',
        stop: 'POST /api/scheduler/stop',
        status: 'GET /api/scheduler/status'
      }
    }
  });
});

// ====================
// BOT API
// ====================

// Получить статус бота
app.get('/api/bot/status', (req, res) => {
  try {
    const status = {
      running: !!bot,
      config: {
        telegramConfigured: !!config.telegram?.botToken,
        openaiConfigured: !!config.openai?.apiKey,
        anthropicConfigured: !!config.anthropic?.apiKey
      }
    };
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Запустить бота один раз (сбор новостей и публикация)
app.post('/api/bot/run', async (req, res) => {
  try {
    if (!bot) {
      return res.status(500).json({ error: 'Бот не инициализирован' });
    }

    console.log('🚀 API запрос: Запуск бота');
    
    // Отправляем немедленный ответ
    res.json({ 
      status: 'started',
      message: 'Бот запущен, выполняется сбор новостей и публикация...'
    });

    // Запускаем бота в фоне
    bot.run()
      .then((result) => {
        console.log('✅ Бот успешно завершил работу:', result);
      })
      .catch((error) => {
        console.error('❌ Ошибка выполнения бота:', error.message);
      });

  } catch (error) {
    console.error('❌ Ошибка API:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Опубликовать следующий пост из очереди
app.post('/api/bot/publish', async (req, res) => {
  try {
    if (!scheduler) {
      return res.status(500).json({ error: 'Планировщик не инициализирован' });
    }

    console.log('📤 API запрос: Публикация следующего поста');
    
    // Отправляем немедленный ответ
    res.json({ 
      status: 'publishing',
      message: 'Публикация поста началась...'
    });

    // Публикуем в фоне
    scheduler.runScheduledPost()
      .then(() => {
        console.log('✅ Пост успешно опубликован');
      })
      .catch((error) => {
        console.error('❌ Ошибка публикации:', error.message);
      });

  } catch (error) {
    console.error('❌ Ошибка API:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ====================
// CONTENT API
// ====================

// Получить статистику контент-плана
app.get('/api/content/stats', async (req, res) => {
  try {
    if (!contentPlanner) {
      return res.status(500).json({ error: 'ContentPlanner не инициализирован' });
    }

    const stats = await contentPlanner.getPlanStats();
    res.json(stats);
  } catch (error) {
    console.error('❌ Ошибка получения статистики:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Получить очередь постов
app.get('/api/content/queue', async (req, res) => {
  try {
    if (!contentPlanner) {
      return res.status(500).json({ error: 'ContentPlanner не инициализирован' });
    }

    const plan = await contentPlanner.loadPlan();
    const queue = plan.queue
      .filter(p => p.status === 'pending')
      .slice(0, 10) // Первые 10 постов
      .map(post => ({
        id: post.id,
        articlesCount: post.articles.length,
        createdAt: post.createdAt
      }));

    res.json({
      total: plan.queue.filter(p => p.status === 'pending').length,
      queue: queue
    });
  } catch (error) {
    console.error('❌ Ошибка получения очереди:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Собрать новости и добавить в контент-план
app.post('/api/content/collect', async (req, res) => {
  try {
    if (!scheduler) {
      return res.status(500).json({ error: 'Планировщик не инициализирован' });
    }

    console.log('🔄 API запрос: Сбор новостей');
    
    // Отправляем немедленный ответ
    res.json({ 
      status: 'collecting',
      message: 'Сбор новостей начался...'
    });

    // Собираем в фоне
    scheduler.collectAndPlan()
      .then(() => {
        console.log('✅ Новости собраны и добавлены в контент-план');
      })
      .catch((error) => {
        console.error('❌ Ошибка сбора новостей:', error.message);
      });

  } catch (error) {
    console.error('❌ Ошибка API:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ====================
// SCHEDULER API
// ====================

let schedulerRunning = false;

// Запустить планировщик
app.post('/api/scheduler/start', (req, res) => {
  try {
    if (schedulerRunning) {
      return res.json({ 
        status: 'already_running',
        message: 'Планировщик уже запущен'
      });
    }

    if (!scheduler) {
      return res.status(500).json({ error: 'Планировщик не инициализирован' });
    }

    console.log('⏰ API запрос: Запуск планировщика');
    scheduler.start();
    schedulerRunning = true;

    res.json({ 
      status: 'started',
      message: 'Планировщик запущен',
      schedules: scheduler.schedules
    });
  } catch (error) {
    console.error('❌ Ошибка запуска планировщика:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Получить статус планировщика
app.get('/api/scheduler/status', (req, res) => {
  try {
    res.json({
      running: schedulerRunning,
      schedules: scheduler?.schedules || []
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ====================
// WEBHOOK для Telegram (опционально)
// ====================

app.post('/webhook/telegram', async (req, res) => {
  try {
    console.log('📨 Получен webhook от Telegram:', req.body);
    
    // Здесь можно обрабатывать команды от Telegram
    // Например, /publish, /stats и т.д.
    
    res.sendStatus(200);
  } catch (error) {
    console.error('❌ Ошибка обработки webhook:', error.message);
    res.sendStatus(500);
  }
});

// ====================
// ERROR HANDLING
// ====================

app.use((err, req, res, next) => {
  console.error('💥 Необработанная ошибка:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Endpoint ${req.method} ${req.path} не найден`
  });
});

// ====================
// START SERVER
// ====================

const server = app.listen(PORT, () => {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 AI Business Bot Server запущен!');
  console.log('='.repeat(60));
  console.log(`📡 Сервер слушает порт: ${PORT}`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log(`💚 Health Check: http://localhost:${PORT}/health`);
  console.log(`📖 API Docs: http://localhost:${PORT}/`);
  console.log('='.repeat(60) + '\n');

  // Автоматически запускаем планировщик при старте
  if (process.env.AUTO_START_SCHEDULER === 'true') {
    console.log('⏰ Автозапуск планировщика...\n');
    try {
      scheduler.start();
      schedulerRunning = true;
    } catch (error) {
      console.error('❌ Ошибка автозапуска планировщика:', error.message);
    }
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n👋 Получен сигнал SIGTERM, останавливаю сервер...');
  server.close(() => {
    console.log('✅ Сервер остановлен');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n\n👋 Получен сигнал SIGINT, останавливаю сервер...');
  server.close(() => {
    console.log('✅ Сервер остановлен');
    process.exit(0);
  });
});

export default app;


