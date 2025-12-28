import Parser from 'rss-parser';

export class AIBusinessNewsCollector {
  constructor(config) {
    this.config = config;
    this.parser = new Parser({
      timeout: 15000,
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
      { name: 'The Verge AI', url: 'https://www.theverge.com/ai-artificial-intelligence/rss/index.xml', type: 'news' },
      { name: 'MIT Tech Review', url: 'https://www.technologyreview.com/topic/artificial-intelligence/feed', type: 'news' },
      { name: 'Wired AI', url: 'https://www.wired.com/feed/tag/ai/latest/rss', type: 'news' },
      { name: 'Ars Technica AI', url: 'https://feeds.arstechnica.com/arstechnica/technology-lab', type: 'news' },

      // === ОФИЦИАЛЬНЫЕ БЛОГИ ===
      { name: 'OpenAI Blog', url: 'https://openai.com/blog/rss.xml', type: 'official' },
      { name: 'Google AI Blog', url: 'https://blog.google/technology/ai/rss/', type: 'official' },
      { name: 'Anthropic', url: 'https://www.anthropic.com/rss.xml', type: 'official' },

      // === REDDIT (соцсети) ===
      { name: 'Reddit r/artificial', url: 'https://www.reddit.com/r/artificial/.rss', type: 'social' },
      { name: 'Reddit r/MachineLearning', url: 'https://www.reddit.com/r/MachineLearning/.rss', type: 'social' },
      { name: 'Reddit r/ChatGPT', url: 'https://www.reddit.com/r/ChatGPT/.rss', type: 'social' },
      { name: 'Reddit r/LocalLLaMA', url: 'https://www.reddit.com/r/LocalLLaMA/.rss', type: 'social' },

      // === HACKER NEWS ===
      { name: 'Hacker News', url: 'https://hnrss.org/newest?q=AI+OR+GPT+OR+LLM', type: 'social' },

      // === PRODUCT HUNT ===
      { name: 'Product Hunt AI', url: 'https://www.producthunt.com/feed?category=artificial-intelligence', type: 'social' }
    ];
  }

  async collectNews() {
    console.log('🔍 Сбор новостей из всех источников...\n');
    const allArticles = [];

    // Группируем источники по типу
    const sources = this.getSources();
    const byType = {
      news: sources.filter((s) => s.type === 'news'),
      official: sources.filter((s) => s.type === 'official'),
      social: sources.filter((s) => s.type === 'social')
    };

    console.log('📰 НОВОСТНЫЕ ИЗДАНИЯ:');
    await this.collectFromSources(byType.news, allArticles);

    console.log('\n🏢 ОФИЦИАЛЬНЫЕ БЛОГИ:');
    await this.collectFromSources(byType.official, allArticles);

    console.log('\n📱 СОЦСЕТИ И ФОРУМЫ:');
    await this.collectFromSources(byType.social, allArticles);

    // Сортируем по дате и берём топ-15
    const sorted = allArticles.sort((a, b) => b.pubDate - a.pubDate).slice(0, 15);

    console.log(`\n✅ Всего собрано: ${sorted.length} статей`);
    console.log(`   📰 Новости: ${allArticles.filter((a) => a.type === 'news').length}`);
    console.log(`   🏢 Официальные: ${allArticles.filter((a) => a.type === 'official').length}`);
    console.log(`   📱 Соцсети: ${allArticles.filter((a) => a.type === 'social').length}`);

    return sorted;
  }

  async collectFromSources(sources, allArticles) {
    for (const source of sources) {
      try {
        console.log(`   📡 ${source.name}...`);
        // eslint-disable-next-line no-await-in-loop
        const feed = await this.parser.parseURL(source.url);

        const articles = feed.items
          .slice(0, 5)
          .filter((item) => this.isRelevant(item))
          .map((item) => ({
            title: this.cleanTitle(item.title || ''),
            snippet: this.cleanSnippet(item.contentSnippet || item.content || ''),
            url: item.link || '',
            source: source.name,
            type: source.type,
            pubDate: item.pubDate ? new Date(item.pubDate) : new Date(),
            isOfficial: source.type === 'official',
            isSocial: source.type === 'social'
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
      'искусственный интеллект',
      'нейросеть'
    ];
    return keywords.some((kw) => text.includes(kw));
  }

  // Оценка достоверности источника
  getSourceCredibility(article) {
    const highCredibility = ['OpenAI Blog', 'Google AI Blog', 'Anthropic', 'MIT Tech Review'];
    const mediumCredibility = ['TechCrunch', 'VentureBeat', 'The Verge', 'Wired', 'Ars Technica'];

    if (highCredibility.some((s) => article.source.includes(s))) return 'high';
    if (mediumCredibility.some((s) => article.source.includes(s))) return 'medium';
    return 'low';
  }

  getDemoArticles() {
    return [
      {
        title: 'OpenAI выпустил GPT-5 с революционными возможностями',
        snippet: 'Новая модель показывает человеческий уровень рассуждений.',
        url: 'https://openai.com/blog/gpt5',
        source: 'OpenAI Blog',
        type: 'official',
        pubDate: new Date(),
        isOfficial: true
      }
    ];
  }
}
