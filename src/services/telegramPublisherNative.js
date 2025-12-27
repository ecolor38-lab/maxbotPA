import https from 'https';
// import http from 'http'; // Not used - using https only
import fs from 'fs/promises';
import FormData from 'form-data';
import path from 'path';
import { URL } from 'url';
import { HttpsProxyAgent } from 'https-proxy-agent';

export class TelegramPublisherNative {
  constructor(config) {
    this.config = config;
    this.botToken = config.telegram.botToken;
    this.channelId = config.telegram.channelId;
    this.apiUrl = `https://api.telegram.org/bot${this.botToken}`;
  }

  async publish(postText, hashtags, imageData = null, articles = []) {
    const fullText = this.formatPostWithSources(postText, hashtags, articles);

    // imageData может быть строкой (путь/URL) или объектом {url, path}
    const imagePath = typeof imageData === 'object' ? imageData?.path : imageData;
    const imageUrl = typeof imageData === 'object' ? imageData?.url : null;

    await this.saveToFile(fullText, imagePath || imageUrl);

    if (!this.channelId) {
      console.log('⚠️ TELEGRAM_CHANNEL_ID не указан - пост сохранен в файл, но не опубликован');
      console.log('💡 Добавьте TELEGRAM_CHANNEL_ID в .env для автоматической публикации');
      return null;
    }

    console.log('📤 Публикую пост в Telegram...');
    console.log(`📏 Длина текста: ${fullText.length} символов`);

    try {
      let postData;

      // Приоритет: ТОЛЬКО локальный файл
      if (imagePath && await this.fileExists(imagePath)) {
        console.log('📸 Отправляю изображение с текстом из файла...');
        postData = await this.publishWithImage(fullText, imagePath);
      } else {
        // Если изображение не скачано - публикуем только текст
        console.log('⚠️ Изображение недоступно, отправляю только текст...');
        postData = await this.publishTextOnly(fullText);
      }

      console.log('✅ Пост успешно опубликован в Telegram!');
      console.log('📊 ID сообщения:', postData.result.message_id);

      return postData;
    } catch (error) {
      console.error('❌ Ошибка при публикации в Telegram:', error.message);
      if (error.response) {
        console.error('Ответ сервера:', error.response);
      }
      throw error;
    }
  }

  formatPostWithSources(postText, hashtags, articles) {
    let fullText = postText;

    // Добавляем источники компактно, если они есть
    if (articles && articles.length > 0) {
      fullText += '\n\n📚 [Источники](';
      // Берем первую ссылку как основную
      fullText += articles[0].url + ')';
    }

    fullText += `\n\n${hashtags}`;

    // Telegram caption лимит: 1024 символа
    // Если всё равно не влезает - обрезаем хештеги
    if (fullText.length > 1020) {
      const withoutHashtags = postText + (articles && articles.length > 0 ? `\n\n📚 [Источники](${articles[0].url})` : '');
      if (withoutHashtags.length <= 1020) {
        // Убираем часть хештегов
        const hashtagsArray = hashtags.split(' ');
        const reducedHashtags = hashtagsArray.slice(0, 5).join(' '); // Только 5 хештегов
        fullText = withoutHashtags + '\n\n' + reducedHashtags;
      } else {
        // Если и без хештегов не влезает - обрезаем
        fullText = withoutHashtags.substring(0, 1020) + '...';
      }
    }

    return fullText;
  }

  async publishTextOnly(text) {
    const data = JSON.stringify({
      chat_id: this.channelId,
      text: text,
      parse_mode: 'Markdown',
      disable_web_page_preview: false
    });

    return this.makeRequest('/sendMessage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      },
      body: data
    });
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

