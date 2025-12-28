import { config } from './config/config.js';
import { AIBusinessNewsCollector } from './services/aiBusinessNewsCollector.js';
import { AISummarizer } from './services/aiSummarizer.js';
import { HashtagGenerator } from './services/hashtagGenerator.js';
import { TelegramPublisherNative } from './services/telegramPublisherNative.js';
import { ContentPlanner } from './services/contentPlanner.js';

export class AIBusinessBot {
  constructor() {
    this.newsCollector = new AIBusinessNewsCollector(config);
    this.summarizer = new AISummarizer(config);
    this.hashtagGenerator = new HashtagGenerator(config);
    this.publisher = new TelegramPublisherNative(config);
    this.planner = new ContentPlanner();
  }

  async run() {
    console.log('🚀 Запуск бота...\n');

    try {
      await this.publisher.testConnection();

      // Сбор новостей
      let articles = await this.newsCollector.collectNews();

      // Фильтрация дубликатов - убираем уже опубликованные
      articles = await this.planner.filterNewArticles(articles);

      if (!articles.length) {
        console.log('⚠️ Нет новых статей для публикации (все уже были опубликованы)');
        return { skipped: true, reason: 'no_new_articles' };
      }

      console.log(`\n📚 Обработка ${articles.length} новых статей...\n`);

      // Генерация поста
      const text = await this.summarizer.generateSummary(articles);
      if (!text) throw new Error('Не удалось сгенерировать текст');

      const hashtags = this.hashtagGenerator.generateHashtags(text);

      console.log('\n📝 Пост:\n' + '─'.repeat(50));
      console.log(text);
      console.log(hashtags);
      console.log('─'.repeat(50) + '\n');

      // Публикация
      const result = await this.publisher.publish(text, hashtags, null, articles);

      // Сохраняем URL как опубликованные
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
    const newArticles = await this.planner.filterNewArticles(articles);
    if (!newArticles.length) {
      console.log('⚠️ Все статьи уже были опубликованы');
      return { skipped: true };
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
