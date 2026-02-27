import OpenAI from 'openai';

export class ImageGenerator {
  constructor(config) {
    this.openai = config.openai?.apiKey ? new OpenAI({ apiKey: config.openai.apiKey }) : null;
  }

  async generateImage(postText) {
    if (!this.openai) {
      console.log('⚠️ OpenAI не настроен — картинка не будет сгенерирована');
      return null;
    }

    console.log('🎨 Генерация обложки через DALL-E...');

    try {
      const prompt = this.buildPrompt(postText);

      const response = await this.openai.images.generate({
        model: 'dall-e-3',
        prompt,
        n: 1,
        size: '1792x1024',
        quality: 'standard'
      });

      const imageUrl = response.data[0]?.url;
      if (imageUrl) {
        console.log('✅ Обложка сгенерирована');
        return imageUrl;
      }
    } catch (error) {
      console.log('⚠️ Ошибка генерации картинки:', error.message);
    }

    return null;
  }

  buildPrompt(postText) {
    // Извлекаем ключевые слова из заголовка (первая строка)
    const firstLine = postText.split('\n')[0].replace(/[#*_\[\]()🔥⚡💡📰🚀🤖💸📱🧠]/g, '').trim();
    const context = firstLine.substring(0, 150);

    // Определяем визуальную тему по содержанию
    const text = postText.toLowerCase();
    let visualTheme = 'digital technology and artificial intelligence';
    if (text.includes('робот') || text.includes('robot')) visualTheme = 'humanoid robots and automation';
    else if (text.includes('медицин') || text.includes('health')) visualTheme = 'AI in medicine and healthcare';
    else if (text.includes('авто') || text.includes('беспилот')) visualTheme = 'autonomous vehicles and self-driving technology';
    else if (text.includes('генера') || text.includes('картин') || text.includes('midjourney')) visualTheme = 'generative AI art and creative tools';
    else if (text.includes('безопасност') || text.includes('security')) visualTheme = 'cybersecurity and digital protection';
    else if (text.includes('бизнес') || text.includes('стартап')) visualTheme = 'tech startup and business innovation';
    else if (text.includes('чат') || text.includes('gpt') || text.includes('claude')) visualTheme = 'AI chatbot conversation interface';

    return `Create a vibrant, eye-catching editorial illustration for a tech news channel. Topic: "${context}". Visual theme: ${visualTheme}. Style: bold and modern, saturated colors with neon accents (electric blue, violet, cyan), clean composition with strong focal point, slightly futuristic aesthetic, geometric shapes mixed with organic forms. Must feel premium and professional like a top tech media brand. NO text, NO letters, NO words, NO logos, NO watermarks on the image. No photorealistic humans.`;
  }
}
