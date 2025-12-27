import cron from 'node-cron';
import { AIBusinessBot } from './index.js';
import { ContentPlanner } from './services/contentPlanner.js';

export class BotScheduler {
  constructor() {
    this.bot = new AIBusinessBot();
    this.planner = new ContentPlanner();
    this.schedule = process.env.CRON_SCHEDULE_1 || '0 * * * *'; // каждый час
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

    this.showStats();
  }

  async runScheduledPost() {
    console.log('🔄 Сбор и публикация...\n');

    await this.collectAndPlan();

    const plan = await this.planner.loadPlan();
    const pending = plan.queue.filter((p) => p.status === 'pending');

    if (!pending.length) {
      console.log('⚠️ Нет постов для публикации');
      return;
    }

    const post = pending[0];
    console.log(`📤 Публикую пост #${post.id}...\n`);

    const result = await this.bot.generateAndPublish(post.articles);
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

// Запуск напрямую
if (process.argv[1]?.includes('scheduler.js')) {
  const scheduler = new BotScheduler();
  scheduler.start();
  process.on('SIGINT', () => process.exit(0));
}
