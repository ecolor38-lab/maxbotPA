import Anthropic from '@anthropic-ai/sdk';
import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

export class ImageGenerator {
  constructor(config) {
    this.config = config;
    this.anthropic = config.anthropic.apiKey ? new Anthropic({ apiKey: config.anthropic.apiKey }) : null;

    // Настройка axios для работы с прокси
    this.axiosConfig = {
      timeout: 120000, // Увеличено для Qwen API
      headers: {
        'Authorization': `Bearer ${config.qwen.apiKey}`,
        'Content-Type': 'application/json',
        'X-DashScope-Async': 'enable' // Асинхронный режим
      }
    };

    if (process.env.HTTPS_PROXY || process.env.https_proxy) {
      const proxyUrl = process.env.HTTPS_PROXY || process.env.https_proxy;
      this.axiosConfig.httpsAgent = new HttpsProxyAgent(proxyUrl);
    }
  }

  async generateImage(prompt) {
    console.log('🎨 Генерирую реалистичное изображение...');

    // Используем Pollinations.ai напрямую (быстрее и надежнее)
    try {
      let enhancedPrompt;
      if (this.anthropic) {
        enhancedPrompt = await this.generateRealisticPromptWithClaude(prompt);
      } else {
        enhancedPrompt = this.enhancePromptRealistic(prompt);
      }

      console.log('✅ Реалистичный промпт создан');
      console.log(`📝 Промпт: ${enhancedPrompt.substring(0, 150)}...`);

      // Генерируем через Pollinations (бесплатно и стабильно)
      return await this.generateWithFallback(prompt);
      
    } catch (error) {
      console.error('⚠️ Ошибка при генерации изображения:', error.message);
      return null;
    }
  }

  async generateRealisticPromptWithClaude(basicPrompt) {
    try {
      const message = await this.anthropic.messages.create({
        model: this.config.anthropic.model,
        max_tokens: 400,
        messages: [{
          role: 'user',
          content: `Создай детальный английский промпт для генерации РЕАЛИСТИЧНОГО фото-изображения для новости на тему: "${basicPrompt}"

ВАЖНО - Требования к промпту для НОВОСТНОГО изображения:
- Только на английском языке
- ФОТОРЕАЛИСТИЧНЫЙ стиль, как для новостей или журнальной статьи
- Современная бизнес-обстановка: офис, конференция, презентация, рабочее пространство
- Профессиональная фотография высокого качества
- Можно включить: современные технологии, AI роботы, компьютеры, экраны с графиками
- Можно показать: руки работающие с устройствами, силуэты людей на фоне (БЕЗ лиц)
- Освещение: естественное или профессиональное студийное
- Композиция: горизонтальная, подходит для новостной статьи
- Цвета: современные корпоративные (синий, белый, серый, черный)
- Глубина резкости: профессиональная (размытый фон)
- Качество: 4K, профессиональная фотосъемка, высокая детализация

ИЗБЕГАТЬ:
- Мультяшного или иллюстративного стиля
- Нереалистичных цветов и эффектов
- Прямых лиц людей (только силуэты или руки)
- Текста и надписей на изображении

Ответь ТОЛЬКО промптом на английском, без пояснений.`
        }]
      });

      return message.content[0].text.trim();
    } catch (error) {
      console.log('⚠️ Claude API недоступен, использую предустановленный промпт');
      return this.enhancePromptRealistic(basicPrompt);
    }
  }

  enhancePromptRealistic(prompt) {
    return `Professional photorealistic business news image about ${prompt}. High-quality 4K photograph of modern corporate office setting with AI technology. Clean contemporary workspace with computers, digital screens showing data visualizations and AI interfaces. Hands working with modern devices, silhouettes of business professionals in the background (no faces visible). Natural lighting, shallow depth of field, professional photography. Corporate color palette: blue, white, gray, black. Horizontal composition suitable for news article header. Ultra-realistic, magazine quality photography, sharp details, professional depth of field. No text, no logos, photojournalism style.`;
  }

