import OpenAI from 'openai';
import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';

export class ImageGenerator {
  constructor(config) {
    this.config = config;
    this.openai = config.openai.apiKey ? new OpenAI({ apiKey: config.openai.apiKey }) : null;
  }

  async generateImage(prompt) {
    if (!this.openai) {
      console.warn('⚠️ OpenAI API ключ не настроен, пропускаю генерацию изображения');
      return null;
    }

    console.log('🎨 Генерирую изображение...');

    try {
      const response = await this.openai.images.generate({
        model: this.config.openai.imageModel,
        prompt: this.enhancePrompt(prompt),
        n: 1,
        size: '1792x1024',
        quality: 'hd',
        style: 'natural'
      });

      const imageUrl = response.data[0].url;
      console.log('✅ Изображение сгенерировано:', imageUrl);

      const imagePath = await this.downloadImage(imageUrl);

      return {
        url: imageUrl,
        path: imagePath
      };
    } catch (error) {
      console.error('Ошибка при генерации изображения:', error.message);
      return null;
    }
  }

  enhancePrompt(prompt) {
    const enhancedPrompt = `Professional medical infographic: ${prompt}.

Style: Clean, modern, scientific illustration with a professional healthcare aesthetic.
Colors: Predominantly blue and white color scheme with subtle gradients.
Elements: Abstract medical imagery - molecules, cells, DNA strands, medical crosses, technology interfaces.
Composition: Horizontal layout suitable for social media posts.
Quality: High-resolution, magazine-quality illustration.
Avoid: Photos of real people, disturbing imagery, text overlays.`;

    return enhancedPrompt;
  }

  async downloadImage(url) {
    try {
      const imagesDir = path.join(process.cwd(), 'images');
      await fs.mkdir(imagesDir, { recursive: true });

      const timestamp = Date.now();
      const imagePath = path.join(imagesDir, `arthritis_${timestamp}.png`);

      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 30000
      });

      await fs.writeFile(imagePath, response.data);

      console.log(`✅ Изображение сохранено: ${imagePath}`);
      return imagePath;
    } catch (error) {
      console.error('Ошибка при загрузке изображения:', error.message);
      throw error;
    }
  }

  async createFallbackImage() {
    console.log('📋 Используем резервный вариант (без изображения)');
    return null;
  }
}
