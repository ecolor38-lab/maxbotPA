import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs/promises';
import path from 'path';

export class MaxBotPublisher {
  constructor(config) {
    this.config = config;
    this.apiUrl = config.maxbot.apiUrl;
    this.apiToken = config.maxbot.apiToken;
    this.chatId = config.maxbot.chatId;
  }

  async publish(postText, hashtags, imagePath = null) {
    const fullText = `${postText}\n\n${hashtags}`;

    await this.saveToFile(fullText, imagePath);

    if (!this.chatId) {
      console.log('⚠️ CHAT_ID не указан - пост сохранен в файл, но не опубликован');
      console.log('💡 Добавьте CHAT_ID в .env для автоматической публикации');
      return null;
    }

    console.log('📤 Публикую пост в Max Bot...');

    try {
      let postData;

      if (imagePath && await this.fileExists(imagePath)) {
        postData = await this.publishWithImage(fullText, imagePath);
      } else {
        postData = await this.publishTextOnly(fullText);
      }

      console.log('✅ Пост успешно опубликован в Max Bot!');
      console.log('📊 ID сообщения:', postData.message_id || 'N/A');

      return postData;
    } catch (error) {
      console.error('❌ Ошибка при публикации:', error.message);
      if (error.response) {
        console.error('Ответ сервера:', JSON.stringify(error.response.data, null, 2));
        console.error('Статус:', error.response.status);
      }
      throw error;
    }
  }

  async publishTextOnly(text) {
    try {
      const response = await axios.post(
        `${this.apiUrl}/messages`,
        {
          chat_id: this.chatId,
          text: text,
          format: 'markdown'
        },
        {
          headers: {
            'Authorization': this.apiToken,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Ошибка при публикации текста:', error.message);
      throw error;
    }
  }

  async publishWithImage(text, imagePath) {
    try {
      const uploadedFile = await this.uploadFile(imagePath);

      const response = await axios.post(
        `${this.apiUrl}/messages`,
        {
          chat_id: this.chatId,
          text: text,
          format: 'markdown',
          attachments: [
            {
              type: 'image',
              payload: {
                file_id: uploadedFile.file_id
              }
            }
          ]
        },
        {
          headers: {
            'Authorization': this.apiToken,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Ошибка при публикации с изображением:', error.message);
      console.log('Пытаюсь опубликовать только текст...');
      return await this.publishTextOnly(text);
    }
  }

  async uploadFile(filePath) {
    try {
      const formData = new FormData();
      const fileBuffer = await fs.readFile(filePath);
      formData.append('file', fileBuffer, path.basename(filePath));

      const response = await axios.post(
        `${this.apiUrl}/upload`,
        formData,
        {
          headers: {
            'Authorization': this.apiToken,
            ...formData.getHeaders()
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity
        }
      );

      return response.data;
    } catch (error) {
      console.error('Ошибка при загрузке файла:', error.message);
      throw error;
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
    console.log('🔌 Проверяю соединение с Max Bot API...');

    try {
      const response = await axios.get(
        `${this.apiUrl}/me`,
        {
          headers: {
            'Authorization': this.apiToken
          }
        }
      );

      console.log('✅ Соединение установлено!');
      console.log('👤 Бот:', response.data.name || response.data.username || 'N/A');
      if (response.data.username) {
        console.log(`📱 Username: @${response.data.username}`);
      }

      return true;
    } catch (error) {
      console.error('❌ Ошибка соединения с Max Bot API:', error.message);
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
