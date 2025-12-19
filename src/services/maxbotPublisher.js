import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';

export class MaxBotPublisher {
  constructor(config) {
    this.config = config;
    this.apiUrl = config.maxbot.apiUrl;
    this.apiToken = config.maxbot.apiToken;
  }

  async publish(postText, hashtags, imagePath = null) {
    console.log('📤 Публикую пост в Max Bot...');

    try {
      const fullText = `${postText}\n\n${hashtags}`;

      let postData;

      if (imagePath && fs.existsSync(imagePath)) {
        postData = await this.publishWithImage(fullText, imagePath);
      } else {
        postData = await this.publishTextOnly(fullText);
      }

      console.log('✅ Пост успешно опубликован в Max Bot!');
      console.log('📊 ID поста:', postData.id || 'N/A');

      return postData;
    } catch (error) {
      console.error('❌ Ошибка при публикации:', error.message);
      if (error.response) {
        console.error('Ответ сервера:', error.response.data);
        console.error('Статус:', error.response.status);
      }
      throw error;
    }
  }

  async publishTextOnly(text) {
    try {
      const response = await axios.post(
        `${this.apiUrl}/posts`,
        {
          text: text,
          publish: true
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
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
      const formData = new FormData();
      formData.append('text', text);
      formData.append('publish', 'true');
      formData.append('image', fs.createReadStream(imagePath));

      const response = await axios.post(
        `${this.apiUrl}/posts`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            ...formData.getHeaders()
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity
        }
      );

      return response.data;
    } catch (error) {
      console.error('Ошибка при публикации с изображением:', error.message);

      console.log('Пытаюсь опубликовать только текст...');
      return await this.publishTextOnly(text);
    }
  }

  async testConnection() {
    console.log('🔌 Проверяю соединение с Max Bot API...');

    try {
      const response = await axios.get(
        `${this.apiUrl}/me`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiToken}`
          }
        }
      );

      console.log('✅ Соединение установлено!');
      console.log('👤 Бот:', response.data.name || response.data.username || 'N/A');

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

  async getPostStats(postId) {
    try {
      const response = await axios.get(
        `${this.apiUrl}/posts/${postId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiToken}`
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Ошибка при получении статистики поста:', error.message);
      return null;
    }
  }
}
