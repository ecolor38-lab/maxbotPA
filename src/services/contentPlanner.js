import fs from 'fs/promises';
import path from 'path';

export class ContentPlanner {
  constructor() {
    this.planFile = path.join(process.cwd(), 'content-plan.json');
    this.publishedFile = path.join(process.cwd(), 'published-posts.json');
  }

  async loadPlan() {
    try {
      const data = await fs.readFile(this.planFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      // Создаем новый план если файла нет
      return {
        queue: [],
        lastUpdated: new Date().toISOString(),
        settings: {
          postsPerDay: 3,
          minArticlesPerPost: 3,
          maxArticlesPerPost: 6
        }
      };
    }
  }

  async savePlan(plan) {
    await fs.writeFile(this.planFile, JSON.stringify(plan, null, 2), 'utf8');
  }

  async loadPublished() {
    try {
      const data = await fs.readFile(this.publishedFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return {
        posts: [],
        lastPublished: null
      };
    }
  }

  async savePublished(published) {
    await fs.writeFile(this.publishedFile, JSON.stringify(published, null, 2), 'utf8');
  }

  async addArticlesToPlan(articles) {
    const plan = await loadPlan();

    // Группируем статьи по категориям
    const byCategory = {
      arthritis: [],
      ai: [],
      general: []
    };

    articles.forEach(article => {
      const category = article.category || 'general';
      if (byCategory[category]) {
        byCategory[category].push(article);
      } else {
        byCategory.general.push(article);
      }
    });

    // Создаем посты из статей
    const posts = this.createPosts(articles, plan.settings);

    // Добавляем в очередь
    plan.queue.push(...posts);
    plan.lastUpdated = new Date().toISOString();

    await this.savePlan(plan);

    console.log(`✅ Добавлено ${posts.length} постов в контент-план`);
    console.log(`📊 Всего в очереди: ${plan.queue.length} постов`);

    return posts;
  }

  createPosts(articles, settings) {
    const posts = [];
    const { minArticlesPerPost, maxArticlesPerPost } = settings;

    // Группируем статьи для постов
    let currentBatch = [];

    for (const article of articles) {
      currentBatch.push(article);

      if (currentBatch.length >= maxArticlesPerPost) {
        posts.push({
          id: Date.now() + posts.length,
          articles: [...currentBatch],
          scheduledFor: null,
          status: 'pending',
          createdAt: new Date().toISOString()
        });
        currentBatch = [];
      }
    }

    // Добавляем остаток если есть минимум статей
    if (currentBatch.length >= minArticlesPerPost) {
      posts.push({
        id: Date.now() + posts.length,
        articles: currentBatch,
        scheduledFor: null,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
    }

    return posts;
  }

  async getNextPost() {
    const plan = await this.loadPlan();

    // Находим первый пост со статусом pending
    const nextPost = plan.queue.find(post => post.status === 'pending');

    if (!nextPost) {
      console.log('⚠️ В очереди нет постов для публикации');
      return null;
    }

    return nextPost;
  }

  async markAsPublished(postId, result) {
    const plan = await this.loadPlan();
    const published = await this.loadPublished();

    // Обновляем статус в плане
    const post = plan.queue.find(p => p.id === postId);
    if (post) {
      post.status = 'published';
      post.publishedAt = new Date().toISOString();
      post.telegramMessageId = result?.result?.message_id;
    }

    // Добавляем в историю
    published.posts.push({
      postId,
      publishedAt: new Date().toISOString(),
      messageId: result?.result?.message_id,
      articlesCount: post?.articles?.length
    });
    published.lastPublished = new Date().toISOString();

    await this.savePlan(plan);
    await this.savePublished(published);

    console.log(`✅ Пост ${postId} отмечен как опубликованный`);
  }

  async getPlanStats() {
    const plan = await this.loadPlan();
    const published = await this.loadPublished();

    const pending = plan.queue.filter(p => p.status === 'pending').length;
    const publishedCount = plan.queue.filter(p => p.status === 'published').length;

    return {
      totalInQueue: plan.queue.length,
      pending,
      published: publishedCount,
      totalPublished: published.posts.length,
      lastPublished: published.lastPublished,
      lastUpdated: plan.lastUpdated
    };
  }

  async cleanOldPosts(daysToKeep = 30) {
    const plan = await this.loadPlan();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const originalLength = plan.queue.length;

    // Удаляем опубликованные посты старше N дней
    plan.queue = plan.queue.filter(post => {
      if (post.status !== 'published') return true;

      const publishedAt = new Date(post.publishedAt);
      return publishedAt > cutoffDate;
    });

    const removed = originalLength - plan.queue.length;

    if (removed > 0) {
      await this.savePlan(plan);
      console.log(`🗑️ Удалено ${removed} старых постов из плана`);
    }

    return removed;
  }
}
