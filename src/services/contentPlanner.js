import fs from 'fs/promises';
import { existsSync, writeFileSync, unlinkSync } from 'fs';
import path from 'path';
import os from 'os';

export class ContentPlanner {
  constructor() {
    this.dataDir = this.findWritableDir();
    this.planFile = path.join(this.dataDir, 'content-plan.json');
    console.log(`📂 Данные: ${this.dataDir}`);
  }

  findWritableDir() {
    const dirs = [process.cwd(), '/tmp/ai-bot', path.join(os.tmpdir(), 'ai-bot')];
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

  async savePlan(plan) {
    try {
      const dir = path.dirname(this.planFile);
      if (!existsSync(dir)) {
        await fs.mkdir(dir, { recursive: true });
      }
      await fs.writeFile(this.planFile, JSON.stringify(plan, null, 2));
    } catch (error) {
      console.warn('⚠️ Не удалось сохранить план:', error.message);
    }
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

  async getNextPost() {
    const plan = await this.loadPlan();
    return plan.queue.find((p) => p.status === 'pending') || null;
  }

  async markAsPublished(postId, result) {
    const plan = await this.loadPlan();
    const post = plan.queue.find((p) => p.id === postId);
    if (post) {
      post.status = 'published';
      post.publishedAt = new Date().toISOString();
      post.messageId = result?.result?.message_id;
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
}
