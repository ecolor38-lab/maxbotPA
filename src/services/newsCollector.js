import axios from 'axios';
import * as cheerio from 'cheerio';

export class NewsCollector {
  constructor(config) {
    this.config = config;
    this.sources = [
      {
        name: 'PubMed',
        url: 'https://pubmed.ncbi.nlm.nih.gov',
        searchUrl: 'https://pubmed.ncbi.nlm.nih.gov/?term='
      },
      {
        name: 'ScienceDaily',
        url: 'https://www.sciencedaily.com',
        searchUrl: 'https://www.sciencedaily.com/search/?keyword='
      }
    ];
  }

  async collectNews() {
    console.log('🔍 Начинаю сбор информации о псориатическом артрите...');

    const allArticles = [];

    for (const topic of this.config.topics) {
      try {
        const articles = await this.searchTopic(topic);
        allArticles.push(...articles);
      } catch (error) {
        console.error(`Ошибка при поиске по теме "${topic}":`, error.message);
      }
    }

    const uniqueArticles = this.removeDuplicates(allArticles);
    const recentArticles = this.filterRecentArticles(uniqueArticles);

    console.log(`✅ Найдено ${recentArticles.length} уникальных статей`);

    return recentArticles.slice(0, this.config.search.maxNewsItems);
  }

  async searchTopic(topic) {
    const articles = [];

    const searchQueries = [
      `${topic} новые исследования 2025`,
      `${topic} breakthrough 2025`,
      `${topic} AI machine learning`,
      `${topic} new drugs 2025`
    ];

    for (const query of searchQueries) {
      try {
        const results = await this.searchGoogle(query);
        articles.push(...results);
      } catch (error) {
        console.error(`Ошибка поиска "${query}":`, error.message);
      }
    }

    return articles;
  }

  async searchGoogle(query) {
    const articles = [];

    try {
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=nws`;
      const response = await axios.get(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 10000
      });

      const $ = cheerio.load(response.data);

      $('.g').each((i, element) => {
        const title = $(element).find('h3').text();
        const link = $(element).find('a').attr('href');
        const snippet = $(element).find('.VwiC3b').text();

        if (title && link) {
          articles.push({
            title: title.trim(),
            url: link,
            snippet: snippet ? snippet.trim() : '',
            source: 'Google News',
            date: new Date().toISOString()
          });
        }
      });
    } catch (error) {
      console.error('Ошибка при поиске в Google:', error.message);
    }

    return articles;
  }

  removeDuplicates(articles) {
    const seen = new Set();
    return articles.filter(article => {
      const key = article.title.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  filterRecentArticles(articles) {
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - this.config.search.daysBack);

    return articles.filter(article => {
      const articleDate = new Date(article.date);
      return articleDate >= daysAgo;
    });
  }

  async fetchArticleContent(url) {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 15000
      });

      const $ = cheerio.load(response.data);

      $('script, style, nav, footer, header, aside').remove();

      const content = $('article, .article-content, .post-content, main, .content')
        .first()
        .text()
        .trim();

      return content || $('body').text().trim().slice(0, 2000);
    } catch (error) {
      console.error(`Ошибка загрузки контента ${url}:`, error.message);
      return '';
    }
  }
}
