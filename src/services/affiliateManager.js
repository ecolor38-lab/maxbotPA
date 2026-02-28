import { getDb } from '../db/database.js';

// Заблокированные в РФ сервисы — подменяем на российские аналоги
const BLOCKED_REPLACEMENTS = {
  'chat.openai.com': { name: 'GigaChat (аналог)', url: 'https://developers.sber.ru/gigachat' },
  'claude.ai': { name: 'GigaChat (аналог)', url: 'https://developers.sber.ru/gigachat' },
  'gemini.google.com': { name: 'YandexGPT (аналог)', url: 'https://ya.ru/ai' },
  'labs.openai.com': { name: 'Кандинский (аналог)', url: 'https://fusionbrain.ai' },
  'midjourney.com': { name: 'Кандинский (аналог)', url: 'https://fusionbrain.ai' },
  'stability.ai': { name: 'Кандинский (аналог)', url: 'https://fusionbrain.ai' }
};

const DEFAULT_AFFILIATES = [
  // Доступные в РФ без VPN
  { keyword: 'gigachat', name: 'GigaChat', url: 'https://developers.sber.ru/gigachat', category: 'llm' },
  { keyword: 'yandexgpt', name: 'YandexGPT', url: 'https://ya.ru/ai', category: 'llm' },
  { keyword: 'алиса', name: 'Алиса', url: 'https://ya.ru/alisa', category: 'llm' },
  { keyword: 'kandinsky', name: 'Кандинский', url: 'https://fusionbrain.ai', category: 'image' },
  { keyword: 'шедеврум', name: 'Шедеврум', url: 'https://shedevrum.ai', category: 'image' },
  { keyword: 'perplexity', name: 'Perplexity AI', url: 'https://perplexity.ai', category: 'search' },
  { keyword: 'notion ai', name: 'Notion AI', url: 'https://notion.so', category: 'productivity' },
  { keyword: 'cursor', name: 'Cursor', url: 'https://cursor.sh', category: 'code' },
  { keyword: 'suno', name: 'Suno AI', url: 'https://suno.ai', category: 'music' },
  { keyword: 'elevenlabs', name: 'ElevenLabs', url: 'https://elevenlabs.io', category: 'voice' },
  // Заблокированные — при упоминании показываем российский аналог
  { keyword: 'chatgpt', name: 'GigaChat (аналог ChatGPT)', url: 'https://developers.sber.ru/gigachat', category: 'llm' },
  { keyword: 'chat gpt', name: 'GigaChat (аналог ChatGPT)', url: 'https://developers.sber.ru/gigachat', category: 'llm' },
  { keyword: 'claude', name: 'GigaChat (аналог Claude)', url: 'https://developers.sber.ru/gigachat', category: 'llm' },
  { keyword: 'gemini', name: 'YandexGPT (аналог Gemini)', url: 'https://ya.ru/ai', category: 'llm' },
  { keyword: 'dall-e', name: 'Кандинский (аналог DALL-E)', url: 'https://fusionbrain.ai', category: 'image' },
  { keyword: 'midjourney', name: 'Кандинский (аналог Midjourney)', url: 'https://fusionbrain.ai', category: 'image' },
  { keyword: 'stable diffusion', name: 'Кандинский (аналог SD)', url: 'https://fusionbrain.ai', category: 'image' },
  { keyword: 'copilot', name: 'GigaCode (аналог Copilot)', url: 'https://developers.sber.ru/gigacode', category: 'code' }
];

export class AffiliateManager {
  constructor() {
    this.initDefaults();
  }

  initDefaults() {
    const db = getDb();

    // Обновляем заблокированные ссылки на аналоги
    for (const [blockedDomain, replacement] of Object.entries(BLOCKED_REPLACEMENTS)) {
      db.prepare("UPDATE affiliates SET name = ?, url = ? WHERE url LIKE ? AND url NOT LIKE ?")
        .run(replacement.name, replacement.url, `%${blockedDomain}%`, `%${replacement.url}%`);
    }

    const count = db.prepare('SELECT COUNT(*) as count FROM affiliates').get();
    if (count.count > 0) return;

    const stmt = db.prepare('INSERT OR IGNORE INTO affiliates (keyword, name, url, category) VALUES (?, ?, ?, ?)');
    const insertMany = db.transaction((items) => {
      for (const item of items) {
        stmt.run(item.keyword, item.name, item.url, item.category);
      }
    });
    insertMany(DEFAULT_AFFILIATES);
  }

  findMentionedTools(text) {
    if (!text) return [];

    const db = getDb();
    const affiliates = db.prepare('SELECT * FROM affiliates WHERE active = 1').all();
    const lower = text.toLowerCase();

    const matched = affiliates.filter((aff) => lower.includes(aff.keyword));

    // Deduplicate by URL — keep first match per unique URL
    const seenUrls = new Set();
    const unique = [];
    for (const aff of matched) {
      const url = aff.ref_url || aff.url;
      if (!seenUrls.has(url)) {
        seenUrls.add(url);
        unique.push({ id: aff.id, name: aff.name, url, category: aff.category });
      }
    }

    return unique.slice(0, 2);
  }

  buildAffiliateButtons(text) {
    const tools = this.findMentionedTools(text);
    if (tools.length === 0) return null;

    return tools.map((tool) => ({
      type: 'link',
      text: `🔗 ${tool.name}`,
      url: tool.url
    }));
  }

  addAffiliate({ keyword, name, url, refUrl, category }) {
    const db = getDb();
    const result = db
      .prepare('INSERT INTO affiliates (keyword, name, url, ref_url, category) VALUES (?, ?, ?, ?, ?)')
      .run(keyword, name, url, refUrl || null, category || null);
    return result.lastInsertRowid;
  }

  updateAffiliate(id, updates) {
    const db = getDb();
    const fields = [];
    const values = [];

    for (const [key, value] of Object.entries(updates)) {
      if (['keyword', 'name', 'url', 'ref_url', 'category', 'active'].includes(key)) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (fields.length === 0) return null;
    values.push(id);

    db.prepare(`UPDATE affiliates SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return db.prepare('SELECT * FROM affiliates WHERE id = ?').get(id);
  }

  listAffiliates() {
    const db = getDb();
    return db.prepare('SELECT * FROM affiliates ORDER BY clicks DESC').all();
  }

  recordClick(affiliateId, postId = null) {
    const db = getDb();
    db.prepare('INSERT INTO affiliate_clicks (affiliate_id, post_id) VALUES (?, ?)').run(affiliateId, postId);
    db.prepare('UPDATE affiliates SET clicks = clicks + 1 WHERE id = ?').run(affiliateId);
  }

  getStats() {
    const db = getDb();
    return {
      total_affiliates: db.prepare('SELECT COUNT(*) as count FROM affiliates WHERE active = 1').get().count,
      total_clicks: db.prepare('SELECT COALESCE(SUM(clicks), 0) as total FROM affiliates').get().total,
      top: db.prepare('SELECT keyword, name, clicks, category FROM affiliates WHERE active = 1 ORDER BY clicks DESC LIMIT 10').all()
    };
  }
}
