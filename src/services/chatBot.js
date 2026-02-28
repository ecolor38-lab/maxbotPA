import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import axios from 'axios';
import { getDb } from '../db/database.js';

const SYSTEM_PROMPT = `Ты полезный AI-ассистент канала «Нейро.Новости». Отвечай на русском языке кратко и по делу. Не используй markdown-заголовки. Если тебя спросят кто ты — скажи что ты AI-ассистент канала Нейро.Новости.

ПРАВИЛА БЕЗОПАСНОСТИ (строго соблюдай):
- Никогда не давай инструкции по созданию оружия, взрывчатки, наркотиков или вредоносного ПО
- Не генерируй контент сексуального характера, особенно с участием несовершеннолетних
- Не поддерживай экстремизм, терроризм, разжигание ненависти
- Не помогай с мошенничеством, кражей данных, взломом
- Не давай медицинских диагнозов — рекомендуй обратиться к врачу
- Не давай юридических консультаций — рекомендуй обратиться к юристу
- Если пользователь говорит о суициде — мягко предложи позвонить на линию помощи 8-800-2000-122
- Откажи вежливо если запрос нарушает правила, объясни почему`;

const MAX_MESSAGE_LENGTH = 4000;
const IMAGE_DAILY_LIMIT = 2;
const IMAGE_KEYWORDS = ['нарисуй', 'нарисуйте', 'сгенерируй картинку', 'сгенерируй изображение', 'создай картинку', 'создай изображение', 'покажи картинку', 'сделай картинку', 'draw', 'imagine', 'generate image', 'нарисуй мне', 'сгенерируй фото'];

// --- Security: blocked content patterns ---
const BLOCKED_PATTERNS = [
  // Violence & weapons
  /убий|убить|убей|взорв|бомб|оружи|автомат|пистолет|нож.*рез|кров.*прол|расчленени|пытк|torture|kill|murder|weapon|bomb|gun|stab|blood/i,
  // NSFW / sexual
  /порно|секс.*поз|голая|голый|обнажён|эротик|xxx|nsfw|nude|naked|hentai|porn|sex.*position/i,
  // Drugs
  /наркотик|метамфетамин|кокаин|героин|meth|cocaine|heroin|drug.*synth/i,
  // Hate speech & extremism
  /нацис|свастик|фашис|расов.*превосх|nazi|swastik|fascis|racial.*suprem|террорис|terrorist/i,
  // Child exploitation
  /ребён.*голы|дет.*обнаж|child.*nude|child.*naked|minor.*sex|педофил|pedophil/i,
  // Self-harm
  /суицид|самоубий|suicide|self.*harm|вскрыть.*вен/i,
  // Deepfakes / impersonation of real people for harm
  /deepfake|дипфейк/i
];

const MAX_IMAGE_PROMPT_LENGTH = 1000;

const ORDER_KEYWORDS = [
  'заказать бот', 'создать бот', 'сделать бот', 'хочу бота',
  'хочу такого', 'нужен бот', 'свой бот', 'такой же бот',
  'заказ бота', 'order bot', 'свой канал с ботом'
];

