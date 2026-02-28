import OpenAI from 'openai';

const ART_STYLES = [
  {
    name: 'cinematic',
    prompt: 'Cinematic photorealistic scene, dramatic lighting with volumetric rays, shallow depth of field, shot on ARRI Alexa, film grain, warm and cool contrast, anamorphic lens flare, moody atmosphere'
  },
  {
    name: '3d_render',
    prompt: 'Clean 3D render, soft studio lighting, matte materials with subtle reflections, pastel and cream color palette with one bold accent color, rounded shapes, Clay render style, Blender Cycles quality'
  },
  {
    name: 'editorial',
    prompt: 'Bold editorial illustration, flat color blocks with textured overlays, risograph print aesthetic, limited palette (3-4 colors), strong geometric composition, grain texture, mid-century modern influence'
  },
  {
    name: 'isometric',
    prompt: 'Detailed isometric 3D illustration, miniature diorama style, soft ambient occlusion, pastel colors with vibrant accents, tiny detailed objects, tilt-shift feel, playful and clean'
  },
  {
    name: 'photojournalism',
    prompt: 'Documentary-style conceptual photography, natural lighting, candid composition, muted tones with selective color pop, real-world setting, environmental storytelling, 35mm lens feel'
  },
  {
    name: 'abstract',
    prompt: 'Abstract generative art, flowing organic forms, gradient meshes, vibrant saturated colors blending into each other, digital fluid simulation, high contrast, contemporary gallery aesthetic'
  },
  {
    name: 'retro_futurism',
    prompt: '1970s retro-futurism style, warm analog color palette (burnt orange, teal, mustard), halftone dots, vintage sci-fi book cover aesthetic, chrome and glass elements, optimistic space-age feel'
  },
  {
    name: 'watercolor',
    prompt: 'Digital watercolor painting, loose brushstrokes with visible paper texture, soft color bleeds, delicate ink outlines, muted earth tones with splashes of vivid color, artistic and elegant'
  },
  {
    name: 'neon_noir',
    prompt: 'Neon noir atmosphere, rain-slicked surfaces reflecting colored lights, deep shadows, cyberpunk city environment, electric blue and magenta neon glow, cinematic wide angle, Blade Runner inspired'
  },
  {
    name: 'minimal',
    prompt: 'Ultra-minimalist design, single bold object on clean background, dramatic negative space, one or two accent colors on white/light grey, subtle shadow, Apple product photo aesthetic'
  },
  {
    name: 'collage',
    prompt: 'Contemporary digital collage, mixed media with photography cutouts and geometric shapes, torn paper edges, overlapping layers, bold typography-like composition (no actual text), Memphis design influence'
  },
  {
    name: 'surreal',
    prompt: 'Surrealist dreamscape, impossible architecture, Magritte-inspired juxtapositions, photorealistic rendering of impossible scenes, soft daylight, slightly uncanny, thought-provoking composition'
  }
];

