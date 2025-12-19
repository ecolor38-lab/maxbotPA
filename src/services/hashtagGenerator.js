export class HashtagGenerator {
  constructor(config) {
    this.config = config;
    this.baseHashtags = {
      ru: [
        '#ПсориатическийАртрит',
        '#Артрит',
        '#Медицина',
        '#Здоровье',
        '#МедицинскиеНовости',
        '#Ревматология',
        '#Иммунология',
        '#ЗдоровыйОбразЖизни'
      ],
      en: [
        '#PsoriaticArthritis',
        '#Arthritis',
        '#Medicine',
        '#Health',
        '#MedicalNews',
        '#Rheumatology',
        '#Immunology',
        '#Healthcare'
      ]
    };

    this.topicalHashtags = {
      ru: [
        '#БиологическиеПрепараты',
        '#НовыеЛекарства',
        '#КлиническиеИсследования',
        '#ИскусственныйИнтеллект',
        '#ИИвМедицине',
        '#ПерсонализированнаяМедицина',
        '#Инновации',
        '#МедТех',
        '#ТаргетнаяТерапия',
        '#ГенетическиеИсследования'
      ],
      en: [
        '#BiologicDrugs',
        '#NewDrugs',
        '#ClinicalTrials',
        '#ArtificialIntelligence',
        '#AIinHealthcare',
        '#PersonalizedMedicine',
        '#Innovation',
        '#MedTech',
        '#TargetedTherapy',
        '#GeneticResearch'
      ]
    };
  }

  generateHashtags(postText, articles) {
    console.log('🏷️ Генерирую хештеги...');

    const lang = this.config.language;
    const hashtags = new Set();

    const baseCount = 4;
    const selectedBase = this.baseHashtags[lang].slice(0, baseCount);
    selectedBase.forEach(tag => hashtags.add(tag));

    const topicalCount = 3;
    const relevantTopical = this.selectRelevantTopicalHashtags(postText, articles, lang);
    relevantTopical.slice(0, topicalCount).forEach(tag => hashtags.add(tag));

    const trending = this.addTrendingHashtags(lang);
    trending.forEach(tag => hashtags.add(tag));

    const finalHashtags = Array.from(hashtags).slice(0, 10);

    console.log(`✅ Сгенерировано ${finalHashtags.length} хештегов`);

    return finalHashtags.join(' ');
  }

  selectRelevantTopicalHashtags(postText, articles, lang) {
    const text = postText.toLowerCase();
    const relevant = [];

    const keywords = {
      'биологическ': ['#БиологическиеПрепараты', '#BiologicDrugs'],
      'biologic': ['#БиологическиеПрепараты', '#BiologicDrugs'],
      'лекарств': ['#НовыеЛекарства', '#NewDrugs'],
      'drug': ['#НовыеЛекарства', '#NewDrugs'],
      'medication': ['#НовыеЛекарства', '#NewDrugs'],
      'исследован': ['#КлиническиеИсследования', '#ClinicalTrials'],
      'research': ['#КлиническиеИсследования', '#ClinicalTrials'],
      'trial': ['#КлиническиеИсследования', '#ClinicalTrials'],
      'ии': ['#ИИвМедицине', '#AIinHealthcare'],
      'ai': ['#ИскусственныйИнтеллект', '#ArtificialIntelligence'],
      'artificial intelligence': ['#ИскусственныйИнтеллект', '#ArtificialIntelligence'],
      'machine learning': ['#ИИвМедицине', '#AIinHealthcare'],
      'персонализ': ['#ПерсонализированнаяМедицина', '#PersonalizedMedicine'],
      'personalized': ['#ПерсонализированнаяМедицина', '#PersonalizedMedicine'],
      'ген': ['#ГенетическиеИсследования', '#GeneticResearch'],
      'genetic': ['#ГенетическиеИсследования', '#GeneticResearch'],
      'таргет': ['#ТаргетнаяТерапия', '#TargetedTherapy'],
      'targeted': ['#ТаргетнаяТерапия', '#TargetedTherapy']
    };

    for (const [keyword, tags] of Object.entries(keywords)) {
      if (text.includes(keyword)) {
        const tag = lang === 'ru' ? tags[0] : tags[1];
        if (!relevant.includes(tag)) {
          relevant.push(tag);
        }
      }
    }

    if (relevant.length < 3) {
      const fallback = this.topicalHashtags[lang].filter(tag => !relevant.includes(tag));
      relevant.push(...fallback.slice(0, 3 - relevant.length));
    }

    return relevant;
  }

  addTrendingHashtags(lang) {
    const year = new Date().getFullYear();
    const trending = [];

    if (lang === 'ru') {
      trending.push('#Медицина2025');
      trending.push('#ЗдоровьеБудущего');
    } else {
      trending.push('#Medicine2025');
      trending.push('#FutureOfHealthcare');
    }

    return trending;
  }
}
