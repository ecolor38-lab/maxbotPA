import { config } from './src/config/config.js';
import { ImageGenerator } from './src/services/imageGenerator.js';
import { TelegramPublisherNative } from './src/services/telegramPublisherNative.js';

const postText = `🚀 Anthropic запускает Agent Skills: открытый стандарт для AI-агентов

18 декабря 2025 — Anthropic открыла Agent Skills как стандарт для корпоративного AI. Спецификация доступна на agentskills.io.

**Что это:**
Готовые наборы инструкций для AI-агентов — от гайдлайнов бренда до автоматизации задач в Jira и Asana.

**Партнеры:**
Microsoft, OpenAI, Atlassian, Figma, Cursor, GitHub уже внедрили стандарт. Каталог Skills от Figma, Canva, Stripe, Notion, Zapier.

**Для бизнеса:**
Подписчики Team и Enterprise планов Claude получают централизованное управление Skills.

**Стратегия:**
Открытый стандарт создает ценность для всей экосистемы (как ранее Model Context Protocol). Прямой вызов OpenAI на корпоративном рынке.`;

const hashtags = '#Anthropic #AgentSkills #AI #Claude #ИИдляБизнеса #OpenAI #ИскусственныйИнтеллект #EnterpriseAI #AIагенты';

const article = {
  title: 'Anthropic launches enterprise Agent Skills and opens the standard',
  url: 'https://venturebeat.com/technology/anthropic-launches-enterprise-agent-skills-and-opens-the-standard',
  source: 'VentureBeat',
  pubDate: new Date('2025-12-18')
};

async function publishPost() {
  try {
    console.log('🎨 Генерирую изображение...\n');

    const imageGenerator = new ImageGenerator(config);
    const imagePrompt = 'Anthropic Agent Skills, AI agents, enterprise software, professional tech illustration with Anthropic branding colors (orange, black), workflow automation, skills directory, corporate AI tools';

    const imageData = await imageGenerator.generateImage(imagePrompt);
    console.log(`✅ Изображение создано: ${imageData.url}\n`);

    console.log('📤 Публикую в Telegram...\n');
    const telegramPublisher = new TelegramPublisherNative(config);

    const result = await telegramPublisher.publish(postText, hashtags, imageData, [article]);

    console.log(`\n✅ Пост опубликован! ID: ${result.message_id}`);
    console.log(`📊 Длина: ${postText.length} символов`);

  } catch (error) {
    console.error('\n❌ Ошибка:', error.message);
    process.exit(1);
  }
}

publishPost();
