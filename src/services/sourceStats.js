export class SourceStats {
  constructor() {
    this.stats = new Map();
  }

  recordSuccess(sourceName, articlesCount) {
    const stat = this.stats.get(sourceName) || { success: 0, fail: 0 };
    stat.success++;
    stat.articles = (stat.articles || 0) + articlesCount;
    this.stats.set(sourceName, stat);
  }

  recordFailure(sourceName) {
    const stat = this.stats.get(sourceName) || { success: 0, fail: 0 };
    stat.fail++;
    this.stats.set(sourceName, stat);
  }

  getSuccessRate(sourceName) {
    const stat = this.stats.get(sourceName);
    if (!stat) return 0.5;
    const total = stat.success + stat.fail;
    return total > 0 ? stat.success / total : 0.5;
  }
}
