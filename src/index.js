import { config } from './config/config.js';
import { AIBusinessNewsCollector } from './services/aiBusinessNewsCollector.js';
import { AISummarizer } from './services/aiSummarizer.js';
import { ImageGenerator } from './services/imageGenerator.js';
import { HashtagGenerator } from './services/hashtagGenerator.js';
import { TelegramPublisherNative } from './services/telegramPublisherNative.js';

export class AIBusinessBot {
  constructor() {
    this.newsCollector = new AIBusinessNewsCollector(config);
    this.aiSummarizer = new AISummarizer(config);
    this.imageGenerator = new ImageGenerator(config);
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

      const hashtags = this.hashtagGenerator.generateHashtags(postText, articles);

      // ВАЖНО: Всегда генерируем изображение для более привлекательного поста
      let imagePath = null;
      console.log('🎨 Генерирую изображение для поста...');
      try {
        const imagePrompt = await this.aiSummarizer.generateImagePrompt(postText);
        const imageData = await this.imageGenerator.generateImage(imagePrompt);
        imagePath = imageData ? imageData.path : null;
        if (imagePath) {
          console.log(`✅ Изображение создано: ${imagePath}`);
        }
      } catch (error) {
        console.log(`⚠️ Не удалось создать изображение: ${error.message}`);
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

  // Метод для генерации и публикации из предоставленных статей
  async generateAndPublish(articles) {
    console.log(`📚 Генерирую пост из ${articles.length} статей...\n`);

    const postText = await this.aiSummarizer.generateSummary(articles);
    const hashtags = this.hashtagGenerator.generateHashtags(postText, articles);

    // Генерируем изображение
    let imagePath = null;
    console.log('🎨 Генерирую изображение для поста...');
    try {
      const imagePrompt = await this.aiSummarizer.generateImagePrompt(postText);
      const imageData = await this.imageGenerator.generateImage(imagePrompt);
      imagePath = imageData ? imageData.path : null;
      if (imagePath) {
        console.log(`✅ Изображение создано: ${imagePath}`);
      } else {
        console.log(`⚠️ Изображение не создано`);
      }
    } catch (error) {
      console.log(`⚠️ Ошибка генерации изображения: ${error.message}`);
    }

    console.log('\n📝 Предпросмотр поста:\n');
    console.log('─'.repeat(60));
    console.log(postText);
    console.log('\n' + hashtags);
    if (imagePath) {
      console.log(`\n🖼️ Изображение: ${imagePath}`);
    }
    console.log('─'.repeat(60) + '\n');

    // Публикуем
    const result = await this.telegramPublisher.publish(postText, hashtags, imagePath, articles);

    console.log('✅ Пост опубликован!');
    console.log(`📊 Статистика:`);
    console.log(`   - Статей: ${articles.length}`);
    console.log(`   - Длина: ${postText.length} символов`);
    console.log(`   - Изображение: ${imagePath ? 'Да (' + imagePath + ')' : 'Нет'}`);

    return result;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const bot = new AIBusinessBot();
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
