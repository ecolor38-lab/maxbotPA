import { config } from './config/config.js';
import { AIBusinessNewsCollector } from './services/aiBusinessNewsCollector.js';
import { ContentPlanner } from './services/contentPlanner.js';

async function main() {
  console.log('🔍 Сбор новостей...\n');

  const collector = new AIBusinessNewsCollector(config);
  const planner = new ContentPlanner();

  try {
    let articles = await collector.collectNews();
    if (!articles.length) {
      articles = collector.getDemoArticles();
    }

    console.log(`\n📚 Собрано: ${articles.length} статей\n`);

    await planner.addArticlesToPlan(articles);

    const stats = await planner.getPlanStats();
    console.log('\n📊 Статистика:');
    console.log(`   В очереди: ${stats.pending}`);
    console.log(`   Опубликовано: ${stats.published}\n`);
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    process.exit(1);
  }
}

main().then(() => process.exit(0));
