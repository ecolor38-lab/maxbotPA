import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

export class AISummarizer {
  constructor(config) {
    this.config = config;
    // Гарантируем, что язык установлен на русский по умолчанию
    if (!this.config.language || (this.config.language !== 'ru' && this.config.language !== 'en')) {
      console.log(
        `⚠️ Язык не установлен или неверный (${this.config.language}), использую 'ru' по умолчанию`
      );
      this.config.language = 'ru';
    }
    this.anthropic = config.anthropic.apiKey
      ? new Anthropic({ apiKey: config.anthropic.apiKey })
      : null;
    this.openai = config.openai.apiKey ? new OpenAI({ apiKey: config.openai.apiKey }) : null;
  }

  async generateSummary(articles) {
    console.log('🤖 Генерирую саммари из собранных статей...');
    console.log(
      `🌍 Язык генерации: ${this.config.language || 'не установлен (используется ru по умолчанию)'}`
    );

    const articlesText = articles
      .map(
        (article, index) =>
          `${index + 1}. ${article.title}\n   Источник: ${article.source}\n   ${article.snippet || ''}\n`
      )
      .join('\n');

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

      // ОБЯЗАТЕЛЬНАЯ проверка и перевод на русский, если язык установлен на русский
      if (this.config.language === 'ru') {
        console.log('🇷🇺 Язык установлен на русский, проверяю и гарантирую русский текст...');
        summary = await this.ensureRussianLanguage(summary);

        // Дополнительная проверка после перевода - если всё ещё много английского, переводим еще раз
        const finalCheck = await this.ensureRussianLanguage(summary);
        if (finalCheck !== summary) {
          console.log('🔄 Повторный перевод для гарантии русского языка...');
          summary = finalCheck;
        }
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
        ? `🇷🇺 ТЫ ПРОФЕССИОНАЛЬНЫЙ РЕДАКТОР РОССИЙСКОГО ДЕЛОВОГО TELEGRAM-КАНАЛА.

КРИТИЧЕСКИ ВАЖНО - НАРУШЕНИЕ НЕДОПУСТИМО:
1. Пиши ИСКЛЮЧИТЕЛЬНО на РУССКОМ языке
2. Английские слова СТРОГО ЗАПРЕЩЕНЫ (кроме: AI, GPT, ChatGPT, Claude, API, LLM, DALL-E, OpenAI)
3. Переводи ВСЕ термины на русский: startup → стартап, company → компания, business → бизнес, revenue → выручка, CEO → глава компании
4. Переводи ВСЕ названия компаний и продуктов на русский, если есть перевод
5. Используй профессиональный деловой стиль
6. Сохраняй все цифры, факты и даты

ЗАПРЕЩЕНО:
❌ Писать на английском языке
❌ Оставлять английские слова (кроме разрешенных терминов)
❌ Использовать фразы типа "according to", "research shows", "the study indicates"

Если получаешь английский текст - ОБЯЗАТЕЛЬНО переведи его на русский.
ВЕСЬ твой ответ должен быть на РУССКОМ языке.`
        : 'You are a business editor. Write ONLY in English.';

      const message = await this.anthropic.messages.create({
        model: this.config.anthropic.model,
        max_tokens: 2000,
        system: systemMessage,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
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
        ? `🇷🇺 ТЫ ПРОФЕССИОНАЛЬНЫЙ РЕДАКТОР РОССИЙСКОГО ДЕЛОВОГО TELEGRAM-КАНАЛА.

КРИТИЧЕСКИ ВАЖНО - НАРУШЕНИЕ НЕДОПУСТИМО:
1. Пиши ИСКЛЮЧИТЕЛЬНО на РУССКОМ языке
2. Английские слова СТРОГО ЗАПРЕЩЕНЫ (кроме: AI, GPT, ChatGPT, Claude, API, LLM, DALL-E, OpenAI)
3. Переводи ВСЕ термины на русский: startup → стартап, company → компания, business → бизнес, revenue → выручка, CEO → глава компании
4. Переводи ВСЕ названия компаний и продуктов на русский, если есть перевод
5. Используй профессиональный деловой стиль
6. Сохраняй все цифры, факты и даты

ЗАПРЕЩЕНО:
❌ Писать на английском языке
❌ Оставлять английские слова (кроме разрешенных терминов)
❌ Использовать фразы типа "according to", "research shows", "the study indicates"

Если получаешь английский текст - ОБЯЗАТЕЛЬНО переведи его на русский.
ВЕСЬ твой ответ должен быть на РУССКОМ языке.`
        : 'You are an expert in AI technologies and business automation. Write ONLY in English.';

      const completion = await this.openai.chat.completions.create({
        model: this.config.openai.model,
        messages: [
          {
            role: 'system',
            content: systemMessage
          },
          {
            role: 'user',
            content: prompt
          }
        ],
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
      'чат-бот',
      'chatbot',
      'AI',
      'ИИ',
      'автоматизация',
      'automation',
      'нейросеть',
      'neural network',
      'машинное обучение',
      'machine learning',
      'GPT',
      'LLM',
      'контент-маркетинг',
      'content marketing',
      'бизнес',
      'business',
      'агент',
      'agent',
      'копирайтинг',
      'copywriting'
    ];

    const found = [];
    for (const keyword of aiBusinessKeywords) {
      if (text.toLowerCase().includes(keyword.toLowerCase())) {
        found.push(keyword);
      }
    }

    return found.slice(0, 3).join(', ') || 'AI business automation and chatbots';
  }

  generateDemoSummary(_articles) {
    return `🚀 AI решения для бизнеса: рост на 300%

Компании внедряют GPT-4 для автоматизации. Результат: +45% конверсия, -60% затраты.

🤖 Чат-боты работают 24/7. Стоимость от 50К₽, окупаемость за 2 месяца.

✍️ Claude и ChatGPT создают тексты в 10 раз быстрее.

Рынок AI вырос на 450% за год.`;
  }

  // Проверяет язык текста и переводит на русский если нужно
  async ensureRussianLanguage(text) {
    if (!text || typeof text !== 'string') {
      return text;
    }

    // Проверяем, есть ли в тексте английские слова (более строгая проверка)
    const englishWordsPattern = /\b[a-zA-Z]{3,}\b/g;
    const englishWords = text.match(englishWordsPattern) || [];

    // Исключаем допустимые английские термины
    const allowedTerms = [
      'AI',
      'GPT',
      'ChatGPT',
      'Claude',
      'API',
      'LLM',
      'DALL-E',
      'OpenAI',
      'CEO',
      'CTO'
    ];
    const englishWordsFiltered = englishWords.filter(
      (word) => !allowedTerms.some((term) => term.toLowerCase() === word.toLowerCase())
    );

    // Проверяем, начинается ли текст с английских слов (признак английского текста)
    const startsWithEnglish = /^[a-zA-Z]/.test(text.trim());

    // Проверяем процент английских слов от общего количества
    const totalWords = text.split(/\s+/).filter((w) => w.length > 0).length;
    const englishRatio = totalWords > 0 ? englishWordsFiltered.length / totalWords : 0;

    // Проверяем наличие кириллицы
    const hasCyrillic = /[а-яА-ЯёЁ]/.test(text);

    // Более строгая проверка: переводим если:
    // 1. Английских слов больше 15% (вместо 30%)
    // 2. Текст начинается с английской буквы И нет кириллицы
    // 3. Нет кириллицы вообще (вероятно весь текст на английском)

    const needsTranslation =
      englishRatio > 0.15 ||
      (startsWithEnglish && !hasCyrillic) ||
      (!hasCyrillic && englishWordsFiltered.length > 5);

    console.log(
      `📊 Проверка языка: английских слов ${englishWordsFiltered.length} из ${totalWords} (${(englishRatio * 100).toFixed(1)}%), кириллица: ${hasCyrillic ? 'есть' : 'нет'}`
    );

    if (needsTranslation) {
      console.log('🔄 Обнаружен английский текст, перевожу на русский...');
      return await this.translateToRussian(text);
    } else {
      console.log('✅ Текст уже на русском языке');
      return text;
    }
  }

  // Переводит текст на русский язык
  async translateToRussian(text) {
    const translatePrompt = `🇷🇺 КРИТИЧЕСКИ ВАЖНО: Переведи этот текст ТОЛЬКО на РУССКИЙ язык!

ТРЕБОВАНИЯ:
1. ВЕСЬ текст должен быть на РУССКОМ языке
2. Сохрани все цифры, факты, даты и эмодзи
3. Используй деловой стиль
4. Сохраняй структуру и абзацы
5. Оставляй ТОЛЬКО эти термины на английском: AI, GPT, ChatGPT, Claude, API, LLM, DALL-E, OpenAI
6. ВСЕ остальные слова переводи на русский (startup → стартап, company → компания, business → бизнес, и т.д.)

Текст для перевода:
${text}

Верни ТОЛЬКО переведенный текст на русском языке. Никаких комментариев! ТОЛЬКО перевод!`;

    try {
      let translated;
      if (this.anthropic) {
        const message = await this.anthropic.messages.create({
          model: this.config.anthropic.model,
          max_tokens: 2000,
          system:
            'Ты профессиональный переводчик. ТВОЯ ЕДИНСТВЕННАЯ ЗАДАЧА - перевести текст на РУССКИЙ язык. ВЕСЬ текст должен быть на русском. Оставляй только термины AI, GPT, ChatGPT, Claude, API, LLM на английском. ВСЁ остальное переводи на русский. НЕ добавляй комментарии, возвращай ТОЛЬКО перевод.',
          messages: [
            {
              role: 'user',
              content: translatePrompt
            }
          ]
        });
        translated = message.content[0].text;
      } else if (this.openai) {
        const completion = await this.openai.chat.completions.create({
          model: this.config.openai.model,
          messages: [
            {
              role: 'system',
              content:
                'Ты профессиональный переводчик. ТВОЯ ЕДИНСТВЕННАЯ ЗАДАЧА - перевести текст на РУССКИЙ язык. ВЕСЬ текст должен быть на русском. Оставляй только термины AI, GPT, ChatGPT, Claude, API, LLM на английском. ВСЁ остальное переводи на русский. НЕ добавляй комментарии, возвращай ТОЛЬКО перевод.'
            },
            {
              role: 'user',
              content: translatePrompt
            }
          ],
          max_tokens: 2000,
          temperature: 0.2
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
