import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import axios from 'axios';
import { getDb } from '../db/database.js';

const SYSTEM_PROMPT = 'Ты полезный AI-ассистент канала «Нейро.Новости». Отвечай на русском языке кратко и по делу. Не используй markdown-заголовки. Если тебя спросят кто ты — скажи что ты AI-ассистент канала Нейро.Новости.';

const MAX_MESSAGE_LENGTH = 4000;

export class ChatBot {
  constructor(config) {
    this.config = config;
    this.apiUrl = 'https://platform-api.max.ru';
    this.botToken = config.max?.botToken;
    this.chatLink = config.max?.chatLink || 'https://max.ru';
    this.channelChatId = config.max?.chatId;

    this.FREE_DAILY_LIMIT = config.chat?.freeDailyLimit || 10;
    this.PREMIUM_DAILY_LIMIT = config.chat?.premiumDailyLimit || 100;
    this.CONTEXT_MESSAGES = config.chat?.contextMessages || 10;

    this.anthropic = config.anthropic?.apiKey
      ? new Anthropic({ apiKey: config.anthropic.apiKey })
      : null;
    this.openai = config.openai?.apiKey
      ? new OpenAI({ apiKey: config.openai.apiKey })
      : null;
  }

  // --- Main entry point for message_created ---
  async handleMessage(update) {
    try {
      const msg = update.message;
      if (!msg) return;

      const body = msg.body;
      if (!body) return;

      // Ignore bot messages (prevent infinite loop)
      if (msg.sender?.is_bot) return;

      // Only handle DM (dialog) messages
      const recipient = msg.recipient;
      if (recipient?.chat_type !== 'dialog') return;

      const userId = msg.sender?.user_id ? String(msg.sender.user_id) : null;
      if (!userId) return;

      const text = (body.text || '').trim();
      if (!text) return;

      // Input length validation
      if (text.length > MAX_MESSAGE_LENGTH) {
        await this.sendMessage(userId, `⚠️ Сообщение слишком длинное (${text.length} символов). Максимум: ${MAX_MESSAGE_LENGTH}.`);
        return;
      }

      const username = msg.sender?.username || null;
      const firstName = msg.sender?.first_name || msg.sender?.name || null;

      const user = this.getOrCreateUser(userId, username, firstName);
      this.resetDailyCounterIfNeeded(user);
      this.checkPremiumExpiry(user);

      // Handle commands
      if (text.startsWith('/')) {
        await this.handleCommand(userId, text, user);
        return;
      }

      // Check subscription
      const subscribed = await this.checkSubscription(userId);
      if (!subscribed) {
        await this.sendMessage(userId, '🔒 Для общения с AI-ассистентом подпишитесь на канал:', this.buildSubscriptionKeyboard());
        return;
      }

      // Re-read counter from DB for accurate limit check
      const db = getDb();
      const freshUser = db.prepare('SELECT messages_today, is_premium FROM bot_users WHERE user_id = ?').get(userId);
      const limit = freshUser.is_premium ? this.PREMIUM_DAILY_LIMIT : this.FREE_DAILY_LIMIT;
      if (freshUser.messages_today >= limit) {
        if (freshUser.is_premium) {
          await this.sendMessage(userId, `⏳ Дневной лимит исчерпан (${limit}/${limit}). Попробуйте завтра!`);
        } else {
          await this.sendMessage(
            userId,
            `⏳ Дневной лимит исчерпан (${this.FREE_DAILY_LIMIT}/${this.FREE_DAILY_LIMIT}).\n\n💎 *Premium* — ${this.PREMIUM_DAILY_LIMIT} сообщений/день:\n`,
            this.buildPremiumKeyboard()
          );
        }
        return;
      }

      // Load context & call AI
      const context = this.getConversationContext(userId, this.CONTEXT_MESSAGES);
      const reply = await this.callAI(userId, text, context, user.model);

      // Save messages
      this.saveMessage(userId, 'user', text);
      this.saveMessage(userId, 'assistant', reply, user.model);

      // Update counters atomically
      db.prepare(`
        UPDATE bot_users SET messages_today = messages_today + 1, total_messages = total_messages + 1
        WHERE user_id = ?
      `).run(userId);

      // Prune old messages (keep last 100 per user)
      this.pruneOldMessages(userId);

      await this.sendMessage(userId, reply);
    } catch (error) {
      console.error('❌ ChatBot handleMessage error:', error.message);
    }
  }

