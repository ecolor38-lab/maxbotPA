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
    chatLink: process.env.MAX_CHAT_LINK || null,
    botLink: process.env.MAX_BOT_LINK || null
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
  yookassa: {
    shopId: process.env.YOOKASSA_SHOP_ID || null,
    secretKey: process.env.YOOKASSA_SECRET_KEY || null,
    returnUrl: process.env.YOOKASSA_RETURN_URL || 'http://141.98.235.39:3000/payment-success'
  },
  chat: {
    freeDailyLimit: parseInt(process.env.CHAT_FREE_DAILY_LIMIT) || 5,
    premiumDailyLimit: parseInt(process.env.CHAT_PREMIUM_DAILY_LIMIT) || 100,
    contextMessages: parseInt(process.env.CHAT_CONTEXT_MESSAGES) || 10
  },
  language: process.env.LANGUAGE || 'ru'
};
