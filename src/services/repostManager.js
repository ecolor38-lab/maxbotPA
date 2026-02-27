import { getTopPosts } from '../db/database.js';

export class RepostManager {
  constructor(publisher) {
    this.publisher = publisher;
  }

  async publishWeeklyBest() {
    const topPosts = getTopPosts(7, 3);

    if (topPosts.length === 0) {
      console.log('⚠️ RepostManager: нет данных для "Лучшее за неделю"');
      return null;
    }

    const items = topPosts
      .map((post, i) => {
        const emoji = ['🥇', '🥈', '🥉'][i] || `${i + 1}.`;
        const preview = post.text?.substring(0, 120)?.replace(/\n/g, ' ') || 'Без текста';
        const clicks = post.click_count || 0;
        return `${emoji} ${preview}... (${clicks} реакций)`;
      })
      .join('\n\n');

    const text = `🏆 **Топ недели: лучшие посты Нейро.Новостей**

Что зашло вам больше всего за эту неделю:

${items}

Спасибо за ваши реакции — они помогают делать канал лучше!`;

    try {
      const result = await this.publisher.publish(text, '', null, [], 'digest');
      console.log('✅ "Лучшее за неделю" опубликовано');
      return result;
    } catch (error) {
      console.error('❌ Ошибка публикации "Лучшее за неделю":', error.message);
      return null;
    }
  }
}