const TOPIC_VISUALS = [
  // Технологии и устройства
  { keywords: ['робот', 'robot', 'humanoid'], theme: 'elegant humanoid robot interacting with people in a sunlit modern office' },
  { keywords: ['медицин', 'health', 'диагност', 'врач'], theme: 'futuristic hospital room with holographic medical displays, a doctor reviewing AI-generated scans' },
  { keywords: ['авто', 'беспилот', 'tesla', 'waymo'], theme: 'sleek autonomous car driving through a beautiful city at golden hour' },
  { keywords: ['дрон', 'drone', 'бпла'], theme: 'swarm of delivery drones flying over a modern city at sunset' },
  { keywords: ['смартфон', 'iphone', 'телефон', 'гаджет'], theme: 'person holding a glowing smartphone with AI interface floating above the screen' },
  { keywords: ['очки', 'vr', 'ar', 'meta quest', 'vision pro'], theme: 'person wearing sleek AR glasses in a beautiful natural setting with holographic overlays' },

  // ИИ-сервисы
  { keywords: ['генера', 'картин', 'midjourney', 'dall-e', 'изображени'], theme: 'magical artist studio where paintings create themselves, brushes floating in air, colorful canvases' },
  { keywords: ['чат', 'gpt', 'claude', 'llm', 'языков'], theme: 'cozy workspace with a glowing AI assistant hovering above a desk, warm ambient lighting' },
  { keywords: ['код', 'program', 'разработ', 'developer', 'copilot'], theme: 'developer workspace with floating holographic code, warm coffee on desk, city view through window' },
  { keywords: ['google', 'gemini'], theme: 'vast modern data center with colorful lights reflecting off glass surfaces' },
  { keywords: ['openai'], theme: 'clean minimalist research lab with glowing neural network visualization' },
  { keywords: ['apple', 'siri'], theme: 'elegant Apple-style product on a marble surface with soft natural light' },
  { keywords: ['nvidia', 'чип', 'gpu', 'процессор'], theme: 'macro shot of a beautiful glowing processor chip with light trails flowing through circuits' },
  { keywords: ['яндекс', 'yandex', 'сбер', 'gigachat'], theme: 'modern Moscow tech campus with glass buildings reflecting sunrise' },

  // Области применения
  { keywords: ['безопасност', 'security', 'кибер', 'хакер'], theme: 'dramatic cybersecurity command center with multiple screens showing threat maps, blue and red lighting' },
  { keywords: ['бизнес', 'стартап', 'invest', 'funding'], theme: 'modern co-working space with diverse team celebrating a product launch, champagne and laptops' },
  { keywords: ['образовани', 'обучени', 'студент', 'школ'], theme: 'futuristic classroom with students using holographic displays, warm sunlight through large windows' },
  { keywords: ['музык', 'suno', 'audio', 'звук'], theme: 'professional music studio with glowing AI waveforms flowing from speakers, warm wood interior' },
  { keywords: ['видео', 'sora', 'runway', 'генерац видео'], theme: 'film director chair facing multiple floating screens showing different AI-generated scenes' },
  { keywords: ['закон', 'регулиров', 'запрет', 'ban'], theme: 'dramatic courthouse with scales of justice, one side holding a glowing AI chip, moody lighting' },
  { keywords: ['агент', 'agent', 'автоном'], theme: 'network of glowing AI nodes connecting across a beautiful cityscape at twilight' },
  { keywords: ['наук', 'research', 'исследовани'], theme: 'beautiful scientific laboratory with molecular visualizations floating in mid-air' },
  { keywords: ['космос', 'space', 'nasa', 'satellite'], theme: 'Earth from orbit with constellation of AI-powered satellites, aurora borealis visible' },
  { keywords: ['финанс', 'банк', 'крипт', 'bitcoin', 'торг'], theme: 'futuristic trading floor with holographic charts and data streams, dramatic lighting' },
  { keywords: ['climate', 'климат', 'экологи', 'энерги'], theme: 'beautiful landscape where nature meets technology: wind turbines, solar panels, lush greenery' },
  { keywords: ['фото', 'камер', 'photo'], theme: 'photographer reviewing AI-enhanced photos on a large display in a stylish studio' },
  { keywords: ['перевод', 'translat', 'язык'], theme: 'beautiful globe with glowing connection lines between countries, diverse languages floating around' },
  { keywords: ['игр', 'game', 'gaming'], theme: 'immersive gaming setup with holographic game world spilling out into the room' }
];

const POST_TYPE_STYLE_BIAS = {
  news_flash: ['cinematic', 'photojournalism', 'editorial', '3d_render', 'minimal'],
  analysis: ['3d_render', 'surreal', 'abstract', 'cinematic', 'watercolor'],
  digest: ['collage', 'isometric', 'editorial', 'retro_futurism'],
  tip: ['minimal', '3d_render', 'isometric', 'watercolor'],
  prediction: ['surreal', 'retro_futurism', 'neon_noir', 'abstract', 'cinematic'],
  hot_take: ['neon_noir', 'abstract', 'editorial', 'cinematic', 'surreal'],
  series: ['watercolor', 'isometric', '3d_render', 'editorial'],
  sponsored: ['minimal', 'cinematic', '3d_render', 'photojournalism']
};

