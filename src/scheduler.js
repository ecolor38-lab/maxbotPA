import cron from 'node-cron';
import { config } from './config/config.js';
import { ArthritisInfoBot } from './index.js';

class BotScheduler {
  constructor() {
    this.bot = new ArthritisInfoBot();
    this.schedule = config.scheduler.cronSchedule;
  }

  start() {
    console.log('⏰ Запуск планировщика задач...');
    console.log(`📅 Расписание: ${this.schedule}`);
    console.log(`   (По умолчанию: каждый день в 9:00)\n`);

    if (!cron.validate(this.schedule)) {
      console.error('❌ Неверный формат расписания cron:', this.schedule);
      process.exit(1);
    }

    cron.schedule(this.schedule, async () => {
      const now = new Date().toLocaleString('ru-RU', {
        timeZone: 'Europe/Moscow',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });

      console.log(`\n${'='.repeat(70)}`);
      console.log(`⏰ Запланированный запуск: ${now}`);
      console.log('='.repeat(70) + '\n');

      try {
        await this.bot.run();
        console.log('\n✅ Запланированная задача выполнена успешно');
      } catch (error) {
        console.error('\n❌ Ошибка при выполнении запланированной задачи:', error.message);
      }

      console.log(`\n${'='.repeat(70)}\n`);
    });

    console.log('✅ Планировщик запущен и ожидает следующего запуска');
    console.log('💡 Для немедленного запуска используйте: npm start\n');

    this.runImmediately();
  }

  async runImmediately() {
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    readline.question('Запустить бота сейчас? (y/n): ', async (answer) => {
      if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'д') {
        console.log('\n🚀 Запуск бота...\n');
        try {
          await this.bot.run();
        } catch (error) {
          console.error('Ошибка:', error.message);
        }
      }
      readline.close();

      console.log('\n⏳ Ожидание следующего запланированного запуска...');
    });
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const scheduler = new BotScheduler();
  scheduler.start();

  process.on('SIGINT', () => {
    console.log('\n\n👋 Остановка планировщика...');
    process.exit(0);
  });
}

export { BotScheduler };
