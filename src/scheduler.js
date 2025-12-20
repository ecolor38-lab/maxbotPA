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
    // Поддержка 3 расписаний в день из .env
    const schedules = [];

    if (process.env.CRON_SCHEDULE_1) {
      schedules.push({ time: process.env.CRON_SCHEDULE_1, name: 'Утренний пост (9:00)' });
    }
    if (process.env.CRON_SCHEDULE_2) {
      schedules.push({ time: process.env.CRON_SCHEDULE_2, name: 'Дневной пост (14:00)' });
    }
    if (process.env.CRON_SCHEDULE_3) {
      schedules.push({ time: process.env.CRON_SCHEDULE_3, name: 'Вечерний пост (19:00)' });
    }

    // Fallback на старое расписание
    if (schedules.length === 0 && config.scheduler?.cronSchedule) {
      schedules.push({ time: config.scheduler.cronSchedule, name: 'Ежедневный пост' });
    }

    // Дефолт если ничего не задано
    if (schedules.length === 0) {
      schedules.push({ time: '0 9 * * *', name: 'Ежедневный пост (9:00)' });
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
    // Проверяем очередь
    const nextPost = await this.contentPlanner.getNextPost();

    if (!nextPost) {
      console.log('📭 Очередь постов пуста, собираю новые новости...');
      await this.collectAndPlan();

      // Пробуем еще раз
      const newPost = await this.contentPlanner.getNextPost();
      if (!newPost) {
        console.log('⚠️ Не удалось собрать новости для публикации');
        return;
      }

      return await this.publishPost(newPost);
    }

    return await this.publishPost(nextPost);
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
    // Собираем новости каждые 12 часов
    cron.schedule('0 */12 * * *', async () => {
      console.log('\n🔄 Автоматический сбор новостей...\n');
      await this.collectAndPlan();
    });

    console.log('✅ Автоматический сбор новостей настроен (каждые 12 часов)\n');
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
