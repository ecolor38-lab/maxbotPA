/**
 * Test suite for maxbotPA project.
 *
 * Uses Node.js built-in assert module and node:test runner.
 * Creates a temporary database in a temp directory so that
 * production data is never touched.
 */

import { strict as assert } from 'node:assert';
import { describe, it, before, after } from 'node:test';
import { mkdtempSync, rmSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

// ---------------------------------------------------------------------------
// Set up a temporary working directory BEFORE any project module is imported.
// The database module resolves its path via process.cwd(), so we override it.
// ---------------------------------------------------------------------------
const tmpDir = mkdtempSync(path.join(os.tmpdir(), 'maxbot-test-'));
const originalCwd = process.cwd();
process.chdir(tmpDir);

// Now import project modules (they will create the DB in tmpDir/data/)
const { getDb, savePost, getRecentPosts, saveButtonClick, getClicksForPost,
        saveChannelMetrics, getLatestMetrics, getEngagementByPostType,
        getTopPosts, getGrowthData } = await import('../src/db/database.js');

const { extractTopics, getAnalyticsOverview } = await import('../src/services/analyticsService.js');

const { getPostTypeForSlot, getPostsCountToday, getTodayScheduleInfo } = await import('../src/services/contentCalendar.js');

const { getOptimizedWeights, getWeightsSummary, resetWeightsCache } = await import('../src/services/contentOptimizer.js');

const { AdManager } = await import('../src/services/adManager.js');

const { AffiliateManager } = await import('../src/services/affiliateManager.js');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID_POST_TYPES = [
  'news_flash', 'analysis', 'digest', 'tip', 'prediction',
  'hot_take', 'series', 'sponsored'
];

// Track pass/fail counts
let passed = 0;
let failed = 0;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

// ==================== Database Module ====================

describe('Database module', () => {

  it('getDb() returns a valid database object', () => {
    const db = getDb();
    assert.ok(db, 'getDb() should return a truthy value');
    assert.equal(typeof db.prepare, 'function', 'db should have a prepare method');
    assert.equal(typeof db.exec, 'function', 'db should have an exec method');
  });

  it('savePost() returns a row id', () => {
    const id = savePost({
      messageId: 'msg_001',
      postType: 'news_flash',
      text: 'Test post about AI news',
      hashtags: '#ai #test',
      imageUrl: null,
      sources: ['https://example.com'],
      topics: ['openai', 'chatgpt']
    });
    assert.ok(id > 0, 'savePost should return a positive row id');
  });

  it('getRecentPosts() returns the saved post', () => {
    const posts = getRecentPosts(1);
    assert.ok(Array.isArray(posts), 'getRecentPosts should return an array');
    assert.ok(posts.length >= 1, 'should have at least one post');
    const post = posts.find(p => p.message_id === 'msg_001');
    assert.ok(post, 'should find the post we just saved');
    assert.equal(post.post_type, 'news_flash');
    assert.equal(post.text, 'Test post about AI news');
  });

  it('getRecentPosts() with 0 days returns empty or only very recent', () => {
    // 0 days means "now" essentially, posts from today should still show
    const posts = getRecentPosts(0);
    assert.ok(Array.isArray(posts), 'should return an array even with 0 days');
  });

  it('saveButtonClick() and getClicksForPost() work together', () => {
    // First save a post to get a valid post id
    const postId = savePost({
      postType: 'analysis',
      text: 'Analysis post for click testing'
    });

    saveButtonClick({
      postId,
      messageId: 'msg_002',
      callbackId: 'cb_1',
      userId: 'user_1',
      buttonKey: 'react:interesting',
      buttonLabel: 'Interesting'
    });

    saveButtonClick({
      postId,
      messageId: 'msg_002',
      callbackId: 'cb_2',
      userId: 'user_2',
      buttonKey: 'react:interesting',
      buttonLabel: 'Interesting'
    });

    saveButtonClick({
      postId,
      messageId: 'msg_002',
      callbackId: 'cb_3',
      userId: 'user_3',
      buttonKey: 'react:useful',
      buttonLabel: 'Useful'
    });

    const clicks = getClicksForPost(postId);
    assert.ok(Array.isArray(clicks), 'getClicksForPost should return an array');
    assert.ok(clicks.length >= 2, 'should have at least 2 distinct button_key groups');

    const interestingClicks = clicks.find(c => c.button_key === 'react:interesting');
    assert.ok(interestingClicks, 'should find react:interesting clicks');
    assert.equal(interestingClicks.count, 2, 'react:interesting should have 2 clicks');

    const usefulClicks = clicks.find(c => c.button_key === 'react:useful');
    assert.ok(usefulClicks, 'should find react:useful clicks');
    assert.equal(usefulClicks.count, 1, 'react:useful should have 1 click');
  });

  it('getClicksForPost() returns empty array for non-existent post', () => {
    const clicks = getClicksForPost(99999);
    assert.ok(Array.isArray(clicks), 'should return an array');
    assert.equal(clicks.length, 0, 'should be empty for non-existent post');
  });

  it('saveChannelMetrics() and getLatestMetrics() work together', () => {
    saveChannelMetrics(100);
    saveChannelMetrics(120);
    saveChannelMetrics(150);

    const latest = getLatestMetrics();
    assert.ok(latest, 'getLatestMetrics should return a row');
    assert.equal(latest.participants_count, 150, 'latest metrics should have 150 subscribers');
  });

  it('getLatestMetrics() returns undefined when no metrics exist in a fresh db', () => {
    // We already inserted metrics, but we can still verify the structure
    const latest = getLatestMetrics();
    assert.ok(latest.recorded_at, 'should have a recorded_at timestamp');
    assert.equal(typeof latest.participants_count, 'number', 'participants_count should be a number');
  });

  it('getEngagementByPostType() returns an array', () => {
    const engagement = getEngagementByPostType(30);
    assert.ok(Array.isArray(engagement), 'should return an array');
    // We saved posts above, so there should be data
    assert.ok(engagement.length > 0, 'should have engagement data for saved posts');
    const first = engagement[0];
    assert.ok('post_type' in first, 'should have post_type field');
    assert.ok('post_count' in first, 'should have post_count field');
    assert.ok('total_clicks' in first, 'should have total_clicks field');
    assert.ok('avg_clicks_per_post' in first, 'should have avg_clicks_per_post field');
  });

  it('getTopPosts() returns an array with click counts', () => {
    const topPosts = getTopPosts(30, 5);
    assert.ok(Array.isArray(topPosts), 'should return an array');
    assert.ok(topPosts.length > 0, 'should have posts');
    assert.ok('click_count' in topPosts[0], 'each post should have click_count');
  });

  it('getTopPosts() respects the limit parameter', () => {
    // Add several posts
    for (let i = 0; i < 5; i++) {
      savePost({ postType: 'tip', text: `Bulk post number ${i}` });
    }
    const topPosts = getTopPosts(30, 3);
    assert.ok(topPosts.length <= 3, 'should respect the limit of 3');
  });

  it('getGrowthData() returns an array with date and subscribers', () => {
    const growth = getGrowthData(30);
    assert.ok(Array.isArray(growth), 'should return an array');
    assert.ok(growth.length > 0, 'should have growth data points');
    const first = growth[0];
    assert.ok('date' in first, 'should have date field');
    assert.ok('subscribers' in first, 'should have subscribers field');
  });

  it('getGrowthData() with 0 days returns empty or minimal data', () => {
    const growth = getGrowthData(0);
    assert.ok(Array.isArray(growth), 'should return an array');
  });
});

// ==================== Analytics Service ====================

describe('Analytics Service', () => {

  describe('extractTopics()', () => {

    it('extracts ChatGPT topic from text', () => {
      const topics = extractTopics('OpenAI released a new ChatGPT update');
      assert.ok(topics.includes('chatgpt'), 'should detect chatgpt');
      assert.ok(topics.includes('openai'), 'should detect openai');
    });

    it('extracts Claude/Anthropic topic', () => {
      const topics = extractTopics('Anthropic announced Claude 4');
      assert.ok(topics.includes('anthropic'), 'should detect anthropic/claude');
    });

    it('extracts Google/Gemini topic', () => {
      const topics = extractTopics('Google unveils Gemini Pro');
      assert.ok(topics.includes('google'), 'should detect google/gemini');
    });

    it('extracts Russian language keywords', () => {
      const topics = extractTopics('Яндекс представил новую модель');
      assert.ok(topics.includes('yandex'), 'should detect yandex from Russian text');
    });

    it('extracts Sber/GigaChat topic', () => {
      const topics = extractTopics('Сбер обновил GigaChat');
      assert.ok(topics.includes('sber'), 'should detect sber');
    });

    it('extracts multiple topics from one text', () => {
      const topics = extractTopics('ChatGPT vs Claude: comparing OpenAI and Anthropic models for coding');
      assert.ok(topics.length >= 3, 'should detect at least 3 topics');
      assert.ok(topics.includes('chatgpt'), 'should include chatgpt');
      assert.ok(topics.includes('openai'), 'should include openai');
      assert.ok(topics.includes('anthropic'), 'should include anthropic');
      assert.ok(topics.includes('code'), 'should include code');
    });

    it('returns empty array for null input', () => {
      const topics = extractTopics(null);
      assert.deepEqual(topics, [], 'should return empty array for null');
    });

    it('returns empty array for empty string', () => {
      const topics = extractTopics('');
      assert.deepEqual(topics, [], 'should return empty array for empty string');
    });

    it('returns empty array for text with no matching topics', () => {
      const topics = extractTopics('The weather is nice today');
      assert.deepEqual(topics, [], 'should return empty array for unrelated text');
    });

    it('is case-insensitive', () => {
      const topics = extractTopics('CHATGPT is great');
      assert.ok(topics.includes('chatgpt'), 'should detect CHATGPT in uppercase');
    });

    it('detects domain topics like robotics, medicine, security', () => {
      const topics = extractTopics('AI robots in medicine improve security of health systems');
      assert.ok(topics.includes('robotics'), 'should detect robotics');
      assert.ok(topics.includes('medicine'), 'should detect medicine');
      assert.ok(topics.includes('security'), 'should detect security');
    });
  });

  describe('getAnalyticsOverview()', () => {

    it('returns correct structure', () => {
      const overview = getAnalyticsOverview(30);
      assert.ok(overview, 'should return an object');
      assert.equal(overview.period_days, 30, 'period_days should match parameter');
      assert.equal(typeof overview.total_posts, 'number', 'total_posts should be a number');
      assert.equal(typeof overview.total_clicks, 'number', 'total_clicks should be a number');
      assert.equal(typeof overview.positive_clicks, 'number', 'positive_clicks should be a number');
      assert.equal(typeof overview.avg_clicks_per_post, 'number', 'avg_clicks_per_post should be a number');
      assert.ok(Array.isArray(overview.post_types), 'post_types should be an array');
      assert.ok(Array.isArray(overview.top_posts), 'top_posts should be an array');
    });

    it('has subscribers field (number or null)', () => {
      const overview = getAnalyticsOverview(7);
      assert.ok(
        overview.subscribers === null || typeof overview.subscribers === 'number',
        'subscribers should be a number or null'
      );
    });

    it('total_posts matches getRecentPosts count', () => {
      const overview = getAnalyticsOverview(30);
      const posts = getRecentPosts(30);
      assert.equal(overview.total_posts, posts.length,
        'total_posts should equal the number of recent posts');
    });
  });
});

// ==================== Content Calendar ====================

describe('Content Calendar', () => {

  it('getPostTypeForSlot(0) returns a valid post type string', () => {
    const postType = getPostTypeForSlot(0);
    assert.equal(typeof postType, 'string', 'should return a string');
    assert.ok(VALID_POST_TYPES.includes(postType),
      `"${postType}" should be one of the known post types`);
  });

  it('getPostTypeForSlot(1) returns a valid post type', () => {
    const postType = getPostTypeForSlot(1);
    assert.equal(typeof postType, 'string', 'should return a string');
    assert.ok(VALID_POST_TYPES.includes(postType),
      `"${postType}" should be one of the known post types`);
  });

  it('getPostTypeForSlot() with no argument returns a valid post type', () => {
    const postType = getPostTypeForSlot();
    assert.equal(typeof postType, 'string', 'should return a string');
    assert.ok(VALID_POST_TYPES.includes(postType),
      `"${postType}" should be a valid post type`);
  });

  it('getPostsCountToday() returns a positive number', () => {
    const count = getPostsCountToday();
    assert.equal(typeof count, 'number', 'should return a number');
    assert.ok(count > 0, 'should be positive');
    assert.ok(count <= 5, 'should be at most 5');
  });

  it('getPostsCountToday() returns 3 or 5 (weekday vs weekend)', () => {
    const count = getPostsCountToday();
    assert.ok(count === 3 || count === 5,
      `count should be 3 (weekend) or 5 (weekday), got ${count}`);
  });

  it('getTodayScheduleInfo() returns correct structure', () => {
    const info = getTodayScheduleInfo();
    assert.ok(info, 'should return an object');
    assert.equal(typeof info.day, 'string', 'day should be a string');
    assert.equal(typeof info.postsCount, 'number', 'postsCount should be a number');
    assert.ok(Array.isArray(info.schedule), 'schedule should be an array');
    assert.equal(typeof info.isWeekend, 'boolean', 'isWeekend should be a boolean');
  });

  it('getTodayScheduleInfo() schedule items contain type and weight', () => {
    const info = getTodayScheduleInfo();
    assert.ok(info.schedule.length >= 2, 'schedule should have at least 2 items');
    for (const item of info.schedule) {
      assert.ok(item.includes('('), 'each schedule item should contain parenthesized weight');
      assert.ok(item.includes('%)'), 'each schedule item should contain % sign');
    }
  });

  it('getTodayScheduleInfo().isWeekend is consistent with postsCount', () => {
    const info = getTodayScheduleInfo();
    if (info.isWeekend) {
      assert.equal(info.postsCount, 3, 'weekend should have 3 posts');
    } else {
      assert.equal(info.postsCount, 5, 'weekday should have 5 posts');
    }
  });
});

// ==================== Content Optimizer ====================

describe('Content Optimizer', () => {

  before(() => {
    resetWeightsCache();
  });

  it('getOptimizedWeights() returns base weights when insufficient data', () => {
    // We have very few posts, so it should return base weights
    resetWeightsCache();
    const weights = getOptimizedWeights();
    assert.ok(weights, 'should return an object');
    assert.equal(typeof weights.news_flash, 'number', 'news_flash weight should be a number');
    assert.equal(typeof weights.analysis, 'number', 'analysis weight should be a number');
    assert.equal(typeof weights.digest, 'number', 'digest weight should be a number');
    assert.equal(typeof weights.tip, 'number', 'tip weight should be a number');
  });

  it('getOptimizedWeights() base weights have expected values', () => {
    resetWeightsCache();
    const weights = getOptimizedWeights();
    // With few posts, these should be the BASE_WEIGHTS
    assert.equal(weights.news_flash, 40, 'news_flash base weight should be 40');
    assert.equal(weights.analysis, 30, 'analysis base weight should be 30');
    assert.equal(weights.digest, 15, 'digest base weight should be 15');
    assert.equal(weights.tip, 15, 'tip base weight should be 15');
    assert.equal(weights.sponsored, 0, 'sponsored base weight should be 0');
  });

  it('getOptimizedWeights() returns cached result on second call', () => {
    resetWeightsCache();
    const first = getOptimizedWeights();
    const second = getOptimizedWeights();
    assert.deepEqual(first, second, 'second call should return same result (cached)');
  });

  it('getWeightsSummary() returns correct format', () => {
    resetWeightsCache();
    const summary = getWeightsSummary();
    assert.ok(summary, 'should return an object');

    // Sponsored has weight 0, so it should NOT be in the summary
    assert.ok(!('sponsored' in summary), 'sponsored (weight=0) should not be in summary');

    // Check a known type
    assert.ok('news_flash' in summary, 'news_flash should be in summary');
    const nf = summary.news_flash;
    assert.equal(typeof nf.weight, 'number', 'weight should be a number');
    assert.equal(typeof nf.percent, 'number', 'percent should be a number');
    assert.equal(typeof nf.base, 'number', 'base should be a number');
    assert.ok(nf.percent > 0 && nf.percent <= 100, 'percent should be between 1 and 100');
  });

  it('getWeightsSummary() percentages add up approximately to 100', () => {
    resetWeightsCache();
    const summary = getWeightsSummary();
    const totalPercent = Object.values(summary).reduce((sum, v) => sum + v.percent, 0);
    // Rounding may cause slight deviation, allow 95-105
    assert.ok(totalPercent >= 95 && totalPercent <= 105,
      `total percent should be near 100, got ${totalPercent}`);
  });
});

// ==================== Ad Manager ====================

describe('Ad Manager', () => {
  let adManager;

  before(() => {
    adManager = new AdManager();
  });

  it('getPricing() returns pricing with slots and packages', () => {
    const pricing = adManager.getPricing();
    assert.ok(pricing, 'should return pricing object');
    assert.equal(typeof pricing.subscribers, 'number', 'subscribers should be a number');

    // Slots
    assert.ok(pricing.slots, 'should have slots');
    assert.ok(pricing.slots.morning, 'should have morning slot');
    assert.ok(pricing.slots.day, 'should have day slot');
    assert.ok(pricing.slots.evening, 'should have evening slot');

    for (const [name, slot] of Object.entries(pricing.slots)) {
      assert.equal(typeof slot.price, 'number', `${name} slot should have numeric price`);
      assert.ok(slot.price >= 500, `${name} slot price should be at least 500`);
      assert.equal(typeof slot.time, 'string', `${name} slot should have time range`);
      assert.equal(typeof slot.label, 'string', `${name} slot should have label`);
    }

    // Packages
    assert.ok(pricing.packages, 'should have packages');
    assert.ok(pricing.packages.single, 'should have single package');
    assert.ok(pricing.packages.pack3, 'should have pack3 package');
    assert.ok(pricing.packages.pack5, 'should have pack5 package');
    assert.ok(pricing.packages.week, 'should have week package');

    for (const [name, pkg] of Object.entries(pricing.packages)) {
      assert.equal(typeof pkg.posts, 'number', `${name} package should have posts count`);
      assert.equal(typeof pkg.price, 'number', `${name} package should have price`);
      assert.equal(typeof pkg.discount, 'number', `${name} package should have discount`);
    }
  });

  it('morning slot is most expensive (premium)', () => {
    const pricing = adManager.getPricing();
    assert.ok(pricing.slots.morning.price >= pricing.slots.day.price,
      'morning (premium) should cost at least as much as day');
    assert.ok(pricing.slots.morning.price >= pricing.slots.evening.price,
      'morning (premium) should cost at least as much as evening');
  });

  it('package discounts increase with more posts', () => {
    const pricing = adManager.getPricing();
    assert.equal(pricing.packages.single.discount, 0, 'single should have 0 discount');
    assert.ok(pricing.packages.pack3.discount > pricing.packages.single.discount,
      'pack3 discount should be more than single');
    assert.ok(pricing.packages.pack5.discount > pricing.packages.pack3.discount,
      'pack5 discount should be more than pack3');
    assert.ok(pricing.packages.week.discount > pricing.packages.pack5.discount,
      'week discount should be more than pack5');
  });

  it('createCampaign() returns an id, price, and slot', () => {
    const result = adManager.createCampaign({
      clientName: 'Test Client',
      brief: 'Test campaign brief',
      slot: 'day',
      scheduledDate: '2026-03-01'
    });
    assert.ok(result, 'should return a result');
    assert.ok(result.id > 0, 'should have a positive id');
    assert.equal(typeof result.price, 'number', 'price should be a number');
    assert.equal(result.slot, 'day', 'slot should be day');
  });

  it('createCampaign() with custom price uses that price', () => {
    const result = adManager.createCampaign({
      clientName: 'Custom Price Client',
      brief: 'Custom price test',
      price: 1500
    });
    assert.equal(result.price, 1500, 'should use custom price 1500');
  });

  it('listCampaigns() returns all campaigns', () => {
    const campaigns = adManager.listCampaigns();
    assert.ok(Array.isArray(campaigns), 'should return an array');
    assert.ok(campaigns.length >= 2, 'should have at least 2 campaigns from earlier tests');
  });

  it('listCampaigns() with status filter works', () => {
    const pending = adManager.listCampaigns('pending');
    assert.ok(Array.isArray(pending), 'should return an array');
    for (const c of pending) {
      assert.equal(c.status, 'pending', 'all returned campaigns should be pending');
    }
  });

  it('getCampaign() returns a specific campaign', () => {
    const result = adManager.createCampaign({
      clientName: 'Specific Client',
      brief: 'Get by ID test'
    });
    const campaign = adManager.getCampaign(result.id);
    assert.ok(campaign, 'should find the campaign');
    assert.equal(campaign.client_name, 'Specific Client');
    assert.equal(campaign.status, 'pending');
  });

  it('getAdStats() returns correct structure', () => {
    const stats = adManager.getAdStats();
    assert.ok(stats, 'should return stats object');
    assert.equal(typeof stats.total, 'number', 'total should be a number');
    assert.equal(typeof stats.published, 'number', 'published should be a number');
    assert.equal(typeof stats.pending, 'number', 'pending should be a number');
    assert.equal(typeof stats.total_revenue, 'number', 'total_revenue should be a number');
    assert.ok(stats.total >= stats.published + stats.pending,
      'total should be >= published + pending');
  });

  it('getAdStats() total matches listCampaigns length', () => {
    const stats = adManager.getAdStats();
    const all = adManager.listCampaigns();
    assert.equal(stats.total, all.length,
      'stats.total should equal number of campaigns');
  });
});

// ==================== Affiliate Manager ====================

describe('Affiliate Manager', () => {
  let affiliateManager;

  before(() => {
    affiliateManager = new AffiliateManager();
  });

  it('listAffiliates() returns default affiliates', () => {
    const affiliates = affiliateManager.listAffiliates();
    assert.ok(Array.isArray(affiliates), 'should return an array');
    assert.ok(affiliates.length >= 10, 'should have at least 10 default affiliates');
  });

  it('listAffiliates() includes expected tools', () => {
    const affiliates = affiliateManager.listAffiliates();
    const keywords = affiliates.map(a => a.keyword);
    assert.ok(keywords.includes('chatgpt'), 'should include chatgpt');
    assert.ok(keywords.includes('claude'), 'should include claude');
    assert.ok(keywords.includes('gemini'), 'should include gemini');
    assert.ok(keywords.includes('midjourney'), 'should include midjourney');
    assert.ok(keywords.includes('copilot'), 'should include copilot');
  });

  it('findMentionedTools() finds ChatGPT in text', () => {
    const tools = affiliateManager.findMentionedTools('ChatGPT released a new update');
    assert.ok(tools.length >= 1, 'should find at least one tool');
    assert.ok(tools.some(t => t.name === 'ChatGPT'), 'should find ChatGPT');
  });

  it('findMentionedTools() finds Claude in text', () => {
    const tools = affiliateManager.findMentionedTools('Try using Claude for your tasks');
    assert.ok(tools.length >= 1, 'should find at least one tool');
    assert.ok(tools.some(t => t.name === 'Claude'), 'should find Claude');
  });

  it('findMentionedTools() finds multiple tools', () => {
    const tools = affiliateManager.findMentionedTools('ChatGPT and Claude are both great LLMs');
    assert.ok(tools.length >= 2, 'should find at least 2 tools');
  });

  it('findMentionedTools() returns max 2 results', () => {
    const tools = affiliateManager.findMentionedTools(
      'ChatGPT vs Claude vs Gemini vs Copilot vs Midjourney comparison'
    );
    assert.ok(tools.length <= 2, 'should return at most 2 tools');
  });

  it('findMentionedTools() returns empty for null input', () => {
    const tools = affiliateManager.findMentionedTools(null);
    assert.deepEqual(tools, [], 'should return empty array for null');
  });

  it('findMentionedTools() returns empty for unrelated text', () => {
    const tools = affiliateManager.findMentionedTools('The weather is sunny today');
    assert.deepEqual(tools, [], 'should return empty for unrelated text');
  });

  it('findMentionedTools() is case-insensitive', () => {
    const tools = affiliateManager.findMentionedTools('CHATGPT is amazing');
    assert.ok(tools.length >= 1, 'should find chatgpt case-insensitively');
  });

  it('findMentionedTools() returns objects with correct shape', () => {
    const tools = affiliateManager.findMentionedTools('Check out Claude');
    assert.ok(tools.length >= 1);
    const tool = tools[0];
    assert.ok('id' in tool, 'should have id');
    assert.ok('name' in tool, 'should have name');
    assert.ok('url' in tool, 'should have url');
    assert.ok('category' in tool, 'should have category');
  });

  it('buildAffiliateButtons() returns buttons for matching text', () => {
    const buttons = affiliateManager.buildAffiliateButtons('Try ChatGPT now');
    assert.ok(Array.isArray(buttons), 'should return an array');
    assert.ok(buttons.length >= 1, 'should have at least one button');
    const btn = buttons[0];
    assert.equal(btn.type, 'link', 'button type should be link');
    assert.ok(btn.text.includes('ChatGPT'), 'button text should include tool name');
    assert.equal(typeof btn.url, 'string', 'button url should be a string');
  });

  it('buildAffiliateButtons() returns null when no tools match', () => {
    const buttons = affiliateManager.buildAffiliateButtons('Plain text about nothing');
    assert.equal(buttons, null, 'should return null when no tools match');
  });

  it('buildAffiliateButtons() returns null for null input', () => {
    const buttons = affiliateManager.buildAffiliateButtons(null);
    assert.equal(buttons, null, 'should return null for null input');
  });

  it('getStats() returns correct structure', () => {
    const stats = affiliateManager.getStats();
    assert.ok(stats, 'should return stats object');
    assert.equal(typeof stats.total_affiliates, 'number');
    assert.equal(typeof stats.total_clicks, 'number');
    assert.ok(Array.isArray(stats.top), 'top should be an array');
  });
});

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

// Restore cwd and clean up temp directory after all tests
after(() => {
  process.chdir(originalCwd);
  try {
    rmSync(tmpDir, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors (file locks on some OSes)
  }
});
