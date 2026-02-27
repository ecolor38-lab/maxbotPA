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
  { keywords: ['робот', 'robot', 'humanoid'], theme: 'humanoid robot in a real-world environment' },
  { keywords: ['медицин', 'health', 'диагност', 'врач'], theme: 'AI-powered medical technology and healthcare innovation' },
  { keywords: ['авто', 'беспилот', 'tesla', 'waymo'], theme: 'autonomous vehicle technology and smart transportation' },
  { keywords: ['генера', 'картин', 'midjourney', 'dall-e', 'изображени'], theme: 'AI-generated art and creative AI tools' },
  { keywords: ['безопасност', 'security', 'кибер', 'хакер'], theme: 'digital security shield protecting data networks' },
  { keywords: ['бизнес', 'стартап', 'invest', 'funding'], theme: 'tech startup innovation and venture capital' },
  { keywords: ['чат', 'gpt', 'claude', 'llm', 'языков'], theme: 'conversational AI assistant interface' },
  { keywords: ['код', 'program', 'разработ', 'developer', 'copilot'], theme: 'AI-assisted software development and coding' },
  { keywords: ['google', 'gemini'], theme: 'Google AI ecosystem and search intelligence' },
  { keywords: ['openai'], theme: 'OpenAI research lab and frontier AI models' },
  { keywords: ['apple', 'siri'], theme: 'Apple devices with integrated AI intelligence' },
  { keywords: ['nvidia', 'чип', 'gpu', 'процессор'], theme: 'high-performance AI computing hardware and chips' },
  { keywords: ['образовани', 'обучени', 'студент'], theme: 'AI transforming education and personalized learning' },
  { keywords: ['музык', 'suno', 'audio'], theme: 'AI music generation and audio synthesis' },
  { keywords: ['видео', 'sora', 'runway', 'генерац видео'], theme: 'AI video generation and visual storytelling' },
  { keywords: ['закон', 'регулиров', 'запрет', 'ban'], theme: 'government regulation of AI technology' },
  { keywords: ['агент', 'agent', 'автоном'], theme: 'autonomous AI agents working independently' }
];

const POST_TYPE_STYLE_BIAS = {
  news_flash: ['cinematic', 'photojournalism', 'editorial'],
  analysis: ['3d_render', 'surreal', 'abstract'],
  digest: ['collage', 'isometric', 'editorial'],
  tip: ['minimal', '3d_render', 'isometric'],
  prediction: ['surreal', 'retro_futurism', 'neon_noir'],
  hot_take: ['neon_noir', 'abstract', 'editorial'],
  series: ['watercolor', 'isometric', '3d_render'],
  sponsored: ['minimal', 'cinematic', '3d_render']
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

    console.log('🎨 Генерация обложки через DALL-E...');

    try {
      const prompt = this.buildPrompt(postText, postType);

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
      console.log('⚠️ Ошибка генерации картинки:', error.message);
    }

    return null;
  }

  buildPrompt(postText, postType = 'news_flash') {
    const firstLine = postText.split('\n')[0].replace(/[#*_\[\]()🔥⚡💡📰🚀🤖💸📱🧠🔮📌🏆]/g, '').trim();
    const context = firstLine.substring(0, 120);
    const lower = postText.toLowerCase();

    const theme = this.detectTheme(lower);
    const style = this.pickStyle(postType);

    console.log(`   Стиль: ${style.name} | Тема: ${theme.substring(0, 50)}...`);

    return `Create a striking image for a technology news article. Subject: "${context}". Scene: ${theme}. Art direction: ${style.prompt}. The image must be visually arresting, with a clear focal point and professional composition. Aspect ratio 16:9. STRICT: absolutely NO text, NO letters, NO words, NO numbers, NO logos, NO watermarks anywhere in the image. No photorealistic human faces.`;
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
