import { config } from './config/config.js';
import { NewsCollector } from './services/newsCollector.js';
import { AISummarizer } from './services/aiSummarizer.js';
import { ImageGenerator } from './services/imageGenerator.js';
import { HashtagGenerator } from './services/hashtagGenerator.js';
import { TelegramPublisherNative } from './services/telegramPublisherNative.js';

export class ArthritisInfoBot {
  constructor() {
    this.newsCollector = new NewsCollector(config);
    this.aiSummarizer = new AISummarizer(config);
    this.imageGenerator = new ImageGenerator(config);
    this.hashtagGenerator = new HashtagGenerator(config);
    this.telegramPublisher = new TelegramPublisherNative(config);
  }

  async run() {
    console.log('🚀 Запуск бота для сбора информации о псориатическом артрите...\n');

    try {
      const connectionOk = await this.telegramPublisher.testConnection();
      if (!connectionOk) {
        console.log('⚠️ Не удалось подключиться к Telegram Bot API');
        console.log('📝 Бот будет работать в режиме сохранения постов в файлы\n');
      } else {
        console.log('');
      }

      const articles = await this.newsCollector.collectNews();

      if (articles.length === 0) {
        console.log('⚠️ Новых статей не найдено');
        return;
      }

      console.log(`\n📚 Обработка ${articles.length} статей...\n`);

      const postText = await this.aiSummarizer.generateSummary(articles);

      const hashtags = this.hashtagGenerator.generateHashtags(postText, articles);

      let imagePath = null;
      if (config.openai.apiKey) {
        const imagePrompt = await this.aiSummarizer.generateImagePrompt(postText);
        const imageData = await this.imageGenerator.generateImage(imagePrompt);
        imagePath = imageData ? imageData.path : null;
      }

      console.log('\n📝 Предпросмотр поста:\n');
      console.log('─'.repeat(60));
      console.log(postText);
      console.log('\n' + hashtags);
      console.log('\n📚 Источники:');
      articles.forEach((article, index) => {
        console.log(`${index + 1}. ${article.source}: ${article.url}`);
      });
      console.log('─'.repeat(60));
      if (imagePath) {
        console.log(`\n🖼️ Изображение: ${imagePath}`);
      }
      console.log('');

      const result = await this.telegramPublisher.publish(postText, hashtags, imagePath, articles);

      console.log('\n✅ Задача выполнена успешно!');
      console.log(`📊 Статистика:`);
      console.log(`   - Найдено статей: ${articles.length}`);
      console.log(`   - Длина поста: ${postText.length} символов`);
      console.log(`   - Хештегов: ${hashtags.split(' ').length}`);
      console.log(`   - Изображение: ${imagePath ? 'Да' : 'Нет'}`);

      return result;
    } catch (error) {
      console.error('\n❌ Ошибка при выполнении:', error.message);
      console.error(error.stack);
      throw error;
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const bot = new ArthritisInfoBot();
  bot.run()
    .then(() => {
      console.log('\n👋 Завершение работы бота');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Критическая ошибка:', error.message);
      process.exit(1);
    });
}
