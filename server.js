import express from 'express';
import { config } from './src/config/config.js';
import { AIBusinessBot } from './src/index.js';
import { BotScheduler } from './src/scheduler.js';
import { ContentPlanner } from './src/services/contentPlanner.js';
import { apiLimiter, strictLimiter, healthCheckLimiter } from './src/middleware/rateLimit.js';
import { validate, runBotSchema, publishSchema, collectSchema } from './src/middleware/validation.js';
import { logger } from './src/utils/logger.js';
import { metricsMiddleware, register } from './src/utils/metrics.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(metricsMiddleware);

// CORS для удобства работы с фронтендом
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  next();
});

// Rate limiting для API
app.use('/api/', apiLimiter);

// Инициализация сервисов
let scheduler = null;
let bot = null;
let contentPlanner = null;

async function initializeServices() {
  try {
    logger.info('🔄 Инициализация сервисов...');
    bot = new AIBusinessBot();
    scheduler = new BotScheduler();
    contentPlanner = new ContentPlanner();
    logger.info('✅ Сервисы инициализированы');
    return true;
  } catch (error) {
    logger.error('❌ Ошибка инициализации сервисов:', error);
    logger.warn('⚠️ Сервер запустится, но функциональность ограничена');
    return false;
  }
}

// Инициализируем сервисы
initializeServices().catch(err => {
  logger.error('❌ Критическая ошибка инициализации:', err);
});

// ====================
// HEALTH CHECK
// ====================