  async generateWithQwen(prompt) {
    try {
      console.log('🔄 Отправляю запрос в Qwen DashScope API...');

      // Qwen использует DashScope API от Alibaba Cloud
      // Документация: https://help.aliyun.com/zh/dashscope/
      
      const requestData = {
        model: 'wanx-v1', // Модель для генерации изображений от Qwen
        input: {
          prompt: prompt
        },
        parameters: {
          style: 'photography', // Реалистичный фотостиль
          size: '1792*1024', // Горизонтальный формат для новостей
          n: 1,
          seed: Math.floor(Math.random() * 999999),
          ref_mode: 'repaint',
          ref_strength: 0.5
        }
      };

      const response = await axios.post(
        'https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis',
        requestData,
        {
          headers: {
            'Authorization': `Bearer ${this.config.qwen.apiKey}`,
            'Content-Type': 'application/json',
            'X-DashScope-Async': 'enable'
          },
          timeout: 120000
        }
      );

      console.log('📡 Ответ от Qwen API:', response.data);

      // Обработка асинхронного ответа
      if (response.data.output && response.data.output.task_id) {
        const taskId = response.data.output.task_id;
        console.log(`⏳ Задача создана: ${taskId}. Ожидаю генерации...`);
        
        // Ожидаем завершения генерации
        return await this.waitForQwenTask(taskId);
      } else if (response.data.output && response.data.output.results && response.data.output.results[0]) {
        // Синхронный ответ
        return response.data.output.results[0].url;
      } else {
        throw new Error('Неожиданный формат ответа от Qwen API');
      }
    } catch (error) {
      console.error('❌ Ошибка Qwen API:', error.message);
      if (error.response) {
        console.error('📡 Ответ сервера:', JSON.stringify(error.response.data, null, 2));
      }
      throw error;
    }
  }

