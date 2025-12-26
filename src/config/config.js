import dotenv from 'dotenv';
dotenv.config();

// Валидация обязательных переменных окружения
function validateConfig() {
  const errors = [];
  
  // Проверка Telegram конфигурации
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    errors.push('TELEGRAM_BOT_TOKEN не установлен');
  }
  
  // Проверка хотя бы одного AI API ключа
  if (!process.env.ANTHROPIC_API_KEY && !process.env.OPENAI_API_KEY) {
    errors.push('Необходим хотя бы один AI API ключ (ANTHROPIC_API_KEY или OPENAI_API_KEY)');
  }
  
  if (errors.length > 0) {
    console.error('\n❌ ОШИБКА КОНФИГУРАЦИИ:\n');
    errors.forEach(error => console.error(`   - ${error}`));
    console.error('\n💡 Создайте файл .env на основе .env.example и заполните необходимые данные\n');
    process.exit(1);
  }
  
  console.log('✅ Конфигурация валидна');
}

// Запускаем валидацию при импорте
validateConfig();

export const config = {
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    channelId: process.env.TELEGRAM_CHANNEL_ID || null
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4-turbo-preview',
    imageModel: 'dall-e-3'
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: 'claude-3-5-haiku-20241022'
  },
  qwen: {
    apiKey: process.env.QWEN_API_KEY,
    model: 'qwen-vl-max', // Модель для генерации изображений
    baseUrl: 'https://dashscope.aliyuncs.com/api/v1'
  },
  scheduler: {
    cronSchedule: process.env.CRON_SCHEDULE || '0 9 * * *'
  },
  search: {
    daysBack: parseInt(process.env.SEARCH_DAYS_BACK) || 7,
    maxNewsItems: parseInt(process.env.MAX_NEWS_ITEMS) || 5
  },
  language: process.env.LANGUAGE || 'ru',
  topics: [
    'ai business solutions',
    'готовые чат-боты',
    'ai автоматизация бизнеса',
    'ai для контент-маркетинга',
    'chatbot для продаж',
    'нейросети для бизнеса',
    'ai агенты'
  ]
};