let lastStyleIndex = -1;

export class ImageGenerator {
  constructor(config) {
    this.openai = config.openai?.apiKey ? new OpenAI({ apiKey: config.openai.apiKey }) : null;
  }

  async generateImage(postText, postType = 'news_flash') {
    if (!this.openai) {
      console.log('⚠️ OpenAI не настроен — картинка не будет сгенерирована');
      return null;
    }

    const prompt = this.buildPrompt(postText, postType);
    const MAX_RETRIES = 3;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      console.log(`🎨 Генерация обложки через DALL-E... (попытка ${attempt}/${MAX_RETRIES})`);

      try {
        const response = await this.openai.images.generate({
          model: 'dall-e-3',
          prompt,
          n: 1,
          size: '1792x1024',
          quality: 'hd'
        });

        const imageUrl = response.data[0]?.url;
        if (imageUrl) {
          console.log('✅ Обложка сгенерирована');
          return imageUrl;
        }
      } catch (error) {
        console.log(`⚠️ Ошибка генерации картинки (попытка ${attempt}):`, error.message);
        if (attempt < MAX_RETRIES) {
          const delay = attempt * 5000;
          console.log(`   ⏳ Повтор через ${delay / 1000} сек...`);
          await new Promise((r) => setTimeout(r, delay));
        }
      }
    }

    return null;
  }

  buildPrompt(postText, postType = 'news_flash') {
    const lower = postText.toLowerCase();

    const theme = this.detectTheme(lower);
    const style = this.pickStyle(postType);
    const composition = this.pickComposition();

    console.log(`   Стиль: ${style.name} | Композиция: ${composition.name} | Тема: ${theme.substring(0, 50)}...`);

    return `${theme}. ${style.prompt}. ${composition.prompt}. Aspect ratio 16:9. STRICT: absolutely NO text, NO letters, NO words, NO numbers, NO logos, NO watermarks anywhere in the image.`;
  }

  pickComposition() {
    const compositions = [
      { name: 'closeup', prompt: 'Extreme macro close-up shot, shallow depth of field, bokeh background' },
      { name: 'wide', prompt: 'Epic wide establishing shot, vast scale, dramatic perspective' },
      { name: 'overhead', prompt: 'Overhead bird-eye view, flat lay composition, geometric arrangement' },
      { name: 'dutch', prompt: 'Dynamic dutch angle, diagonal lines, sense of motion and energy' },
      { name: 'symmetry', prompt: 'Perfect bilateral symmetry, centered subject, mirror-like balance' },
      { name: 'rule_of_thirds', prompt: 'Subject placed at rule-of-thirds intersection, natural visual flow' },
      { name: 'frame_in_frame', prompt: 'Frame within a frame composition, layered depth, framing element in foreground' },
      { name: 'negative_space', prompt: 'Bold use of negative space, isolated subject, breathing room around focal point' }
    ];
    return compositions[Math.floor(Math.random() * compositions.length)];
  }

  detectTheme(text) {
    for (const { keywords, theme } of TOPIC_VISUALS) {
      if (keywords.some((kw) => text.includes(kw))) {
        return theme;
      }
    }
    return 'cutting-edge artificial intelligence technology in everyday life';
  }

  pickStyle(postType) {
    const biased = POST_TYPE_STYLE_BIAS[postType] || POST_TYPE_STYLE_BIAS.news_flash;
    const pool = ART_STYLES.filter((s) => biased.includes(s.name));

    // Не повторяем предыдущий стиль
    const available = pool.length > 1 ? pool.filter((_, i) => {
      const globalIdx = ART_STYLES.indexOf(pool[i]);
      return globalIdx !== lastStyleIndex;
    }) : pool;

    const picked = available[Math.floor(Math.random() * available.length)] || pool[0];
    lastStyleIndex = ART_STYLES.indexOf(picked);
    return picked;
  }
}
