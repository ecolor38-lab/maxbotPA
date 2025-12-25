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
    const isRussian = this.config.language === 'ru';

    if (isRussian) {
      return `ВАЖНО: Весь ответ должен быть на РУССКОМ языке!

НОВОСТИ (переведи на русский если нужно):
${articlesText}

ЗАДАЧА: Создай пост для Telegram канала на русском языке.

СТРОГИЕ ТРЕБОВАНИЯ:
1. 🇷🇺 ТОЛЬКО РУССКИЙ ЯЗЫК! Английские слова ЗАПРЕЩЕНЫ (кроме AI, GPT, ChatGPT, Claude)
2. Объем: 450-600 символов
3. Сохраняй цифры и факты
4. Деловой стиль

ФОРМАТ:
🚀 [Заголовок на русском]

[2-3 коротких абзаца на русском про ключевые новости]

ЗАПРЕЩЕНО:
- Английские слова (кроме AI-терминов)
- Хештеги
- Призывы подписаться
- Фразы типа "The study shows"

Верни ТОЛЬКО текст поста на русском языке без комментариев.`;
    } else {
      return `You are a business editor. Rewrite these news articles in a professional style.

NEWS:
${articlesText}

TASK: Rewrite in business English.

REQUIREMENTS:
1. Keep all facts: numbers, companies, dates
2. Length: 450-600 characters max
3. Use specific details from news
4. 2-3 short paragraphs
5. NO hashtags - they will be added separately

Return only the post text.`;
    }
  }

  async generateWithClaude(prompt) {
    try {
      const isRussian = this.config.language === 'ru';
      const systemMessage = isRussian 
        ? 'Ты деловой редактор. Пиши ТОЛЬКО на русском языке. Запрещено использовать английские слова кроме технических терминов (AI, GPT). Весь текст должен быть на русском.'
        : 'You are a business editor. Write ONLY in English.';
      
      const message = await this.anthropic.messages.create({
        model: this.config.anthropic.model,
        max_tokens: 2000,
        system: systemMessage,
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
      const isRussian = this.config.language === 'ru';
      const systemMessage = isRussian
        ? 'Ты эксперт по AI технологиям и бизнес-автоматизации. Пиши ТОЛЬКО на русском языке. Запрещено использовать английские слова кроме технических терминов (AI, GPT, ChatGPT). Весь остальной текст только на русском.'
        : 'You are an expert in AI technologies and business automation. Write ONLY in English.';
      
      const completion = await this.openai.chat.completions.create({
        model: this.config.openai.model,
        messages: [{
          role: 'system',
          content: systemMessage
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
    return `🚀 AI решения для бизнеса: рост на 300%

Компании внедряют GPT-4 для автоматизации. Результат: +45% конверсия, -60% затраты.

🤖 Чат-боты работают 24/7. Стоимость от 50К₽, окупаемость за 2 месяца.

✍️ Claude и ChatGPT создают тексты в 10 раз быстрее.

Рынок AI вырос на 450% за год.`;
  }
}