  async waitForQwenTask(taskId, maxAttempts = 30) {
    console.log(`⏳ Проверяю статус задачи ${taskId}...`);
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const response = await axios.get(
          `https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`,
          {
            headers: {
              'Authorization': `Bearer ${this.config.qwen.apiKey}`
            },
            timeout: 30000
          }
        );

        const status = response.data.output.task_status;
        console.log(`📊 Статус (попытка ${attempt}/${maxAttempts}): ${status}`);

        if (status === 'SUCCEEDED') {
          const imageUrl = response.data.output.results[0].url;
          console.log('✅ Изображение готово!');
          return imageUrl;
        } else if (status === 'FAILED') {
          throw new Error(`Генерация изображения не удалась: ${response.data.output.message || 'Unknown error'}`);
        }

        // Ждем перед следующей проверкой
        // eslint-disable-next-line no-await-in-loop, no-promise-executor-return
        await new Promise((resolve) => { setTimeout(resolve, 4000); }); // 4 секунды между проверками
      } catch (error) {
        console.error(`⚠️ Ошибка проверки статуса (попытка ${attempt}):`, error.message);
        
        if (attempt >= maxAttempts) {
          throw new Error('Превышено время ожидания генерации изображения');
        }
        
        // eslint-disable-next-line no-await-in-loop, no-promise-executor-return
        await new Promise((resolve) => { setTimeout(resolve, 5000); });
      }
    }

    throw new Error('Превышено максимальное количество попыток проверки статуса');
  }

  async generateWithFallback(prompt) {
    try {
      console.log('🔄 Использую Pollinations.ai как fallback...');
      
      const enhancedPrompt = this.enhancePromptRealistic(prompt);
      const encodedPrompt = encodeURIComponent(enhancedPrompt);
      
      // Pollinations.ai с настройками для реалистичных изображений
      const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1792&height=1024&model=flux&nologo=true&enhance=true&seed=${Date.now()}`;
      
      console.log('✅ Fallback изображение создано');
      
      const imagePath = await this.downloadImage(imageUrl);
      
      return {
        url: imageUrl,
        path: imagePath
      };
    } catch (error) {
      console.error('❌ Fallback метод также не сработал:', error.message);
      return null;
    }
  }

  async downloadImage(url) {
    try {
      // Пробуем несколько путей для сохранения (для разных платформ)
      const possibleDirs = [
        path.join(process.cwd(), 'images'),  // Основной путь
        '/tmp/images',                        // Для Render/Railway (ephemeral FS)
        path.join(os.tmpdir(), 'images')     // Системная временная папка
      ];

      let imagesDir = null;
      
      // Находим первую рабочую папку
      for (const dir of possibleDirs) {
        console.log(`📂 Проверяю папку: ${dir}`);
        
        try {
          // eslint-disable-next-line no-await-in-loop
          await fs.mkdir(dir, { recursive: true });
          
          // Проверяем, что папка действительно создана и доступна для записи
          // eslint-disable-next-line no-await-in-loop
          const stats = await fs.stat(dir);
          if (stats.isDirectory()) {
            // Пробуем создать тестовый файл
            const testFile = path.join(dir, '.test');
            try {
              // eslint-disable-next-line no-await-in-loop
              await fs.writeFile(testFile, 'test');
              // eslint-disable-next-line no-await-in-loop
              await fs.unlink(testFile);
              console.log(`✅ Папка images готова: ${dir}`);
              imagesDir = dir;
              break;  // Нашли рабочую папку!
            } catch (testError) {
              console.log(`⚠️ Папка ${dir} не доступна для записи: ${testError.code}`);
            }
          }
        } catch (mkdirError) {
          console.log(`⚠️ Не удалось создать ${dir}: ${mkdirError.code}`);
          continue;
        }
      }

      if (!imagesDir) {
        console.error(`❌ Не удалось найти доступную папку для изображений`);
        console.error(`⚠️ Работаю без сохранения изображений (только URL)`);
        return null;
      }

      const maxRetries = 3;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          // Пересоздаем папку перед каждой попыткой (на случай эфемерной FS)
          try {
            // eslint-disable-next-line no-await-in-loop
            await fs.mkdir(imagesDir, { recursive: true });
            console.log(`✅ Папка проверена перед попыткой ${attempt}`);
          } catch (mkdirError) {
            // Игнорируем EEXIST
            if (mkdirError.code !== 'EEXIST') {
              console.error(`⚠️ Проблема с папкой:`, mkdirError.message);
            }
          }

          const timestamp = Date.now();
          const imagePath = path.join(imagesDir, `ai_business_${timestamp}.png`);

          console.log(`⬇️ Скачиваю изображение (попытка ${attempt}/${maxRetries})...`);
          console.log(`📍 Путь сохранения: ${imagePath}`);

          // eslint-disable-next-line no-await-in-loop
          const response = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: 30000,
            maxRedirects: 5,
            validateStatus: (status) => status === 200
          });

          if (response.data && response.data.length > 0) {
            try {
              // Еще раз проверяем папку прямо перед записью
              // eslint-disable-next-line no-await-in-loop
              await fs.mkdir(imagesDir, { recursive: true });
              
              // eslint-disable-next-line no-await-in-loop
              await fs.writeFile(imagePath, response.data);
              console.log(`✅ Изображение сохранено: ${imagePath}`);
              
              // Проверяем, что файл действительно создан
              // eslint-disable-next-line no-await-in-loop
              const fileStats = await fs.stat(imagePath);
              console.log(`✅ Размер файла: ${fileStats.size} байт`);
              
              return imagePath;
            } catch (writeError) {
              // Ошибка записи файла
              console.error(`⚠️ Ошибка записи файла:`, writeError.message);
              console.error(`⚠️ Код ошибки:`, writeError.code);
              console.error(`⚠️ Путь:`, imagePath);
              
              if (writeError.code === 'EACCES' || writeError.code === 'EROFS') {
                console.error(`⚠️ Нет прав на запись файла (read-only FS) - публикую без картинки`);
                return null;
              }
              if (writeError.code === 'ENOENT') {
                console.error(`⚠️ Папка ${imagesDir} недоступна или FS только для чтения`);
                // Не выходим сразу, пробуем еще раз
                if (attempt >= maxRetries) {
                  console.error(`⚠️ Файловая система не поддерживает запись - работаем без изображений`);
                  return null;
                }
              } else {
                throw writeError;
              }
            }
          } else {
            console.log(`⚠️ Получен пустой ответ от сервера`);
          }
        } catch (error) {
          console.error(`❌ Попытка ${attempt} не удалась:`, error.message);
          console.error(`❌ Код ошибки:`, error.code || 'N/A');
          
          if (attempt < maxRetries) {
            console.log(`⏳ Жду 2 секунды перед следующей попыткой...`);
            // eslint-disable-next-line no-await-in-loop, no-promise-executor-return
            await new Promise((resolve) => { setTimeout(resolve, 2000); });
          }
        }
      }

      console.error('⚠️ Не удалось скачать изображение после всех попыток');
      return null;
    } catch (error) {
      console.error('⚠️ Критическая ошибка при работе с изображениями:', error.message);
      console.error('⚠️ Stack trace:', error.stack);
      return null;
    }
  }

  async createFallbackImage() {
    console.log('📋 Публикация без изображения');
    return null;
  }
}
