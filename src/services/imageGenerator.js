import axios from 'axios';

export class ImageGenerator {
  constructor(config) {
    this.config = config;
  }

  async generateImage(prompt) {
    console.log('🎨 Генерация изображения...');

    try {
      // Используем Pollinations.ai - бесплатный сервис
      const encodedPrompt = encodeURIComponent(
        `Professional AI business illustration: ${prompt}. Modern tech style, blue gradient, neural networks, no text, no people.`
      );
      const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=576&nologo=true`;

      // Проверяем доступность
      const response = await axios.head(imageUrl, { timeout: 10000 });
      if (response.status === 200) {
        console.log('✅ Изображение готово');
        return imageUrl;
      }
    } catch (error) {
      console.log('⚠️ Ошибка генерации изображения:', error.message);
    }

    return null;
  }
}
