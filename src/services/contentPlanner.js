import fs from 'fs/promises';
import path from 'path';
import os from 'os';

export class ContentPlanner {
  constructor() {
    // Используем /tmp для Docker/read-only окружений
    const dataDir = this.getWritableDir();
    this.planFile = path.join(dataDir, 'content-plan.json');
    this.publishedFile = path.join(dataDir, 'published-posts.json');
    console.log(`📂 Используется директория для данных: ${dataDir}`);
  }

  getWritableDir() {
    // Приоритет директорий для разных окружений
    const possibleDirs = [
      process.cwd(), // Текущая директория (локально)
      '/data', // Docker volume (если смонтирован)
      '/tmp/ai-bot', // Временная директория (Docker/Railway/Render)
      path.join(os.tmpdir(), 'ai-bot') // Системная временная директория
    ];

    // Проверяем какая директория доступна для записи
    for (const dir of possibleDirs) {
      try {
        // Синхронная проверка при инициализации
        const testFile = path.join(dir, '.write-test');
        require('fs').writeFileSync(testFile, 'test');
        require('fs').unlinkSync(testFile);
        return dir;
      } catch (error) {
        // Директория недоступна, пробуем следующую
        continue;
      }
    }

    // Если ничего не подошло, используем /tmp (всегда доступна)
    console.warn('⚠️ Не найдена директория для записи, использую /tmp');
    return '/tmp';
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
          postsPerDay: 1, // 1 новость = 1 пост (публикация каждые 3 часа)
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
      if (error.code === 'EACCES' || error.code === 'EPERM' || error.code === 'EROFS') {
        console.error(`❌ Нет прав на запись в ${this.planFile}`);
        console.error('⚠️ Работаю в режиме без сохранения контент-плана (ephemeral mode)');
        // Не падаем, просто предупреждаем
        return;
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
      if (error.code === 'EACCES' || error.code === 'EPERM' || error.code === 'EROFS') {
        console.error(`❌ Нет прав на запись в ${this.publishedFile}`);
        console.error('⚠️ Работаю в режиме без сохранения истории публикаций (ephemeral mode)');
        // Не падаем, просто предупреждаем
        return;
      }
      throw error;
    }
  }

  async addArticlesToPlan(articles) {
    const plan = await this.loadPlan();
    const published = await this.loadPublished();

    // Получаем все URL которые уже были опубликованы
    const publishedUrls = new Set(
      published.posts
        .map((p) => p.articles?.map((a) => a.url))
        .flat()
        .filter(Boolean)
    );

    // Получаем URL из текущего плана
    const plannedUrls = new Set(plan.queue.flatMap((p) => p.articles.map((a) => a.url)));

    // Фильтруем дубликаты
    const uniqueArticles = articles.filter((article) => {
      const isDuplicate = publishedUrls.has(article.url) || plannedUrls.has(article.url);
      if (isDuplicate) {
        console.log(`   🔄 Дубликат пропущен: ${article.title.substring(0, 50)}...`);
      }
      return !isDuplicate;
    });

    if (uniqueArticles.length < articles.length) {
      console.log(`\n✅ Отфильтровано ${articles.length - uniqueArticles.length} дубликатов`);
      console.log(`📝 Новых уникальных новостей: ${uniqueArticles.length}`);
    }

    articles = uniqueArticles;

    // Группируем статьи по категориям
    const byCategory = {
      arthritis: [],
      ai: [],
      general: []
    };

    articles.forEach((article) => {
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

  createPosts(articles, _settings) {
    const posts = [];

    // Новая логика: 1 новость = 1 пост
    console.log(
      `📋 Создаю ${articles.length} постов из ${articles.length} новостей (1 новость = 1 пост)`
    );

    articles.forEach((article, index) => {
      posts.push({
        id: Date.now() + index,
        articles: [article], // Один пост содержит одну новость
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
    const nextPost = plan.queue.find((post) => post.status === 'pending');

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
    const post = plan.queue.find((p) => p.id === postId);
    if (post) {
      post.status = 'published';
      post.publishedAt = new Date().toISOString();
      post.telegramMessageId = result?.result?.message_id;
    }

    // Добавляем в историю с URL статей для проверки дубликатов
    published.posts.push({
      postId,
      publishedAt: new Date().toISOString(),
      messageId: result?.result?.message_id,
      articlesCount: post?.articles?.length,
      articles: post?.articles || [] // Сохраняем статьи для проверки дубликатов
    });
    published.lastPublished = new Date().toISOString();

    await this.savePlan(plan);
    await this.savePublished(published);

    console.log(`✅ Пост ${postId} отмечен как опубликованный`);
  }

  async getPlanStats() {
    const plan = await this.loadPlan();
    const published = await this.loadPublished();

    const pending = plan.queue.filter((p) => p.status === 'pending').length;
    const publishedCount = plan.queue.filter((p) => p.status === 'published').length;

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
    plan.queue = plan.queue.filter((post) => {
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
