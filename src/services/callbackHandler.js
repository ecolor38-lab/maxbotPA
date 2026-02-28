import axios from 'axios';
import { config } from '../config/config.js';
import { saveButtonClick, getPostByMessageId, getClicksForPost, getDb } from '../db/database.js';
import { ChatBot } from './chatBot.js';
import { PaymentManager } from './paymentManager.js';

const NOTIFICATION_TEXTS = {
  'react:interesting': '🔥 Голос принят! Будем писать больше таких новостей',
  'react:skip': '👌 Голос принят! Учтём ваше мнение',
  'react:agree': '👍 Голос принят! Мнение учтено',
  'react:disagree': '🤔 Голос принят! Интересная позиция',
  'react:more': '🔎 Голос принят! Подготовим подробный разбор',
  'react:useful': '✅ Голос принят! Рады, что полезно',
  'react:known': '💪 Голос принят! Значит вы уже в теме',
  'react:will_happen': '🎯 Голос принят! Запомним ваш прогноз',
  'react:wont_happen': '❌ Голос принят! Посмотрим через время',
  'react:interested': '👀 Голос принят! Спасибо за интерес',
  'react:not_relevant': '👌 Голос принят! Учтём',
  'vote:top1': '1️⃣ Голос принят! Спасибо за участие',
  'vote:top2': '2️⃣ Голос принят! Спасибо за участие',
  'vote:top3': '3️⃣ Голос принят! Спасибо за участие'
};

export class CallbackHandler {
  constructor() {
    this.apiUrl = 'https://platform-api.max.ru';
    this.botToken = config.max?.botToken;
    this.chatLink = config.max?.chatLink || null;
    this.running = false;
    this.marker = this.loadMarker();
    this.chatBot = new ChatBot(config);
    this.paymentManager = new PaymentManager(config);
  }

  loadMarker() {
    try {
      const db = getDb();
      const row = db.prepare("SELECT value FROM kv_store WHERE key = 'callback_marker'").get();
      return row ? parseInt(row.value) : null;
    } catch {
      return null;
    }
  }

  saveMarker(marker) {
    try {
      const db = getDb();
      db.prepare("INSERT OR REPLACE INTO kv_store (key, value) VALUES ('callback_marker', ?)").run(String(marker));
    } catch {
      // non-critical
    }
  }

  async start() {
    if (!this.botToken) {
      console.log('⚠️ CallbackHandler: MAX_BOT_TOKEN не установлен');
      return;
    }

    this.running = true;
    console.log('🔘 CallbackHandler: запущен (long-polling)');

    while (this.running) {
      try {
        await this.poll();
      } catch (error) {
        if (this.running) {
          console.error('❌ CallbackHandler ошибка:', error.message);
          await this.sleep(5000);
        }
      }
    }
  }

  stop() {
    this.running = false;
    console.log('🔘 CallbackHandler: остановлен');
  }

  async poll() {
    const params = {
      types: 'message_created,message_callback,bot_started',
      timeout: 30,
      limit: 50
    };
    if (this.marker !== null) {
      params.marker = this.marker;
    }

    const response = await axios.get(`${this.apiUrl}/updates`, {
      params,
      headers: { Authorization: this.botToken },
      timeout: 35000
    });

    const { updates, marker } = response.data;
    if (marker != null) {
      this.marker = marker;
      this.saveMarker(marker);
    }

    if (updates && updates.length > 0) {
      for (const update of updates) {
        const type = update.update_type;
        if (type === 'message_created') {
          console.log(`💬 DM message from ${update.message?.sender?.name || 'unknown'}`);
          await this.chatBot.handleMessage(update);
        } else if (type === 'bot_started') {
          console.log(`🚀 bot_started from user ${update.user?.user_id || 'unknown'}`);
          await this.chatBot.handleBotStarted(update);
        } else if (type === 'message_callback') {
          const payload = update.callback?.payload || '';
          console.log(`🔘 Callback: "${payload}" from ${update.callback?.user?.name || 'unknown'}`);
          if (payload.startsWith('check:') || payload.startsWith('model:') || payload.startsWith('premium:')) {
            if (payload === 'premium:buy') {
              await this.handlePremiumBuy(update);
            } else {
              await this.chatBot.handleCallbackFromDM(update);
            }
          } else {
            await this.handleCallback(update);
          }
        } else {
          console.log(`❓ Unknown update type: ${type}`);
        }
      }
    }
  }

  async handlePremiumBuy(update) {
    const { callback } = update;
    if (!callback) return;

    const callbackId = callback.callback_id;
    const userId = callback.user?.user_id ? String(callback.user.user_id) : null;
    if (!userId) return;

    if (!this.paymentManager.configured) {
      await this.chatBot.answerCallback(callbackId, '⚠️ Платежи временно недоступны');
      return;
    }

    await this.chatBot.answerCallback(callbackId, '💎 Создаём ссылку на оплату...');

    try {
      const paymentUrl = await this.paymentManager.createPayment(userId);
      if (paymentUrl) {
        const keyboard = {
          type: 'inline_keyboard',
          payload: {
            buttons: [
              [{ type: 'link', text: '💳 Оплатить 390₽', url: paymentUrl }]
            ]
          }
        };
        await this.chatBot.sendMessage(userId, '💎 Ссылка на оплату Premium (1 месяц):', keyboard);
      } else {
        await this.chatBot.sendMessage(userId, '⚠️ Не удалось создать платёж. Попробуйте позже.');
      }
    } catch (error) {
      console.error('❌ Premium buy error:', error.message);
      await this.chatBot.sendMessage(userId, '⚠️ Ошибка при создании платежа. Попробуйте позже.');
    }
  }

