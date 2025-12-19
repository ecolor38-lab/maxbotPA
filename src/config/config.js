import dotenv from 'dotenv';
dotenv.config();

export const config = {
  maxbot: {
    apiToken: process.env.MAXBOT_API_TOKEN,
    apiUrl: 'https://api.max.bot/v1'
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4-turbo-preview',
    imageModel: 'dall-e-3'
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: 'claude-3-5-sonnet-20241022'
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
    'псориатический артрит',
    'psoriatic arthritis',
    'псориатический артрит лечение',
    'psoriatic arthritis treatment',
    'биологические препараты псориатический артрит',
    'AI в медицине артрит',
    'новые лекарства от артрита'
  ]
};
