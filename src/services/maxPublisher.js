import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import { AffiliateManager } from './affiliateManager.js';
import { resolveChatId } from './maxApi.js';

const ENGAGEMENT_BUTTONS = {
  news_flash: [
    { type: 'callback', text: '🔥 Интересно', payload: 'react:interesting' },
    { type: 'callback', text: '😐 Мимо', payload: 'react:skip' }
  ],
  analysis: [
    { type: 'callback', text: '👍 Согласен', payload: 'react:agree' },
    { type: 'callback', text: '👎 Не согласен', payload: 'react:disagree' },
    { type: 'callback', text: '🔎 Подробнее', payload: 'react:more' }
  ],
  digest: [
    { type: 'callback', text: '1️⃣ Топ-1', payload: 'vote:top1' },
    { type: 'callback', text: '2️⃣ Топ-2', payload: 'vote:top2' },
    { type: 'callback', text: '3️⃣ Топ-3', payload: 'vote:top3' }
  ],
  tip: [
    { type: 'callback', text: '✅ Полезно', payload: 'react:useful' },
    { type: 'callback', text: '💤 Уже знал', payload: 'react:known' }
  ],
  prediction: [
    { type: 'callback', text: '🎯 Сбудется', payload: 'react:will_happen' },
    { type: 'callback', text: '❌ Не верю', payload: 'react:wont_happen' }
  ],
  hot_take: [
    { type: 'callback', text: '🔥 Согласен', payload: 'react:agree' },
    { type: 'callback', text: '🧊 Не согласен', payload: 'react:disagree' }
  ],
  sponsored: [
    { type: 'callback', text: '👀 Интересно', payload: 'react:interested' },
    { type: 'callback', text: '😐 Не актуально', payload: 'react:not_relevant' }
  ],
  series: [
    { type: 'callback', text: '🔥 Интересно', payload: 'react:interesting' },
    { type: 'callback', text: '😐 Мимо', payload: 'react:skip' }
  ]
};

export class MaxPublisher {
  constructor(config) {
    this.botToken = config.max?.botToken;
    this.chatId = config.max?.chatId;
    this.chatLink = config.max?.chatLink || null;
    this.botLink = config.max?.botLink || null;
    this.publicUrl = process.env.PUBLIC_URL || null;
    this.apiUrl = 'https://platform-api.max.ru';
    this.headers = {
      Authorization: this.botToken,
      'Content-Type': 'application/json'
    };
  }

  buildKeyboard(postType, postText = '') {
    const buttons = ENGAGEMENT_BUTTONS[postType] || ENGAGEMENT_BUTTONS.news_flash;
    const rows = [buttons];

    try {
      this.affiliateManager ??= new AffiliateManager();
      const affiliateButtons = this.affiliateManager.buildAffiliateButtons(postText);
      if (affiliateButtons?.length) {
        rows.push(affiliateButtons);
      }
    } catch {
      // affiliate not critical
    }

    if (this.botLink) {
      rows.push([{ type: 'link', text: '🤖 Спросить AI-ассистента', url: this.botLink }]);
    }

    if (this.chatLink && this.publicUrl) {
      const shareUrl = `${this.publicUrl}/share?link=${encodeURIComponent(this.chatLink)}`;
      rows.push([{ type: 'link', text: '📢 Поделиться каналом', url: shareUrl }]);
    }

    return {
      type: 'inline_keyboard',
      payload: { buttons: rows }
    };
  }

  async publish(postText, hashtags, imageUrl = null, articles = [], postType = 'news_flash') {
    const fullText = this.formatPost(postText, hashtags, articles);
    await this.saveToFile(fullText);

    if (!this.botToken) {
      console.log('⚠️ MAX не настроен - пост сохранен в файл');
      return { saved: true };
    }

    if (!this.chatId && this.chatLink) {
      await this.resolveChatId();
    }

    if (!this.chatId) {
      console.log('⚠️ MAX chat_id не определён - пост сохранен в файл');
      return { saved: true };
    }

    console.log(`📤 Публикую в MAX (${fullText.length} символов, тип: ${postType})...`);

    const keyboard = this.buildKeyboard(postType, fullText);

    try {
      const result = imageUrl
        ? await this.sendWithImage(fullText, imageUrl, keyboard)
        : await this.sendMessage(fullText, keyboard);
      console.log('✅ Опубликовано в MAX! ID:', result.message?.body?.mid);
      return result;
    } catch (error) {
      console.error('❌ Ошибка публикации в MAX:', error.response?.data || error.message);
      throw error;
    }
  }

