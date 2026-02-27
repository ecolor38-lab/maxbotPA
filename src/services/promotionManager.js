import { getDb, getMetricsHistory } from '../db/database.js';

const DEFAULT_BUDGET = {
  total: 20000,
  small_channels: 8000,
  medium_channels: 6000,
  dalle: 3000,
  claude_api: 2000,
  reserve: 1000
};

export class PromotionManager {
  addPromotion({ channelName, channelUrl, channelSubscribers, channelCategory, cost, placementDate, notes }) {
    const db = getDb();
    const metrics = getMetricsHistory(1);
    const subscribersBefore = metrics.length > 0 ? metrics[metrics.length - 1].participants_count : null;

    const result = db
      .prepare(
        `INSERT INTO promotions (channel_name, channel_url, channel_subscribers, channel_category, cost, placement_date, subscribers_before, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        channelName,
        channelUrl || null,
        channelSubscribers || null,
        channelCategory || null,
        cost,
        placementDate,
        subscribersBefore,
        notes || null
      );

    return result.lastInsertRowid;
  }

  updateResults(promotionId) {
    const db = getDb();
    const promo = db.prepare('SELECT * FROM promotions WHERE id = ?').get(promotionId);
    if (!promo) return null;

    const metrics = getMetricsHistory(1);
    const subscribersAfter = metrics.length > 0 ? metrics[metrics.length - 1].participants_count : null;

    if (subscribersAfter && promo.subscribers_before) {
      const gained = subscribersAfter - promo.subscribers_before;
      const costPerSub = gained > 0 ? Math.round((promo.cost / gained) * 100) / 100 : 0;
      const roi = gained > 0 ? Math.round(((gained * 10 - promo.cost) / promo.cost) * 100) / 100 : -1;

      db.prepare(
        `UPDATE promotions SET subscribers_after = ?, subscribers_gained = ?, roi = ?, status = 'completed'
         WHERE id = ?`
      ).run(subscribersAfter, gained, roi, promotionId);

      return { gained, costPerSub, roi, subscribersAfter };
    }

    return null;
  }

  listPromotions(status = null) {
    const db = getDb();
    if (status) {
      return db.prepare('SELECT * FROM promotions WHERE status = ? ORDER BY placement_date DESC').all(status);
    }
    return db.prepare('SELECT * FROM promotions ORDER BY placement_date DESC').all();
  }

  getROISummary() {
    const db = getDb();

    const completed = db.prepare("SELECT * FROM promotions WHERE status = 'completed'").all();
    if (completed.length === 0) {
      return { message: 'Нет завершённых размещений', recommendations: this.getDefaultRecommendations() };
    }

    const totalSpent = completed.reduce((sum, p) => sum + p.cost, 0);
    const totalGained = completed.reduce((sum, p) => sum + (p.subscribers_gained || 0), 0);
    const avgCostPerSub = totalGained > 0 ? Math.round((totalSpent / totalGained) * 100) / 100 : 0;
    const avgROI = completed.reduce((sum, p) => sum + (p.roi || 0), 0) / completed.length;

    const byChannel = {};
    for (const p of completed) {
      const cat = p.channel_category || 'other';
      if (!byChannel[cat]) byChannel[cat] = { spent: 0, gained: 0, count: 0 };
      byChannel[cat].spent += p.cost;
      byChannel[cat].gained += p.subscribers_gained || 0;
      byChannel[cat].count++;
    }

    const categoryStats = Object.entries(byChannel)
      .map(([cat, data]) => ({
        category: cat,
        ...data,
        costPerSub: data.gained > 0 ? Math.round((data.spent / data.gained) * 100) / 100 : Infinity
      }))
      .sort((a, b) => a.costPerSub - b.costPerSub);

    return {
      total_spent: totalSpent,
      total_gained: totalGained,
      avg_cost_per_sub: avgCostPerSub,
      avg_roi: Math.round(avgROI * 100) / 100,
      placements: completed.length,
      by_category: categoryStats,
      recommendations: this.generateRecommendations(categoryStats, avgCostPerSub)
    };
  }

  generateRecommendations(categoryStats, avgCostPerSub) {
    const recommendations = [];

    const best = categoryStats[0];
    if (best?.costPerSub < Infinity) {
      recommendations.push(`Лучшая категория: ${best.category} (${best.costPerSub}₽/подписчик). Увеличить бюджет.`);
    }

    const worst = categoryStats.length > 1 ? categoryStats[categoryStats.length - 1] : null;
    if (worst?.costPerSub > avgCostPerSub * 2) {
      recommendations.push(`Сократить: ${worst.category} (${worst.costPerSub}₽/подписчик — дорого).`);
    }

    if (avgCostPerSub > 0 && avgCostPerSub <= 20) {
      recommendations.push('Отличный CPA! Можно масштабировать бюджет.');
    } else if (avgCostPerSub > 50) {
      recommendations.push('CPA высокий. Попробуйте более мелкие каналы или другие категории.');
    }

    return recommendations;
  }

  getDefaultRecommendations() {
    return [
      `Бюджет по умолчанию: ${DEFAULT_BUDGET.total}₽/мес`,
      `Мелкие каналы (500-2К): ${DEFAULT_BUDGET.small_channels}₽ (4-8 размещений)`,
      `Средние каналы (2К-10К): ${DEFAULT_BUDGET.medium_channels}₽ (2-3 размещения)`,
      'Начните с 2-3 тестовых размещений в разных категориях'
    ];
  }

  getBudgetStatus() {
    const db = getDb();
    const thisMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

    const spent = db
      .prepare("SELECT COALESCE(SUM(cost), 0) as total FROM promotions WHERE placement_date LIKE ? || '%'")
      .get(thisMonth);

    return {
      budget: DEFAULT_BUDGET,
      spent_this_month: spent.total,
      remaining: DEFAULT_BUDGET.total - spent.total,
      percent_used: Math.round((spent.total / DEFAULT_BUDGET.total) * 100)
    };
  }
}
