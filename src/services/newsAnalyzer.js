import Anthropic from '@anthropic-ai/sdk';

export class NewsAnalyzer {
  constructor(config) {
    this.config = config;
    this.anthropic = config.anthropic.apiKey
      ? new Anthropic({ apiKey: config.anthropic.apiKey })
      : null;
  }

  /**
   * Анализирует новости на достоверность и интересность
   * @param {Array} articles - массив новостей
   * @returns {Array} - отсортированные и проверенные новости
   */
  async analyzeArticles(articles) {
    console.log(`\n🔍 Анализ ${articles.length} новостей на достоверность и интересность...`);

    const analyzed = [];

    for (const article of articles) {
      try {
        const analysis = await this.analyzeArticle(article);

        if (analysis.isTrustworthy) {
          analyzed.push({
            ...article,
            trustScore: analysis.trustScore,
            interestScore: analysis.interestScore,
            totalScore: analysis.totalScore,
            analysisReason: analysis.reason
          });

          console.log(`   ✅ ${article.title.substring(0, 50)}...`);
          console.log(`      Достоверность: ${analysis.trustScore}/10 | Интересность: ${analysis.interestScore}/10`);
        } else {
          console.log(`   ❌ ОТКЛОНЕНО: ${article.title.substring(0, 50)}...`);
          console.log(`      Причина: ${analysis.reason}`);
        }
      } catch (error) {
        console.error(`   ⚠️ Ошибка анализа: ${article.title.substring(0, 40)}...`);
        // При ошибке добавляем со средним скором
        analyzed.push({
          ...article,
          trustScore: 5,
          interestScore: 5,
          totalScore: 5,
          analysisReason: 'Анализ недоступен'
        });
      }
    }

    // Сортируем по общему скору (достоверность + интересность)
    analyzed.sort((a, b) => b.totalScore - a.totalScore);

    console.log(`\n📊 Результат анализа: ${analyzed.length} из ${articles.length} новостей прошли проверку`);

    return analyzed;
  }

  /**
   * Анализирует одну новость
   */
  async analyzeArticle(article) {
    if (!this.anthropic) {
      // Fallback: базовая проверка без AI
      return this.basicAnalysis(article);
    }

    try {
      const prompt = this.createAnalysisPrompt(article);

      const response = await this.anthropic.messages.create({
        model: this.config.anthropic.model,
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      const result = response.content[0].text;
      return this.parseAnalysisResult(result);

    } catch (error) {
      console.error('Ошибка AI анализа:', error.message);
      return this.basicAnalysis(article);
    }
  }

  createAnalysisPrompt(article) {
    return `Проанализируй эту новость про AI/технологии на достоверность и интересность для бизнес-аудитории.

НОВОСТЬ:
Заголовок: ${article.title}
Описание: ${article.description}
Источник: ${article.source}
Дата: ${article.pubDate}

ЗАДАЧА: Оцени по шкале 1-10:
1. ДОСТОВЕРНОСТЬ (trustScore):
   - Проверь на признаки фейка, кликбейта, манипуляций
   - Оцени надежность источника
   - Проверь реалистичность фактов и цифр
   - Оцени 1-3 = явный фейк/кликбейт, 4-6 = сомнительно, 7-10 = достоверно

2. ИНТЕРЕСНОСТЬ (interestScore):
   - Насколько актуально и полезно для бизнеса
   - Есть ли конкретная практическая ценность
   - Насколько свежая и уникальная информация
   - Оцени 1-3 = скучно, 4-6 = средне, 7-10 = очень интересно

КРИТЕРИИ ОТКЛОНЕНИЯ (isTrustworthy = false):
- Явные признаки фейка или манипуляций
- Недостоверный источник
- Достоверность меньше 3 (будь менее строгим, принимай больше новостей)

Ответь ТОЛЬКО в формате JSON:
{
  "trustScore": 8,
  "interestScore": 7,
  "isTrustworthy": true,
  "reason": "Краткое объяснение оценки (1 предложение)"
}`;
  }

  parseAnalysisResult(text) {
    try {
      // Ищем JSON в ответе
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);

        return {
          trustScore: data.trustScore || 5,
          interestScore: data.interestScore || 5,
          totalScore: ((data.trustScore || 5) + (data.interestScore || 5)) / 2,
          isTrustworthy: data.isTrustworthy !== false && (data.trustScore || 5) >= 3,
          reason: data.reason || 'Анализ выполнен'
        };
      }
    } catch (error) {
      console.error('Ошибка парсинга анализа:', error.message);
    }

    return this.basicAnalysis();
  }

  /**
   * Базовый анализ без AI (fallback)
   */
  basicAnalysis(article) {
    let trustScore = 7; // По умолчанию доверяем источникам
    let interestScore = 6;

    if (article) {
      // Проверка на кликбейт по ключевым словам
      const clickbaitWords = ['шокирующ', 'невероят', 'сенсац', 'взорвал', 'такого еще не было'];
      const title = article.title.toLowerCase();

      if (clickbaitWords.some(word => title.includes(word))) {
        trustScore -= 2;
      }

      // Бонус за известные источники
      const trustedSources = ['TechCrunch', 'VentureBeat', 'MIT Technology Review'];
      if (trustedSources.some(source => article.source.includes(source))) {
        trustScore += 1;
      }

      // Проверка актуальности
      const daysSincePublished = (new Date() - new Date(article.pubDate)) / (1000 * 60 * 60 * 24);
      if (daysSincePublished <= 1) {
        interestScore += 1; // Свежие новости интереснее
      }
    }

    trustScore = Math.max(1, Math.min(10, trustScore));
    interestScore = Math.max(1, Math.min(10, interestScore));

    return {
      trustScore,
      interestScore,
      totalScore: (trustScore + interestScore) / 2,
      isTrustworthy: trustScore >= 4,
      reason: 'Базовая проверка (AI недоступен)'
    };
  }

  /**
   * Выбирает топ N самых интересных и достоверных новостей
   */
  selectTopArticles(analyzedArticles, count = 3) {
    console.log(`\n⭐ Выбираю топ-${count} лучших новостей...`);

    const top = analyzedArticles.slice(0, count);

    top.forEach((article, index) => {
      console.log(`   ${index + 1}. ${article.title.substring(0, 60)}...`);
      console.log(`      Общий балл: ${article.totalScore.toFixed(1)}/10`);
    });

    return top;
  }
}