  formatPost(text, hashtags, articles) {
    let post = text;

    if (articles.length > 0) {
      const sources = articles
        .filter((a) => a.url)
        .slice(0, 3)
        .map((a) => `• [${a.source || 'Источник'}](${a.url})`)
        .join('\n');

      if (sources) {
        post += `\n\n📚 **Источники:**\n${sources}`;
      }
    }

    if (hashtags) {
      post += `\n\n${hashtags}`;
    }

    if (post.length > 3900) {
      const footerIdx = post.lastIndexOf('\n\n📚');
      if (footerIdx > 0) {
        const footer = post.substring(footerIdx);
        post = text.substring(0, 3890 - footer.length) + '...' + footer;
      } else {
        post = post.substring(0, 3897) + '...';
      }
    }

    return post;
  }

  async sendMessage(text, keyboard = null) {
    const body = { text, format: 'markdown' };
    if (keyboard) {
      body.attachments = [keyboard];
    }
    const response = await axios.post(`${this.apiUrl}/messages`, body, {
      params: { chat_id: this.chatId },
      headers: this.headers,
      timeout: 30000
    });
    return response.data;
  }

  async sendWithImage(text, imageUrl, keyboard = null) {
    const uploadToken = await this.uploadImageFromUrl(imageUrl);
    if (!uploadToken) {
      console.log('⚠️ Картинка не загружена, отправляем без неё');
      return this.sendMessage(text, keyboard);
    }

    const attachments = [{ type: 'image', payload: { token: uploadToken } }];
    if (keyboard) {
      attachments.push(keyboard);
    }
    const response = await axios.post(
      `${this.apiUrl}/messages`,
      { text, format: 'markdown', attachments },
      { params: { chat_id: this.chatId }, headers: this.headers, timeout: 30000 }
    );
    return response.data;
  }

  async uploadImageFromUrl(imageUrl) {
    try {
      const uploadRes = await axios.post(`${this.apiUrl}/uploads`, null, {
        params: { chat_id: this.chatId, type: 'image' },
        headers: { Authorization: this.botToken },
        timeout: 15000
      });

      console.log('📥 Скачиваю картинку...');
      const imageRes = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 30000
      });

      console.log('📤 Загружаю на MAX...');
      const formData = new FormData();
      formData.append('data', new Blob([imageRes.data], { type: 'image/png' }), 'image.png');

      const result = await axios.post(uploadRes.data.url, formData, { timeout: 30000 });

      const photos = result.data?.photos;
      if (photos) {
        const firstKey = Object.keys(photos)[0];
        const token = photos[firstKey]?.token;
        if (token) {
          console.log('✅ Картинка загружена на MAX');
          return token;
        }
      }
      console.log('⚠️ Не удалось получить токен:', JSON.stringify(result.data));
      return null;
    } catch (error) {
      console.log('⚠️ Ошибка загрузки картинки:', error.response?.data || error.message);
      return null;
    }
  }

  async resolveChatId() {
    const { chatId, title, chats } = await resolveChatId(this.botToken, this.chatLink);
    if (chatId) {
      this.chatId = chatId;
      console.log(`🔗 Канал найден: "${title}" (ID: ${this.chatId})`);
    } else {
      console.log('⚠️ Канал не найден по ссылке. Доступные чаты:');
      chats.forEach((c) => console.log(`   • ${c.title} (ID: ${c.chat_id})`));
    }
  }

  async getChats() {
    try {
      const response = await axios.get(`${this.apiUrl}/chats`, {
        params: { count: 50 },
        headers: { Authorization: this.botToken },
        timeout: 15000
      });
      return response.data.chats || [];
    } catch (error) {
      console.error('❌ Не удалось получить чаты:', error.message);
      return [];
    }
  }

  async saveToFile(text) {
    try {
      const dir = path.join(process.cwd(), 'posts');
      await fs.mkdir(dir, { recursive: true });
      const filename = `post_${Date.now()}.txt`;
      await fs.writeFile(path.join(dir, filename), text);
      console.log(`💾 Сохранено: posts/${filename}`);
    } catch (error) {
      console.warn('⚠️ Не удалось сохранить в файл:', error.message);
    }
  }

  async testConnection() {
    if (!this.botToken) return false;
    try {
      const response = await axios.get(`${this.apiUrl}/me`, {
        headers: { Authorization: this.botToken },
        timeout: 15000
      });
      const bot = response.data;
      if (bot) {
        console.log(`✅ MAX подключен: ${bot.name} (@${bot.username})`);

        if (!this.chatId && this.chatLink) {
          await this.resolveChatId();
        }

        if (!this.chatId) {
          const chats = await this.getChats();
          if (chats.length) {
            console.log('📋 Доступные чаты:');
            chats.forEach((c) => console.log(`   • ${c.title} (ID: ${c.chat_id}, тип: ${c.type})`));
          }
        }
        return true;
      }
    } catch (error) {
      console.log('❌ MAX недоступен:', error.response?.data || error.message);
    }
    return false;
  }
}
