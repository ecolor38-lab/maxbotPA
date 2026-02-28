import Database from 'better-sqlite3';
import path from 'path';
import { existsSync, mkdirSync } from 'fs';

let db = null;

export function getDb() {
  if (db) return db;

  const dataDir = path.join(process.cwd(), 'data');
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }

  const dbPath = path.join(dataDir, 'maxbot.db');
  db = new Database(dbPath);

  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');

  initTables(db);
  return db;
}

function initTables(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id TEXT,
      post_type TEXT NOT NULL,
      text TEXT NOT NULL,
      hashtags TEXT,
      image_url TEXT,
      sources TEXT,
      topics TEXT,
      char_count INTEGER,
      published_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS button_clicks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER,
      message_id TEXT,
      callback_id TEXT,
      user_id TEXT,
      button_key TEXT NOT NULL,
      button_label TEXT,
      clicked_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (post_id) REFERENCES posts(id)
    );

    CREATE TABLE IF NOT EXISTS channel_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      participants_count INTEGER,
      recorded_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS weekly_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      week_start TEXT NOT NULL,
      week_end TEXT NOT NULL,
      report_text TEXT NOT NULL,
      data_json TEXT,
      message_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS kv_store (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS series (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      total_parts INTEGER NOT NULL,
      current_part INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS detected_trends (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      keyword TEXT NOT NULL,
      source_count INTEGER NOT NULL,
      sources TEXT,
      sample_titles TEXT,
      status TEXT NOT NULL DEFAULT 'new',
      detected_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS ad_campaigns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_name TEXT NOT NULL,
      brief TEXT,
      slot TEXT NOT NULL DEFAULT 'day',
      scheduled_date TEXT,
      scheduled_time TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      price INTEGER NOT NULL DEFAULT 500,
      paid INTEGER NOT NULL DEFAULT 0,
      post_id INTEGER,
      message_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      published_at TEXT
    );

    CREATE TABLE IF NOT EXISTS affiliates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      keyword TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      ref_url TEXT,
      category TEXT,
      clicks INTEGER NOT NULL DEFAULT 0,
      revenue REAL NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS affiliate_clicks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      affiliate_id INTEGER NOT NULL,
      post_id INTEGER,
      clicked_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (affiliate_id) REFERENCES affiliates(id)
    );

    CREATE TABLE IF NOT EXISTS promotions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      channel_name TEXT NOT NULL,
      channel_url TEXT,
      channel_subscribers INTEGER,
      channel_category TEXT,
      cost INTEGER NOT NULL,
      placement_date TEXT NOT NULL,
      subscribers_before INTEGER,
      subscribers_after INTEGER,
      subscribers_gained INTEGER DEFAULT 0,
      roi REAL DEFAULT 0,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'planned',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_posts_published_at ON posts(published_at);
    CREATE INDEX IF NOT EXISTS idx_posts_post_type ON posts(post_type);
    CREATE INDEX IF NOT EXISTS idx_button_clicks_post_id ON button_clicks(post_id);
    CREATE INDEX IF NOT EXISTS idx_button_clicks_clicked_at ON button_clicks(clicked_at);
    CREATE INDEX IF NOT EXISTS idx_button_clicks_button_key ON button_clicks(button_key);
    CREATE INDEX IF NOT EXISTS idx_channel_metrics_recorded_at ON channel_metrics(recorded_at);
    CREATE INDEX IF NOT EXISTS idx_trends_detected_at ON detected_trends(detected_at);
    CREATE INDEX IF NOT EXISTS idx_trends_status ON detected_trends(status);

    -- AI Chat Bot tables
    CREATE TABLE IF NOT EXISTS bot_users (
      user_id TEXT PRIMARY KEY,
      username TEXT,
      first_name TEXT,
      model TEXT NOT NULL DEFAULT 'gpt-4o-mini',
      messages_today INTEGER NOT NULL DEFAULT 0,
      images_today INTEGER NOT NULL DEFAULT 0,
      last_message_date TEXT,
      is_subscribed INTEGER NOT NULL DEFAULT 0,
      is_premium INTEGER NOT NULL DEFAULT 0,
      premium_until TEXT,
      total_messages INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      model TEXT,
      tokens_used INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      payment_id TEXT UNIQUE,
      amount INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      confirmed_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_chat_messages_user ON chat_messages(user_id);
    CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at);
    CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);

    CREATE TABLE IF NOT EXISTS bot_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      username TEXT,
      first_name TEXT,
      description TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'new',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_bot_orders_user ON bot_orders(user_id);
  `);
}

export function savePost({ messageId, postType, text, hashtags, imageUrl, sources, topics }) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO posts (message_id, post_type, text, hashtags, image_url, sources, topics, char_count)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    messageId || null,
    postType,
    text,
    hashtags || null,
    imageUrl || null,
    sources ? JSON.stringify(sources) : null,
    topics ? JSON.stringify(topics) : null,
    text.length
  );
  return result.lastInsertRowid;
}

export function getPostByMessageId(messageId) {
  const db = getDb();
  return db.prepare('SELECT * FROM posts WHERE message_id = ?').get(messageId);
}

export function getRecentPosts(days = 7) {
  const db = getDb();
  return db
    .prepare(
      `SELECT * FROM posts
       WHERE published_at >= datetime('now', '-' || ? || ' days')
       ORDER BY published_at DESC`
    )
    .all(days);
}

export function saveButtonClick({ postId, messageId, callbackId, userId, buttonKey, buttonLabel }) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO button_clicks (post_id, message_id, callback_id, user_id, button_key, button_label)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  return stmt.run(postId || null, messageId || null, callbackId || null, userId || null, buttonKey, buttonLabel || null);
}

export function getClicksForPost(postId) {
  const db = getDb();
  return db
    .prepare(
      `SELECT button_key, COUNT(*) as count
       FROM button_clicks WHERE post_id = ?
       GROUP BY button_key`
    )
    .all(postId);
}

export function getClickStats(days = 7) {
  const db = getDb();
  return db
    .prepare(
      `SELECT bc.button_key, bc.button_label, COUNT(*) as count,
              p.post_type, p.id as post_id
       FROM button_clicks bc
       LEFT JOIN posts p ON bc.post_id = p.id
       WHERE bc.clicked_at >= datetime('now', '-' || ? || ' days')
       GROUP BY bc.post_id, bc.button_key
       ORDER BY count DESC`
    )
    .all(days);
}

export function saveChannelMetrics(participantsCount) {
  const db = getDb();
  db.prepare('INSERT INTO channel_metrics (participants_count) VALUES (?)').run(participantsCount);
}

export function getMetricsHistory(days = 30) {
  const db = getDb();
  return db
    .prepare(
      `SELECT * FROM channel_metrics
       WHERE recorded_at >= datetime('now', '-' || ? || ' days')
       ORDER BY recorded_at ASC`
    )
    .all(days);
}

export function getLatestMetrics() {
  const db = getDb();
  return db.prepare('SELECT * FROM channel_metrics ORDER BY recorded_at DESC LIMIT 1').get();
}

export function saveWeeklyReport({ weekStart, weekEnd, reportText, dataJson, messageId }) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO weekly_reports (week_start, week_end, report_text, data_json, message_id)
    VALUES (?, ?, ?, ?, ?)
  `);
  return stmt.run(weekStart, weekEnd, reportText, dataJson ? JSON.stringify(dataJson) : null, messageId || null);
}

