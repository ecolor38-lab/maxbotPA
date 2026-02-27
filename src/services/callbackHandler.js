import axios from 'axios';
import { config } from '../config/config.js';
import { saveButtonClick, getPostByMessageId, getClicksForPost, getDb } from '../db/database.js';

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
    this.running = false;
    this.marker = this.loadMarker();
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
      types: 'message_callback',
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
        if (update.update_type === 'message_callback') {
          await this.handleCallback(update);
        }
      }
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
    await this.answerCallback(callbackId, notification);
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
      console.log(`   ↳ Ответ отправлен: "${notification}" (${response.status})`);
    } catch (error) {
      console.warn('⚠️ Ошибка ответа на callback:', error.response?.status, error.response?.data || error.message);
    }
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
