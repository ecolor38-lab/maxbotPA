import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config/config.js';
import {
  getRecentPosts,
  getEngagementByPostType,
  getEngagementByHour,
  getTopPosts,
  getGrowthData,
  getTopicEngagement,
  getClickStats,
  getLatestMetrics,
  getMetricsHistory,
  saveWeeklyReport
} from '../db/database.js';

const TOPIC_KEYWORDS = {
  chatgpt: ['chatgpt', 'chat gpt', 'чатгпт'],
  openai: ['openai', 'open ai', 'опенай'],
  google: ['google', 'гугл', 'gemini', 'джемини', 'bard'],
  anthropic: ['anthropic', 'claude', 'клод'],
  yandex: ['яндекс', 'yandex', 'yandexgpt', 'алиса'],
  sber: ['сбер', 'sber', 'gigachat', 'гигачат', 'kandinsky'],
  apple: ['apple', 'эпл', 'siri', 'сири'],
  meta: ['meta', 'llama', 'лама', 'facebook'],
  microsoft: ['microsoft', 'copilot', 'копилот', 'bing'],
  midjourney: ['midjourney', 'миджорни'],
  stable_diffusion: ['stable diffusion', 'stability ai'],
  robotics: ['робот', 'robot', 'беспилотник', 'автопилот'],
  medicine: ['медицин', 'medicine', 'health', 'здоровь', 'диагност'],
  education: ['образовани', 'education', 'обучени', 'edtech'],
  security: ['безопасност', 'security', 'кибер', 'cyber', 'хакер'],
  regulation: ['регулирован', 'regulation', 'закон', 'law', 'запрет', 'ban'],
  startup: ['стартап', 'startup', 'инвестиц', 'invest', 'funding'],
  image_gen: ['генерац', 'картин', 'изображени', 'image generat', 'dall-e', 'dalle'],
  code: ['программирован', 'coding', 'код', 'разработк', 'developer'],
  agents: ['агент', 'agent', 'автоном', 'autonom']
};

export function extractTopics(text) {
  if (!text) return [];
  const lower = text.toLowerCase();
  const topics = [];

  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      topics.push(topic);
    }
  }

  return topics;
}

export function getAnalyticsOverview(days = 7) {
  const posts = getRecentPosts(days);
  const metrics = getLatestMetrics();
  const clickStats = getClickStats(days);

  const totalClicks = clickStats.reduce((sum, s) => sum + s.count, 0);
  const POSITIVE_REACTIONS = ['react:interesting', 'react:agree', 'react:useful', 'react:more', 'react:will_happen', 'react:interested'];
  const positiveClicks = clickStats
    .filter((s) => s.button_key && POSITIVE_REACTIONS.includes(s.button_key))
    .reduce((sum, s) => sum + s.count, 0);

  return {
    period_days: days,
    total_posts: posts.length,
    total_clicks: totalClicks,
    positive_clicks: positiveClicks,
    avg_clicks_per_post: posts.length > 0 ? Math.round((totalClicks / posts.length) * 100) / 100 : 0,
    subscribers: metrics?.participants_count || null,
    post_types: getEngagementByPostType(days),
    top_posts: getTopPosts(days, 5)
  };
}

export function getAnalyticsByType(days = 30) {
  return getEngagementByPostType(days);
}

export function getAnalyticsByTime(days = 30) {
  return getEngagementByHour(days);
}

export function getAnalyticsTopics(days = 30) {
  return getTopicEngagement(days);
}

export function getAnalyticsGrowth(days = 30) {
  const growth = getGrowthData(days);
  const metrics = getMetricsHistory(days);

  let netGrowth = 0;
  if (metrics.length >= 2) {
    netGrowth = metrics[metrics.length - 1].participants_count - metrics[0].participants_count;
  }

  return {
    period_days: days,
    data_points: growth,
    net_growth: netGrowth,
    current_subscribers: metrics.length > 0 ? metrics[metrics.length - 1].participants_count : null
  };
}

export async function generateWeeklyReport() {
  const overview = getAnalyticsOverview(7);
  const byType = getAnalyticsByType(7);
  const byTime = getAnalyticsByTime(7);
  const topics = getAnalyticsTopics(7);
  const growth = getAnalyticsGrowth(7);

  const reportData = { overview, byType, byTime, topics, growth };
  const anthropic = config.anthropic?.apiKey ? new Anthropic({ apiKey: config.anthropic.apiKey }) : null;

  if (!anthropic) {
    console.log('⚠️ ANTHROPIC_API_KEY не установлен — отчёт без AI');
    return formatBasicReport(reportData);
  }

  const prompt = `Проанализируй данные канала "Нейро.Новости" за неделю и напиши краткий аналитический отчёт на русском языке.

Данные:
- Постов за неделю: ${overview.total_posts}
- Всего кликов: ${overview.total_clicks}
- Позитивных кликов: ${overview.positive_clicks}
- Среднее кликов на пост: ${overview.avg_clicks_per_post}
- Подписчиков: ${overview.subscribers || 'нет данных'}
- Рост: ${growth.net_growth}

По типам постов:
${byType.map((t) => `  ${t.post_type}: ${t.post_count} постов, ${t.total_clicks} кликов (avg: ${t.avg_clicks_per_post})`).join('\n')}

Популярные темы:
${topics.slice(0, 10).map((t) => `  ${t.topic}: ${t.posts} постов, avg ${t.avgClicks} кликов`).join('\n')}

Лучшее время:
${byTime.filter((t) => t.post_count > 0).map((t) => `  ${t.hour}:00 — ${t.avg_clicks} avg кликов (${t.post_count} постов)`).join('\n')}

Топ постов:
${overview.top_posts.slice(0, 3).map((p, i) => `  ${i + 1}. [${p.post_type}] ${p.text?.substring(0, 80)}... (${p.click_count} кликов)`).join('\n')}

ФОРМАТ отчёта:
📊 **Еженедельный отчёт Нейро.Новости**

1. Краткое резюме (2-3 предложения)
2. Что зашло лучше всего (тип поста, темы)
3. Рекомендации на следующую неделю (2-3 пункта)
4. Рост аудитории

Пиши кратко, по делу, с конкретными цифрами. 300-500 символов.`;

  try {
    const response = await anthropic.messages.create({
      model: config.anthropic.model || 'claude-sonnet-4-20250514',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5
    });

    const reportText = response.content[0].text;

    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7);

    saveWeeklyReport({
      weekStart: weekStart.toISOString().split('T')[0],
      weekEnd: now.toISOString().split('T')[0],
      reportText,
      dataJson: reportData
    });

    return reportText;
  } catch (error) {
    console.error('❌ Ошибка генерации отчёта:', error.message);
    return formatBasicReport(reportData);
  }
}

function formatBasicReport(data) {
  const { overview, growth } = data;
  return `📊 **Еженедельный отчёт Нейро.Новости**

Постов: ${overview.total_posts} | Кликов: ${overview.total_clicks} | Avg: ${overview.avg_clicks_per_post}
Подписчиков: ${overview.subscribers || '?'} (${growth.net_growth >= 0 ? '+' : ''}${growth.net_growth})`;
}
