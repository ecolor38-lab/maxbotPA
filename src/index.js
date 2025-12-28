import { config } from './config/config.js';
import { AIBusinessNewsCollector } from './services/aiBusinessNewsCollector.js';
import { AISummarizer } from './services/aiSummarizer.js';
import { HashtagGenerator } from './services/hashtagGenerator.js';
import { TelegramPublisherNative } from './services/telegramPublisherNative.js';
import { ContentPlanner } from './services/contentPlanner.js';
import { FactChecker } from './services/factChecker.js';

export class AIBusinessBot {
  constructor() {
    this.newsCollector = new AIBusinessNewsCollector(config);
    this.summarizer = new AISummarizer(config);
    this.hashtagGenerator = new HashtagGenerator(config);
    this.publisher = new TelegramPublisherNative(config);
    this.planner = new ContentPlanner();
    this.factChecker = new FactChecker(config);
  }

  async run() {
    console.log('🚀 Запуск бота...\n');

    try {
      await this.publisher.testConnection();

      // 1. Сбор новостей из всех источников (включая соцсети)
      let articles = await this.newsCollector.collectNews();

      // 2. Фильтрация дубликатов - убираем уже опубликованные
      articles = await this.planner.filterNewArticles(articles);

      if (!articles.length) {
        console.log('⚠️ Нет новых статей для публикации');
        return { skipped: true, reason: 'no_new_articles' };
      }

      // 3. Проверка на фейки и спам
      articles = await this.factChecker.checkArticles(articles);

      if (!articles.length) {
        console.log('⚠️ Все статьи не прошли проверку');
        return { skipped: true, reason: 'all_filtered_by_fact_check' };
      }

      console.log(`\n📚 Генерация поста из ${articles.length} проверенных статей...\n`);

      // 4. Генерация поста
      const text = await this.summarizer.generateSummary(articles);
      if (!text) throw new Error('Не удалось сгенерировать текст');

      const hashtags = this.hashtagGenerator.generateHashtags(text);

      console.log('\n📝 Пост:\n' + '─'.repeat(50));
      console.log(text);
      console.log(hashtags);
      console.log('─'.repeat(50) + '\n');

      // 5. Публикация
      const result = await this.publisher.publish(text, hashtags, null, articles);

      // 6. Сохраняем URL как опубликованные
      await this.planner.markUrlsAsPublished(articles);

      console.log('✅ Готово!');
      return result;
    } catch (error) {
      console.error('❌ Ошибка:', error.message);
      throw error;
    }
  }

  async generateAndPublish(articles) {
    // Фильтрация дубликатов
    let newArticles = await this.planner.filterNewArticles(articles);
    if (!newArticles.length) {
      console.log('⚠️ Все статьи уже были опубликованы');
      return { skipped: true };
    }

    // Проверка на фейки
    newArticles = await this.factChecker.checkArticles(newArticles);
    if (!newArticles.length) {
      console.log('⚠️ Статьи не прошли проверку');
      return { skipped: true, reason: 'fact_check_failed' };
    }

    const text = await this.summarizer.generateSummary(newArticles);
    if (!text) throw new Error('Не удалось сгенерировать текст');

    const hashtags = this.hashtagGenerator.generateHashtags(text);
    const result = await this.publisher.publish(text, hashtags, null, newArticles);

    // Сохраняем как опубликованные
    await this.planner.markUrlsAsPublished(newArticles);

    return result;
  }
}

// Запуск напрямую
if (process.argv[1]?.includes('index.js')) {
  const bot = new AIBusinessBot();
  bot
    .run()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
