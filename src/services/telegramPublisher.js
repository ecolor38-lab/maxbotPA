import axios from 'axios';
import fs from 'fs/promises';
import FormData from 'form-data';
import path from 'path';

export class TelegramPublisher {
  constructor(config) {
    this.config = config;
    this.botToken = config.telegram.botToken;
    this.channelId = config.telegram.channelId;
    this.apiUrl = `https://api.telegram.org/bot${this.botToken}`;
  }

  async publish(postText, hashtags, imagePath = null, articles = []) {
    const fullText = this.formatPostWithSources(postText, hashtags, articles);

    await this.saveToFile(fullText, imagePath);

    if (!this.channelId) {
      console.log('⚠️ TELEGRAM_CHANNEL_ID не указан - пост сохранен в файл, но не опубликован');
      console.log('💡 Добавьте TELEGRAM_CHANNEL_ID в .env для автоматической публикации');
      return null;
    }

    console.log('📤 Публикую пост в Telegram...');

    try {
      let postData;

      if (imagePath && await this.fileExists(imagePath)) {
        postData = await this.publishWithImage(fullText, imagePath);
      } else {
        postData = await this.publishTextOnly(fullText);
      }

      console.log('✅ Пост успешно опубликован в Telegram!');
      console.log('📊 ID сообщения:', postData.result.message_id);

      return postData;
    } catch (error) {
      console.error('❌ Ошибка при публикации в Telegram:', error.message);
      if (error.response) {
        console.error('Ответ сервера:', JSON.stringify(error.response.data, null, 2));
        console.error('Статус:', error.response.status);
      }
      throw error;
    }
  }

  formatPostWithSources(postText, hashtags, articles) {
    let fullText = postText;

    // Добавляем источники, если они есть
    if (articles && articles.length > 0) {
      fullText += '\n\n📚 Источники:\n';
      articles.forEach((article, index) => {
        // Используем markdown формат для ссылок
        const source = article.source || 'Источник';
        fullText += `${index + 1}. [${source}](${article.url})\n`;
      });
    }

    fullText += `\n\n${hashtags}`;

    return fullText;
  }

  async publishTextOnly(text) {
    try {
      const response = await axios.post(
        `${this.apiUrl}/sendMessage`,
        {
          chat_id: this.channelId,
          text: text,
          parse_mode: 'Markdown',
          disable_web_page_preview: false
        },
        {
          timeout: 30000,
          maxRedirects: 0,
          proxy: false,
          validateStatus: (status) => status < 500
        }
      );

      return response.data;
    } catch (error) {
      console.error('Ошибка при публикации текста в Telegram:', error.message);
      throw error;
    }
  }

  async publishWithImage(text, imagePath) {
    try {
      const formData = new FormData();
      formData.append('chat_id', this.channelId);
      formData.append('caption', text);
      formData.append('parse_mode', 'Markdown');

      const imageBuffer = await fs.readFile(imagePath);
      formData.append('photo', imageBuffer, {
        filename: path.basename(imagePath),
        contentType: 'image/png'
      });

      const response = await axios.post(
        `${this.apiUrl}/sendPhoto`,
        formData,
        {
          headers: formData.getHeaders(),
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
          timeout: 60000,
          maxRedirects: 0,
          proxy: false,
          validateStatus: (status) => status < 500
        }
      );

      return response.data;
    } catch (error) {
      console.error('Ошибка при публикации с изображением в Telegram:', error.message);
      console.log('Пытаюсь опубликовать только текст...');
      return await this.publishTextOnly(text);
    }
  }

  async saveToFile(text, imagePath = null) {
    try {
      const postsDir = path.join(process.cwd(), 'posts');
      await fs.mkdir(postsDir, { recursive: true });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const txtPath = path.join(postsDir, `post_${timestamp}.txt`);

      let fileContent = `${text}\n\n`;
      if (imagePath) {
        fileContent += `Изображение: ${imagePath}\n`;
      }
      fileContent += `\nСоздано: ${new Date().toLocaleString('ru-RU')}\n`;

      await fs.writeFile(txtPath, fileContent, 'utf8');

      console.log(`💾 Пост сохранен в файл: ${txtPath}`);

      return txtPath;
    } catch (error) {
      console.error('Ошибка при сохранении в файл:', error.message);
    }
  }

  async testConnection() {
    console.log('🔌 Проверяю соединение с Telegram Bot API...');

    try {
      const response = await axios.get(`${this.apiUrl}/getMe`, {
        timeout: 30000,
        maxRedirects: 0,
        proxy: false,
        validateStatus: (status) => status < 500
      });

      console.log('✅ Соединение установлено!');
      console.log('👤 Бот:', response.data.result.first_name);
      console.log(`📱 Username: @${response.data.result.username}`);

      return true;
    } catch (error) {
      console.error('❌ Ошибка соединения с Telegram API:', error.message);
      if (error.response) {
        console.error('Статус:', error.response.status);
        console.error('Ответ:', error.response.data);
      }
      return false;
    }
  }

  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}