app.get('/health', healthCheckLimiter, (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Prometheus metrics endpoint
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    logger.error('Error generating metrics:', error);
    res.status(500).end();
  }
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
app.post('/api/bot/run', strictLimiter, validate(runBotSchema), async (req, res) => {
  try {
    if (!bot) {
      return res.status(500).json({ error: 'Бот не инициализирован' });
    }

    logger.info('🚀 API запрос: Запуск бота');
    
    // Отправляем немедленный ответ
    res.json({ 
      status: 'started',
      message: 'Бот запущен, выполняется сбор новостей и публикация...'
    });

    // Запускаем бота в фоне
    bot.run()
      .then((result) => {
        logger.info('✅ Бот успешно завершил работу', { result });
      })
      .catch((error) => {
        logger.error('❌ Ошибка выполнения бота:', error);
      });

  } catch (error) {
    logger.error('❌ Ошибка API:', error);
    res.status(500).json({ error: error.message });
  }
});

// Опубликовать следующий пост из очереди
app.post('/api/bot/publish', strictLimiter, validate(publishSchema), async (req, res) => {
  try {
    if (!scheduler) {
      return res.status(500).json({ error: 'Планировщик не инициализирован' });
    }

    logger.info('📤 API запрос: Публикация следующего поста');
    
    // Отправляем немедленный ответ
    res.json({ 
      status: 'publishing',
      message: 'Публикация поста началась...'
    });

    // Публикуем в фоне
    scheduler.runScheduledPost()
      .then(() => {
        logger.info('✅ Пост успешно опубликован');
      })
      .catch((error) => {
        logger.error('❌ Ошибка публикации:', error);
      });

  } catch (error) {
    logger.error('❌ Ошибка API:', error);
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
    logger.error('❌ Ошибка получения статистики:', error);
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
    logger.error('❌ Ошибка получения очереди:', error);
    res.status(500).json({ error: error.message });
  }
});

// Собрать новости и добавить в контент-план
app.post('/api/content/collect', strictLimiter, validate(collectSchema), async (req, res) => {
  try {
    if (!scheduler) {
      return res.status(500).json({ error: 'Планировщик не инициализирован' });
    }

    logger.info('🔄 API запрос: Сбор новостей');
    
    // Отправляем немедленный ответ
    res.json({ 
      status: 'collecting',
      message: 'Сбор новостей начался...'
    });

    // Собираем в фоне
    scheduler.collectAndPlan()
      .then(() => {
        logger.info('✅ Новости собраны и добавлены в контент-план');
      })
      .catch((error) => {
        logger.error('❌ Ошибка сбора новостей:', error);
      });

  } catch (error) {
    logger.error('❌ Ошибка API:', error);
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
    logger.error('❌ Ошибка запуска планировщика:', error);
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
    logger.info('📨 Получен webhook от Telegram', { body: req.body });
    
    // Здесь можно обрабатывать команды от Telegram
    // Например, /publish, /stats и т.д.
    
    res.sendStatus(200);
  } catch (error) {
    logger.error('❌ Ошибка обработки webhook:', error);
    res.sendStatus(500);
  }
});

// ====================
// ERROR HANDLING
// ====================

app.use((err, req, res, next) => {
  logger.error('💥 Необработанная ошибка:', err);
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

const server = app.listen(PORT, '0.0.0.0', async () => {
  logger.info('\n' + '='.repeat(60));
  logger.info('🚀 AI Business Bot Server запущен!');
  logger.info('='.repeat(60));
  logger.info(`📡 Сервер слушает порт: ${PORT}`);
  logger.info(`🌐 URL: http://localhost:${PORT}`);
  logger.info(`💚 Health Check: http://localhost:${PORT}/health`);
  logger.info(`📖 API Docs: http://localhost:${PORT}/`);
  logger.info(`📊 Metrics: http://localhost:${PORT}/metrics`);
  logger.info('='.repeat(60) + '\n');

  // Автоматически запускаем планировщик при старте
  if (process.env.AUTO_START_SCHEDULER === 'true' && scheduler) {
    logger.info('⏰ Автозапуск планировщика...\n');
    try {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Даем время на инициализацию
      scheduler.start();
      schedulerRunning = true;
      logger.info('✅ Планировщик успешно запущен\n');
    } catch (error) {
      logger.error('❌ Ошибка автозапуска планировщика:', error);
      logger.warn('⚠️ Планировщик можно запустить вручную через API\n');
    }
  }
});

// Обработка неперехваченных ошибок
process.on('uncaughtException', (error) => {
  logger.error('\n💥 Неперехваченное исключение:', error);
  logger.warn('⚠️ Продолжаю работу...\n');
  // Не падаем, логируем и продолжаем
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('\n💥 Необработанное отклонение Promise:', { reason, promise });
  logger.warn('⚠️ Продолжаю работу...\n');
  // Не падаем, логируем и продолжаем
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('\n👋 Получен сигнал SIGTERM, останавливаю сервер...');
  if (scheduler && schedulerRunning) {
    try {
      scheduler.stop();
      logger.info('⏸️  Планировщик остановлен');
    } catch (error) {
      logger.error('⚠️ Ошибка остановки планировщика:', error);
    }
  }
  server.close(() => {
    logger.info('✅ Сервер остановлен');
    process.exit(0);
  });
  
  // Принудительная остановка через 30 секунд
  setTimeout(() => {
    logger.error('❌ Принудительная остановка (timeout)');
    process.exit(1);
  }, 30000);
});

process.on('SIGINT', () => {
  logger.info('\n\n👋 Получен сигнал SIGINT, останавливаю сервер...');
  if (scheduler && schedulerRunning) {
    try {
      scheduler.stop();
      logger.info('⏸️  Планировщик остановлен');
    } catch (error) {
      logger.error('⚠️ Ошибка остановки планировщика:', error);
    }
  }
  server.close(() => {
    logger.info('✅ Сервер остановлен');
    process.exit(0);
  });
  
  // Принудительная остановка через 30 секунд
  setTimeout(() => {
    logger.error('❌ Принудительная остановка (timeout)');
    process.exit(1);
  }, 30000);
});

// Обработка ошибки занятого порта
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    logger.error(`\n❌ Порт ${PORT} уже занят!`);
    logger.error('💡 Решение:');
    logger.error('   1. Остановите все процессы: pm2 delete all');
    logger.error('   2. Или измените порт в .env: PORT=3001');
    logger.error('   3. Или найдите процесс: lsof -i :3000 и убейте его\n');
    process.exit(1);
  } else {
    logger.error('❌ Ошибка сервера:', error);
    process.exit(1);
  }
});

export default app;