export function getLatestReport() {
  const db = getDb();
  return db.prepare('SELECT * FROM weekly_reports ORDER BY created_at DESC LIMIT 1').get();
}

export function getEngagementByPostType(days = 30) {
  const db = getDb();
  return db
    .prepare(
      `SELECT p.post_type,
              COUNT(DISTINCT p.id) as post_count,
              COUNT(bc.id) as total_clicks,
              ROUND(CAST(COUNT(bc.id) AS REAL) / MAX(COUNT(DISTINCT p.id), 1), 2) as avg_clicks_per_post
       FROM posts p
       LEFT JOIN button_clicks bc ON bc.post_id = p.id
       WHERE p.published_at >= datetime('now', '-' || ? || ' days')
       GROUP BY p.post_type
       ORDER BY avg_clicks_per_post DESC`
    )
    .all(days);
}

export function getEngagementByHour(days = 30) {
  const db = getDb();
  return db
    .prepare(
      `SELECT CAST(strftime('%H', p.published_at) AS INTEGER) as hour,
              COUNT(DISTINCT p.id) as post_count,
              COUNT(bc.id) as total_clicks,
              ROUND(CAST(COUNT(bc.id) AS REAL) / MAX(COUNT(DISTINCT p.id), 1), 2) as avg_clicks
       FROM posts p
       LEFT JOIN button_clicks bc ON bc.post_id = p.id
       WHERE p.published_at >= datetime('now', '-' || ? || ' days')
       GROUP BY hour
       ORDER BY hour`
    )
    .all(days);
}

export function getTopPosts(days = 7, limit = 10) {
  const db = getDb();
  return db
    .prepare(
      `SELECT p.*, COUNT(bc.id) as click_count
       FROM posts p
       LEFT JOIN button_clicks bc ON bc.post_id = p.id
       WHERE p.published_at >= datetime('now', '-' || ? || ' days')
       GROUP BY p.id
       ORDER BY click_count DESC
       LIMIT ?`
    )
    .all(days, limit);
}

export function getGrowthData(days = 30) {
  const db = getDb();
  return db
    .prepare(
      `SELECT date(recorded_at) as date,
              MAX(participants_count) as subscribers
       FROM channel_metrics
       WHERE recorded_at >= datetime('now', '-' || ? || ' days')
       GROUP BY date(recorded_at)
       ORDER BY date ASC`
    )
    .all(days);
}

export function getTopicEngagement(days = 30) {
  const db = getDb();
  const posts = db
    .prepare(
      `SELECT p.id, p.topics, COUNT(bc.id) as clicks
       FROM posts p
       LEFT JOIN button_clicks bc ON bc.post_id = p.id
       WHERE p.published_at >= datetime('now', '-' || ? || ' days')
         AND p.topics IS NOT NULL
       GROUP BY p.id`
    )
    .all(days);

  const topicMap = {};
  for (const post of posts) {
    try {
      const topics = JSON.parse(post.topics);
      for (const topic of topics) {
        if (!topicMap[topic]) topicMap[topic] = { topic, posts: 0, clicks: 0 };
        topicMap[topic].posts++;
        topicMap[topic].clicks += post.clicks;
      }
    } catch {
      // skip invalid JSON
    }
  }

  return Object.values(topicMap)
    .map((t) => ({ ...t, avgClicks: t.posts > 0 ? Math.round((t.clicks / t.posts) * 100) / 100 : 0 }))
    .sort((a, b) => b.avgClicks - a.avgClicks);
}

process.on('exit', () => {
  if (db) {
    try {
      db.close();
    } catch {
      // ignore
    }
  }
});