  // --- bot_started event ---
  async handleBotStarted(update) {
    try {
      const userId = update.user?.user_id ? String(update.user.user_id) : null;
      if (!userId) return;

      const username = update.user?.username || null;
      const firstName = update.user?.first_name || update.user?.name || null;
      this.getOrCreateUser(userId, username, firstName);

      const welcome = `👋 Привет! Я AI-ассистент канала *Нейро.Новости*.

Могу ответить на любой вопрос об искусственном интеллекте, технологиях, программировании и многом другом.

Для начала подпишитесь на канал:`;

      await this.sendMessage(userId, welcome, this.buildSubscriptionKeyboard());
    } catch (error) {
      console.error('❌ ChatBot handleBotStarted error:', error.message);
    }
  }

  // --- Callback from DM (check:subscription, model:*) ---
  async handleCallbackFromDM(update) {
    try {
      const { callback } = update;
      if (!callback) return;

      const callbackId = callback.callback_id;
      const payload = callback.payload || '';
      const userId = callback.user?.user_id ? String(callback.user.user_id) : null;
      if (!userId) return;

      if (payload === 'check:subscription') {
        await this.handleSubscriptionCheck(callbackId, userId);
      } else if (payload.startsWith('model:')) {
        await this.handleModelSwitch(callbackId, userId, payload);
      }
    } catch (error) {
      console.error('❌ ChatBot handleCallbackFromDM error:', error.message);
    }
  }

  async handleSubscriptionCheck(callbackId, userId) {
    const subscribed = await this.checkSubscriptionViaAPI(userId);
    if (subscribed) {
      const db = getDb();
      db.prepare('UPDATE bot_users SET is_subscribed = 1 WHERE user_id = ?').run(userId);
      await this.answerCallback(callbackId, '✅ Подписка подтверждена!');
      await this.sendMessage(userId, '✅ Подписка подтверждена! Теперь можете задавать вопросы.\n\nВыберите модель AI:', this.buildModelsKeyboard());
    } else {
      await this.answerCallback(callbackId, '❌ Сначала подпишитесь на канал');
    }
  }

  async handleModelSwitch(callbackId, userId, payload) {
    const modelMap = {
      'model:gpt-4o-mini': 'gpt-4o-mini',
      'model:claude-haiku': 'claude-haiku-4-5-20251001'
    };
    const model = modelMap[payload];
    if (!model) return;

    const db = getDb();
    db.prepare('UPDATE bot_users SET model = ? WHERE user_id = ?').run(model, userId);

    const label = model.startsWith('gpt') ? 'GPT-4o-mini' : 'Claude Haiku';
    await this.answerCallback(callbackId, `✅ Модель: ${label}`);
    await this.sendMessage(userId, `🤖 Модель переключена на *${label}*. Просто напишите сообщение!`);
  }

  // --- Commands ---
  async handleCommand(userId, text, user) {
    const cmd = text.split(/\s/)[0].toLowerCase();

    switch (cmd) {
      case '/start': {
        const welcome = `👋 Привет! Я AI-ассистент канала *Нейро.Новости*.

Могу ответить на любой вопрос об искусственном интеллекте, технологиях, программировании и многом другом.

📊 Бесплатно: ${this.FREE_DAILY_LIMIT} сообщений/день
💎 Premium: ${this.PREMIUM_DAILY_LIMIT} сообщений/день

Для начала подпишитесь на канал:`;
        await this.sendMessage(userId, welcome, this.buildSubscriptionKeyboard());
        break;
      }

      case '/models':
        await this.sendMessage(userId, `🤖 Выберите модель AI:\n\nТекущая: *${this.getModelLabel(user.model)}*`, this.buildModelsKeyboard());
        break;

      case '/premium': {
        if (user.is_premium) {
          await this.sendMessage(userId, `💎 У вас Premium!\nДействует до: ${user.premium_until || '∞'}\nЛимит: ${this.PREMIUM_DAILY_LIMIT} сообщений/день\nИспользовано сегодня: ${user.messages_today}`);
        } else {
          await this.sendMessage(
            userId,
            `💎 *Premium-доступ* — 390₽/мес\n\n✅ ${this.PREMIUM_DAILY_LIMIT} сообщений/день (вместо ${this.FREE_DAILY_LIMIT})\n✅ Приоритетные ответы\n\nИспользовано сегодня: ${user.messages_today}/${this.FREE_DAILY_LIMIT}`,
            this.buildPremiumKeyboard()
          );
        }
        break;
      }

      case '/reset': {
        const db = getDb();
        db.prepare('DELETE FROM chat_messages WHERE user_id = ?').run(userId);
        await this.sendMessage(userId, '🗑 Контекст диалога очищен. Начинаем сначала!');
        break;
      }

      case '/help':
        await this.sendMessage(userId, `📋 *Команды:*\n\n/start — начало работы\n/models — выбор модели AI\n/premium — информация о Premium\n/reset — очистить контекст диалога\n/help — эта справка\n\nИли просто напишите сообщение!`);
        break;

      default:
        await this.sendMessage(userId, '❓ Неизвестная команда. Напишите /help для списка команд.');
    }
  }

