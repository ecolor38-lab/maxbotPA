import Anthropic from '@anthropic-ai/sdk';
import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import fs from 'fs/promises';
import path from 'path';

export class ImageGenerator {
  constructor(config) {
    this.config = config;
    this.anthropic = config.anthropic.apiKey ? new Anthropic({ apiKey: config.anthropic.apiKey }) : null;

    // Настройка axios для работы с прокси
    this.axiosConfig = {
      timeout: 60000,
      responseType: 'arraybuffer'
    };

    if (process.env.HTTPS_PROXY || process.env.https_proxy) {
      const proxyUrl = process.env.HTTPS_PROXY || process.env.https_proxy;
      this.axiosConfig.httpsAgent = new HttpsProxyAgent(proxyUrl);
    }
  }

  async generateImage(prompt) {
    console.log('🎨 Генерирую изображение через Claude + Pollinations AI...');

    try {
      // Шаг 1: Используем Claude для создания детального промпта
      let enhancedPrompt;
      if (this.anthropic) {
        enhancedPrompt = await this.generatePromptWithClaude(prompt);
      } else {
        enhancedPrompt = this.enhancePromptSimple(prompt);
      }

      console.log('✅ Промпт создан через Claude');
      console.log(`📝 Промпт: ${enhancedPrompt.substring(0, 100)}...`);

      // Шаг 2: Генерируем изображение через бесплатный API Pollinations
      const imageUrl = await this.generateWithPollinations(enhancedPrompt);

      console.log('✅ Изображение сгенерировано');

      // Шаг 3: Скачиваем изображение
      const imagePath = await this.downloadImage(imageUrl);

      return {
        url: imageUrl,
        path: imagePath
      };
    } catch (error) {
      console.error('⚠️ Ошибка при генерации изображения:', error.message);
      return null;
    }
  }

  async generatePromptWithClaude(basicPrompt) {
    try {
      const message = await this.anthropic.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 300,
        messages: [{
          role: 'user',
          content: `Создай детальный английский промпт для генерации AI бизнес изображения на основе этой темы: "${basicPrompt}"

Требования к промпту:
- Только на английском языке
- Современный технологический бизнес стиль
- Профессиональная AI инфографика
- Цвета: синий, фиолетовый, белый градиент
- Элементы: нейросети, AI роботы, чат-боты, автоматизация, технологии, цифровые элементы
- Горизонтальная композиция для соцсетей
- БЕЗ текста, БЕЗ людей, БЕЗ реалистичных фото

Ответь ТОЛЬКО промптом, без пояснений.`
        }]
      });

      return message.content[0].text.trim();
    } catch (error) {
      console.log('⚠️ Claude API недоступен, использую простой промпт');
      return this.enhancePromptSimple(basicPrompt);
    }
  }

  enhancePromptSimple(prompt) {
    return `Professional AI business infographic about ${prompt}. Modern tech illustration with blue and purple gradient. Abstract AI imagery with neural networks, chatbot icons, automation symbols, AI robots, digital circuits, and technology interfaces. Horizontal layout, high-resolution, magazine-quality. No text, no people, no photos.`;
  }

  async generateWithPollinations(prompt) {
    try {
      // Pollinations.ai - бесплатный API для генерации изображений
      // Поддерживает Stable Diffusion
      const encodedPrompt = encodeURIComponent(prompt);

      // Используем их публичный API
      const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1792&height=1024&model=flux&nologo=true&enhance=true`;

      console.log('🔗 URL изображения:', imageUrl);

      return imageUrl;
    } catch (error) {
      console.error('Ошибка Pollinations API:', error.message);
      throw error;
    }
  }

  async downloadImage(url) {
    const maxRetries = 3;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const imagesDir = path.join(process.cwd(), 'images');
        await fs.mkdir(imagesDir, { recursive: true });

        const timestamp = Date.now();
        const imagePath = path.join(imagesDir, `ai_business_${timestamp}.png`);

        console.log(`⬇️ Скачиваю изображение (попытка ${attempt}/${maxRetries})...`);

        const response = await axios.get(url, {
          ...this.axiosConfig,
          timeout: 30000,
          maxRedirects: 5,
          validateStatus: (status) => status === 200
        });

        if (response.data && response.data.length > 0) {
          await fs.writeFile(imagePath, response.data);
          console.log(`✅ Изображение сохранено: ${imagePath}`);
          return imagePath;
        }
      } catch (error) {
        console.error(`❌ Попытка ${attempt} не удалась:`, error.message);
        
        if (attempt < maxRetries) {
          console.log(`⏳ Жду 2 секунды перед следующей попыткой...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }

    console.error('⚠️ Не удалось скачать изображение после всех попыток');
    return null;
  }

  async createFallbackImage() {
    console.log('📋 Публикация без изображения');
    return null;
  }
}
