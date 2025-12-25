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
    try {
      if (this.anthropic) {
        summary = await this.generateWithClaude(prompt);
      } else if (this.openai) {
        summary = await this.generateWithOpenAI(prompt);
      } else {
        console.log('⚠️ API ключи не настроены, использую демо-контент');
        summary = this.generateDemoSummary(articles);
      }
    } catch (error) {
      console.log('⚠️ Ошибка API, использую демо-контент');
      summary = this.generateDemoSummary(articles);
    }

    console.log('✅ Саммари успешно сгенерировано');
    return summary;
  }

  createPrompt(articlesText) {
    const language = this.config.language === 'ru' ? 'русском' : 'английском';

    return `Ты - деловой редактор. Твоя задача - ТОЧНО передать информацию из новостей без искажений.

НОВОСТИ:
${articlesText}

ЗАДАЧА: Перепиши эти конкретные новости в деловой стиль на ${language} языке.

КРИТИЧЕСКИ ВАЖНО:
1. НЕ обобщай, НЕ суммаризируй - пиши про КАЖДУЮ новость отдельно
2. Сохраняй ВСЕ факты: цифры, названия компаний, даты, технологии
3. Объем: 500-650 символов (строго не более 650!)
4. Используй конкретику из новостей - никакой отсебятины

СТРУКТУРА:
- Заголовок с главной темой (1 строка)
- 2-3 КОРОТКИХ абзаца, каждый про отдельную новость (1-2 предложения)
- Конкретные факты из каждой новости
- БЕЗ общих фраз типа "AI развивается" - только конкретика
- 2-3 эмодзи для структуры

Пиши как для делового человека - четко, по фактам, без воды.
БЕЗ хештегов - они добавятся отдельно.
БЕЗ призывов к действию в конце.

Верни только текст поста.`;
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
          content: 'Ты эксперт по AI технологиям и бизнес-автоматизации.'
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

    // Простой fallback промпт на основе ключевых слов
    const keywords = this.extractKeywords(postText);
    const fallbackPrompt = `Professional AI business illustration about ${keywords}. Modern tech infographic with blue and purple gradient, neural networks, AI robots, automation symbols, chatbot icons, and digital technology elements. Horizontal layout, clean design, no text, no people.`;

    const prompt = `На основе этого поста создай короткий промпт (на английском, до 100 слов) для генерации бизнес AI иллюстрации.

Пост:
${postText}

Требования: AI бизнес тематика, современный технологический стиль, синий/фиолетовый/белый цвета, без людей, фокус на AI технологиях, нейросетях, автоматизации, роботах.
Верни только промпт на английском.`;

    try {
      let imagePrompt;
      if (this.anthropic) {
        imagePrompt = await this.generateWithClaude(prompt);
      } else if (this.openai) {
        imagePrompt = await this.generateWithOpenAI(prompt);
      } else {
        console.log('⚠️ API не настроены, использую простой промпт');
        return fallbackPrompt;
      }

      console.log('✅ Промпт для изображения создан через AI');
      return imagePrompt;
    } catch (error) {
      console.log('⚠️ Ошибка AI, использую простой промпт');
      return fallbackPrompt;
    }
  }

  extractKeywords(text) {
    const aiBusinessKeywords = [
      'чат-бот', 'chatbot', 'AI', 'ИИ',
      'автоматизация', 'automation', 'нейросеть', 'neural network',
      'машинное обучение', 'machine learning', 'GPT', 'LLM',
      'контент-маркетинг', 'content marketing', 'бизнес', 'business',
      'агент', 'agent', 'копирайтинг', 'copywriting'
    ];

    const found = [];
    for (const keyword of aiBusinessKeywords) {
      if (text.toLowerCase().includes(keyword.toLowerCase())) {
        found.push(keyword);
      }
    }

    return found.slice(0, 3).join(', ') || 'AI business automation and chatbots';
  }

  generateDemoSummary(articles) {
    return `🚀 AI решения для бизнеса: рост продаж на 300%

Компании внедряют GPT-4 агентов для автоматизации продаж и поддержки. Результат: +45% конверсия, -60% затраты на персонал.

🤖 Чат-боты автоматизируют диалоги с клиентами 24/7. Стоимость от 50К₽, окупаемость за 2 месяца.

✍️ Claude и ChatGPT создают тексты в 10 раз быстрее. Jasper AI помогает малому бизнесу конкурировать с крупными брендами.

Рынок AI-решений вырос на 450% за год. 70% компаний уже используют AI.`;
  }
}
