import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

export class FactChecker {
  constructor(config) {
    this.config = config;
    this.anthropic = config.anthropic?.apiKey
      ? new Anthropic({ apiKey: config.anthropic.apiKey })
      : null;
    this.openai = config.openai?.apiKey ? new OpenAI({ apiKey: config.openai.apiKey }) : null;
  }

  async checkArticles(articles) {
    console.log(`\n🔍 Проверка ${articles.length} статей на достоверность...`);

    const checkedArticles = [];

    for (const article of articles) {
      // Быстрая проверка по источнику
      const credibility = this.getQuickCredibility(article);

      if (credibility === 'high') {
        // Официальные источники - доверяем
        article.verified = true;
        article.credibilityScore = 95;
        checkedArticles.push(article);
        console.log(`   ✅ ${article.source}: официальный источник`);
        continue;
      }

      if (credibility === 'spam') {
        console.log(`   🚫 ${article.source}: спам/реклама, пропускаем`);
        continue;
      }

      // Для соцсетей - проверка через AI
      if (article.type === 'social' && (this.anthropic || this.openai)) {
        try {
          // eslint-disable-next-line no-await-in-loop
          const result = await this.verifyWithAI(article);
          if (result.isReliable) {
            article.verified = true;
            article.credibilityScore = result.score;
            article.verificationNote = result.note;
            checkedArticles.push(article);
            console.log(`   ✅ ${article.source}: проверено AI (${result.score}%)`);
          } else {
            console.log(`   ⚠️ ${article.source}: сомнительно - "${result.note}"`);
          }
        } catch (error) {
          // При ошибке AI - пропускаем соцсети
          console.log(`   ⏭️ ${article.source}: не удалось проверить`);
        }
      } else {
        // Новостные издания - добавляем с пометкой
        article.verified = true;
        article.credibilityScore = 75;
        checkedArticles.push(article);
        console.log(`   ✓ ${article.source}: новостное издание`);
      }
    }

    console.log(`\n📊 Прошли проверку: ${checkedArticles.length} из ${articles.length}`);
    return checkedArticles;
  }

  getQuickCredibility(article) {
    const text = `${article.title || ''} ${article.snippet || ''}`.toLowerCase();

    // Официальные блоги компаний - максимальное доверие
    const officialSources = ['openai', 'anthropic', 'google ai', 'meta ai', 'microsoft'];
    if (officialSources.some((s) => article.source.toLowerCase().includes(s))) {
      return 'high';
    }

    // Спам/кликбейт фильтры
    const spamIndicators = [
      'заработай',
      'earn money',
      'get rich',
      '100% бесплатно',
      'click here',
      'limited time',
      'купить подписчиков',
      'casino',
      'crypto airdrop',
      'make $',
      'passive income'
    ];

    if (spamIndicators.some((spam) => text.includes(spam))) {
      return 'spam';
    }

    // Кликбейт заголовки
    const clickbaitPatterns = [
      /you won't believe/i,
      /shocking/i,
      /doctors hate/i,
      /one weird trick/i,
      /ШОК!/i,
      /СЕНСАЦИЯ/i
    ];

    if (clickbaitPatterns.some((pattern) => pattern.test(text))) {
      return 'spam';
    }

    return article.type === 'news' ? 'medium' : 'low';
  }

  async verifyWithAI(article) {
    const prompt = `Оцени достоверность этой новости об AI/технологиях:

Заголовок: ${article.title}
Источник: ${article.source}
Содержание: ${article.snippet}

Ответь СТРОГО в формате JSON:
{
  "isReliable": true/false,
  "score": число от 0 до 100,
  "note": "краткое объяснение на русском (макс 50 символов)"
}

Критерии:
- isReliable=false если: явный фейк, кликбейт, реклама, непроверяемые утверждения
- isReliable=true если: есть конкретные факты, известный источник, логичная информация
- score: 90+ = очень надёжно, 70-89 = надёжно, 50-69 = сомнительно, <50 = ненадёжно`;

    try {
      const response = this.anthropic
        ? (await this.anthropic.messages.create({
            model: this.config?.anthropic?.model || 'claude-sonnet-4-20250514',
            max_tokens: 200,
            messages: [{ role: 'user', content: prompt }]
          })).content[0].text
        : (await this.openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 200,
            temperature: 0.3
          })).choices[0].message.content;

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      return jsonMatch
        ? JSON.parse(jsonMatch[0])
        : { isReliable: true, score: 70, note: 'Не удалось распарсить' };
    } catch (error) {
      console.log(`      AI error: ${error.message}`);
      return { isReliable: false, score: 0, note: 'Ошибка проверки' };
    }
  }
}
