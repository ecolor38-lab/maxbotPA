import express from 'express';
import { config } from './src/config/config.js';
import { AIBusinessBot } from './src/index.js';
import { BotScheduler } from './src/scheduler.js';
import { ContentPlanner } from './src/services/contentPlanner.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

// Services
let bot = null;
let scheduler = null;
let contentPlanner = null;

try {
  bot = new AIBusinessBot();
  scheduler = new BotScheduler();
  contentPlanner = new ContentPlanner();
  console.log('✅ Сервисы инициализированы');
} catch (error) {
  console.error('❌ Ошибка инициализации:', error.message);
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// API info
app.get('/', (req, res) => {
  res.json({
    name: 'AI Business Bot',
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
  if (!bot) return res.status(500).json({ error: 'Бот не инициализирован' });

  res.json({ status: 'started', message: 'Бот запущен' });
  bot.run().catch((e) => console.error('Ошибка:', e.message));
});

// Content stats
app.get('/api/content/stats', async (req, res) => {
  if (!contentPlanner) return res.status(500).json({ error: 'Planner не готов' });
  const stats = await contentPlanner.getPlanStats();
  res.json(stats);
});

// Collect news
app.post('/api/content/collect', async (req, res) => {
  if (!scheduler) return res.status(500).json({ error: 'Scheduler не готов' });

  res.json({ status: 'collecting' });
  scheduler.collectAndPlan().catch((e) => console.error('Ошибка сбора:', e.message));
});

// Error handler
app.use((err, req, res, _next) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: err.message });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 Server: http://localhost:${PORT}\n`);

  // Auto-start scheduler
  if (process.env.AUTO_START_SCHEDULER === 'true' && scheduler) {
    scheduler.start();
    console.log('⏰ Scheduler запущен\n');
  }
});

// Graceful shutdown
const shutdown = () => {
  console.log('\n👋 Завершение...');
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10000);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export default app;
