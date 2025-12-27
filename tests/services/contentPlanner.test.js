import { describe, it, before, after, beforeEach } from 'mocha';
import { expect } from 'chai';
import { ContentPlanner } from '../../src/services/contentPlanner.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

describe('ContentPlanner', () => {
  let planner;
  let testDir;

  before(async () => {
    // Создаем временную директорию для тестов
    testDir = path.join(os.tmpdir(), 'ai-bot-test-' + Date.now());
    await fs.mkdir(testDir, { recursive: true });
  });

  after(async () => {
    // Очищаем после тестов
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Игнорируем ошибки очистки
    }
  });

  beforeEach(() => {
    planner = new ContentPlanner();
  });

  describe('Constructor', () => {
    it('should initialize with correct file paths', () => {
      expect(planner.planFile).to.be.a('string');
      expect(planner.publishedFile).to.be.a('string');
      expect(planner.planFile).to.include('content-plan.json');
      expect(planner.publishedFile).to.include('published-posts.json');
    });

    it('should find writable directory', () => {
      const dir = planner.getWritableDir();
      expect(dir).to.be.a('string');
      expect(dir.length).to.be.greaterThan(0);
    });
  });

  describe('loadPlan', () => {
    it('should return empty plan if file does not exist', async () => {
      const plan = await planner.loadPlan();
      
      expect(plan).to.be.an('object');
      expect(plan).to.have.property('queue');
      expect(plan.queue).to.be.an('array');
      expect(plan).to.have.property('lastUpdated');
      expect(plan).to.have.property('settings');
    });

    it('should have correct default settings', async () => {
      const plan = await planner.loadPlan();
      
      expect(plan.settings).to.deep.include({
        postsPerDay: 1,
        minArticlesPerPost: 1,
        maxArticlesPerPost: 1
      });
    });
  });

  describe('createPosts', () => {
    it('should create 1 post per 1 article', () => {
      const articles = [
        { title: 'Article 1', url: 'http://test1.com', source: 'Test' },
        { title: 'Article 2', url: 'http://test2.com', source: 'Test' },
        { title: 'Article 3', url: 'http://test3.com', source: 'Test' }
      ];
      
      const posts = planner.createPosts(articles, { minArticlesPerPost: 1, maxArticlesPerPost: 1 });
      
      expect(posts).to.be.an('array');
      expect(posts.length).to.equal(3);
      
      posts.forEach((post, index) => {
        expect(post).to.have.property('id');
        expect(post).to.have.property('articles');
        expect(post.articles).to.be.an('array');
        expect(post.articles.length).to.equal(1);
        expect(post.articles[0]).to.equal(articles[index]);
        expect(post.status).to.equal('pending');
      });
    });

    it('should create posts with unique IDs', () => {
      const articles = [
        { title: 'Article 1', url: 'http://test1.com' },
        { title: 'Article 2', url: 'http://test2.com' }
      ];
      
      const posts = planner.createPosts(articles, {});
      const ids = posts.map(p => p.id);
      const uniqueIds = new Set(ids);
      
      expect(uniqueIds.size).to.equal(ids.length);
    });

    it('should handle empty articles array', () => {
      const posts = planner.createPosts([], {});
      expect(posts).to.be.an('array');
      expect(posts.length).to.equal(0);
    });
  });

  describe('addArticlesToPlan', () => {
    it('should add articles to plan', async () => {
      const articles = [
        { title: 'New Article', url: 'http://test.com', source: 'Test Source' }
      ];
      
      const posts = await planner.addArticlesToPlan(articles);
      
      expect(posts).to.be.an('array');
      expect(posts.length).to.be.greaterThan(0);
      expect(posts[0].articles[0].title).to.equal('New Article');
    });

    it('should filter out duplicate URLs from published', async () => {
      // Добавляем статью первый раз
      const article1 = { title: 'Article', url: 'http://duplicate.com', source: 'Test' };
      await planner.addArticlesToPlan([article1]);
      
      // Пытаемся добавить ту же статью снова
      const posts = await planner.addArticlesToPlan([article1]);
      
      // Должно быть 0 новых постов (дубликат отфильтрован)
      expect(posts.length).to.equal(0);
    });
  });

  describe('getNextPost', () => {
    it('should return null if queue is empty', async () => {
      const nextPost = await planner.getNextPost();
      expect(nextPost).to.be.null;
    });

    it('should return first pending post', async () => {
      const articles = [
        { title: 'Article 1', url: 'http://test1.com', source: 'Test' }
      ];
      await planner.addArticlesToPlan(articles);
      
      const nextPost = await planner.getNextPost();
      
      expect(nextPost).to.not.be.null;
      expect(nextPost).to.have.property('status', 'pending');
      expect(nextPost).to.have.property('articles');
    });
  });

  describe('markAsPublished', () => {
    it('should mark post as published', async () => {
      const articles = [
        { title: 'Article', url: 'http://test.com', source: 'Test' }
      ];
      await planner.addArticlesToPlan(articles);
      
      const nextPost = await planner.getNextPost();
      const postId = nextPost.id;
      
      await planner.markAsPublished(postId, { result: { message_id: 123 } });
      
      const plan = await planner.loadPlan();
      const post = plan.queue.find(p => p.id === postId);
      
      expect(post.status).to.equal('published');
      expect(post).to.have.property('publishedAt');
      expect(post.telegramMessageId).to.equal(123);
    });

    it('should add to published history', async () => {
      const articles = [
        { title: 'Article', url: 'http://test.com', source: 'Test' }
      ];
      await planner.addArticlesToPlan(articles);
      
      const nextPost = await planner.getNextPost();
      await planner.markAsPublished(nextPost.id, { result: { message_id: 456 } });
      
      const published = await planner.loadPublished();
      
      expect(published.posts.length).to.be.greaterThan(0);
      expect(published).to.have.property('lastPublished');
    });
  });

  describe('getPlanStats', () => {
    it('should return correct stats for empty plan', async () => {
      const stats = await planner.getPlanStats();
      
      expect(stats).to.have.property('totalInQueue');
      expect(stats).to.have.property('pending');
      expect(stats).to.have.property('published');
      expect(stats).to.have.property('totalPublished');
      expect(stats.pending).to.be.a('number');
    });

    it('should count pending posts correctly', async () => {
      const articles = [
        { title: 'Article 1', url: 'http://test1.com', source: 'Test' },
        { title: 'Article 2', url: 'http://test2.com', source: 'Test' }
      ];
      await planner.addArticlesToPlan(articles);
      
      const stats = await planner.getPlanStats();
      
      expect(stats.pending).to.equal(2);
      expect(stats.totalInQueue).to.equal(2);
    });
  });

  describe('cleanOldPosts', () => {
    it('should not remove pending posts', async () => {
      const articles = [
        { title: 'Article', url: 'http://test.com', source: 'Test' }
      ];
      await planner.addArticlesToPlan(articles);
      
      const removed = await planner.cleanOldPosts(1); // 1 день
      
      expect(removed).to.equal(0);
    });

    it('should remove old published posts', async () => {
      // Добавляем и публикуем пост
      const articles = [
        { title: 'Old Article', url: 'http://old.com', source: 'Test' }
      ];
      await planner.addArticlesToPlan(articles);
      const post = await planner.getNextPost();
      await planner.markAsPublished(post.id, { result: { message_id: 1 } });
      
      // Изменяем дату публикации на старую
      const plan = await planner.loadPlan();
      const publishedPost = plan.queue.find(p => p.id === post.id);
      publishedPost.publishedAt = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(); // 40 дней назад
      await planner.savePlan(plan);
      
      // Очищаем посты старше 30 дней
      const removed = await planner.cleanOldPosts(30);
      
      expect(removed).to.equal(1);
    });
  });

  describe('Error handling', () => {
    it('should handle save errors gracefully', async () => {
      // Этот тест проверяет что ошибки сохранения не падают приложение
      const plan = {
        queue: [],
        lastUpdated: new Date().toISOString(),
        settings: {}
      };
      
      // Не должно выбросить ошибку
      await planner.savePlan(plan);
    });
  });
});




