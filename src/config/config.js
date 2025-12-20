import dotenv from 'dotenv';
dotenv.config();

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
