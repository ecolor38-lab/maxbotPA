export class HashtagGenerator {
  constructor(config) {
    this.config = config;
    this.baseHashtags = {
      ru: [
        '#AIдляБизнеса',
        '#ИИ',
        '#ИскусственныйИнтеллект',
        '#Автоматизация',
        '#ЧатБот',
        '#НейроБизнес',
        '#БизнесАвтоматизация',
        '#ГотовыеРешения'
      ],
      en: [
        '#AIforBusiness',
        '#ArtificialIntelligence',
        '#AI',
        '#Automation',
        '#Chatbot',
        '#BusinessAI',
        '#DigitalTransformation',
        '#AITools'
      ]
    };

    this.topicalHashtags = {
      ru: [
        '#GPT4',
        '#ChatGPT',
        '#Claude',
        '#Нейросети',
        '#КонтентМаркетинг',
        '#AIАгент',
        '#МашинноеОбучение',
        '#ЦифровизацияБизнеса',
        '#Стартап',
        '#ИнновацииВБизнесе'
      ],
      en: [
        '#GPT4',
        '#ChatGPT',
        '#Claude',
        '#MachineLearning',
        '#ContentMarketing',
        '#AIAgent',
        '#DeepLearning',
        '#Startup',
        '#TechInnovation',
        '#AIRevolution'
      ]
    };
  }

  generateHashtags(postText, articles) {
    console.log('🏷️ Генерирую хештеги...');

    // Проверяем и нормализуем язык с fallback на 'ru'
    let lang = this.config?.language || 'ru';

    // Убедимся что язык поддерживается
    if (!this.baseHashtags[lang]) {
      console.log(`⚠️ Язык "${lang}" не поддерживается, использую "ru"`);
      lang = 'ru';
    }

    const hashtags = new Set();

    const baseCount = 3;
    // Добавляем дополнительную проверку что baseHashtags[lang] существует и это массив
    const baseHashtagsArray = this.baseHashtags[lang] || this.baseHashtags['ru'] || [];
    const selectedBase = baseHashtagsArray.slice(0, baseCount);
    selectedBase.forEach((tag) => hashtags.add(tag));

    const topicalCount = 2;
    const relevantTopical = this.selectRelevantTopicalHashtags(postText, articles, lang) || [];
    relevantTopical.slice(0, topicalCount).forEach((tag) => hashtags.add(tag));

    const trending = this.addTrendingHashtags(lang) || [];
    trending.slice(0, 1).forEach((tag) => hashtags.add(tag)); // Только 1 трендовый

    const finalHashtags = Array.from(hashtags).slice(0, 6);

    console.log(`✅ Сгенерировано ${finalHashtags.length} хештегов`);

    return finalHashtags.join(' ');
  }

  selectRelevantTopicalHashtags(postText, articles, lang) {
    // Убедимся что postText не undefined
    const text = (postText || '').toLowerCase();
    const relevant = [];

    // Нормализуем язык
    const normalizedLang = this.baseHashtags[lang] ? lang : 'ru';

    const keywords = {
      gpt: ['#GPT4', '#GPT4'],
      chatgpt: ['#ChatGPT', '#ChatGPT'],
      claude: ['#Claude', '#Claude'],
      'чат-бот': ['#ЧатБот', '#Chatbot'],
      chatbot: ['#ЧатБот', '#Chatbot'],
      нейросет: ['#Нейросети', '#MachineLearning'],
      neural: ['#Нейросети', '#MachineLearning'],
      контент: ['#КонтентМаркетинг', '#ContentMarketing'],
      content: ['#КонтентМаркетинг', '#ContentMarketing'],
      агент: ['#AIАгент', '#AIAgent'],
      agent: ['#AIАгент', '#AIAgent'],
      'машинное обучение': ['#МашинноеОбучение', '#MachineLearning'],
      'machine learning': ['#МашинноеОбучение', '#MachineLearning'],
      автоматизац: ['#БизнесАвтоматизация', '#Automation'],
      automation: ['#БизнесАвтоматизация', '#Automation'],
      стартап: ['#Стартап', '#Startup'],
      startup: ['#Стартап', '#Startup']
    };

    for (const [keyword, tags] of Object.entries(keywords)) {
      if (text.includes(keyword)) {
        const tag = normalizedLang === 'ru' ? tags[0] : tags[1];
        if (!relevant.includes(tag)) {
          relevant.push(tag);
        }
      }
    }

    if (relevant.length < 3) {
      const fallback = this.topicalHashtags[normalizedLang] || this.topicalHashtags['ru'] || [];
      const filtered = Array.isArray(fallback)
        ? fallback.filter((tag) => !relevant.includes(tag))
        : [];
      relevant.push(...filtered.slice(0, 3 - relevant.length));
    }

    return relevant;
  }

  addTrendingHashtags(lang) {
    const _year = new Date().getFullYear(); // eslint-disable-line no-unused-vars
    const trending = [];

    // Нормализуем язык с fallback
    const normalizedLang = lang === 'ru' || lang === 'en' ? lang : 'ru';

    if (normalizedLang === 'ru') {
      trending.push('#ИИ2025');
      trending.push('#БизнесБудущего');
    } else {
      trending.push('#AI2025');
      trending.push('#FutureOfBusiness');
    }

    return trending;
  }
}
