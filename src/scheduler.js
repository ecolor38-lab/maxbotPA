import cron from 'node-cron';
import { AIBusinessBot } from './index.js';
import { ContentPlanner } from './services/contentPlanner.js';
import { MetricsCollector } from './services/metricsCollector.js';
import { generateWeeklyReport } from './services/analyticsService.js';
import { RepostManager } from './services/repostManager.js';
import { TrendDetector } from './services/trendDetector.js';
import { getPostTypeForSlot, getTodayScheduleInfo } from './services/contentCalendar.js';
import { AdManager } from './services/adManager.js';

export class BotScheduler {
  constructor() {
    this.bot = new AIBusinessBot();
    this.planner = new ContentPlanner();
    this.metricsCollector = new MetricsCollector();
    this.trendDetector = new TrendDetector();
    this.adManager = new AdManager();
    this.schedule = process.env.CRON_SCHEDULE_1 || '0 * * * *';
    this.todaySlotIndex = 0;
    this.lastSlotDay = new Date().getDate();
  }

  start() {
    console.log('⏰ Планировщик запущен');
    console.log(`📅 Расписание: ${this.schedule}\n`);

    if (!cron.validate(this.schedule)) {
      console.error('❌ Неверный формат cron');
      return;
    }

    cron.schedule(this.schedule, async () => {
      console.log(`\n${'='.repeat(50)}`);
      console.log(`⏰ Запуск: ${new Date().toLocaleString('ru-RU')}`);
      console.log('='.repeat(50) + '\n');

      try {
        await this.runScheduledPost();
      } catch (error) {
        console.error('❌ Ошибка:', error.message);
      }
    });

    cron.schedule('0 */6 * * *', async () => {
      console.log('📊 Сбор метрик подписчиков...');
      try {
        await this.metricsCollector.collectMetrics();
      } catch (error) {
        console.error('❌ Ошибка метрик:', error.message);
      }
    });

    cron.schedule('0 20 * * 5', async () => {
      console.log('🏆 Публикация "Лучшее за неделю"...');
      try {
        const repostManager = new RepostManager(this.bot.publisher);
        await repostManager.publishWeeklyBest();
      } catch (error) {
        console.error('❌ Ошибка "Лучшее за неделю":', error.message);
      }
    });

    cron.schedule('0 21 * * 0', async () => {
      console.log('📊 Генерация еженедельного отчёта...');
      try {
        const report = await generateWeeklyReport();
        if (report) {
          await this.bot.publisher.publish(report, '', null, [], 'news_flash');
          console.log('✅ Еженедельный отчёт опубликован');
        }
      } catch (error) {
        console.error('❌ Ошибка еженедельного отчёта:', error.message);
      }
    });

    cron.schedule('0 */2 * * *', async () => {
      try {
        const trends = await this.trendDetector.detectTrends();
        if (trends.length > 0) {
          console.log(`🔥 Breaking: "${trends[0].keyword}" (${trends[0].sourceCount} источников)`);
        }
      } catch (error) {
        console.error('❌ TrendDetector ошибка:', error.message);
      }
    });

    this.metricsCollector.collectMetrics().catch(() => {});

    const schedule = getTodayScheduleInfo();
    console.log(`📅 Сегодня ${schedule.day}: ${schedule.postsCount} постов`);
    console.log(`   Типы: ${schedule.schedule.join(', ')}`);

    this.showStats();
  }

  async runScheduledPost() {
    console.log('🔄 Сбор и публикация...\n');

    const today = new Date().getDate();
    if (today !== this.lastSlotDay) {
      this.todaySlotIndex = 0;
      this.lastSlotDay = today;
    }

    await this.collectAndPlan();

    const plan = await this.planner.loadPlan();
    const pending = plan.queue.filter((p) => p.status === 'pending');

    if (!pending.length) {
      console.log('⚠️ Нет постов для публикации');
      return;
    }

    const adCampaign = this.adManager.getNextPendingCampaign();
    if (adCampaign) {
      console.log(`📌 Рекламный пост: кампания #${adCampaign.id} (${adCampaign.client_name})`);
      try {
        const result = await this.bot.generateAndPublish(
          [{ title: adCampaign.brief, url: '', source: adCampaign.client_name }],
          'sponsored'
        );
        this.adManager.markAsPublished(adCampaign.id, result?.postId, result?.message?.body?.mid);
        console.log('✅ Рекламный пост опубликован');
        return;
      } catch (error) {
        console.error('❌ Ошибка рекламного поста:', error.message);
      }
    }

    const postType = getPostTypeForSlot(this.todaySlotIndex);
    this.todaySlotIndex++;

    const post = pending[0];
    console.log(`📤 Публикую пост #${post.id} [${postType}]...\n`);

    const result = await this.bot.generateAndPublish(post.articles, postType);
    await this.planner.markAsPublished(post.id, result);

    console.log('✅ Опубликовано');
  }

  async collectAndPlan() {
    console.log('🔄 Сбор новостей...\n');

    try {
      const articles = await this.bot.newsCollector.collectNews();
      if (articles.length) {
        await this.planner.addArticlesToPlan(articles);
        await this.planner.cleanOldPosts(30);
      }
    } catch (error) {
      console.error('❌ Ошибка сбора:', error.message);
    }
  }

  async showStats() {
    const stats = await this.planner.getPlanStats();
    console.log('📊 Статистика:');
    console.log(`   В очереди: ${stats.pending}`);
    console.log(`   Опубликовано: ${stats.published}\n`);
  }

  stop() {
    console.log('⏸️ Планировщик остановлен');
  }
}

if (process.argv[1]?.includes('scheduler.js')) {
  const scheduler = new BotScheduler();
  scheduler.start();
  process.on('SIGINT', () => process.exit(0));
}
