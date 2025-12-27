import Parser from 'rss-parser';
// import axios from 'axios'; // Not used - using rss-parser instead
import { HttpsProxyAgent } from 'https-proxy-agent';
import { NewsAnalyzer } from './newsAnalyzer.js';
import { SourceStats } from './sourceStats.js';

export class AIBusinessNewsCollector {
  constructor(config) {
    this.config = config;
    this.newsAnalyzer = new NewsAnalyzer(config);
    this.sourceStats = new SourceStats();
    this.parser = new Parser({
      timeout: 30000,
      customFields: {
        item: [
          ['dc:creator', 'author'],
          ['content:encoded', 'contentEncoded']
        ]
      }
    });

    // Настройка axios для работы с прокси
    this.axiosConfig = {
      timeout: 30000,
      validateStatus: (status) => status < 500
    };

    if (process.env.HTTPS_PROXY || process.env.https_proxy) {
      const proxyUrl = process.env.HTTPS_PROXY || process.env.https_proxy;
      this.axiosConfig.httpsAgent = new HttpsProxyAgent(proxyUrl);
    }
  }

  // Топ источники для AI и бизнес новостей
  getSources() {
    return {
      // RSS feeds AI и технологических новостей
      rss: [
        // === ОФИЦИАЛЬНЫЕ БЛОГИ AI КОМПАНИЙ ===
        {
          name: 'OpenAI Blog',
          url: 'https://openai.com/blog/rss.xml',
          category: 'ai-llm',
          priority: 10
        },
        {
          name: 'Anthropic News',
          url: 'https://www.anthropic.com/news/rss.xml',
          category: 'ai-llm',
          priority: 10
        },
        {
          name: 'Google AI Blog',
          url: 'https://blog.google/technology/ai/rss/',
          category: 'ai-research',
          priority: 10
        },
        {
          name: 'DeepMind Blog',
          url: 'https://www.deepmind.com/blog/rss.xml',
          category: 'ai-research',
          priority: 9
        },
        {
          name: 'Meta AI Blog',
          url: 'https://ai.meta.com/blog/rss/',
          category: 'ai-research',
          priority: 9
        },
        {
          name: 'Microsoft AI Blog',
          url: 'https://blogs.microsoft.com/ai/feed/',
          category: 'ai-enterprise',
          priority: 9
        },
        {
          name: 'Hugging Face Blog',
          url: 'https://huggingface.co/blog/feed.xml',
          category: 'ai-tools',
          priority: 8
        },
        {
          name: 'Stability AI Blog',
          url: 'https://stability.ai/blog/rss.xml',
          category: 'ai-generative',
          priority: 8
        },

        // === КОРПОРАТИВНЫЕ AI БЛОГИ ===
        {
          name: 'AWS Machine Learning',
          url: 'https://aws.amazon.com/blogs/machine-learning/feed/',
          category: 'ai-cloud',
          priority: 8
        },
        {
          name: 'Google Cloud AI',
          url: 'https://cloud.google.com/blog/products/ai-machine-learning/rss',
          category: 'ai-cloud',
          priority: 8
        },
        {
          name: 'Microsoft Azure AI',
          url: 'https://azure.microsoft.com/en-us/blog/topics/artificial-intelligence/feed/',
          category: 'ai-cloud',
          priority: 8
        },
        {
          name: 'NVIDIA AI Blog',
          url: 'https://blogs.nvidia.com/blog/category/deep-learning/feed/',
          category: 'ai-hardware',
          priority: 8
        },

        // === НАУЧНЫЕ И ОБРАЗОВАТЕЛЬНЫЕ ===
        {
          name: 'MIT Technology Review AI',
          url: 'https://www.technologyreview.com/topic/artificial-intelligence/feed',
          category: 'ai-research',
          priority: 9
        },
        {
          name: 'Papers With Code',
          url: 'https://paperswithcode.com/latest/rss.xml',
          category: 'ai-research',
          priority: 7
        },
        {
          name: 'Towards Data Science',
          url: 'https://towardsdatascience.com/feed',
          category: 'ai-education',
          priority: 7
        },
        {
          name: 'The Batch (deeplearning.ai)',
          url: 'https://www.deeplearning.ai/the-batch/feed/',
          category: 'ai-education',
          priority: 8
        },

        // === НОВОСТНЫЕ AI ИСТОЧНИКИ ===
        {
          name: 'TechCrunch AI',
          url: 'https://techcrunch.com/tag/artificial-intelligence/feed/',
          category: 'ai-news',
          priority: 10
        },
        {
          name: 'VentureBeat AI',
          url: 'https://venturebeat.com/category/ai/feed/',
          category: 'ai-business',
          priority: 9
        },
        {
          name: 'The Verge AI',
          url: 'https://www.theverge.com/ai-artificial-intelligence/rss/index.xml',
          category: 'ai-news',
          priority: 8
        },
        {
          name: 'AI Business',
          url: 'https://aibusiness.com/rss.xml',
          category: 'ai-business',
          priority: 10
        },
        {
          name: 'AI News',
          url: 'https://artificialintelligence-news.com/feed/',
          category: 'ai-news',
          priority: 7
        },
        {
          name: 'SyncedReview',
          url: 'https://syncedreview.com/feed/',
          category: 'ai-news',
          priority: 7
        },

        // === СПЕЦИАЛИЗИРОВАННЫЕ AI ИНСТРУМЕНТЫ ===
        {
          name: 'LangChain Blog',
          url: 'https://blog.langchain.dev/rss/',
          category: 'ai-tools',
          priority: 7
        },
        {
          name: 'Cohere AI Blog',
          url: 'https://cohere.com/blog/rss.xml',
          category: 'ai-llm',
          priority: 7
        },
        {
          name: 'Replicate Blog',
          url: 'https://replicate.com/blog/rss.xml',
          category: 'ai-tools',
          priority: 6
        }
      ]
    };
  }