  async handleCallback(update) {
    const { callback, message } = update;
    if (!callback) return;

    const callbackId = callback.callback_id;
    const payload = callback.payload || '';
    const userId = callback.user?.user_id ? String(callback.user.user_id) : null;
    const userName = callback.user?.name || 'Unknown';
    const messageId = message?.body?.mid || null;

    console.log(`🔘 Клик: ${payload} от ${userName} (msg: ${messageId})`);

    // Кнопка "Поделиться каналом"
    if (payload === 'share:channel') {
      const link = this.chatLink || 'https://max.ru';
      await this.answerCallback(callbackId, '📢 Ссылка отправлена в личку!');
      // Отправляем ссылку в личку пользователю (уведомление слишком мелькает)
      if (userId) {
        const shareUrl = process.env.PUBLIC_URL
          ? `${process.env.PUBLIC_URL}/share?link=${encodeURIComponent(link)}`
          : link;
        const keyboard = {
          type: 'inline_keyboard',
          payload: {
            buttons: [
              [{ type: 'link', text: '📢 Поделиться каналом', url: shareUrl }]
            ]
          }
        };
        await this.chatBot.sendMessage(userId, '📢 Поделитесь каналом с друзьями:', keyboard);
      }
      return;
    }

    const post = messageId ? getPostByMessageId(String(messageId)) : null;
    const postId = post?.id || null;

    try {
      saveButtonClick({
        postId,
        messageId: messageId ? String(messageId) : null,
        callbackId,
        userId,
        buttonKey: payload,
        buttonLabel: NOTIFICATION_TEXTS[payload] ? payload : null
      });
    } catch (e) {
      console.warn('⚠️ Не удалось сохранить клик:', e.message);
    }

    if (payload.startsWith('vote:') && postId) {
      this.checkVoteThreshold(postId, payload);
    }

    const notification = NOTIFICATION_TEXTS[payload] || '👍 Спасибо!';

    // Обновляем клавиатуру со счётчиками голосов
    const updatedMessage = postId ? this.buildUpdatedMessage(message, postId) : null;
    await this.answerCallback(callbackId, notification, updatedMessage);
  }

  buildUpdatedMessage(originalMessage, postId) {
    try {
      const body = originalMessage?.body;
      if (!body) return null;

      const clicks = getClicksForPost(postId);
      if (!clicks.length) return null;

      const clickMap = {};
      for (const c of clicks) {
        clickMap[c.button_key] = c.count;
      }

      const originalAttachments = body.attachments || [];
      const newAttachments = [];

      for (const att of originalAttachments) {
        if (att.type === 'inline_keyboard') {
          newAttachments.push(this.updateKeyboardWithCounts(att, clickMap));
        } else if (att.type === 'image') {
          // Сохраняем картинку по токену
          const token = att.payload?.token;
          if (token) {
            newAttachments.push({ type: 'image', payload: { token } });
          }
        }
      }

      if (!newAttachments.length) return null;

      return {
        text: body.text || '',
        attachments: newAttachments,
        format: body.format || 'markdown'
      };
    } catch (e) {
      console.warn('⚠️ Не удалось построить обновлённое сообщение:', e.message);
      return null;
    }
  }

  updateKeyboardWithCounts(keyboard, clickMap) {
    const updated = JSON.parse(JSON.stringify(keyboard));

    for (const row of updated.payload.buttons) {
      for (const btn of row) {
        if (btn.type === 'callback' && btn.payload && clickMap[btn.payload]) {
          // "🔥 Интересно (3)" → "🔥 Интересно", затем добавляем новый счётчик
          const baseText = btn.text.replace(/\s*\(\d+\)$/, '');
          btn.text = `${baseText} (${clickMap[btn.payload]})`;
        }
      }
    }

    return updated;
  }

  checkVoteThreshold(postId, payload) {
    try {
      const clicks = getClicksForPost(postId);
      const voteClicks = clicks.find((c) => c.button_key === payload);
      if (voteClicks && voteClicks.count >= 5) {
        console.log(`🗳️ Голосование: "${payload}" набрал ${voteClicks.count} голосов — стоит сделать анализ по теме`);
      }
    } catch {
      // ignore
    }
  }

  async answerCallback(callbackId, notification, updatedMessage = null) {
    try {
      const body = { notification };
      if (updatedMessage) {
        body.message = updatedMessage;
      }

      const response = await axios.post(
        `${this.apiUrl}/answers`,
        body,
        {
          params: { callback_id: callbackId },
          headers: {
            Authorization: this.botToken,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );
      console.log(`   ↳ Ответ отправлен: "${notification}" (${response.status})`);
    } catch (error) {
      console.warn('⚠️ Ошибка ответа на callback:', error.response?.status, error.response?.data || error.message);
    }
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
