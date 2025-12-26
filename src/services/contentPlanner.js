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
          postsPerDay: 1,  // 1 новость = 1 пост (публикация каждые 3 часа)
          minArticlesPerPost: 1,
          maxArticlesPerPost: 1
        }
      };
    }
  }

  async savePlan(plan) {
    try {
      // Убеждаемся, что директория существует
      const dir = path.dirname(this.planFile);
      try {
        await fs.access(dir);
      } catch (error) {
        // Директория не существует, пытаемся создать
        await fs.mkdir(dir, { recursive: true });
      }

      await fs.writeFile(this.planFile, JSON.stringify(plan, null, 2), 'utf8');
    } catch (error) {
      if (error.code === 'EACCES' || error.code === 'EPERM') {
        const errorMsg = `Нет прав доступа для записи файла ${this.planFile}. ` +
          `Проверьте права доступа файла или настройки Docker volume (если используется контейнер). ` +
          `В Docker рекомендуется монтировать директорию, а не файл напрямую.`;
        throw new Error(errorMsg);
      }
      throw error;
    }
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
    try {
      // Убеждаемся, что директория существует
      const dir = path.dirname(this.publishedFile);
      try {
        await fs.access(dir);
      } catch (error) {
        // Директория не существует, пытаемся создать
        await fs.mkdir(dir, { recursive: true });
      }

      await fs.writeFile(this.publishedFile, JSON.stringify(published, null, 2), 'utf8');
    } catch (error) {
      if (error.code === 'EACCES' || error.code === 'EPERM') {
        const errorMsg = `Нет прав доступа для записи файла ${this.publishedFile}. ` +
          `Проверьте права доступа файла или настройки Docker volume (если используется контейнер).`;
        throw new Error(errorMsg);
      }
      throw error;
    }
  }

  async addArticlesToPlan(articles) {
    const plan = await this.loadPlan();

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

    // Новая логика: 1 новость = 1 пост
    console.log(`📋 Создаю ${articles.length} постов из ${articles.length} новостей (1 новость = 1 пост)`);

    articles.forEach((article, index) => {
      posts.push({
        id: Date.now() + index,
        articles: [article],  // Один пост содержит одну новость
        scheduledFor: null,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      console.log(`   Пост ${index + 1}: "${article.title.substring(0, 60)}..."`);
    });

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
