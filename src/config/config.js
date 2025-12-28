import dotenv from 'dotenv';
dotenv.config();

// Валидация
if (!process.env.TELEGRAM_BOT_TOKEN) {
  console.warn('⚠️ TELEGRAM_BOT_TOKEN не установлен');
}

if (!process.env.ANTHROPIC_API_KEY && !process.env.OPENAI_API_KEY) {
  console.warn('⚠️ Нужен ANTHROPIC_API_KEY или OPENAI_API_KEY');
}

export const config = {
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    channelId: process.env.TELEGRAM_CHANNEL_ID
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview'
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: process.env.ANTHROPIC_MODEL || 'claude-3-haiku-20240307'
  },
  search: {
    daysBack: parseInt(process.env.SEARCH_DAYS_BACK) || 2
  },
  language: process.env.LANGUAGE || 'ru'
};
