import cron from 'node-cron';
import { config } from './config/config.js';
import { AIBusinessBot } from './index.js';
import { ContentPlanner } from './services/contentPlanner.js';

class BotScheduler {
  constructor() {
    this.bot = new AIBusinessBot();
    this.contentPlanner = new ContentPlanner();
    this.schedules = this.getSchedules();
  }

  getSchedules() {
    // Поддержка расписаний из .env
    const schedules = [];

    if (process.env.CRON_SCHEDULE_1) {
      schedules.push({ time: process.env.CRON_SCHEDULE_1, name: 'Пост каждые 3 часа' });
    }
    if (process.env.CRON_SCHEDULE_2) {
      schedules.push({ time: process.env.CRON_SCHEDULE_2, name: 'Дополнительный пост' });
    }
    if (process.env.CRON_SCHEDULE_3) {
      schedules.push({ time: process.env.CRON_SCHEDULE_3, name: 'Дополнительный пост' });
    }

    // Fallback на старое расписание
    if (schedules.length === 0 && config.scheduler?.cronSchedule) {
      schedules.push({ time: config.scheduler.cronSchedule, name: 'Ежедневный пост' });
    }

    // Дефолт: каждые 3 часа
    if (schedules.length === 0) {
      schedules.push({ time: '0 */3 * * *', name: 'Пост каждые 3 часа' });
    }

    return schedules;
  }

  start() {
    console.log('🤖 Запуск автоматического бота с контент-планом...\n');
    console.log('📅 Настроенные расписания:');

    this.schedules.forEach((schedule, index) => {
      console.log(`   ${index + 1}. ${schedule.name} - ${schedule.time}`);
    });

    console.log('');

    // Запускаем каждое расписание
    this.schedules.forEach((schedule, index) => {
      if (!cron.validate(schedule.time)) {
        console.error(`❌ Неверный формат расписания #${index + 1}:`, schedule.time);
        return;
      }

      cron.schedule(schedule.time, async () => {
        const timezone = process.env.TIMEZONE || 'Asia/Irkutsk';
        const now = new Date().toLocaleString('ru-RU', {
          timeZone: timezone,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        });

        console.log(`\n${'='.repeat(70)}`);
        console.log(`⏰ ${schedule.name}: ${now} (${timezone})`);
        console.log('='.repeat(70) + '\n');

        try {
          await this.runScheduledPost();
        } catch (error) {
          console.error('\n❌ Ошибка при выполнении запланированной задачи:', error.message);
        }

        console.log(`\n${'='.repeat(70)}\n`);
      });

      console.log(`✅ Расписание #${index + 1} активировано: ${schedule.name}`);
    });

    console.log('\n💡 Команды:');
    console.log('   - npm start        - Опубликовать следующий пост из очереди');
    console.log('   - npm run collect  - Собрать новости и добавить в контент-план\n');

    // Показываем статистику контент-плана
    this.showPlanStats();

    // Запуск сбора новостей каждые 12 часов
    this.scheduleNewsCollection();
  }

  async runScheduledPost() {
    const postsPerBatch = parseInt(process.env.POSTS_PER_BATCH) || 3;

    console.log(`📦 Публикация пакета (до ${postsPerBatch} постов)...\n`);

    // Проверяем очередь
    const plan = await this.contentPlanner.loadPlan();
    const availablePosts = plan.queue.filter(p => p.status === 'pending');

    if (availablePosts.length === 0) {
      console.log('📭 Очередь постов пуста, собираю новые новости...');
      await this.collectAndPlan();

      // Обновляем план после сбора
      const updatedPlan = await this.contentPlanner.loadPlan();
      const newPosts = updatedPlan.queue.filter(p => p.status === 'pending');

      if (newPosts.length === 0) {
        console.log('⚠️ Не удалось собрать новости для публикации');
        return;
      }
    }

    // Публикуем до postsPerBatch постов
    const postsToPublish = Math.min(postsPerBatch, availablePosts.length);

    console.log(`📤 Публикую ${postsToPublish} постов...\n`);

    let publishedCount = 0;
    for (let i = 0; i < postsToPublish; i++) {
      // Берем пост из уже загруженного списка (не из базы повторно!)
      const post = availablePosts[i];

      if (post && post.status === 'pending') {
        try {
          await this.publishPost(post);
          publishedCount++;

          // Небольшая задержка между постами (5 секунд)
          if (i < postsToPublish - 1) {
            console.log('⏳ Пауза 5 секунд перед следующим постом...\n');
            await new Promise(resolve => setTimeout(resolve, 5000));
          }
        } catch (error) {
          console.error(`❌ Не удалось опубликовать пост #${post.id}:`, error.message);
          // Продолжаем со следующим постом
        }
      }
    }

    console.log(`\n✅ Опубликовано ${publishedCount} из ${postsToPublish} постов`);
  }

  async publishPost(post) {
    console.log(`📤 Публикую пост #${post.id} (статей: ${post.articles.length})\n`);

    try {
      // Используем статьи из контент-плана
      const articles = post.articles;

      // Генерируем пост через основного бота
      const result = await this.bot.generateAndPublish(articles);

      // Отмечаем как опубликованный
      await this.contentPlanner.markAsPublished(post.id, result);

      console.log('✅ Пост успешно опубликован');

      return result;
    } catch (error) {
      console.error('❌ Ошибка при публикации:', error.message);
      throw error;
    }
  }

  async collectAndPlan() {
    console.log('🔄 Сбор новостей и создание контент-плана...\n');

    try {
      // Собираем новости
      const articles = await this.bot.newsCollector.collectNews();

      if (articles.length === 0) {
        console.log('⚠️ Новых статей не найдено');
        return;
      }

      // Добавляем в контент-план
      await this.contentPlanner.addArticlesToPlan(articles);

      // Очищаем старые посты
      await this.contentPlanner.cleanOldPosts(30);

      console.log('✅ Контент-план обновлен\n');

      await this.showPlanStats();
    } catch (error) {
      console.error('❌ Ошибка при сборе новостей:', error.message);
    }
  }

  scheduleNewsCollection() {
    // Собираем новости каждые 3 часа
    cron.schedule('0 */3 * * *', async () => {
      console.log('\n🔄 Автоматический сбор новостей...\n');
      await this.collectAndPlan();
    });

    console.log('✅ Автоматический сбор новостей настроен (каждые 3 часа)\n');
  }

  async showPlanStats() {
    const stats = await this.contentPlanner.getPlanStats();

    console.log('📊 Статистика контент-плана:');
    console.log(`   - В очереди: ${stats.pending} постов`);
    console.log(`   - Опубликовано сегодня: ${stats.published}`);
    console.log(`   - Всего опубликовано: ${stats.totalPublished}`);
    if (stats.lastPublished) {
      const lastPub = new Date(stats.lastPublished).toLocaleString('ru-RU');
      console.log(`   - Последняя публикация: ${lastPub}`);
    }
    console.log('');
  }

  async runImmediately() {
    console.log('\n🚀 Немедленный запуск бота...\n');
    try {
      await this.runScheduledPost();
    } catch (error) {
      console.error('Ошибка:', error.message);
    }

    console.log('\n⏳ Ожидание следующего запланированного запуска...');
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const scheduler = new BotScheduler();
  scheduler.start();

  process.on('SIGINT', () => {
    console.log('\n\n👋 Остановка планировщика...');
    process.exit(0);
  });
}

export { BotScheduler };
