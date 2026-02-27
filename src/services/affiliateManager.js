import { getDb } from '../db/database.js';

const DEFAULT_AFFILIATES = [
  { keyword: 'chatgpt', name: 'ChatGPT', url: 'https://chat.openai.com', category: 'llm' },
  { keyword: 'claude', name: 'Claude', url: 'https://claude.ai', category: 'llm' },
  { keyword: 'gemini', name: 'Google Gemini', url: 'https://gemini.google.com', category: 'llm' },
  { keyword: 'midjourney', name: 'Midjourney', url: 'https://midjourney.com', category: 'image' },
  { keyword: 'dall-e', name: 'DALL-E', url: 'https://labs.openai.com', category: 'image' },
  { keyword: 'stable diffusion', name: 'Stable Diffusion', url: 'https://stability.ai', category: 'image' },
  { keyword: 'perplexity', name: 'Perplexity AI', url: 'https://perplexity.ai', category: 'search' },
  { keyword: 'notion ai', name: 'Notion AI', url: 'https://notion.so', category: 'productivity' },
  { keyword: 'copilot', name: 'GitHub Copilot', url: 'https://github.com/features/copilot', category: 'code' },
  { keyword: 'cursor', name: 'Cursor', url: 'https://cursor.sh', category: 'code' },
  { keyword: 'runway', name: 'Runway ML', url: 'https://runwayml.com', category: 'video' },
  { keyword: 'suno', name: 'Suno AI', url: 'https://suno.ai', category: 'music' },
  { keyword: 'elevenlabs', name: 'ElevenLabs', url: 'https://elevenlabs.io', category: 'voice' },
  { keyword: 'gigachat', name: 'GigaChat', url: 'https://developers.sber.ru/gigachat', category: 'llm' },
  { keyword: 'yandexgpt', name: 'YandexGPT', url: 'https://ya.ru/ai', category: 'llm' },
  { keyword: 'kandinsky', name: 'Кандинский', url: 'https://fusionbrain.ai', category: 'image' }
];

export class AffiliateManager {
  constructor() {
    this.initDefaults();
  }

  initDefaults() {
    const db = getDb();
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

    return affiliates
      .filter((aff) => lower.includes(aff.keyword))
      .slice(0, 2)
      .map((aff) => ({
        id: aff.id,
        name: aff.name,
        url: aff.ref_url || aff.url,
        category: aff.category
      }));
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
