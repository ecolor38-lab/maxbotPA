import { AIBusinessNewsCollector } from './aiBusinessNewsCollector.js';
import { config } from '../config/config.js';
import { getDb } from '../db/database.js';

export class TrendDetector {
  constructor() {
    this.newsCollector = new AIBusinessNewsCollector(config);
  }

  async detectTrends() {
    console.log('🔍 TrendDetector: сканирование источников...');

    try {
      const articles = await this.newsCollector.collectNews();
      if (!articles.length) {
        console.log('🔍 TrendDetector: нет новых статей');
        return [];
      }

      const keywordMap = {};

      for (const article of articles) {
        const title = (article.title || '').toLowerCase();
        const keywords = this.extractKeywords(title);

        for (const kw of keywords) {
          if (!keywordMap[kw]) {
            keywordMap[kw] = { sources: new Set(), titles: [] };
          }
          keywordMap[kw].sources.add(article.source || 'unknown');
          if (keywordMap[kw].titles.length < 5) {
            keywordMap[kw].titles.push(article.title);
          }
        }
      }

      const trends = [];
      const db = getDb();
      for (const [keyword, data] of Object.entries(keywordMap)) {
        if (data.sources.size >= 3) {
          const recent = db
            .prepare(
              `SELECT id FROM detected_trends
               WHERE keyword = ? AND detected_at >= datetime('now', '-24 hours')`
            )
            .get(keyword);

          if (!recent) {
            const sources = Array.from(data.sources);
            db.prepare('INSERT INTO detected_trends (keyword, source_count, sources, sample_titles) VALUES (?, ?, ?, ?)').run(
              keyword,
              sources.length,
              JSON.stringify(sources),
              JSON.stringify(data.titles)
            );

            trends.push({
              keyword,
              sourceCount: sources.length,
              sources,
              titles: data.titles
            });
          }
        }
      }

      if (trends.length > 0) {
        console.log(`🔥 TrendDetector: найдено ${trends.length} трендов!`);
        trends.forEach((t) => console.log(`   • "${t.keyword}" (${t.sourceCount} источников)`));
      } else {
        console.log('🔍 TrendDetector: новых трендов не найдено');
      }

      return trends;
    } catch (error) {
      console.error('❌ TrendDetector ошибка:', error.message);
      return [];
    }
  }

  extractKeywords(title) {
    const keywords = [];
    const normalized = title.replace(/[^\wа-яё\s-]/gi, ' ').replace(/\s+/g, ' ');
    const words = normalized.split(' ').filter((w) => w.length > 3);

    for (let i = 0; i < words.length - 1; i++) {
      const bigram = `${words[i]} ${words[i + 1]}`;
      if (this.isSignificantBigram(bigram)) {
        keywords.push(bigram);
      }
    }

    const entities = [
      'openai', 'google', 'anthropic', 'meta', 'microsoft', 'apple', 'nvidia',
      'chatgpt', 'gemini', 'claude', 'llama', 'copilot', 'midjourney',
      'яндекс', 'сбер', 'gigachat'
    ];
    for (const word of words) {
      if (entities.includes(word)) {
        keywords.push(word);
      }
    }

    return keywords;
  }

  isSignificantBigram(bigram) {
    const stopBigrams = [
      'this that', 'what will', 'how does', 'will make', 'can help',
      'что такое', 'как это', 'что будет', 'для того'
    ];
    return !stopBigrams.includes(bigram);
  }

  getNewTrends() {
    const db = getDb();
    return db.prepare("SELECT * FROM detected_trends WHERE status = 'new' ORDER BY source_count DESC").all();
  }

  markTrendProcessed(trendId) {
    const db = getDb();
    db.prepare("UPDATE detected_trends SET status = 'published' WHERE id = ?").run(trendId);
  }
}
