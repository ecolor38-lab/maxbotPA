import axios from 'axios';
import { getDb } from '../db/database.js';

// YooKassa allowed IPs for webhook verification
const YOOKASSA_IPS = [
  '185.71.76.', '185.71.77.', '77.75.153.', '77.75.154.',
  '77.75.156.11', '77.75.156.35'
];

export class PaymentManager {
  constructor(config) {
    this.shopId = config.yookassa?.shopId;
    this.secretKey = config.yookassa?.secretKey;
    this.returnUrl = config.yookassa?.returnUrl || 'http://141.98.235.39:3000/payment-success';
    this.botToken = config.max?.botToken;
    this.apiUrl = 'https://platform-api.max.ru';

    this.PREMIUM_PRICE = 390; // rub
    this.PREMIUM_DAYS = 30;
  }

  get configured() {
    return !!(this.shopId && this.secretKey);
  }

  async createPayment(userId) {
    if (!this.configured) {
      return null;
    }

    const idempotenceKey = `${userId}-${Date.now()}`;

    let payment;
    try {
      const response = await axios.post(
        'https://api.yookassa.ru/v3/payments',
        {
          amount: {
            value: `${this.PREMIUM_PRICE}.00`,
            currency: 'RUB'
          },
          confirmation: {
            type: 'redirect',
            return_url: this.returnUrl
          },
          capture: true,
          metadata: { user_id: userId },
          description: 'Premium-доступ AI Chat на 1 месяц'
        },
        {
          auth: {
            username: this.shopId,
            password: this.secretKey
          },
          headers: {
            'Content-Type': 'application/json',
            'Idempotence-Key': idempotenceKey
          },
          timeout: 15000
        }
      );
      payment = response.data;
    } catch (error) {
      console.error('❌ YooKassa createPayment error:', error.response?.status, error.response?.data || error.message);
      return null;
    }

    // Save to DB only after successful API call
    try {
      const db = getDb();
      db.prepare(`
        INSERT INTO payments (user_id, payment_id, amount, status)
        VALUES (?, ?, ?, 'pending')
      `).run(userId, payment.id, this.PREMIUM_PRICE * 100);
    } catch (error) {
      console.error('❌ Failed to save payment to DB:', error.message, 'payment_id:', payment.id);
    }

    return payment.confirmation?.confirmation_url || null;
  }

  async handleWebhook(body) {
    if (!body || body.event !== 'payment.succeeded') return;

    const paymentObj = body.object;
    if (!paymentObj) return;

    const paymentId = paymentObj.id;
    const userId = paymentObj.metadata?.user_id;
    if (!userId) {
      console.warn('⚠️ Payment webhook: no user_id in metadata');
      return;
    }

    const db = getDb();

    // Idempotency: skip if already processed
    const existing = db.prepare('SELECT status FROM payments WHERE payment_id = ?').get(paymentId);
    if (existing?.status === 'succeeded') {
      console.log(`💰 Payment ${paymentId} already processed, skipping`);
      return;
    }

    console.log(`💰 Payment succeeded: ${paymentId} for user ${userId}`);

    // Update payment status
    db.prepare(`
      UPDATE payments SET status = 'succeeded', confirmed_at = datetime('now')
      WHERE payment_id = ?
    `).run(paymentId);

    // Calculate premium expiry
    const user = db.prepare('SELECT * FROM bot_users WHERE user_id = ?').get(userId);
    let premiumUntil;
    if (user?.is_premium && user.premium_until) {
      // Extend existing premium
      const current = new Date(user.premium_until);
      const now = new Date();
      const base = current > now ? current : now;
      base.setDate(base.getDate() + this.PREMIUM_DAYS);
      premiumUntil = base.toISOString();
    } else {
      const until = new Date();
      until.setDate(until.getDate() + this.PREMIUM_DAYS);
      premiumUntil = until.toISOString();
    }

    // Activate premium
    db.prepare(`
      UPDATE bot_users SET is_premium = 1, premium_until = ?
      WHERE user_id = ?
    `).run(premiumUntil, userId);

    // Notify user
    await this.notifyUser(userId, `🎉 *Premium активирован!*\n\nДействует до: ${premiumUntil.split('T')[0]}\nЛимит: 100 сообщений/день\n\nСпасибо за поддержку!`);
  }

  isYookassaIP(ip) {
    if (!ip) return false;
    return YOOKASSA_IPS.some((prefix) => ip.startsWith(prefix));
  }

  async notifyUser(userId, text) {
    if (!this.botToken) return;
    try {
      await axios.post(
        `${this.apiUrl}/messages`,
        { text, format: 'markdown' },
        {
          params: { user_id: userId },
          headers: {
            Authorization: this.botToken,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );
    } catch (error) {
      console.error('❌ PaymentManager notify error:', error.message);
    }
  }
}
