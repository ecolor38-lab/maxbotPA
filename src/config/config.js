import dotenv from 'dotenv';
dotenv.config();

// Валидация
if (!process.env.MAX_BOT_TOKEN) {
  console.warn('⚠️ MAX_BOT_TOKEN не установлен');
}

if (!process.env.ANTHROPIC_API_KEY && !process.env.OPENAI_API_KEY) {
  console.warn('⚠️ Нужен ANTHROPIC_API_KEY или OPENAI_API_KEY');
}

export const config = {
  max: {
    botToken: process.env.MAX_BOT_TOKEN,
    chatId: process.env.MAX_CHAT_ID ? parseInt(process.env.MAX_CHAT_ID) : null,
    chatLink: process.env.MAX_CHAT_LINK || null
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview'
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514'
  },
  search: {
    daysBack: parseInt(process.env.SEARCH_DAYS_BACK) || 2
  },
  language: process.env.LANGUAGE || 'ru'
};
