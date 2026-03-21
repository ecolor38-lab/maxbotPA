import Parser from 'rss-parser';

export class AIBusinessNewsCollector {
  constructor(config) {
    this.config = config;
    this.parser = new Parser({
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7'
      },
      customFields: {
        item: ['media:content', 'content:encoded']
      }
    });
  }

  getSources() {
    return [
      // === ОСНОВНЫЕ ТЕХНО-ИЗДАНИЯ ===
      { name: 'TechCrunch AI', url: 'https://techcrunch.com/tag/artificial-intelligence/feed/', type: 'news' },
      { name: 'VentureBeat AI', url: 'https://venturebeat.com/category/ai/feed/', type: 'news' },
      { name: 'The Verge AI', url: 'https://www.theverge.com/rss/index.xml', type: 'news' },
      { name: 'MIT Tech Review', url: 'https://www.technologyreview.com/topic/artificial-intelligence/feed', type: 'news' },
      { name: 'Wired AI', url: 'https://www.wired.com/feed/tag/ai/latest/rss', type: 'news' },
      { name: 'Ars Technica AI', url: 'https://feeds.arstechnica.com/arstechnica/technology-lab', type: 'news' },

      // === ОФИЦИАЛЬНЫЕ БЛОГИ ===
      { name: 'OpenAI Blog', url: 'https://openai.com/blog/rss.xml', type: 'official' },
      { name: 'Google AI Blog', url: 'https://blog.google/technology/ai/rss/', type: 'official' },
      // Anthropic RSS removed — returns 404, no active feed

      // === СОЦСЕТИ ===

      // === HACKER NEWS ===
      { name: 'Hacker News', url: 'https://hnrss.org/newest?q=AI+OR+GPT+OR+LLM', type: 'social' },

      // === PRODUCT HUNT ===
      { name: 'Product Hunt AI', url: 'https://www.producthunt.com/feed?category=artificial-intelligence', type: 'social' },

      // === РОССИЙСКИЕ ИСТОЧНИКИ ===
      { name: 'Habr AI', url: 'https://habr.com/ru/rss/hub/artificial_intelligence/all/?fl=ru', type: 'ru_news' },
      { name: 'Habr ML', url: 'https://habr.com/ru/rss/hub/machine_learning/all/?fl=ru', type: 'ru_news' },
      { name: '3DNews AI', url: 'https://3dnews.ru/ai/rss/', type: 'ru_news' },
      { name: 'CNews', url: 'https://www.cnews.ru/inc/rss/news.xml', type: 'ru_news' },
      { name: 'iXBT', url: 'https://www.ixbt.com/export/news.rss', type: 'ru_news' },
      { name: 'vc.ru', url: 'https://vc.ru/rss/all', type: 'ru_news' },
      { name: 'RBC Технологии', url: 'https://rssexport.rbc.ru/rbcnews/news/30/full.rss', type: 'ru_news' },
      { name: 'Коммерсантъ', url: 'https://www.kommersant.ru/rss/news.xml', type: 'ru_news' },
      { name: 'ТАСС', url: 'https://tass.ru/rss/v2.xml', type: 'ru_news' },
      { name: 'Лента.ру', url: 'https://lenta.ru/rss/news', type: 'ru_news' },
      { name: 'DTF', url: 'https://dtf.ru/rss/all', type: 'ru_news' }
    ];
  }

  async collectNews() {
    console.log('🔍 Сбор новостей из всех источников...\n');
    const allArticles = [];
    const sources = this.getSources();

    const groups = [
      { type: 'news', label: '📰 ЗАРУБЕЖНЫЕ ИЗДАНИЯ' },
      { type: 'ru_news', label: '🇷🇺 РОССИЙСКИЕ ИЗДАНИЯ' },
      { type: 'official', label: '🏢 ОФИЦИАЛЬНЫЕ БЛОГИ' },
      { type: 'social', label: '📱 СОЦСЕТИ И ФОРУМЫ' }
    ];

    for (const group of groups) {
      console.log(`${group.label}:`);
      await this.collectFromSources(
        sources.filter((s) => s.type === group.type),
        allArticles
      );
      console.log('');
    }

    // Balanced selection: guarantee minimum slots per category
    const minSlots = { news: 5, ru_news: 10, official: 2, social: 3 };
    const totalSlots = 20;
    const selected = [];

    // Group articles by type, sorted by date within each
    const byType = {};
    for (const group of groups) {
      byType[group.type] = allArticles
        .filter((a) => a.type === group.type)
        .sort((a, b) => b.pubDate - a.pubDate);
    }

    // First pass: fill minimum slots per category
    for (const [type, min] of Object.entries(minSlots)) {
      const pool = byType[type] || [];
      const take = pool.splice(0, min);
      selected.push(...take);
    }

    // Second pass: fill remaining slots from largest pools
    let remaining = totalSlots - selected.length;
    while (remaining > 0) {
      const pools = Object.values(byType).filter((p) => p.length > 0);
      if (pools.length === 0) break;
      pools.sort((a, b) => b.length - a.length);
      const item = pools[0].shift();
      selected.push(item);
      remaining--;
    }

    // Final sort by date
    selected.sort((a, b) => b.pubDate - a.pubDate);

    console.log(`✅ Всего собрано: ${allArticles.length} → отобрано: ${selected.length} статей`);
    for (const group of groups) {
      const raw = allArticles.filter((a) => a.type === group.type).length;
      const sel = selected.filter((a) => a.type === group.type).length;
      console.log(`   ${group.label.split(' ')[0]} ${group.type}: ${sel}/${raw}`);
    }

    return selected;
  }

  async collectFromSources(sources, allArticles) {
    for (const source of sources) {
      try {
        console.log(`   📡 ${source.name}...`);
        // eslint-disable-next-line no-await-in-loop
        const feed = await this.parser.parseURL(source.url);

        // Для общих лент (РБК, ТАСС, Коммерсантъ) берём больше — фильтруем по ключевым словам
        const scanLimit = source.type === 'ru_news' ? 20 : 10;
        const articles = feed.items
          .slice(0, scanLimit)
          .filter((item) => this.isRelevant(item))
          .slice(0, 5)
          .map((item) => ({
            title: this.cleanTitle(item.title || ''),
            snippet: this.cleanSnippet(item.contentSnippet || item.content || ''),
            url: item.link || '',
            source: source.name,
            type: source.type,
            pubDate: item.pubDate ? new Date(item.pubDate) : new Date()
          }));

        allArticles.push(...articles);
        console.log(`      ✓ ${articles.length} статей`);
      } catch (error) {
        console.log(`      ✗ ${error.message.substring(0, 50)}`);
      }
    }
  }

  cleanTitle(title) {
    // Убираем [R], [D], [P] теги с Reddit
    return title.replace(/^\[[A-Z]\]\s*/, '').trim();
  }

  cleanSnippet(snippet) {
    // Убираем HTML и лишние пробелы
    return snippet
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .substring(0, 400)
      .trim();
  }

  isRelevant(item) {
    // Фильтрация по дате - только за последние 2 дня
    if (item.pubDate) {
      const pubDate = new Date(item.pubDate);
      const daysBack = this.config?.search?.daysBack || 2;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysBack);
      if (pubDate < cutoffDate) {
        return false;
      }
    }

    // Фильтрация по ключевым словам
    const text = `${item.title} ${item.contentSnippet || ''}`.toLowerCase();
    const keywords = [
      // Английские
      'ai',
      'gpt',
      'llm',
      'chatbot',
      'automation',
      'machine learning',
      'neural',
      'openai',
      'anthropic',
      'claude',
      'gemini',
      'copilot',
      'midjourney',
      'stable diffusion',
      'deepseek',
      'mistral',
      'llama',
      'artificial intelligence',
      'deep learning',
      'transformer',
      'generative ai',
      // Российские компании и продукты
      'искусственный интеллект',
      'нейросеть',
      'нейросети',
      'нейронная сеть',
      'yandexgpt',
      'яндекс gpt',
      'яндексgpt',
      'яндекс арт',
      'yandexart',
      'gigachat',
      'гигачат',
      'сбер',
      'sber',
      'kandinsky',
      'кандинский',
      'маруся',
      'алиса',
      'yandex cloud',
      'vk cloud',
      'мтс ai',
      'т-банк',
      'тинькофф',
      // Российские темы
      'цифровая экономика',
      'цифровизация',
      'импортозамещен',
      'роскомнадзор',
      'минцифры',
      'it-отрасл',
      'ит-отрасл',
      'российский процессор',
      'отечественн',
      'технологический суверенитет',
      'робототехник',
      'беспилотник',
      'дрон',
      'кибербезопасност',
      'биометри'
    ];
    return keywords.some((kw) => text.includes(kw));
  }

  getDemoArticles() {
    return [
      {
        title: 'OpenAI выпустил GPT-5 с революционными возможностями',
        snippet: 'Новая модель показывает человеческий уровень рассуждений.',
        url: 'https://openai.com/blog/gpt5',
        source: 'OpenAI Blog',
        type: 'official',
        pubDate: new Date()
      }
    ];
  }
}
