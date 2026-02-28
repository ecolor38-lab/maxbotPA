import { config } from './config/config.js';
import { AIBusinessNewsCollector } from './services/aiBusinessNewsCollector.js';
import { AISummarizer } from './services/aiSummarizer.js';
import { HashtagGenerator } from './services/hashtagGenerator.js';
import { ImageGenerator } from './services/imageGenerator.js';
import { MaxPublisher } from './services/maxPublisher.js';
import { ContentPlanner } from './services/contentPlanner.js';
import { FactChecker } from './services/factChecker.js';
import { savePost } from './db/database.js';
import { extractTopics } from './services/analyticsService.js';

export class AIBusinessBot {
  constructor() {
    this.newsCollector = new AIBusinessNewsCollector(config);
    this.summarizer = new AISummarizer(config);
    this.hashtagGenerator = new HashtagGenerator(config);
    this.imageGenerator = new ImageGenerator(config);
    this.publisher = new MaxPublisher(config);
    this.planner = new ContentPlanner();
    this.factChecker = new FactChecker(config);
  }

  async run() {
    console.log('🚀 Запуск бота...\n');

    try {
      await this.publisher.testConnection();

      let articles = await this.newsCollector.collectNews();
      articles = await this.planner.filterNewArticles(articles);

      if (!articles.length) {
        console.log('⚠️ Нет новых статей для публикации');
        return { skipped: true, reason: 'no_new_articles' };
      }

      articles = await this.factChecker.checkArticles(articles);

      if (!articles.length) {
        console.log('⚠️ Все статьи не прошли проверку');
        return { skipped: true, reason: 'all_filtered_by_fact_check' };
      }

      console.log(`\n📚 Генерация поста из ${articles.length} проверенных статей...\n`);

      const postType = this.summarizer.pickPostType().key;
      return await this._publishArticles(articles, postType, true);
    } catch (error) {
      console.error('❌ Ошибка:', error.message);
      throw error;
    }
  }

  async generateAndPublish(articles, forceType = null, { skipFilter = false } = {}) {
    let newArticles = articles;

    if (!skipFilter) {
      newArticles = await this.planner.filterNewArticles(articles);
      if (!newArticles.length) {
        console.log('⚠️ Все статьи уже были опубликованы');
        return { skipped: true };
      }
    }

    newArticles = await this.factChecker.checkArticles(newArticles);
    if (!newArticles.length) {
      console.log('⚠️ Статьи не прошли проверку');
      return { skipped: true, reason: 'fact_check_failed' };
    }

    const postType = forceType || this.summarizer.pickPostType().key;
    return await this._publishArticles(newArticles, postType, false);
  }

  async _publishArticles(articles, postType, verbose = false) {
    const text = await this.summarizer.generateSummary(articles, postType);
    if (!text) throw new Error('Не удалось сгенерировать текст');

    const hashtags = this.hashtagGenerator.generateHashtags(text);
    const imageUrl = await this.imageGenerator.generateImage(text, postType);

    if (verbose) {
      console.log('\n📝 Пост:\n' + '─'.repeat(50));
      console.log(text);
      console.log(hashtags);
      if (imageUrl) console.log(`🖼️ Обложка: ${imageUrl.substring(0, 80)}...`);
      console.log('─'.repeat(50) + '\n');
    }

    const result = await this.publisher.publish(text, hashtags, imageUrl, articles, postType);

    const messageId = result?.message?.body?.mid || null;
    const topics = extractTopics(text);
    const sources = articles.filter((a) => a.url).map((a) => ({ url: a.url, source: a.source }));
    try {
      savePost({
        messageId: messageId ? String(messageId) : null,
        postType,
        text,
        hashtags,
        imageUrl,
        sources,
        topics
      });
      if (verbose) console.log('💾 Пост сохранён в аналитику');
    } catch (e) {
      console.warn('⚠️ Не удалось сохранить в SQLite:', e.message);
    }

    await this.planner.markUrlsAsPublished(articles);

    if (verbose) console.log('✅ Готово!');
    return { ...result, postType };
  }
}

if (process.argv[1]?.includes('index.js')) {
  const bot = new AIBusinessBot();
  bot
    .run()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