export class ChatBot {
  constructor(config) {
    this.config = config;
    this.apiUrl = 'https://platform-api.max.ru';
    this.botToken = config.max?.botToken;
    this.chatLink = config.max?.chatLink || 'https://max.ru';
    this.channelChatId = config.max?.chatId;

    this.FREE_DAILY_LIMIT = config.chat?.freeDailyLimit || 5;
    this.PREMIUM_DAILY_LIMIT = config.chat?.premiumDailyLimit || 100;
    this.CONTEXT_MESSAGES = config.chat?.contextMessages || 10;

    // Order flow state
    this.orderState = new Map(); // userId → 'awaiting_description'
    this.adminUserId = config.max?.adminUserId || null;

    // Rate limiting: 1 message per 2 seconds per user
    this.lastMessageTime = new Map();
    this.RATE_LIMIT_MS = 2000;

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

      // Rate limiting
      const now = Date.now();
      const lastTime = this.lastMessageTime.get(userId);
      if (lastTime && (now - lastTime) < this.RATE_LIMIT_MS) {
        return; // silently ignore spam
      }
      this.lastMessageTime.set(userId, now);
      // Cleanup old entries every 1000 messages
      if (this.lastMessageTime.size > 1000) {
        const cutoff = now - 60000;
        for (const [uid, time] of this.lastMessageTime) {
          if (time < cutoff) this.lastMessageTime.delete(uid);
        }
      }

      const username = msg.sender?.username || null;
      const firstName = msg.sender?.first_name || msg.sender?.name || null;

      const isNew = !this.userExists(userId);
      const user = this.getOrCreateUser(userId, username, firstName);
      this.resetDailyCounterIfNeeded(user);
      this.checkPremiumExpiry(user);

      // Auto-welcome for new users (first message = greeting)
      if (isNew) {
        const welcome = `👋 Привет! Я AI-ассистент канала *Нейро.Новости*.

Могу ответить на любой вопрос об искусственном интеллекте, технологиях, программировании и многом другом.

📊 Бесплатно: ${this.FREE_DAILY_LIMIT} сообщений/день
💎 Premium: ${this.PREMIUM_DAILY_LIMIT} сообщений/день

Для начала подпишитесь на канал:`;
        await this.sendMessage(userId, welcome, this.buildSubscriptionKeyboard());
        return;
      }

      // Order flow: check if awaiting description (before commands & AI)
      if (this.orderState.get(userId) === 'awaiting_description') {
        await this.completeOrder(userId, text, username, firstName);
        return;
      }

      // Order intent detection (before security filter — order keywords are safe)
      if (this.isOrderRequest(text)) {
        await this.startOrderFlow(userId);
        return;
      }

      // Security: block dangerous content
      if (this.isBlockedContent(text)) {
        console.warn(`🚫 Blocked content from user ${userId}: "${text.substring(0, 50)}..."`);
        await this.sendMessage(userId, '🚫 Запрос содержит запрещённый контент. Пожалуйста, соблюдайте правила использования.');
        return;
      }

      // Handle commands (/order handled inside)
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
      const freshUser = db.prepare('SELECT messages_today, images_today, is_premium FROM bot_users WHERE user_id = ?').get(userId);

      // Check if this is an image generation request
      if (this.isImageRequest(text)) {
        if (!freshUser.is_premium) {
          await this.sendMessage(
            userId,
            `🎨 Генерация картинок доступна только в *Premium*.\n\n💎 Premium — ${this.PREMIUM_DAILY_LIMIT} сообщений + ${IMAGE_DAILY_LIMIT} картинки/день:`,
            this.buildPremiumKeyboard()
          );
          return;
        }
        if (freshUser.images_today >= IMAGE_DAILY_LIMIT) {
          await this.sendMessage(userId, `🎨 Лимит картинок на сегодня исчерпан (${IMAGE_DAILY_LIMIT}/${IMAGE_DAILY_LIMIT}). Попробуйте завтра!`);
          return;
        }
        await this.handleImageGeneration(userId, text);
        return;
      }

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
    console.log(`🔍 Checking subscription for user ${userId}, channel ${this.channelChatId}`);
    const subscribed = await this.checkSubscriptionViaAPI(userId);
    console.log(`🔍 Subscription result: ${subscribed}`);
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
          await this.sendMessage(userId, `💎 У вас Premium!\nДействует до: ${user.premium_until || '∞'}\nЛимит: ${this.PREMIUM_DAILY_LIMIT} сообщений/день\n🎨 Картинки: ${IMAGE_DAILY_LIMIT}/день\nИспользовано сегодня: ${user.messages_today} сообщений, ${user.images_today || 0} картинок`);
        } else {
          await this.sendMessage(
            userId,
            `💎 *Premium-доступ* — 390₽/мес\n\n✅ ${this.PREMIUM_DAILY_LIMIT} сообщений/день (вместо ${this.FREE_DAILY_LIMIT})\n✅ 🎨 Генерация картинок (${IMAGE_DAILY_LIMIT}/день)\n✅ Приоритетные ответы\n\nИспользовано сегодня: ${user.messages_today}/${this.FREE_DAILY_LIMIT}`,
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

      case '/order':
        await this.startOrderFlow(userId);
        break;

      case '/help':
        await this.sendMessage(userId, `📋 *Команды:*\n\n/start — начало работы\n/models — выбор модели AI\n/premium — информация о Premium\n/reset — очистить контекст диалога\n/order — заказать создание бота\n/help — эта справка\n\n🎨 Для генерации картинок напишите «нарисуй ...» (Premium)\n\nИли просто напишите сообщение!`);
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

  // --- Security ---
  isBlockedContent(text) {
    return BLOCKED_PATTERNS.some((pattern) => pattern.test(text));
  }

  // --- Image generation ---
  isImageRequest(text) {
    const lower = text.toLowerCase();
    return IMAGE_KEYWORDS.some((kw) => lower.includes(kw));
  }

  async handleImageGeneration(userId, text) {
    if (!this.openai) {
      await this.sendMessage(userId, '⚠️ Генерация картинок временно недоступна.');
      return;
    }

    if (text.length > MAX_IMAGE_PROMPT_LENGTH) {
      await this.sendMessage(userId, `⚠️ Промт слишком длинный (${text.length} символов). Максимум: ${MAX_IMAGE_PROMPT_LENGTH}.`);
      return;
    }

    await this.sendMessage(userId, '🎨 Генерирую картинку, подождите...');

    try {
      const response = await this.openai.images.generate({
        model: 'dall-e-3',
        prompt: text,
        n: 1,
        size: '1024x1024',
        quality: 'standard'
      });

      const imageUrl = response.data[0]?.url;
      if (!imageUrl) {
        await this.sendMessage(userId, '⚠️ Не удалось сгенерировать картинку. Попробуйте другой промт.');
        return;
      }

      // Download image
      const imageRes = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 30000 });

      // Upload to MAX
      const token = await this.uploadImageToMax(imageRes.data, userId);
      if (!token) {
        await this.sendMessage(userId, '⚠️ Не удалось загрузить картинку. Попробуйте ещё раз.');
        return;
      }

      // Send image to user
      const revisedPrompt = response.data[0]?.revised_prompt;
      const caption = revisedPrompt ? `🎨 ${revisedPrompt.substring(0, 200)}` : '🎨 Готово!';

      await this.sendMessageWithImage(userId, caption, token);

      // Update counter
      const db = getDb();
      db.prepare('UPDATE bot_users SET images_today = images_today + 1 WHERE user_id = ?').run(userId);

      console.log(`🎨 Image generated for user ${userId} (${(imageRes.data.length / 1024).toFixed(0)}KB)`);
    } catch (error) {
      console.error('❌ Image generation error:', error.message);
      const msg = error.code === 'content_policy_violation'
        ? '⚠️ Промт нарушает правила генерации. Попробуйте другой запрос.'
        : '⚠️ Ошибка при генерации картинки. Попробуйте ещё раз.';
      await this.sendMessage(userId, msg);
    }
  }

