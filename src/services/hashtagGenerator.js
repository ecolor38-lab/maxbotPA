export class HashtagGenerator {
  constructor(config) {
    this.lang = config?.language === 'en' ? 'en' : 'ru';
    this.hashtags = {
      ru: ['#AIдляБизнеса', '#ИИ', '#Автоматизация', '#ЧатБот', '#Нейросети', '#ИИ2025'],
      en: ['#AIforBusiness', '#AI', '#Automation', '#Chatbot', '#MachineLearning', '#AI2025']
    };
  }

  generateHashtags(postText) {
    const tags = this.hashtags[this.lang];
    const selected = tags.slice(0, 5);

    // Добавляем контекстные теги
    const text = (postText || '').toLowerCase();
    if (text.includes('gpt') || text.includes('chatgpt')) {
      selected.push(this.lang === 'ru' ? '#ChatGPT' : '#ChatGPT');
    }
    if (text.includes('claude')) {
      selected.push('#Claude');
    }

    const unique = [...new Set(selected)].slice(0, 6);
    console.log(`🏷️ Хештеги: ${unique.length}`);
    return unique.join(' ');
  }
}
