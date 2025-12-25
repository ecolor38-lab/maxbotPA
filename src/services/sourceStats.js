import fs from 'fs/promises';
import path from 'path';

export class SourceStats {
  constructor() {
    this.statsFile = path.join(process.cwd(), 'source-stats.json');
    this.stats = null;
  }

  async load() {
    try {
      const data = await fs.readFile(this.statsFile, 'utf8');
      this.stats = JSON.parse(data);
      console.log('📊 Загружена статистика источников');
    } catch (error) {
      // Файл не существует - создаем новую статистику
      this.stats = {
        sources: {},
        lastUpdate: new Date().toISOString()
      };
      console.log('📊 Создана новая статистика источников');
    }
  }

  async save() {
    try {
      this.stats.lastUpdate = new Date().toISOString();
      await fs.writeFile(this.statsFile, JSON.stringify(this.stats, null, 2), 'utf8');
      console.log('💾 Статистика источников сохранена');
    } catch (error) {
      console.error('❌ Ошибка сохранения статистики:', error.message);
    }
  }

  // Получить статистику источника
  getSourceStats(sourceName) {
    if (!this.stats.sources[sourceName]) {
      this.stats.sources[sourceName] = {
        name: sourceName,
        totalAttempts: 0,
        successfulAttempts: 0,
        articlesFound: 0,
        lastSuccess: null,
        lastAttempt: null,
        consecutiveFailures: 0,
        enabled: true
      };
    }
    return this.stats.sources[sourceName];
  }

  // Записать успешный результат
  recordSuccess(sourceName, articlesCount) {
    const stats = this.getSourceStats(sourceName);
    stats.totalAttempts++;
    stats.successfulAttempts++;
    stats.articlesFound += articlesCount;
    stats.lastSuccess = new Date().toISOString();
    stats.lastAttempt = new Date().toISOString();
    stats.consecutiveFailures = 0;
    
    // Если источник был отключен, но дал результат - включаем обратно
    if (!stats.enabled) {
      stats.enabled = true;
      console.log(`   ✅ Источник "${sourceName}" снова включен`);
    }
  }

  // Записать неудачу
  recordFailure(sourceName) {
    const stats = this.getSourceStats(sourceName);
    stats.totalAttempts++;
    stats.lastAttempt = new Date().toISOString();
    stats.consecutiveFailures++;
    
    // Если 5 неудач подряд - отключаем источник
    if (stats.consecutiveFailures >= 5) {
      stats.enabled = false;
      console.log(`   ❌ Источник "${sourceName}" отключен (${stats.consecutiveFailures} неудач подряд)`);
    }
  }

  // Проверить, активен ли источник
  isEnabled(sourceName) {
    const stats = this.getSourceStats(sourceName);
    return stats.enabled;
  }

  // Получить успешность источника (0-1)
  getSuccessRate(sourceName) {
    const stats = this.getSourceStats(sourceName);
    if (stats.totalAttempts === 0) return 0.5; // Средняя оценка для новых
    return stats.successfulAttempts / stats.totalAttempts;
  }

  // Отсортировать источники по эффективности
  sortSourcesByEffectiveness(sources) {
    return sources.sort((a, b) => {
      // Сначала активные источники
      const aEnabled = this.isEnabled(a.name) ? 1 : 0;
      const bEnabled = this.isEnabled(b.name) ? 1 : 0;
      if (aEnabled !== bEnabled) return bEnabled - aEnabled;

      // Затем по успешности
      const aRate = this.getSuccessRate(a.name);
      const bRate = this.getSuccessRate(b.name);
      if (Math.abs(aRate - bRate) > 0.1) return bRate - aRate;

      // Затем по приоритету
      return b.priority - a.priority;
    });
  }

  // Получить статистику для отчета
  getReport() {
    const sources = Object.values(this.stats.sources);
    
    const active = sources.filter(s => s.enabled).length;
    const disabled = sources.filter(s => !s.enabled).length;
    
    const topSources = sources
      .filter(s => s.enabled && s.totalAttempts > 0)
      .sort((a, b) => {
        const aRate = a.successfulAttempts / a.totalAttempts;
        const bRate = b.successfulAttempts / b.totalAttempts;
        return bRate - aRate;
      })
      .slice(0, 5);

    return {
      totalSources: sources.length,
      activeSources: active,
      disabledSources: disabled,
      topSources: topSources.map(s => ({
        name: s.name,
        successRate: Math.round((s.successfulAttempts / s.totalAttempts) * 100),
        articlesFound: s.articlesFound,
        attempts: s.totalAttempts
      }))
    };
  }

  // Показать краткую статистику
  printBrief() {
    const report = this.getReport();
    console.log(`\n📊 Статистика источников:`);
    console.log(`   Активных: ${report.activeSources} | Отключенных: ${report.disabledSources}`);
    
    if (report.topSources.length > 0) {
      console.log(`\n🏆 Топ-5 источников:`);
      report.topSources.forEach((s, i) => {
        console.log(`   ${i + 1}. ${s.name} - ${s.successRate}% успеха (${s.articlesFound} статей)`);
      });
    }
    console.log('');
  }
}

