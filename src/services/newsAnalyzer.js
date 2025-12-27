export class NewsAnalyzer {
  constructor(config) {
    this.config = config;
  }

  async analyzeArticles(articles) {
    console.log(`🔍 Анализ ${articles.length} статей...`);

    // Простой анализ на основе ключевых слов
    const analyzed = articles.map((article) => {
      const text = `${article.title} ${article.snippet || ''}`.toLowerCase();

      // Проверяем релевантность AI/бизнес тематике
      const aiKeywords = [
        'ai',
        'gpt',
        'llm',
        'neural',
        'machine learning',
        'automation',
        'chatbot'
      ];
      const score = aiKeywords.filter((kw) => text.includes(kw)).length;

      return {
        ...article,
        relevanceScore: Math.min(10, score * 2 + 5),
        isRelevant: score > 0
      };
    });

    const relevant = analyzed.filter((a) => a.isRelevant);
    console.log(`✅ Релевантных: ${relevant.length} из ${articles.length}`);

    return relevant.length > 0 ? relevant : analyzed.slice(0, 5);
  }
}
