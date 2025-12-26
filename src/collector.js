import { config } from './config/config.js';
import { AIBusinessNewsCollector } from './services/aiBusinessNewsCollector.js';
import { ContentPlanner } from './services/contentPlanner.js';

class NewsCollector {
  constructor() {
    this.newsCollector = new AIBusinessNewsCollector(config);
    this.contentPlanner = new ContentPlanner();
  }

  async run() {
    console.log('🔍 Запуск сбора новостей для контент-плана...\n');

    try {
      // Собираем новости
      let articles = await this.newsCollector.collectNews();

      // Если реальных статей нет, используем демо
      if (articles.length === 0) {
        console.log('⚠️ Реальных новостей не найдено, используем демо-статьи\n');
        articles = this.newsCollector.getDemoArticles();
      }

      if (articles.length === 0) {
        console.log('❌ Нет новостей для обработки');
        return;
      }

      console.log(`\n📚 Собрано ${articles.length} новостей\n`);

      // Показываем новости
      console.log('📰 Список новостей:');
      articles.forEach((article, index) => {
        console.log(`   ${index + 1}. ${article.title}`);
        console.log(`      Источник: ${article.source} | ${article.pubDate.toLocaleDateString('ru-RU')}`);
      });

      console.log('');

      // Добавляем в контент-план
      const posts = await this.contentPlanner.addArticlesToPlan(articles);

      console.log('');

      // Показываем план постов
      console.log('📋 Созданные посты:');
      posts.forEach((post, index) => {
        console.log(`\n   Пост ${index + 1} (ID: ${post.id}):`);
        post.articles.forEach((article, i) => {
          console.log(`      ${i + 1}. ${article.title.substring(0, 70)}...`);
        });
      });

      console.log('');

      // Статистика
      const stats = await this.contentPlanner.getPlanStats();
      console.log('📊 Общая статистика контент-плана:');
      console.log(`   - В очереди: ${stats.pending} постов`);
      console.log(`   - Опубликовано: ${stats.totalPublished}`);

      console.log('\n✅ Сбор новостей завершен!');
      console.log('💡 Запустите "npm run schedule" для автоматической публикации');
    } catch (error) {
      console.error('\n❌ Ошибка при сборе новостей:', error.message);
      console.error(error.stack);
      process.exit(1);
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const collector = new NewsCollector();
  
  // Graceful shutdown handlers
  process.on('SIGTERM', () => {
    console.log('\n👋 Получен SIGTERM, завершаю работу...');
    process.exit(0);
  });

  process.on('SIGINT', () => {
    console.log('\n👋 Получен SIGINT (Ctrl+C), завершаю работу...');
    process.exit(0);
  });
  
  collector.run()
    .then(() => {
      console.log('\n👋 Завершение работы');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Критическая ошибка:', error.message);
      process.exit(1);
    });
}

export { NewsCollector };
