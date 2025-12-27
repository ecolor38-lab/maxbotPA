import Parser from 'rss-parser';

export class AIBusinessNewsCollector {
  constructor(config) {
    this.config = config;
    this.parser = new Parser({ timeout: 15000 });
  }

  getSources() {
    return [
      { name: 'TechCrunch AI', url: 'https://techcrunch.com/tag/artificial-intelligence/feed/' },
      { name: 'VentureBeat AI', url: 'https://venturebeat.com/category/ai/feed/' },
      { name: 'The Verge AI', url: 'https://www.theverge.com/ai-artificial-intelligence/rss/index.xml' },
      { name: 'MIT Tech Review', url: 'https://www.technologyreview.com/topic/artificial-intelligence/feed' },
      { name: 'OpenAI Blog', url: 'https://openai.com/blog/rss.xml' }
    ];
  }

  async collectNews() {
    console.log('🔍 Сбор новостей...\n');
    const allArticles = [];

    for (const source of this.getSources()) {
      try {
        console.log(`📡 ${source.name}...`);
        // eslint-disable-next-line no-await-in-loop
        const feed = await this.parser.parseURL(source.url);

        const articles = feed.items
          .slice(0, 5)
          .filter((item) => this.isRelevant(item))
          .map((item) => ({
            title: item.title || '',
            snippet: item.contentSnippet?.substring(0, 300) || '',
            url: item.link || '',
            source: source.name,
            pubDate: item.pubDate ? new Date(item.pubDate) : new Date()
          }));

        allArticles.push(...articles);
        console.log(`   ✓ ${articles.length} статей`);
      } catch (error) {
        console.log(`   ✗ ${error.message}`);
      }
    }

    const sorted = allArticles.sort((a, b) => b.pubDate - a.pubDate).slice(0, 10);
    console.log(`\n✅ Всего: ${sorted.length} статей`);
    return sorted;
  }

  isRelevant(item) {
    const text = `${item.title} ${item.contentSnippet || ''}`.toLowerCase();
    const keywords = ['ai', 'gpt', 'llm', 'chatbot', 'automation', 'machine learning', 'neural'];
    return keywords.some((kw) => text.includes(kw));
  }

  getDemoArticles() {
    return [
      {
        title: 'GPT-4 увеличивает продажи на 300%',
        snippet: 'Компании внедряют AI-агентов для автоматизации продаж.',
        url: 'https://techcrunch.com/ai',
        source: 'TechCrunch',
        pubDate: new Date()
      }
    ];
  }
}
