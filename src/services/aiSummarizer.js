import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

export class AISummarizer {
  constructor(config) {
    this.config = config;
    this.language = config.language || 'ru';
    this.anthropic = config.anthropic?.apiKey
      ? new Anthropic({ apiKey: config.anthropic.apiKey })
      : null;
    this.openai = config.openai?.apiKey ? new OpenAI({ apiKey: config.openai.apiKey }) : null;
  }

  async generateSummary(articles) {
    console.log(`🤖 Генерирую пост из ${articles.length} статей...`);

    const articlesText = articles.map((a, i) => `${i + 1}. ${a.title} (${a.source})`).join('\n');

    const prompt =
      this.language === 'ru'
        ? `Напиши короткий пост для Telegram на русском языке (400-500 символов).
Новости: ${articlesText}
Требования: деловой стиль, конкретные факты, без хештегов.`
        : `Write a short Telegram post in English (400-500 chars).
News: ${articlesText}
Requirements: business style, specific facts, no hashtags.`;

    try {
      if (this.anthropic) {
        return await this.callClaude(prompt);
      } else if (this.openai) {
        return await this.callOpenAI(prompt);
      }
    } catch (error) {
      console.log('⚠️ API error, using demo content');
    }

    return this.getDemoSummary();
  }

  async callClaude(prompt) {
    const response = await this.anthropic.messages.create({
      model: this.config.anthropic.model || 'claude-3-haiku-20240307',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }]
    });
    return response.content[0].text;
  }

  async callOpenAI(prompt) {
    const response = await this.openai.chat.completions.create({
      model: this.config.openai.model || 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1000
    });
    return response.choices[0].message.content;
  }

  getDemoSummary() {
    return `🚀 AI для бизнеса: главные новости

Компании активно внедряют AI-решения. Результат: рост эффективности на 40%, сокращение затрат на 30%.

Чат-боты и автоматизация становятся стандартом. Рынок растёт на 25% ежегодно.`;
  }
}
