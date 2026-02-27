import { getEngagementByPostType, getRecentPosts } from '../db/database.js';

const BASE_WEIGHTS = {
  news_flash: 40,
  analysis: 30,
  digest: 15,
  tip: 15,
  prediction: 10,
  hot_take: 10,
  series: 5,
  sponsored: 0
};

const MIN_DATA_DAYS = 14;
const MIN_POSTS_FOR_OPTIMIZATION = 20;
const CACHE_TTL = 24 * 60 * 60 * 1000;

let cachedWeights = null;
let lastOptimized = 0;

export function getOptimizedWeights() {
  // Используем кеш если есть
  if (cachedWeights && Date.now() - lastOptimized < CACHE_TTL) {
    return cachedWeights;
  }

  try {
    const posts = getRecentPosts(MIN_DATA_DAYS);

    if (posts.length < MIN_POSTS_FOR_OPTIMIZATION) {
      console.log(`📊 Optimizer: недостаточно данных (${posts.length}/${MIN_POSTS_FOR_OPTIMIZATION} постов)`);
      return BASE_WEIGHTS;
    }

    const engagement = getEngagementByPostType(30);

    if (!engagement.length) {
      return BASE_WEIGHTS;
    }

    const totalAvg =
      engagement.reduce((sum, e) => sum + e.avg_clicks_per_post, 0) / engagement.length || 1;

    const optimized = { ...BASE_WEIGHTS };

    for (const entry of engagement) {
      const type = entry.post_type;
      if (!(type in BASE_WEIGHTS) || type === 'sponsored') continue;

      const multiplier = totalAvg > 0 ? (entry.avg_clicks_per_post - totalAvg) / totalAvg : 0;
      const clamped = Math.max(-0.5, Math.min(1.0, multiplier));
      optimized[type] = Math.max(5, Math.round(BASE_WEIGHTS[type] * (1 + clamped)));
    }

    cachedWeights = optimized;
    lastOptimized = Date.now();

    console.log('📊 Optimizer: веса обновлены:', optimized);
    return optimized;
  } catch (error) {
    console.warn('⚠️ Optimizer ошибка:', error.message);
    return BASE_WEIGHTS;
  }
}

export function getWeightsSummary() {
  const weights = getOptimizedWeights();
  const totalWeight = Object.values(weights).reduce((s, w) => s + w, 0);
  const summary = {};

  for (const [type, weight] of Object.entries(weights)) {
    if (weight > 0) {
      summary[type] = {
        weight,
        percent: Math.round((weight / totalWeight) * 100),
        base: BASE_WEIGHTS[type]
      };
    }
  }

  return summary;
}

export function resetWeightsCache() {
  cachedWeights = null;
  lastOptimized = 0;
}