  async collectNews() {
    console.log('🔍 Собираю новости из AI и бизнес источников...\n');

    // Загружаем статистику источников
    await this.sourceStats.load();
    this.sourceStats.printBrief();

    const sources = this.getSources();
    
    // Фильтруем только активные источники
    const activeSources = sources.rss.filter(source => this.sourceStats.isEnabled(source.name));
    const disabledCount = sources.rss.length - activeSources.length;
    
    if (disabledCount > 0) {
      console.log(`⚠️ Пропущено ${disabledCount} неактивных источников\n`);
    }

    // Сортируем по эффективности
    const sortedSources = this.sourceStats.sortSourcesByEffectiveness(activeSources);
    
    const allArticles = [];
    let successfulSources = 0;
    let failedSources = 0;

    // Собираем из RSS фидов
    for (const source of sortedSources) {
      try {
        const successRate = this.sourceStats.getSuccessRate(source.name);
        const ratePercent = Math.round(successRate * 100);
        console.log(`📡 Парсинг: ${source.name} (успешность: ${ratePercent}%)...`);
        
        // eslint-disable-next-line no-await-in-loop
        const articles = await this.parseRSSFeed(source);

        if (articles && articles.length > 0) {
          allArticles.push(...articles);
          successfulSources++;
          this.sourceStats.recordSuccess(source.name, articles.length);
          console.log(`   ✓ Найдено статей: ${articles.length}`);
        } else {
          this.sourceStats.recordFailure(source.name);
          console.log(`   ⚠️ Источник пуст, переход к следующему`);
        }
      } catch (error) {
        failedSources++;
        this.sourceStats.recordFailure(source.name);
        console.log(`   ✗ Ошибка: ${error.message}`);
        console.log(`   → Продолжаю со следующим источником...`);
        continue;
      }
    }

    // Сохраняем статистику
    await this.sourceStats.save();

    console.log(`\n📊 Обработано источников: ${successfulSources} успешно, ${failedSources} с ошибками`);

    // Фильтруем и сортируем
    const filteredArticles = this.filterArticles(allArticles);
    const sortedArticles = this.sortByRelevance(filteredArticles);

    console.log(`✅ Всего найдено релевантных статей: ${sortedArticles.length}`);

    if (sortedArticles.length === 0) {
      console.log('⚠️ Ни один источник не вернул статьи, используем демо-статьи');
      return [];
    }

    // Берем ВСЕ отфильтрованные статьи для анализа (до 100)
    const maxItems = Math.min(sortedArticles.length, 100);
    const candidateArticles = sortedArticles.slice(0, maxItems);

    console.log(`📊 Анализирую ${candidateArticles.length} новостей из ${sortedArticles.length} для создания качественных постов...`);

    // Анализируем на достоверность и интересность
    const analyzedArticles = await this.newsAnalyzer.analyzeArticles(candidateArticles);

    // Выбираем лучшие статьи (21 пост на неделю = 3 поста в день * 7 дней)
    const postsPerBatch = parseInt(process.env.POSTS_PER_BATCH) || 21;
    const topArticles = this.newsAnalyzer.selectTopArticles(analyzedArticles, postsPerBatch);

    console.log(`✅ Отобрано ${topArticles.length} лучших новостей для контент-плана (цель: ${postsPerBatch} на неделю)`);

    return topArticles;
  }

