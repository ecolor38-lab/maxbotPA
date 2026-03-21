import express from 'express';
import { fileURLToPath } from 'url';
import path from 'path';
import { config } from './src/config/config.js';
import { AIBusinessBot } from './src/index.js';
import { BotScheduler } from './src/scheduler.js';
import { ContentPlanner } from './src/services/contentPlanner.js';
import { CallbackHandler } from './src/services/callbackHandler.js';
import {
  getAnalyticsOverview,
  getAnalyticsByType,
  getAnalyticsByTime,
  getAnalyticsTopics,
  getAnalyticsGrowth
} from './src/services/analyticsService.js';
import { AdManager } from './src/services/adManager.js';
import { PaymentManager } from './src/services/paymentManager.js';

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err.stack || err.message);
  // Only kill on truly fatal errors (out of memory, etc.)
  if (err.code === 'ENOMEM' || err.message?.includes('out of memory')) {
    process.exit(1);
  }
});
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err);
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;
const API_SECRET = process.env.API_SECRET || null;

app.use(express.json());
app.use('/public', express.static(path.join(__dirname, 'public')));

function parseDays(query, defaultDays = 30) {
  return Math.min(Math.max(parseInt(query) || defaultDays, 1), 365);
}

function requireAuth(req, res, next) {
  if (!API_SECRET) return next();
  const token = req.headers.authorization;
  if (token !== `Bearer ${API_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

let bot = null;
let scheduler = null;
let contentPlanner = null;
let callbackHandler = null;

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

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/share', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'share.html'));
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.get('/', (req, res) => {
  res.json({
    name: 'AI Business Bot',
    version: '1.0.0',
    endpoints: [
      '/health',
      '/api/bot/run',
      '/api/bot/status',
      '/api/content/stats',
      '/api/analytics/overview',
      '/api/analytics/types',
      '/api/analytics/times',
      '/api/analytics/topics',
      '/api/analytics/growth',
      '/api/ads/pricing',
      '/api/ads/campaigns',
      '/api/ads/slots',
      '/api/ads/stats',
      '/api/payments/webhook'
    ]
  });
});

app.get('/api/bot/status', (req, res) => {
  res.json({
    running: !!bot,
    max: !!config.max?.botToken,
    ai: !!config.anthropic?.apiKey || !!config.openai?.apiKey
  });
});

app.post('/api/bot/run', requireAuth, async (req, res) => {
  initServices();
  if (!bot) return res.status(500).json({ error: 'Бот не инициализирован' });

  res.json({ status: 'started', message: 'Бот запущен' });
  bot.run().catch((e) => console.error('Ошибка бота:', e.message));
});

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

app.post('/api/content/collect', requireAuth, async (req, res) => {
  initServices();
  if (!scheduler) return res.status(500).json({ error: 'Scheduler не готов' });

  res.json({ status: 'collecting' });
  scheduler.collectAndPlan().catch((e) => console.error('Ошибка сбора:', e.message));
});

app.get('/api/analytics/overview', (req, res) => {
  try { res.json(getAnalyticsOverview(parseDays(req.query.days, 7))); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/analytics/types', (req, res) => {
  try { res.json(getAnalyticsByType(parseDays(req.query.days))); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/analytics/times', (req, res) => {
  try { res.json(getAnalyticsByTime(parseDays(req.query.days))); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/analytics/topics', (req, res) => {
  try { res.json(getAnalyticsTopics(parseDays(req.query.days))); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/analytics/growth', (req, res) => {
  try { res.json(getAnalyticsGrowth(parseDays(req.query.days))); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

const adManager = new AdManager();
const paymentManager = new PaymentManager(config);

app.get('/api/ads/pricing', (req, res) => {
  try {
    res.json(adManager.getPricing());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/ads/campaigns', requireAuth, (req, res) => {
  try {
    const status = req.query.status || null;
    res.json(adManager.listCampaigns(status));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/ads/campaigns', requireAuth, (req, res) => {
  try {
    const { clientName, brief, slot, scheduledDate, price } = req.body;
    if (!clientName) return res.status(400).json({ error: 'clientName required' });
    const validSlots = ['morning', 'day', 'evening'];
    if (slot && !validSlots.includes(slot)) return res.status(400).json({ error: `slot must be one of: ${validSlots.join(', ')}` });
    if (price !== undefined && (typeof price !== 'number' || price < 0)) return res.status(400).json({ error: 'price must be a positive number' });
    if (brief && brief.length > 2000) return res.status(400).json({ error: 'brief must be under 2000 characters' });
    const result = adManager.createCampaign({ clientName, brief, slot, scheduledDate, price });
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/ads/slots', (req, res) => {
  try {
    const pricing = adManager.getPricing();
    const todayCampaigns = adManager.getScheduledForToday();
    const bookedSlots = todayCampaigns.map((c) => c.slot);
    const available = {};
    for (const [slot, info] of Object.entries(pricing.slots)) {
      available[slot] = { ...info, booked: bookedSlots.includes(slot) };
    }
    res.json({ date: new Date().toISOString().split('T')[0], slots: available });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/ads/stats', requireAuth, (req, res) => {
  try {
    res.json(adManager.getAdStats());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// YooKassa webhook
app.post('/api/payments/webhook', async (req, res) => {
  // Extract real client IP (last entry in x-forwarded-for or direct socket)
  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded ? forwarded.split(',').pop().trim() : (req.socket.remoteAddress || '');
  if (!paymentManager.isYookassaIP(ip)) {
    console.warn(`⚠️ Payment webhook REJECTED from unknown IP: ${ip}`);
    return res.sendStatus(403);
  }

  try {
    await paymentManager.handleWebhook(req.body);
  } catch (error) {
    console.error('❌ Payment webhook error:', error.message);
  }
  res.sendStatus(200);
});

// Payment success page — check actual payment status
app.get('/payment-success', async (req, res) => {
  // Check if user actually has premium (webhook may have already processed)
  const userId = req.query.user_id;
  let paid = false;
  if (userId) {
    try {
      const { getDb } = await import('./src/db/database.js');
      const db = getDb();
      const user = db.prepare('SELECT is_premium FROM bot_users WHERE user_id = ?').get(String(userId));
      paid = !!user?.is_premium;
    } catch (_) { /* ignore */ }
  }

  if (paid) {
    res.send(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Оплата</title>
<style>body{font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background:#f0f0f0}
.card{background:#fff;padding:40px;border-radius:12px;text-align:center;box-shadow:0 2px 10px rgba(0,0,0,.1)}
h1{color:#4CAF50}</style></head>
<body><div class="card"><h1>Оплата прошла успешно!</h1><p>Premium-доступ активирован. Вернитесь в MAX.</p></div></body></html>`);
  } else {
    res.send(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Оплата</title>
<style>body{font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background:#f0f0f0}
.card{background:#fff;padding:40px;border-radius:12px;text-align:center;box-shadow:0 2px 10px rgba(0,0,0,.1)}
h1{color:#FF9800}.retry{display:inline-block;margin-top:16px;padding:10px 24px;background:#4CAF50;color:#fff;border-radius:8px;text-decoration:none}</style></head>
<body><div class="card"><h1>Оплата не завершена</h1><p>Платёж не был оплачен или ещё обрабатывается.</p><p>Вернитесь в MAX и попробуйте снова.</p></div></body></html>`);
  }
});

app.use((err, req, res, _next) => {
  console.error('Express Error:', err.message);
  res.status(500).json({ error: err.message });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);

  if (process.env.AUTO_START_SCHEDULER === 'true') {
    initServices();
    if (scheduler) {
      scheduler.start();
      console.log('⏰ Scheduler started');
    }

    callbackHandler = new CallbackHandler();
    callbackHandler.start().catch((e) => console.error('❌ CallbackHandler ошибка:', e.message));
    console.log('🔘 CallbackHandler started');
  }
});

const shutdown = () => {
  console.log('👋 Shutting down...');
  if (callbackHandler) callbackHandler.stop();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10000);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export default app;
