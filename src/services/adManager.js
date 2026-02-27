import { getDb, getLatestMetrics } from '../db/database.js';

export class AdManager {
  getPricing() {
    const metrics = getLatestMetrics();
    const subscribers = metrics?.participants_count || 0;
    const basePrice = Math.max(500, Math.round(subscribers * 0.5));

    return {
      subscribers,
      slots: {
        morning: { time: '08:00-10:00', price: Math.round(basePrice * 1.2), label: 'Утро (премиум)' },
        day: { time: '11:00-15:00', price: basePrice, label: 'День (стандарт)' },
        evening: { time: '17:00-21:00', price: Math.round(basePrice * 1.1), label: 'Вечер' }
      },
      packages: {
        single: { posts: 1, price: basePrice, discount: 0 },
        pack3: { posts: 3, price: Math.round(basePrice * 3 * 0.85), discount: 15 },
        pack5: { posts: 5, price: Math.round(basePrice * 5 * 0.8), discount: 20 },
        week: { posts: 7, price: Math.round(basePrice * 7 * 0.7), discount: 30 }
      },
      formula: 'subscribers × 0.5₽, min 500₽',
      updated_at: new Date().toISOString()
    };
  }

  createCampaign({ clientName, brief, slot = 'day', scheduledDate, price }) {
    const db = getDb();
    const pricing = this.getPricing();
    const slotPrice = pricing.slots[slot]?.price || pricing.slots.day.price;
    const finalPrice = price || slotPrice;

    const result = db
      .prepare(
        `INSERT INTO ad_campaigns (client_name, brief, slot, scheduled_date, price)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(clientName, brief || null, slot, scheduledDate || null, finalPrice);

    return {
      id: result.lastInsertRowid,
      price: finalPrice,
      slot
    };
  }

  getCampaign(id) {
    const db = getDb();
    return db.prepare('SELECT * FROM ad_campaigns WHERE id = ?').get(id);
  }

  listCampaigns(status = null) {
    const db = getDb();
    if (status) {
      return db.prepare('SELECT * FROM ad_campaigns WHERE status = ? ORDER BY created_at DESC').all(status);
    }
    return db.prepare('SELECT * FROM ad_campaigns ORDER BY created_at DESC').all();
  }

  updateCampaign(id, updates) {
    const db = getDb();
    const fields = [];
    const values = [];

    for (const [key, value] of Object.entries(updates)) {
      if (['client_name', 'brief', 'slot', 'scheduled_date', 'scheduled_time', 'status', 'price', 'paid'].includes(key)) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (fields.length === 0) return null;
    values.push(id);

    db.prepare(`UPDATE ad_campaigns SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return this.getCampaign(id);
  }

  deleteCampaign(id) {
    const db = getDb();
    db.prepare('DELETE FROM ad_campaigns WHERE id = ?').run(id);
  }

  markAsPublished(campaignId, postId, messageId) {
    const db = getDb();
    db.prepare(
      `UPDATE ad_campaigns SET status = 'published', post_id = ?, message_id = ?, published_at = datetime('now')
       WHERE id = ?`
    ).run(postId || null, messageId || null, campaignId);
  }

  getScheduledForToday() {
    const db = getDb();
    const today = new Date().toISOString().split('T')[0];
    return db
      .prepare("SELECT * FROM ad_campaigns WHERE scheduled_date = ? AND status = 'pending' ORDER BY scheduled_time ASC")
      .all(today);
  }

  getNextPendingCampaign() {
    const db = getDb();
    return db
      .prepare("SELECT * FROM ad_campaigns WHERE status = 'pending' AND paid = 1 ORDER BY scheduled_date ASC, created_at ASC LIMIT 1")
      .get();
  }

  getAdStats() {
    const db = getDb();
    const total = db.prepare('SELECT COUNT(*) as count FROM ad_campaigns').get();
    const published = db.prepare("SELECT COUNT(*) as count FROM ad_campaigns WHERE status = 'published'").get();
    const pending = db.prepare("SELECT COUNT(*) as count FROM ad_campaigns WHERE status = 'pending'").get();
    const revenue = db.prepare("SELECT COALESCE(SUM(price), 0) as total FROM ad_campaigns WHERE status = 'published'").get();

    return {
      total: total.count,
      published: published.count,
      pending: pending.count,
      total_revenue: revenue.total
    };
  }
}
