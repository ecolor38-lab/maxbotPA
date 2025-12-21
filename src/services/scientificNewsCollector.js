import Parser from 'rss-parser';
import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';

export class ScientificNewsCollector {
  constructor(config) {
    this.config = config;
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

  // Топ-10 научных источников для медицинских новостей
  getSources() {
    return {
      // RSS feeds научных журналов
      rss: [
        {
          name: 'PubMed Central - Arthritis',
          url: 'https://www.ncbi.nlm.nih.gov/feed/rss.cgi?ChanKey=PubMedHealth',
          category: 'research',
          priority: 10
        },
        {
          name: 'Nature Medicine',
          url: 'https://www.nature.com/nm.rss',
          category: 'research',
          priority: 9
        },
        {
          name: 'Science Daily - Arthritis',
          url: 'https://www.sciencedaily.com/rss/health_medicine/arthritis.xml',
          category: 'news',
          priority: 8
        },
        {
          name: 'Medical News Today - Arthritis',
          url: 'https://www.medicalnewstoday.com/rss/arthritis.xml',
          category: 'news',
          priority: 8
        },
        {
          name: 'ScienceDaily - Medical AI',
          url: 'https://www.sciencedaily.com/rss/computers_math/artificial_intelligence.xml',
          category: 'ai',
          priority: 7
        },
        {
          name: 'Medical Xpress - Rheumatology',
          url: 'https://medicalxpress.com/rss-feed/search/?search=arthritis',
          category: 'research',
          priority: 7
        }
      ],

      // Новостные медицинские сайты
      news: [
        {
          name: 'Reuters Health News',
          url: 'https://www.reuters.com/news/archive/healthNews',
          type: 'web',
          priority: 8
        }
      ]
    };
  }

  async collectNews() {
    console.log('🔍 Собираю новости из научных источников...\n');

    const sources = this.getSources();
    const allArticles = [];

    // Собираем из RSS фидов
    for (const source of sources.rss) {
      try {
        console.log(`📡 Парсинг: ${source.name}...`);
        const articles = await this.parseRSSFeed(source);
        allArticles.push(...articles);
        console.log(`   ✓ Найдено статей: ${articles.length}`);
      } catch (error) {
        console.log(`   ✗ Ошибка: ${error.message}`);
      }
    }

    // Фильтруем и сортируем
    const filteredArticles = this.filterArticles(allArticles);
    const sortedArticles = this.sortByRelevance(filteredArticles);

    console.log(`\n✅ Всего найдено релевантных статей: ${sortedArticles.length}`);

    return sortedArticles.slice(0, this.config.search.maxNewsItems || 10);
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

    // Ключевые слова для поиска
    const arthritisKeywords = [
      'arthritis', 'артрит',
      'rheumatoid', 'ревматоидный',
      'psoriatic', 'псориатический',
      'osteoarthritis', 'остеоартрит',
      'joint', 'сустав',
      'inflammation', 'воспаление',
      'rheumatology', 'ревматология',
      'autoimmune', 'аутоиммунн'
    ];

    const medicalAIKeywords = [
      'artificial intelligence', 'искусственный интеллект',
      'machine learning', 'машинное обучение',
      'ai diagnosis', 'ai диагностика',
      'deep learning', 'глубокое обучение',
      'medical ai', 'медицинский ai',
      'drug discovery', 'разработка лекарств',
      'clinical trial', 'клиническое исследование'
    ];

    const generalMedKeywords = [
      'new treatment', 'новое лечение',
      'breakthrough', 'прорыв',
      'clinical study', 'клиническое исследование',
      'medication', 'медикамент',
      'therapy', 'терапия',
      'biologic', 'биологический препарат'
    ];

    // Проверяем наличие ключевых слов
    const hasArthritis = arthritisKeywords.some(kw => text.includes(kw));
    const hasMedicalAI = medicalAIKeywords.some(kw => text.includes(kw));
    const hasGeneralMed = generalMedKeywords.some(kw => text.includes(kw));

    return hasArthritis || hasMedicalAI || hasGeneralMed;
  }

  filterArticles(articles) {
    const daysBack = this.config.search.daysBack || 30;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);

    return articles.filter(article => {
      // Фильтр по дате
      if (article.pubDate < cutoffDate) return false;

      // Фильтр по минимальной длине
      if (article.description.length < 100) return false;

      return true;
    });
  }

