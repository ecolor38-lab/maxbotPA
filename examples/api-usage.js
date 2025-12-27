/**
 * Примеры использования AI Business Bot API
 * 
 * Запустите сервер перед использованием:
 * npm run server
 */

import axios from 'axios';

// URL вашего сервера
const API_URL = process.env.API_URL || 'http://localhost:3000';

// ===========================================
// ПРИМЕР 1: Проверка здоровья сервера
// ===========================================

async function checkHealth() {
  console.log('\n=== HEALTH CHECK ===\n');
  
  try {
    const response = await axios.get(`${API_URL}/health`);
    console.log('✅ Сервер работает:', response.data);
    return true;
  } catch (error) {
    console.error('❌ Сервер недоступен:', error.message);
    return false;
  }
}

// ===========================================
// ПРИМЕР 2: Получение статуса бота
// ===========================================

async function getBotStatus() {
  console.log('\n=== BOT STATUS ===\n');
  
  try {
    const response = await axios.get(`${API_URL}/api/bot/status`);
    console.log('Статус бота:', response.data);
    
    const { config } = response.data;
    
    if (!config.telegramConfigured) {
      console.log('⚠️ Telegram не настроен');
    }
    if (!config.openaiConfigured) {
      console.log('⚠️ OpenAI не настроен');
    }
    if (!config.anthropicConfigured) {
      console.log('⚠️ Anthropic не настроен');
    }
    
    if (config.telegramConfigured && config.openaiConfigured && config.anthropicConfigured) {
      console.log('✅ Все сервисы настроены правильно');
    }
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

// ===========================================
// ПРИМЕР 3: Получение статистики контент-плана
// ===========================================

async function getContentStats() {
  console.log('\n=== CONTENT STATS ===\n');
  
  try {
    const response = await axios.get(`${API_URL}/api/content/stats`);
    const stats = response.data;
    
    console.log(`📊 Статистика:`);
    console.log(`   - В очереди: ${stats.pending} постов`);
    console.log(`   - Опубликовано сегодня: ${stats.published}`);
    console.log(`   - Всего опубликовано: ${stats.totalPublished}`);
    
    if (stats.lastPublished) {
      const lastPub = new Date(stats.lastPublished).toLocaleString('ru-RU');
      console.log(`   - Последняя публикация: ${lastPub}`);
    }
    
    return stats;
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

// ===========================================
// ПРИМЕР 4: Получение очереди постов
// ===========================================

async function getContentQueue() {
  console.log('\n=== CONTENT QUEUE ===\n');
  
  try {
    const response = await axios.get(`${API_URL}/api/content/queue`);
    const { total, queue } = response.data;
    
    console.log(`📦 Всего в очереди: ${total} постов\n`);
    
    if (queue.length === 0) {
      console.log('📭 Очередь пуста');
      return queue;
    }
    
    console.log('Первые 10 постов:');
    queue.forEach((post, index) => {
      const date = new Date(post.createdAt).toLocaleString('ru-RU');
      console.log(`${index + 1}. ID: ${post.id}, Статей: ${post.articlesCount}, Создан: ${date}`);
    });
    
    return queue;
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

// ===========================================
// ПРИМЕР 5: Сбор новостей
// ===========================================

async function collectNews() {
  console.log('\n=== COLLECT NEWS ===\n');
  
  try {
    console.log('🔄 Запускаю сбор новостей...');
    const response = await axios.post(`${API_URL}/api/content/collect`);
    console.log('✅', response.data.message);
    
    // Подождём немного и проверим результат
    console.log('⏳ Ждём 30 секунд...');
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    // Проверяем обновлённую статистику
    await getContentStats();
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

// ===========================================
// ПРИМЕР 6: Публикация поста
// ===========================================

async function publishPost() {
  console.log('\n=== PUBLISH POST ===\n');
  
  try {
    // Сначала проверим, есть ли посты в очереди
    const queueResponse = await axios.get(`${API_URL}/api/content/queue`);
    
    if (queueResponse.data.total === 0) {
      console.log('📭 Очередь пуста. Сначала соберите новости.');
      return;
    }
    
    console.log('📤 Публикую следующий пост...');
    const response = await axios.post(`${API_URL}/api/bot/publish`);
    console.log('✅', response.data.message);
    
    // Подождём и проверим статистику
    console.log('⏳ Ждём 20 секунд...');
    await new Promise(resolve => setTimeout(resolve, 20000));
    
    await getContentStats();
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

// ===========================================
// ПРИМЕР 7: Запуск бота (полный цикл)
// ===========================================

async function runBot() {
  console.log('\n=== RUN BOT ===\n');
  
  try {
    console.log('🚀 Запускаю бота (сбор новостей + публикация)...');
    const response = await axios.post(`${API_URL}/api/bot/run`);
    console.log('✅', response.data.message);
    
    // Бот работает в фоне, подождём
    console.log('⏳ Ждём завершения (может занять 1-2 минуты)...');
    await new Promise(resolve => setTimeout(resolve, 60000));
    
    await getContentStats();
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

// ===========================================
// ПРИМЕР 8: Управление планировщиком
// ===========================================

async function manageScheduler() {
  console.log('\n=== SCHEDULER MANAGEMENT ===\n');
  
  try {
    // Проверим статус
    console.log('🔍 Проверяю статус планировщика...');
    let response = await axios.get(`${API_URL}/api/scheduler/status`);
    console.log('Статус:', response.data);
    
    if (!response.data.running) {
      console.log('\n⏰ Запускаю планировщик...');
      response = await axios.post(`${API_URL}/api/scheduler/start`);
      console.log('✅', response.data.message);
      console.log('📅 Расписания:', response.data.schedules);
    } else {
      console.log('✅ Планировщик уже запущен');
    }
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

// ===========================================
// ПРИМЕР 9: Мониторинг (бесконечный цикл)
// ===========================================

async function monitorBot(intervalMinutes = 5) {
  console.log('\n=== BOT MONITORING ===\n');
  console.log(`🔄 Мониторинг каждые ${intervalMinutes} минут\n`);
  
  while (true) {
    try {
      const stats = await getContentStats();
      
      // Проверки и уведомления
      if (stats.pending === 0) {
        console.log('\n⚠️ ВНИМАНИЕ: Очередь пуста! Запускаю сбор новостей...\n');
        await collectNews();
      }
      
      if (stats.pending < 5) {
        console.log('\n⚠️ ПРЕДУПРЕЖДЕНИЕ: Мало постов в очереди (< 5)\n');
      }
      
    } catch (error) {
      console.error('❌ Ошибка мониторинга:', error.message);
    }
    
    // Ждём до следующей проверки
    await new Promise(resolve => setTimeout(resolve, intervalMinutes * 60 * 1000));
  }
}

// ===========================================
// ПРИМЕР 10: Полный рабочий процесс
// ===========================================

async function fullWorkflow() {
  console.log('\n╔══════════════════════════════════════╗');
  console.log('║   AI Business Bot - Full Workflow   ║');
  console.log('╚══════════════════════════════════════╝\n');
  
  // 1. Проверка здоровья
  const isHealthy = await checkHealth();
  if (!isHealthy) {
    console.error('\n❌ Сервер недоступен. Завершение.');
    return;
  }
  
  // 2. Проверка статуса
  await getBotStatus();
  
  // 3. Текущая статистика
  const stats = await getContentStats();
  
  // 4. Если очередь пуста - собираем новости
  if (stats.pending === 0) {
    console.log('\n📭 Очередь пуста, собираю новости...');
    await collectNews();
  } else {
    console.log('\n✅ В очереди уже есть посты');
    await getContentQueue();
  }
  
  // 5. Публикуем один пост
  console.log('\n📤 Публикую тестовый пост...');
  await publishPost();
  
  // 6. Запускаем планировщик
  console.log('\n⏰ Настраиваю автоматическую публикацию...');
  await manageScheduler();
  
  console.log('\n╔══════════════════════════════════════╗');
  console.log('║         Workflow Completed!         ║');
  console.log('╚══════════════════════════════════════╝\n');
  
  console.log('💡 Бот теперь работает автоматически по расписанию!');
  console.log('📊 Мониторинг доступен по адресу:', API_URL);
}

// ===========================================
// ГЛАВНАЯ ФУНКЦИЯ
// ===========================================

async function main() {
  const command = process.argv[2];
  
  switch (command) {
    case 'health':
      await checkHealth();
      break;
    case 'status':
      await getBotStatus();
      break;
    case 'stats':
      await getContentStats();
      break;
    case 'queue':
      await getContentQueue();
      break;
    case 'collect':
      await collectNews();
      break;
    case 'publish':
      await publishPost();
      break;
    case 'run':
      await runBot();
      break;
    case 'scheduler':
      await manageScheduler();
      break;
    case 'monitor':
      await monitorBot(5);
      break;
    case 'workflow':
      await fullWorkflow();
      break;
    default:
      console.log('\n📚 Доступные команды:\n');
      console.log('  node examples/api-usage.js health      - Health check');
      console.log('  node examples/api-usage.js status      - Статус бота');
      console.log('  node examples/api-usage.js stats       - Статистика');
      console.log('  node examples/api-usage.js queue       - Очередь постов');
      console.log('  node examples/api-usage.js collect     - Собрать новости');
      console.log('  node examples/api-usage.js publish     - Опубликовать пост');
      console.log('  node examples/api-usage.js run         - Запустить бота');
      console.log('  node examples/api-usage.js scheduler   - Управление планировщиком');
      console.log('  node examples/api-usage.js monitor     - Мониторинг (бесконечный)');
      console.log('  node examples/api-usage.js workflow    - Полный рабочий процесс');
      console.log('');
      console.log('💡 Перед использованием запустите сервер: npm run server\n');
  }
}

// Запуск
main().catch(console.error);