      return this.makeFormRequest('/sendPhoto', formData);
    } catch (error) {
      console.error('⚠️ Ошибка при публикации с изображением:', error.message);
      console.log('📝 Публикую только текст...');
      return await this.publishTextOnly(text);
    }
  }

  async publishWithImageUrl(text, imageUrl) {
    try {
      const data = JSON.stringify({
        chat_id: this.channelId,
        photo: imageUrl,
        caption: text,
        parse_mode: 'Markdown'
      });

      return this.makeRequest('/sendPhoto', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data)
        },
        body: data
      });
    } catch (error) {
      console.error('Ошибка при публикации с изображением по URL:', error.message);
      console.log('Пытаюсь опубликовать только текст...');
      return await this.publishTextOnly(text);
    }
  }

  async publishImageOnly(imagePath) {
    try {
      const formData = new FormData();
      formData.append('chat_id', this.channelId);

      const imageBuffer = await fs.readFile(imagePath);
      formData.append('photo', imageBuffer, {
        filename: path.basename(imagePath),
        contentType: 'image/png'
      });

      return this.makeFormRequest('/sendPhoto', formData);
    } catch (error) {
      console.error('Ошибка при публикации изображения:', error.message);
      throw error;
    }
  }

  async publishImageOnlyUrl(imageUrl) {
    try {
      const data = JSON.stringify({
        chat_id: this.channelId,
        photo: imageUrl
      });

      return this.makeRequest('/sendPhoto', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data)
        },
        body: data
      });
    } catch (error) {
      console.error('Ошибка при публикации изображения по URL:', error.message);
      throw error;
    }
  }

  makeRequest(endpoint, options = {}) {
    return new Promise((resolve, reject) => {
      const url = new URL(this.apiUrl + endpoint);

      const requestOptions = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method: options.method || 'GET',
        headers: options.headers || {},
        timeout: 30000
      };

      // Добавляем прокси агент если установлен HTTPS_PROXY
      if (process.env.HTTPS_PROXY || process.env.https_proxy) {
        const proxyUrl = process.env.HTTPS_PROXY || process.env.https_proxy;
        requestOptions.agent = new HttpsProxyAgent(proxyUrl);
      }

      const req = https.request(requestOptions, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.ok) {
              resolve(parsed);
            } else {
              reject(new Error(`Telegram API error: ${parsed.description || data}`));
            }
          } catch (e) {
            reject(new Error(`Failed to parse response: ${data}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      if (options.body) {
        req.write(options.body);
      }

      req.end();
    });
  }

  makeFormRequest(endpoint, formData) {
    return new Promise((resolve, reject) => {
      const url = new URL(this.apiUrl + endpoint);

      const requestOptions = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method: 'POST',
        headers: formData.getHeaders(),
        timeout: 60000
      };

      // Добавляем прокси агент если установлен HTTPS_PROXY
      if (process.env.HTTPS_PROXY || process.env.https_proxy) {
        const proxyUrl = process.env.HTTPS_PROXY || process.env.https_proxy;
        requestOptions.agent = new HttpsProxyAgent(proxyUrl);
      }

      const req = https.request(requestOptions, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.ok) {
              resolve(parsed);
            } else {
              reject(new Error(`Telegram API error: ${parsed.description || data}`));
            }
          } catch (e) {
            reject(new Error(`Failed to parse response: ${data}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      formData.pipe(req);
    });
  }

  async saveToFile(text, imagePath = null) {
    try {
      const postsDir = path.join(process.cwd(), 'posts');
      
      // Пытаемся создать папку, игнорируем ошибки прав доступа
      try {
        await fs.mkdir(postsDir, { recursive: true });
      } catch (mkdirError) {
        if (mkdirError.code !== 'EEXIST' && mkdirError.code !== 'EACCES') {
          throw mkdirError;
        }
      }

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
      if (error.code === 'EACCES') {
        console.log('⚠️ Нет прав на сохранение файла (только чтение)');
      } else {
        console.error('⚠️ Ошибка при сохранении в файл:', error.message);
      }
      // Игнорируем ошибку - на production может быть read-only FS
      return null;
    }
  }

  async testConnection() {
    console.log('🔌 Проверяю соединение с Telegram Bot API...');

    try {
      const response = await this.makeRequest('/getMe');

      console.log('✅ Соединение установлено!');
      console.log('👤 Бот:', response.result.first_name);
      console.log(`📱 Username: @${response.result.username}`);

      return true;
    } catch (error) {
      console.error('❌ Ошибка соединения с Telegram API:', error.message);
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
