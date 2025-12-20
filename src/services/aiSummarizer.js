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

    return `Ты - деловой редактор, переписывающий новости о AI технологиях и бизнес-решениях в понятный формат.

Перепиши следующие новости в деловой, понятный стиль для социальной сети на ${language} языке:

${articlesText}

Требования к тексту:
1. НЕ суммаризируй - ПЕРЕПИСЫВАЙ новости своими словами
2. Объем: 800-1200 символов
3. Деловой, но понятный стиль - пиши как для руководителя среднего бизнеса
4. Структура:
   - Четкий заголовок с главной новостью
   - Краткое объяснение сути
   - Конкретные факты из новостей (цифры, компании, технологии)
   - Что это значит для бизнеса на практике
   - Призыв к действию
5. Используй 2-3 эмодзи для структурирования
6. Упоминай реальные факты, цифры, компании из новостей
7. БЕЗ технического жаргона - объясняй простым языком

НЕ ВКЛЮЧАЙ хештеги - они будут добавлены отдельно.

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
    return `🚀 Готовые AI решения увеличивают продажи на 300%: что работает в 2025?

AI для бизнеса больше не фантастика - это реальность, доступная каждому предпринимателю. Вот решения, которые меняют правила игры:

🤖 Чат-боты нового поколения
GPT-4 агенты автоматизируют продажи и поддержку клиентов 24/7. Компании фиксируют рост конверсии на 45% и сокращают затраты на обслуживание на 60%. Внедрение занимает всего 3-5 дней.

✍️ AI контент-маркетинг
Новые инструменты на базе Claude и ChatGPT создают тексты, посты и статьи в 10 раз быстрее. Jasper AI, Copy.ai и аналоги помогают малому бизнесу конкурировать с крупными брендами при минимальных затратах.

📊 Бизнес-автоматизация
AI-агенты обрабатывают заявки, ведут CRM, составляют коммерческие предложения. Российские стартапы достигают ROI за 2 месяца, полностью автоматизируя рутинные процессы.

Рынок готовых AI-решений вырос на 450% за год. 70% компаний уже используют AI для роста бизнеса. Не отставайте от конкурентов!

💡 Хотите внедрить AI в свой бизнес? Подписывайтесь - делюсь готовыми решениями!`;
  }
}