  sortByRelevance(articles) {
    return articles.sort((a, b) => {
      // Сортировка по приоритету источника и дате
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      return b.pubDate - a.pubDate;
    });
  }

  // Для тестирования - получить демо статьи если нет подключения
  getDemoArticles() {
    console.log('⚠️ Используются демо-статьи для тестирования\n');

    return [
      {
        title: 'New JAK Inhibitor Shows Promise in Psoriatic Arthritis Treatment',
        description: 'A phase III clinical trial published in The Lancet Rheumatology demonstrates that a novel JAK inhibitor achieves significant improvement in joint symptoms and skin manifestations in patients with psoriatic arthritis. The study included 847 patients across 15 countries.',
        url: 'https://www.thelancet.com/journals/lanrhe/article/PIIS2665-9913(24)00001-X/fulltext',
        source: 'The Lancet Rheumatology',
        category: 'research',
        priority: 9,
        pubDate: new Date('2025-01-10'),
        author: 'Dr. Sarah Johnson et al.'
      },
      {
        title: 'AI Algorithm Predicts Arthritis Flares 48 Hours in Advance',
        description: 'Researchers at MIT have developed an artificial intelligence system that can predict arthritis flares up to 48 hours before they occur by analyzing wearable sensor data. The algorithm achieved 87% accuracy in clinical validation studies.',
        url: 'https://www.nature.com/articles/s41591-024-03456-1',
        source: 'Nature Medicine',
        category: 'ai',
        priority: 10,
        pubDate: new Date('2025-01-08'),
        author: 'Chen Wei, PhD'
      },
      {
        title: 'Breakthrough in Cartilage Regeneration Using Stem Cells',
        description: 'Scientists report successful cartilage regeneration in osteoarthritis patients using mesenchymal stem cells. The treatment showed significant improvement in joint function and pain reduction after 6 months in early-phase trials.',
        url: 'https://stm.sciencemag.org/content/17/782/eadk1234',
        source: 'Science Translational Medicine',
        category: 'research',
        priority: 9,
        pubDate: new Date('2025-01-05'),
        author: 'Anderson Laboratory'
      },
      {
        title: 'Machine Learning Identifies New Drug Targets for Rheumatoid Arthritis',
        description: 'Using deep learning analysis of genomic data, researchers identified three previously unknown protein targets that could lead to more effective rheumatoid arthritis treatments with fewer side effects.',
        url: 'https://www.cell.com/cell/fulltext/S0092-8674(24)01456-7',
        source: 'Cell',
        category: 'ai',
        priority: 9,
        pubDate: new Date('2025-01-03'),
        author: 'Kumar R, Zhang L'
      },
      {
        title: 'FDA Approves First Oral Treatment for Active Psoriatic Arthritis',
        description: 'The FDA has approved deucravacitinib, a first-in-class oral treatment for adults with active psoriatic arthritis. Clinical trials showed it was more effective than placebo in reducing joint symptoms and skin lesions.',
        url: 'https://www.nejm.org/doi/full/10.1056/NEJMoa2412345',
        source: 'New England Journal of Medicine',
        category: 'research',
        priority: 10,
        pubDate: new Date('2025-01-12'),
        author: 'FDA Medical Review Team'
      },
      {
        title: 'AI-Powered Imaging Detects Early Arthritis Before Symptoms Appear',
        description: 'A new AI imaging system can detect microscopic joint changes associated with arthritis up to 3 years before clinical symptoms emerge, potentially enabling preventive treatment strategies.',
        url: 'https://jamanetwork.com/journals/jama/fullarticle/2825678',
        source: 'JAMA',
        category: 'ai',
        priority: 9,
        pubDate: new Date('2024-12-28'),
        author: 'Martinez-Lopez A'
      }
    ];
  }
}
