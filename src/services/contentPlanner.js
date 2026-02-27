import fs from 'fs/promises';
import { existsSync, writeFileSync, unlinkSync } from 'fs';
import path from 'path';

export class ContentPlanner {
  constructor() {
    this.dataDir = this.findWritableDir();
    this.planFile = path.join(this.dataDir, 'content-plan.json');
    this.publishedFile = path.join(this.dataDir, 'published-urls.json');
    console.log(`📂 Данные: ${this.dataDir}`);
  }

  findWritableDir() {
    const dirs = [process.cwd(), '/tmp/ai-bot'];
    for (const dir of dirs) {
      try {
        const testFile = path.join(dir, '.test');
        writeFileSync(testFile, 'test');
        unlinkSync(testFile);
        return dir;
      } catch {
        continue;
      }
    }
    return '/tmp';
  }

  async loadPlan() {
    try {
      const data = await fs.readFile(this.planFile, 'utf8');
      return JSON.parse(data);
    } catch {
      return { queue: [], lastUpdated: new Date().toISOString() };
    }
  }

  async saveJSON(filePath, data) {
    try {
      const dir = path.dirname(filePath);
      if (!existsSync(dir)) {
        await fs.mkdir(dir, { recursive: true });
      }
      await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.warn(`⚠️ Не удалось сохранить ${path.basename(filePath)}:`, error.message);
    }
  }

  async savePlan(plan) {
    await this.saveJSON(this.planFile, plan);
  }

  async addArticlesToPlan(articles) {
    const plan = await this.loadPlan();
    const existingUrls = new Set(plan.queue.flatMap((p) => p.articles.map((a) => a.url)));

    const newArticles = articles.filter((a) => !existingUrls.has(a.url));
    console.log(`📝 Новых статей: ${newArticles.length} из ${articles.length}`);

    const posts = newArticles.map((article, i) => ({
      id: Date.now() + i,
      articles: [article],
      status: 'pending',
      createdAt: new Date().toISOString()
    }));

    plan.queue.push(...posts);
    plan.lastUpdated = new Date().toISOString();
    await this.savePlan(plan);

    return posts;
  }

  async markAsPublished(postId, result) {
    const plan = await this.loadPlan();
    const post = plan.queue.find((p) => p.id === postId);
    if (post) {
      post.status = 'published';
      post.publishedAt = new Date().toISOString();
      post.messageId = result?.message?.body?.mid;
      await this.savePlan(plan);
    }
  }

  async getPlanStats() {
    const plan = await this.loadPlan();
    return {
      pending: plan.queue.filter((p) => p.status === 'pending').length,
      published: plan.queue.filter((p) => p.status === 'published').length,
      total: plan.queue.length
    };
  }

  async cleanOldPosts(days = 30) {
    const plan = await this.loadPlan();
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const before = plan.queue.length;
    plan.queue = plan.queue.filter(
      (p) => p.status !== 'published' || new Date(p.publishedAt) > cutoff
    );
    if (plan.queue.length < before) {
      await this.savePlan(plan);
      console.log(`🗑️ Удалено ${before - plan.queue.length} старых постов`);
    }
  }

  // === ДЕДУПЛИКАЦИЯ ===

  async loadPublishedUrls() {
    try {
      const data = await fs.readFile(this.publishedFile, 'utf8');
      const parsed = JSON.parse(data);
      // Очистка старых URL (старше 30 дней)
      const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
      return parsed.filter((item) => item.date > cutoff);
    } catch {
      return [];
    }
  }

  async savePublishedUrls(urls) {
    await this.saveJSON(this.publishedFile, urls);
  }

  async filterNewArticles(articles) {
    const published = await this.loadPublishedUrls();
    const publishedUrls = new Set(published.map((p) => p.url));

    const newArticles = articles.filter((a) => !publishedUrls.has(a.url));
    const duplicates = articles.length - newArticles.length;

    if (duplicates > 0) {
      console.log(`🔄 Пропущено дубликатов: ${duplicates}`);
    }

    return newArticles;
  }

  async markUrlsAsPublished(articles) {
    const published = await this.loadPublishedUrls();
    const now = Date.now();

    for (const article of articles) {
      if (article.url && !published.some((p) => p.url === article.url)) {
        published.push({
          url: article.url,
          title: article.title,
          date: now
        });
      }
    }

    await this.savePublishedUrls(published);
    console.log(`📌 Сохранено ${articles.length} URL как опубликованные`);
  }
}