  // --- AI calls ---
  async callAI(userId, userMessage, context, model) {
    const messages = context.map((m) => ({ role: m.role, content: m.content }));
    messages.push({ role: 'user', content: userMessage });

    try {
      if (model.startsWith('gpt') && this.openai) {
        return await this.callOpenAI(SYSTEM_PROMPT, messages);
      } else if (model.startsWith('claude') && this.anthropic) {
        return await this.callClaude(SYSTEM_PROMPT, messages);
      } else if (this.openai) {
        return await this.callOpenAI(SYSTEM_PROMPT, messages);
      } else if (this.anthropic) {
        return await this.callClaude(SYSTEM_PROMPT, messages);
      }
    } catch (error) {
      console.error('❌ AI call error:', error.message);
      return '⚠️ Произошла ошибка при обращении к AI. Попробуйте ещё раз через минуту.';
    }

    return '⚠️ AI-сервисы временно недоступны.';
  }

  async callClaude(systemPrompt, messages) {
    const response = await this.anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1000,
      system: systemPrompt,
      messages,
      temperature: 0.7
    });
    return response.content[0].text;
  }

  async callOpenAI(systemPrompt, messages) {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      max_tokens: 1000,
      temperature: 0.7
    });
    return response.choices[0].message.content;
  }

  // --- Subscription check ---
  async checkSubscription(userId) {
    const db = getDb();
    const user = db.prepare('SELECT is_subscribed FROM bot_users WHERE user_id = ?').get(userId);
    if (user?.is_subscribed) return true;

    // Check via API
    return this.checkSubscriptionViaAPI(userId);
  }

  async checkSubscriptionViaAPI(userId) {
    if (!this.channelChatId) {
      // No channel configured — allow all
      return true;
    }

    try {
      const response = await axios.get(`${this.apiUrl}/chats/${this.channelChatId}/members`, {
        params: { user_ids: [parseInt(userId)] },
        headers: { Authorization: this.botToken },
        timeout: 10000
      });

      const members = response.data?.members || [];
      const isMember = members.some((m) => String(m.user_id) === String(userId));

      if (isMember) {
        const db = getDb();
        db.prepare('UPDATE bot_users SET is_subscribed = 1 WHERE user_id = ?').run(userId);
      }

      return isMember;
    } catch (error) {
      const status = error.response?.status;
      if (status && status >= 400 && status < 500) {
        // Client error (403 = bot not admin, 404 = chat not found) — deny access
        console.warn(`⚠️ Subscription check client error ${status}:`, error.message);
        return false;
      }
      // Network/server error — allow access to avoid blocking users
      console.warn('⚠️ Subscription check transient error:', error.message);
      return true;
    }
  }

  // --- Send message via MAX API ---
  async sendMessage(userId, text, keyboard) {
    try {
      const body = { text, format: 'markdown' };
      if (keyboard) {
        body.attachments = [keyboard];
      }

      await axios.post(`${this.apiUrl}/messages`, body, {
        params: { user_id: userId },
        headers: {
          Authorization: this.botToken,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
    } catch (error) {
      console.error('❌ Send message error:', error.response?.status, error.response?.data || error.message);
    }
  }

  async answerCallback(callbackId, notification) {
    try {
      await axios.post(
        `${this.apiUrl}/answers`,
        { notification },
        {
          params: { callback_id: callbackId },
          headers: {
            Authorization: this.botToken,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );
    } catch (error) {
      console.warn('⚠️ Answer callback error:', error.message);
    }
  }

  // --- Keyboards ---
  buildSubscriptionKeyboard() {
    return {
      type: 'inline_keyboard',
      payload: {
        buttons: [
          [{ type: 'link', text: '📢 Подписаться на канал', url: this.chatLink }],
          [{ type: 'callback', text: '✅ Проверить подписку', payload: 'check:subscription' }]
        ]
      }
    };
  }

  buildModelsKeyboard() {
    return {
      type: 'inline_keyboard',
      payload: {
        buttons: [
          [{ type: 'callback', text: '🟢 GPT-4o-mini (быстрый)', payload: 'model:gpt-4o-mini' }],
          [{ type: 'callback', text: '🟣 Claude Haiku (умный)', payload: 'model:claude-haiku' }]
        ]
      }
    };
  }

  buildPremiumKeyboard() {
    return {
      type: 'inline_keyboard',
      payload: {
        buttons: [
          [{ type: 'callback', text: '💎 Подключить Premium — 390₽/мес', payload: 'premium:buy' }]
        ]
      }
    };
  }

  // --- DB helpers ---
  getOrCreateUser(userId, username, firstName) {
    const db = getDb();
    let user = db.prepare('SELECT * FROM bot_users WHERE user_id = ?').get(userId);
    if (!user) {
      db.prepare(`
        INSERT INTO bot_users (user_id, username, first_name, last_message_date)
        VALUES (?, ?, ?, date('now'))
      `).run(userId, username || null, firstName || null);
      user = db.prepare('SELECT * FROM bot_users WHERE user_id = ?').get(userId);
    } else if (username || firstName) {
      db.prepare('UPDATE bot_users SET username = COALESCE(?, username), first_name = COALESCE(?, first_name) WHERE user_id = ?')
        .run(username, firstName, userId);
      user = db.prepare('SELECT * FROM bot_users WHERE user_id = ?').get(userId);
    }
    return user;
  }

  resetDailyCounterIfNeeded(user) {
    const today = new Date().toISOString().split('T')[0];
    if (user.last_message_date !== today) {
      const db = getDb();
      db.prepare('UPDATE bot_users SET messages_today = 0, last_message_date = ? WHERE user_id = ?')
        .run(today, user.user_id);
      user.messages_today = 0;
      user.last_message_date = today;
    }
  }

  checkPremiumExpiry(user) {
    if (user.is_premium && user.premium_until) {
      const now = new Date();
      const until = new Date(user.premium_until);
      if (until < now) {
        const db = getDb();
        db.prepare('UPDATE bot_users SET is_premium = 0, premium_until = NULL WHERE user_id = ?').run(user.user_id);
        user.is_premium = 0;
        user.premium_until = null;
      }
    }
  }

  getConversationContext(userId, limit) {
    const db = getDb();
    return db.prepare(`
      SELECT role, content FROM chat_messages
      WHERE user_id = ?
      ORDER BY id DESC
      LIMIT ?
    `).all(userId, limit).reverse();
  }

  saveMessage(userId, role, content, model) {
    const db = getDb();
    db.prepare(`
      INSERT INTO chat_messages (user_id, role, content, model)
      VALUES (?, ?, ?, ?)
    `).run(userId, role, content, model || null);
  }

  pruneOldMessages(userId) {
    try {
      const db = getDb();
      // Keep only the last 100 messages per user
      db.prepare(`
        DELETE FROM chat_messages WHERE user_id = ? AND id NOT IN (
          SELECT id FROM chat_messages WHERE user_id = ? ORDER BY id DESC LIMIT 100
        )
      `).run(userId, userId);
    } catch {
      // non-critical
    }
  }

  getModelLabel(model) {
    if (model?.startsWith('gpt')) return 'GPT-4o-mini';
    if (model?.startsWith('claude')) return 'Claude Haiku';
    return model || 'GPT-4o-mini';
  }
}