  async parseRSSFeed(source) {
    try {
      const feed = await this.parser.parseURL(source.url);
      const articles = [];

      for (const item of feed.items) {
        // Проверяем релевантность
        if (this.isRelevant(item)) {
          articles.push({
            title: item.title || '',
            description: item.contentSnippet || item.description || '',
            url: item.link || '',
            source: source.name,
            category: source.category,
            priority: source.priority,
            pubDate: item.pubDate ? new Date(item.pubDate) : new Date(),
            author: item.author || 'Unknown'
          });
        }
      }

      return articles;
    } catch (error) {
      console.error(`Ошибка парсинга ${source.name}:`, error.message);
      return [];
    }
  }

  isRelevant(item) {
    const text = `${item.title} ${item.contentSnippet || item.description || ''}`.toLowerCase();

    // Ключевые слова для AI бизнеса
    const aiBusinessKeywords = [
      'chatbot', 'чат-бот', 'чатбот',
      'ai agent', 'ai агент', 'ии агент',
      'automation', 'автоматизация',
      'machine learning', 'машинное обучение',
      'deep learning', 'глубокое обучение',
      'gpt', 'llm', 'large language model',
      'ai solution', 'ai решение',
      'artificial intelligence', 'искусственный интеллект',
      'neural network', 'нейросеть', 'нейронная сеть'
    ];

    const contentMarketingKeywords = [
      'content marketing', 'контент-маркетинг',
      'ai content', 'ai контент',
      'copywriting', 'копирайтинг',
      'seo', 'content generation',
      'marketing automation', 'маркетинговая автоматизация'
    ];

    const businessKeywords = [
      'business automation', 'бизнес автоматизация',
      'enterprise ai', 'корпоративный ai',
      'ai startup', 'ai стартап',
      'ai tools', 'ai инструменты',
      'productivity', 'продуктивность',
      'workflow', 'рабочий процесс'
    ];

    // Проверяем наличие ключевых слов
    const hasAIBusiness = aiBusinessKeywords.some(kw => text.includes(kw));
    const hasContentMarketing = contentMarketingKeywords.some(kw => text.includes(kw));
    const hasBusiness = businessKeywords.some(kw => text.includes(kw));

    return hasAIBusiness || hasContentMarketing || hasBusiness;
  }

  filterArticles(articles) {
    const daysBack = this.config.search.daysBack || 30;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);

    console.log(`📅 Фильтрация новостей: только за последние ${daysBack} дней (с ${cutoffDate.toLocaleDateString('ru-RU')})`);

    const filtered = articles.filter(article => {
      // Фильтр по дате
      if (article.pubDate < cutoffDate) return false;

      // Фильтр по минимальной длине
      if (article.description.length < 100) return false;

      return true;
    });

