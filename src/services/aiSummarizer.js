import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

export class AISummarizer {
  constructor(config) {
    this.config = config;
    this.anthropic = config.anthropic?.apiKey
      ? new Anthropic({ apiKey: config.anthropic.apiKey })
      : null;
    this.openai = config.openai?.apiKey ? new OpenAI({ apiKey: config.openai.apiKey }) : null;
  }

  async generateSummary(articles) {
    console.log(`🤖 Генерирую пост из ${articles.length} статей...`);

    const articlesText = articles
      .map((a, i) => `${i + 1}. ${a.title}\n   ${a.snippet || ''}`)
      .join('\n\n');

    const systemPrompt = `Ты - редактор русскоязычного Telegram-канала об AI и бизнесе.
ВАЖНО: Пиши ТОЛЬКО на русском языке! Переводи все английские термины.
Стиль: деловой, но живой. Используй эмодзи в начале.`;

    const userPrompt = `Напиши пост для Telegram на РУССКОМ языке (400-600 символов).

Новости для обработки:
${articlesText}

Требования:
- ТОЛЬКО русский язык (переведи всё с английского)
- Начни с эмодзи и яркого заголовка
- Конкретные факты и цифры
- 2-3 коротких абзаца
- БЕЗ хештегов (добавятся отдельно)
- БЕЗ ссылок`;

    try {
      if (this.anthropic) {
        return await this.callClaude(systemPrompt, userPrompt);
      } else if (this.openai) {
        return await this.callOpenAI(systemPrompt, userPrompt);
      }
    } catch (error) {
      console.log('⚠️ Ошибка API:', error.message);
    }

    return this.getDemoSummary();
  }

  async callClaude(system, prompt) {
    const response = await this.anthropic.messages.create({
      model: this.config.anthropic.model || 'claude-3-haiku-20240307',
      max_tokens: 1000,
      system: system,
      messages: [{ role: 'user', content: prompt }]
    });
    return response.content[0].text;
  }

  async callOpenAI(system, prompt) {
    const response = await this.openai.chat.completions.create({
      model: this.config.openai.model || 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt }
      ],
      max_tokens: 1000,
      temperature: 0.7
    });
    return response.choices[0].message.content;
  }

  getDemoSummary() {
    return `🚀 AI-революция в бизнесе: что нового?

Компании массово внедряют искусственный интеллект. Результаты впечатляют: эффективность выросла на 40%, а затраты сократились на треть.

Чат-боты и автоматизация стали новым стандартом. Рынок AI-решений растёт на 25% ежегодно — и это только начало.`;
  }
}
