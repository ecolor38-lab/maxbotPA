import { config } from './config/config.js';
import { AIBusinessNewsCollector } from './services/aiBusinessNewsCollector.js';
import { AISummarizer } from './services/aiSummarizer.js';
import { HashtagGenerator } from './services/hashtagGenerator.js';
import { TelegramPublisherNative } from './services/telegramPublisherNative.js';

export class AIBusinessBot {
  constructor() {
    this.newsCollector = new AIBusinessNewsCollector(config);
    this.aiSummarizer = new AISummarizer(config);
    this.hashtagGenerator = new HashtagGenerator(config);
    this.telegramPublisher = new TelegramPublisherNative(config);
  }

  async run() {
    console.log('🚀 Запуск AI бизнес бота для сбора новостей...\n');

    try {
      const connectionOk = await this.telegramPublisher.testConnection();
      if (!connectionOk) {
        console.log('⚠️ Не удалось подключиться к Telegram Bot API');
        console.log('📝 Бот будет работать в режиме сохранения постов в файлы\n');
      } else {
        console.log('');
      }

      // Собираем новости из научных источников
      let articles;
      try {
        articles = await this.newsCollector.collectNews();

        // Если реальных статей нет, используем демо
        if (articles.length === 0) {
          console.log('⚠️ Реальных новостей не найдено, используем демо-статьи\n');
          articles = this.newsCollector.getDemoArticles();
        }
      } catch (error) {
        console.log('⚠️ Ошибка при сборе новостей, используем демо-статьи\n');
        articles = this.newsCollector.getDemoArticles();
      }

      if (articles.length === 0) {
        console.log('⚠️ Новых статей не найдено');
        return;
      }

      console.log(`\n📚 Обработка ${articles.length} статей...\n`);

      const postText = await this.aiSummarizer.generateSummary(articles);

      // Проверяем что постText не пустой
      if (!postText || postText.trim() === '') {
        console.error('❌ Не удалось сгенерировать текст поста');
        return;
      }

      const hashtags = this.hashtagGenerator.generateHashtags(postText, articles);

      console.log('\n📝 Предпросмотр поста:\n');
      console.log('─'.repeat(60));
      console.log(postText);
      console.log('\n' + hashtags);
      console.log('\n📚 Источники (превью автоматически):');
      articles.forEach((article, index) => {
        console.log(`${index + 1}. ${article.source}: ${article.url}`);
      });
      console.log('─'.repeat(60));
      console.log('');

      const result = await this.telegramPublisher.publish(postText, hashtags, null, articles);

      console.log('\n✅ Задача выполнена успешно!');
      console.log(`📊 Статистика:`);
      console.log(`   - Найдено статей: ${articles.length}`);
      console.log(`   - Длина поста: ${postText.length} символов`);
      console.log(`   - Хештегов: ${hashtags.split(' ').length}`);
      console.log(`   - Превью: автоматически по ссылке`);

      return result;
    } catch (error) {
      console.error('\n❌ Ошибка при выполнении:', error.message);
      console.error(error.stack);
      throw error;
    }
  }

  // Метод для генерации и публикации из предоставленных статей
  async generateAndPublish(articles) {
    console.log(`📚 Генерирую пост из ${articles.length} статей...\n`);

    const postText = await this.aiSummarizer.generateSummary(articles);

    // Проверяем что постText не пустой
    if (!postText || postText.trim() === '') {
      console.error('❌ Не удалось сгенерировать текст поста');
      throw new Error('Failed to generate post text');
    }

    const hashtags = this.hashtagGenerator.generateHashtags(postText, articles);

    console.log('\n📝 Предпросмотр поста:\n');
    console.log('─'.repeat(60));
    console.log(postText);
    console.log('\n' + hashtags);
    console.log('─'.repeat(60) + '\n');

    // Публикуем текст - Telegram автоматически покажет превью по ссылке
    const result = await this.telegramPublisher.publish(postText, hashtags, null, articles);

    console.log('✅ Пост опубликован!');
    console.log(`📊 Статистика:`);
    console.log(`   - Статей: ${articles.length}`);
    console.log(`   - Длина: ${postText.length} символов`);
    console.log(`   - Превью: автоматически по ссылке`);

    return result;
  }
}

// Проверка, запущен ли файл напрямую (работает на Windows и Unix)
const isMainModule =
  import.meta.url === `file://${process.argv[1]}` ||
  import.meta.url.endsWith(process.argv[1]) ||
  process.argv[1]?.endsWith('src/index.js') ||
  process.argv[1]?.endsWith('src\\index.js');

if (isMainModule) {
  const bot = new AIBusinessBot();
  bot
    .run()
    .then(() => {
      console.log('\n👋 Завершение работы бота');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Критическая ошибка:', error.message);
      process.exit(1);
    });
}