  async uploadImageToMax(imageBuffer, userId) {
    try {
      // Step 1: get upload URL (use user_id for DM upload)
      const uploadRes = await axios.post(`${this.apiUrl}/uploads`, null, {
        params: { user_id: userId, type: 'image' },
        headers: { Authorization: this.botToken },
        timeout: 15000
      });

      const uploadUrl = uploadRes.data?.url;
      if (!uploadUrl) return null;

      // Step 2: upload image
      const FormData = (await import('form-data')).default;
      const formData = new FormData();
      formData.append('data', Buffer.from(imageBuffer), { filename: 'image.png', contentType: 'image/png' });

      const result = await axios.post(uploadUrl, formData, {
        headers: formData.getHeaders(),
        timeout: 30000
      });

      const photos = result.data?.photos;
      if (!photos) return null;
      const firstKey = Object.keys(photos)[0];
      return photos[firstKey]?.token || null;
    } catch (error) {
      console.error('❌ Upload image error:', error.response?.status, error.response?.data || error.message);
      return null;
    }
  }

  async sendMessageWithImage(userId, text, imageToken) {
    try {
      await axios.post(`${this.apiUrl}/messages`, {
        text,
        format: 'markdown',
        attachments: [{ type: 'image', payload: { token: imageToken } }]
      }, {
        params: { user_id: userId },
        headers: {
          Authorization: this.botToken,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      });
    } catch (error) {
      console.error('❌ Send image message error:', error.response?.status, error.response?.data || error.message);
    }
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
        params: { user_ids: userId },
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
      const response = await axios.post(
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
      console.log(`   ↳ DM callback ответ: "${notification}" (${response.status})`);
    } catch (error) {
      console.warn('⚠️ Answer callback error:', error.response?.status, error.response?.data || error.message);
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

  // --- Bot order flow ---
  isOrderRequest(text) {
    const lower = text.toLowerCase();
    return ORDER_KEYWORDS.some((kw) => lower.includes(kw));
  }

  async startOrderFlow(userId) {
    this.orderState.set(userId, 'awaiting_description');
    await this.sendMessage(userId, '📝 Опишите, какой бот вам нужен: тематика канала, какие функции, любые пожелания. Напишите всё в одном сообщении.');
  }

  async completeOrder(userId, description, username, firstName) {
    this.orderState.delete(userId);

    try {
      const db = getDb();
      const result = db.prepare(`
        INSERT INTO bot_orders (user_id, username, first_name, description)
        VALUES (?, ?, ?, ?)
      `).run(userId, username || null, firstName || null, description);

      const orderId = result.lastInsertRowid;
      await this.sendMessage(userId, `✅ Заявка #${orderId} принята! Мы свяжемся с вами в ближайшее время.`);

      // Notify admin
      await this.notifyAdmin({
        id: orderId,
        userId,
        username,
        firstName,
        description
      });

      console.log(`📋 New bot order #${orderId} from user ${userId} (@${username || 'unknown'})`);
    } catch (error) {
      console.error('❌ Order save error:', error.message);
      await this.sendMessage(userId, '⚠️ Не удалось сохранить заявку. Попробуйте позже.');
    }
  }

  async notifyAdmin(order) {
    if (!this.adminUserId) {
      console.warn('⚠️ ADMIN_USER_ID not set, skipping order notification');
      return;
    }

    const now = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const name = order.firstName || 'Без имени';
    const handle = order.username ? ` (@${order.username})` : '';

    const text = `📋 Новая заявка на бота (#${order.id})\n👤 ${name}${handle}\n🆔 User ID: ${order.userId}\n\n📝 ${order.description}\n\n📅 ${now}`;

    await this.sendMessage(this.adminUserId, text);
  }

  // --- DB helpers ---
  userExists(userId) {
    const db = getDb();
    return !!db.prepare('SELECT 1 FROM bot_users WHERE user_id = ?').get(userId);
  }

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
      db.prepare('UPDATE bot_users SET messages_today = 0, images_today = 0, last_message_date = ? WHERE user_id = ?')
        .run(today, user.user_id);
      user.messages_today = 0;
      user.images_today = 0;
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
