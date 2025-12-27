import express from 'express';
import { config } from './src/config/config.js';
import { AIBusinessBot } from './src/index.js';
import { BotScheduler } from './src/scheduler.js';
import { ContentPlanner } from './src/services/contentPlanner.js';

// Защита от падений
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err.message);
});
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err);
});

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Services (ленивая инициализация)
let bot = null;
let scheduler = null;
let contentPlanner = null;

function initServices() {
  try {
    if (!bot) bot = new AIBusinessBot();
    if (!scheduler) scheduler = new BotScheduler();
    if (!contentPlanner) contentPlanner = new ContentPlanner();
    console.log('✅ Сервисы готовы');
  } catch (error) {
    console.error('❌ Ошибка инициализации:', error.message);
  }
}

// Health check (без инициализации)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// API info
app.get('/', (req, res) => {
  res.json({
    name: 'AI Business Bot',
    version: '1.0.0',
    endpoints: ['/health', '/api/bot/run', '/api/bot/status', '/api/content/stats']
  });
});

// Bot status
app.get('/api/bot/status', (req, res) => {
  res.json({
    running: !!bot,
    telegram: !!config.telegram?.botToken,
    ai: !!config.anthropic?.apiKey || !!config.openai?.apiKey
  });
});

// Run bot
app.post('/api/bot/run', async (req, res) => {
  initServices();
  if (!bot) return res.status(500).json({ error: 'Бот не инициализирован' });

  res.json({ status: 'started', message: 'Бот запущен' });
  bot.run().catch((e) => console.error('Ошибка бота:', e.message));
});

// Content stats
app.get('/api/content/stats', async (req, res) => {
  initServices();
  if (!contentPlanner) return res.status(500).json({ error: 'Planner не готов' });
  
  try {
    const stats = await contentPlanner.getPlanStats();
    res.json(stats);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Collect news
app.post('/api/content/collect', async (req, res) => {
  initServices();
  if (!scheduler) return res.status(500).json({ error: 'Scheduler не готов' });

  res.json({ status: 'collecting' });
  scheduler.collectAndPlan().catch((e) => console.error('Ошибка сбора:', e.message));
});

// Error handlers
app.use((err, req, res, _next) => {
  console.error('Express Error:', err.message);
  res.status(500).json({ error: err.message });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);

  // Auto-start scheduler
  if (process.env.AUTO_START_SCHEDULER === 'true') {
    initServices();
    if (scheduler) {
      scheduler.start();
      console.log('⏰ Scheduler started');
    }
  }
});

// Graceful shutdown
const shutdown = () => {
  console.log('👋 Shutting down...');
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10000);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export default app;
