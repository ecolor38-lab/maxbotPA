import axios from 'axios';
import fs from 'fs/promises';
import FormData from 'form-data';
import { createReadStream, existsSync } from 'fs';
import path from 'path';

export class TelegramPublisherNative {
  constructor(config) {
    this.botToken = config.telegram?.botToken;
    this.channelId = config.telegram?.channelId;
    this.apiUrl = `https://api.telegram.org/bot${this.botToken}`;
  }

  async publish(postText, hashtags, imagePath = null, articles = []) {
    const fullText = this.formatPost(postText, hashtags, articles);
    await this.saveToFile(fullText);

    if (!this.channelId || !this.botToken) {
      console.log('⚠️ Telegram не настроен - пост сохранен в файл');
      return { saved: true };
    }

    console.log(`📤 Публикую в Telegram (${fullText.length} символов)...`);

    try {
      let result;
      if (imagePath && existsSync(imagePath)) {
        result = await this.sendPhoto(fullText, imagePath);
      } else {
        result = await this.sendMessage(fullText);
      }
      console.log('✅ Опубликовано! ID:', result.result?.message_id);
      return result;
    } catch (error) {
      console.error('❌ Ошибка публикации:', error.message);
      throw error;
    }
  }

  formatPost(text, hashtags, articles) {
    let post = text;

    // Добавляем источники
    if (articles && articles.length > 0) {
      const sources = articles
        .filter((a) => a.url)
        .slice(0, 3) // Максимум 3 источника
        .map((a) => `• [${a.source || 'Источник'}](${a.url})`)
        .join('\n');

      if (sources) {
        post += `\n\n📚 *Источники:*\n${sources}`;
      }
    }

    // Добавляем хештеги
    if (hashtags) {
      post += `\n\n${hashtags}`;
    }

    // Лимит Telegram - 4096 для сообщений, 1024 для caption
    const limit = 4000;
    if (post.length > limit) {
      // Обрезаем текст, сохраняя источники и хештеги
      const footer = post.substring(post.lastIndexOf('\n\n📚'));
      const maxTextLen = limit - footer.length - 10;
      post = text.substring(0, maxTextLen) + '...' + footer;
    }

    return post;
  }

  async sendMessage(text) {
    const response = await axios.post(`${this.apiUrl}/sendMessage`, {
      chat_id: this.channelId,
      text,
      parse_mode: 'Markdown',
      disable_web_page_preview: false
    });
    return response.data;
  }

  async sendPhoto(caption, imagePath) {
    const form = new FormData();
    form.append('chat_id', this.channelId);
    form.append('caption', caption.substring(0, 1020)); // Лимит caption
    form.append('parse_mode', 'Markdown');
    form.append('photo', createReadStream(imagePath));

    const response = await axios.post(`${this.apiUrl}/sendPhoto`, form, {
      headers: form.getHeaders()
    });
    return response.data;
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
      const response = await axios.get(`${this.apiUrl}/getMe`);
      const bot = response.data?.result;
      if (bot) {
        console.log(`✅ Telegram подключен: @${bot.username}`);
        return true;
      }
    } catch (error) {
      console.log('❌ Telegram недоступен:', error.message);
    }
    return false;
  }
}
