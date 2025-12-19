import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

export class AISummarizer {
  constructor(config) {
    this.config = config;
    this.anthropic = config.anthropic.apiKey ? new Anthropic({ apiKey: config.anthropic.apiKey }) : null;
    this.openai = config.openai.apiKey ? new OpenAI({ apiKey: config.openai.apiKey }) : null;
  }

  async generateSummary(articles) {
    console.log('🤖 Генерирую саммари из собранных статей...');

    const articlesText = articles.map((article, index) =>
      `${index + 1}. ${article.title}\n   Источник: ${article.source}\n   ${article.snippet || ''}\n`
    ).join('\n');

    const prompt = this.createPrompt(articlesText);

    let summary;
    if (this.anthropic) {
      summary = await this.generateWithClaude(prompt);
    } else if (this.openai) {
      summary = await this.generateWithOpenAI(prompt);
    } else {
      throw new Error('Необходим API ключ для Anthropic или OpenAI');
    }

    console.log('✅ Саммари успешно сгенерировано');
    return summary;
  }

  createPrompt(articlesText) {
    const language = this.config.language === 'ru' ? 'русском' : 'английском';

    return `Ты - медицинский журналист, специализирующийся на псориатическом артрите и новых медицинских технологиях.

На основе следующих статей создай информативный и интересный пост для социальной сети на ${language} языке:

${articlesText}

Требования к посту:
1. Объем: 800-1200 символов
2. Структура:
   - Привлекающий внимание заголовок
   - Краткое введение о важности темы
   - 3-5 ключевых инсайтов из последних исследований
   - Практическое значение для пациентов
   - Призыв к действию (подписаться, поделиться опытом)
3. Стиль: научно-популярный, доступный, но профессиональный
4. Упомяни конкретные цифры, названия препаратов, технологий если они есть
5. Используй эмодзи для лучшей читаемости (2-3 штуки максимум)
6. Избегай медицинского жаргона, объясняй сложные термины

НЕ ВКЛЮЧАЙ хештеги в текст поста - они будут добавлены отдельно.

Верни только текст поста, без дополнительных комментариев.`;
  }

  async generateWithClaude(prompt) {
    try {
      const message = await this.anthropic.messages.create({
        model: this.config.anthropic.model,
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      return message.content[0].text;
    } catch (error) {
      console.error('Ошибка при генерации с Claude:', error.message);
      throw error;
    }
  }

  async generateWithOpenAI(prompt) {
    try {
      const completion = await this.openai.chat.completions.create({
        model: this.config.openai.model,
        messages: [{
          role: 'system',
          content: 'Ты медицинский журналист, специализирующийся на псориатическом артрите.'
        }, {
          role: 'user',
          content: prompt
        }],
        max_tokens: 2000,
        temperature: 0.7
      });

      return completion.choices[0].message.content;
    } catch (error) {
      console.error('Ошибка при генерации с OpenAI:', error.message);
      throw error;
    }
  }

  async generateImagePrompt(postText) {
    console.log('🎨 Генерирую промпт для изображения...');

    const prompt = `На основе этого поста создай короткий промпт (на английском, до 100 слов) для генерации иллюстрации DALL-E.

Пост:
${postText}

Требования к промпту:
- Медицинская тематика, профессиональная инфографика
- Стиль: современный, чистый, научно-популярный
- Цветовая гамма: синий, белый, светлые тона
- Избегай изображения реальных людей
- Фокус на концептах: молекулы, клетки, медицинские символы, технологии
- Формат: горизонтальный, подходит для поста в соц.сетях

Верни только промпт на английском, без дополнительных пояснений.`;

    let imagePrompt;
    if (this.anthropic) {
      imagePrompt = await this.generateWithClaude(prompt);
    } else if (this.openai) {
      imagePrompt = await this.generateWithOpenAI(prompt);
    }

    console.log('✅ Промпт для изображения создан');
    return imagePrompt;
  }
}
