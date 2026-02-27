export class HashtagGenerator {
  constructor(config) {
    this.lang = config?.language === 'en' ? 'en' : 'ru';
    // Контекстные теги — добавляются только при упоминании в тексте
    this.contextTags = {
      // Компании и продукты
      chatgpt: '#ChatGPT',
      'gpt-': '#ChatGPT',
      claude: '#Claude',
      gemini: '#Gemini',
      openai: '#OpenAI',
      google: '#Google',
      apple: '#Apple',
      microsoft: '#Microsoft',
      яндекс: '#Яндекс',
      yandex: '#Яндекс',
      сбер: '#Сбер',
      meta: '#Meta',
      tesla: '#Tesla',
      nvidia: '#NVIDIA',
      // Технологии
      нейросет: '#нейросети',
      'neural net': '#нейросети',
      llm: '#LLM',
      copilot: '#Copilot',
      midjourney: '#Midjourney',
      'stable diffusion': '#StableDiffusion',
      sora: '#Sora',
      робот: '#роботы',
      robot: '#роботы',
      автоматизац: '#автоматизация',
      программир: '#разработка',
      coding: '#разработка',
      беспилотн: '#беспилотники',
      квантов: '#квантовыекомпьютеры',
      блокчейн: '#блокчейн',
      // Темы
      стартап: '#стартапы',
      startup: '#стартапы',
      бизнес: '#бизнес',
      безопасност: '#кибербезопасность',
      регулирован: '#регулирование',
      образован: '#EdTech',
      медицин: '#MedTech',
      генерац: '#генеративныйИИ',
      агент: '#ИИагенты'
    };
    // Базовые теги — выбираем 1 случайный + контекстные
    this.baseTags = {
      ru: ['#ИИ', '#нейросети', '#технологии', '#AI', '#TechNews'],
      en: ['#AI', '#Tech', '#MachineLearning']
    };
  }

  generateHashtags(postText) {
    const text = (postText || '').toLowerCase();
    const tags = [];

    // 1 базовый тег (случайный)
    const base = this.baseTags[this.lang];
    tags.push(base[Math.floor(Math.random() * base.length)]);

    // Контекстные теги
    for (const [keyword, tag] of Object.entries(this.contextTags)) {
      if (text.includes(keyword) && !tags.includes(tag)) {
        tags.push(tag);
      }
    }

    // 2-3 хештега — оптимально для MAX (не перегружаем пост)
    const unique = [...new Set(tags)].slice(0, 3);
    console.log(`🏷️ Хештеги (${unique.length}): ${unique.join(' ')}`);
    return unique.join(' ');
  }
}
