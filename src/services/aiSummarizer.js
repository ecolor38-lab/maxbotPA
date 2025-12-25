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

      // Проверка и перевод на русский, если нужно
      if (this.config.language === 'ru') {
        summary = await this.ensureRussianLanguage(summary);
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
      return `🇷🇺 КРИТИЧЕСКИ ВАЖНО: ВСЕ должно быть на РУССКОМ языке!

НОВОСТИ:
${articlesText}

ТВОЯ ЗАДАЧА: 
Создай профессиональный пост для Telegram канала на РУССКОМ языке.

АБСОЛЮТНЫЕ ТРЕБОВАНИЯ (нарушение НЕДОПУСТИМО):
1. 🇷🇺 ВЕСЬ текст ТОЛЬКО на РУССКОМ! 
2. Английские слова СТРОГО ЗАПРЕЩЕНЫ (исключения: AI, GPT, ChatGPT, Claude, API)
3. Переведи ВСЕ названия компаний, продуктов и термины на русский
4. Объем: 450-600 символов
5. Сохраняй ВСЕ цифры и факты из новостей
6. Деловой, но живой стиль

ОБЯЗАТЕЛЬНЫЙ ФОРМАТ:
🚀 [Яркий заголовок на русском - главная мысль]

[Первый абзац: суть новости с конкретными цифрами]

[Второй абзац: детали и последствия]

СТРОГО ЗАПРЕЩЕНО:
❌ Английские слова (кроме AI, GPT, ChatGPT, Claude, API)
❌ Фразы типа "The study shows", "according to", "research indicates"
❌ Хештеги (добавятся отдельно)
❌ Призывы подписаться
❌ Общие фразы без конкретики

ПРИМЕРЫ ПРАВИЛЬНОГО перевода:
"startup" → "стартап"
"CEO" → "глава компании"
"revenue" → "выручка"
"market share" → "доля рынка"
"chatbot" → "чат-бот"
"automation" → "автоматизация"

Начинай сразу с поста! Никаких пояснений! ТОЛЬКО РУССКИЙ ЯЗЫК!`;
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
        ? `Ты профессиональный редактор российского делового Telegram-канала.

КРИТИЧЕСКИ ВАЖНО:
- Пиши ИСКЛЮЧИТЕЛЬНО на русском языке
- Английские слова СТРОГО ЗАПРЕЩЕНЫ (кроме: AI, GPT, ChatGPT, Claude, API, LLM)
- Переводи ВСЕ термины и названия на русский
- Используй профессиональный деловой стиль
- Сохраняй все цифры и факты

Если видишь английский текст - ОБЯЗАТЕЛЬНО переведи его на русский.
Весь твой ответ должен быть на русском языке без исключений.`
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
        ? `Ты профессиональный редактор российского делового Telegram-канала.

КРИТИЧЕСКИ ВАЖНО:
- Пиши ИСКЛЮЧИТЕЛЬНО на русском языке
- Английские слова СТРОГО ЗАПРЕЩЕНЫ (кроме: AI, GPT, ChatGPT, Claude, API, LLM)
- Переводи ВСЕ термины и названия на русский
- Используй профессиональный деловой стиль
- Сохраняй все цифры и факты

Если видишь английский текст - ОБЯЗАТЕЛЬНО переведи его на русский.
Весь твой ответ должен быть на русском языке без исключений.`
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

  // Проверяет язык текста и переводит на русский если нужно
  async ensureRussianLanguage(text) {
    // Проверяем, есть ли в тексте много английских слов
    const englishWordsPattern = /\b[a-zA-Z]{4,}\b/g;
    const englishWords = text.match(englishWordsPattern) || [];
    
    // Исключаем допустимые английские термины
    const allowedTerms = ['AI', 'GPT', 'ChatGPT', 'Claude', 'API', 'LLM', 'DALL-E', 'OpenAI'];
    const englishWordsFiltered = englishWords.filter(word => 
      !allowedTerms.some(term => term.toLowerCase() === word.toLowerCase())
    );

    // Если английских слов больше 30% от общего текста - нужен перевод
    const totalWords = text.split(/\s+/).length;
    const englishRatio = englishWordsFiltered.length / totalWords;

    console.log(`📊 Проверка языка: английских слов ${englishWordsFiltered.length} из ${totalWords} (${(englishRatio * 100).toFixed(1)}%)`);

    if (englishRatio > 0.3) {
      console.log('🔄 Текст на английском, перевожу на русский...');
      return await this.translateToRussian(text);
    } else {
      console.log('✅ Текст уже на русском языке');
      return text;
    }
  }

  // Переводит текст на русский язык
  async translateToRussian(text) {
    const translatePrompt = `Переведи этот текст на РУССКИЙ язык. Сохрани все цифры, факты и эмодзи.

ВАЖНО:
- Используй деловой стиль
- Сохраняй структуру и абзацы
- Оставляй термины AI, GPT, ChatGPT, Claude на английском
- Весь остальной текст ТОЛЬКО на русском

Текст для перевода:
${text}

Верни ТОЛЬКО переведенный текст без комментариев.`;

    try {
      let translated;
      if (this.anthropic) {
        const message = await this.anthropic.messages.create({
          model: this.config.anthropic.model,
          max_tokens: 2000,
          system: 'Ты профессиональный переводчик. Переводи ТОЛЬКО на русский язык. Сохраняй технические термины AI, GPT, Claude.',
          messages: [{
            role: 'user',
            content: translatePrompt
          }]
        });
        translated = message.content[0].text;
      } else if (this.openai) {
        const completion = await this.openai.chat.completions.create({
          model: this.config.openai.model,
          messages: [{
            role: 'system',
            content: 'Ты профессиональный переводчик. Переводи ТОЛЬКО на русский язык. Сохраняй технические термины AI, GPT, Claude.'
          }, {
            role: 'user',
            content: translatePrompt
          }],
          max_tokens: 2000,
          temperature: 0.3
        });
        translated = completion.choices[0].message.content;
      } else {
        console.log('⚠️ API недоступны, возвращаю исходный текст');
        return text;
      }

      console.log('✅ Текст успешно переведен на русский');
      return translated;
    } catch (error) {
      console.error('⚠️ Ошибка перевода:', error.message);
      console.log('⚠️ Возвращаю исходный текст');
      return text;
    }
  }
}
