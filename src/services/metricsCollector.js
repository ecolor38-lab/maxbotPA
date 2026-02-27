import axios from 'axios';
import { config } from '../config/config.js';
import { saveChannelMetrics, getLatestMetrics } from '../db/database.js';
import { resolveChatId } from './maxApi.js';

export class MetricsCollector {
  constructor() {
    this.apiUrl = 'https://platform-api.max.ru';
    this.botToken = config.max?.botToken;
    this.chatId = config.max?.chatId;
    this.chatLink = config.max?.chatLink;
  }

  async collectMetrics() {
    if (!this.botToken) {
      console.log('⚠️ MetricsCollector: MAX_BOT_TOKEN не установлен');
      return null;
    }

    try {
      if (!this.chatId && this.chatLink) {
        const { chatId } = await resolveChatId(this.botToken, this.chatLink);
        if (chatId) this.chatId = chatId;
      }

      if (!this.chatId) {
        console.log('⚠️ MetricsCollector: chat_id не определён');
        return null;
      }

      const response = await axios.get(`${this.apiUrl}/chats/${this.chatId}`, {
        headers: { Authorization: this.botToken },
        timeout: 15000
      });

      const chat = response.data;
      const participants = chat.participants_count || chat.members_count || 0;

      const prev = getLatestMetrics();
      saveChannelMetrics(participants);

      const growth = prev ? participants - prev.participants_count : 0;
      const arrow = growth > 0 ? '📈' : growth < 0 ? '📉' : '➡️';

      console.log(`${arrow} Подписчиков: ${participants} (${growth >= 0 ? '+' : ''}${growth})`);

      return { participants, growth };
    } catch (error) {
      console.error('❌ MetricsCollector ошибка:', error.response?.data || error.message);
      return null;
    }
  }
}