    console.log(`   Отфильтровано: ${filtered.length} из ${articles.length} статей актуальны`);

    return filtered;
  }

  sortByRelevance(articles) {
    const sorted = articles.sort((a, b) => {
      // Сортировка по приоритету источника и дате
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      return b.pubDate - a.pubDate;
    });

    // Показываем самые свежие новости
    if (sorted.length > 0) {
      const newest = sorted[0];
      console.log(`📰 Самая свежая новость: ${newest.title.substring(0, 60)}... (${newest.pubDate.toLocaleDateString('ru-RU')})`);
    }

    return sorted;
  }

  // Демо статьи для тестирования
  getDemoArticles() {
    console.log('⚠️ Используются демо-статьи для тестирования\n');

    return [
      {
        title: 'Новые GPT-4 агенты автоматизируют продажи: рост выручки на 300%',
        description: 'Компании внедряют AI-агентов на базе GPT-4 для автоматизации продаж и поддержки клиентов. Исследование показывает, что бизнесы увеличивают конверсию на 45% и сокращают затраты на обслуживание на 60%. Готовые решения доступны для малого и среднего бизнеса.',
        url: 'https://techcrunch.com/tag/artificial-intelligence/',
        source: 'TechCrunch AI',
        category: 'ai-business',
        priority: 10,
        pubDate: new Date(),
        author: 'TechCrunch'
      },
      {
        title: 'Топ-5 AI инструментов для контент-маркетинга в 2025 году',
        description: 'Обзор лучших AI платформ для создания контента: от генерации текстов до видео. Jasper AI, Copy.ai, и новые решения на базе Claude помогают маркетологам создавать контент в 10 раз быстрее при сохранении качества.',
        url: 'https://venturebeat.com/ai/',
        source: 'VentureBeat AI',
        category: 'ai-business',
        priority: 9,
        pubDate: new Date(),
        author: 'VentureBeat'
      },
      {
        title: 'Обучение ChatGPT для вашего бизнеса: пошаговый гайд',
        description: 'Как создать кастомного чат-бота на базе ChatGPT за 3 дня без программирования. Детальное руководство по fine-tuning, интеграции с CRM и автоматизации бизнес-процессов. Реальные кейсы и примеры промптов.',
        url: 'https://towardsdatascience.com/',
        source: 'Towards Data Science',
        category: 'ai-education',
        priority: 8,
        pubDate: new Date(),
        author: 'Towards Data Science'
      },
      {
        title: 'AI-агенты заменяют целые отделы: кейс российского стартапа',
        description: 'Российская компания разработала AI-агента, который полностью автоматизировал работу отдела продаж из 12 человек. ROI достигнут за 2 месяца. Решение доступно для внедрения в любом бизнесе.',
        url: 'https://vc.ru/tag/ai',
        source: 'VC.ru',
        category: 'ai-business',
        priority: 10,
        pubDate: new Date(),
        author: 'VC.ru'
      },
      {
        title: 'Рынок готовых AI-решений вырос на 450% за год',
        description: 'Аналитики прогнозируют, что к концу 2025 года 70% компаний будут использовать готовые AI-решения. Наибольший спрос на чат-боты для клиентской поддержки, AI для контент-маркетинга и автоматизации рутинных задач.',
        url: 'https://aibusiness.com/',
        source: 'AI Business',
        category: 'ai-business',
        priority: 9,
        pubDate: new Date(),
        author: 'AI Business'
      },
      {
        title: 'Midjourney и DALL-E 3 для бизнеса: практические кейсы',
        description: 'Как компании используют AI для генерации визуального контента: от соцсетей до презентаций. Подробные инструкции, промпты и примеры интеграции с рабочими процессами. Экономия на дизайнерах до 80%.',
        url: 'https://www.theverge.com/ai-artificial-intelligence',
        source: 'The Verge AI',
        category: 'ai-business',
        priority: 8,
        pubDate: new Date(),
        author: 'The Verge'
      }
    ];
  }
}
