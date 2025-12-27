import https from 'https';
import dotenv from 'dotenv';

dotenv.config();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

console.log('🔍 Проверяю доступные каналы для бота...\n');

function getUpdates() {
  return new Promise((resolve, reject) => {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/getUpdates`;
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function main() {
  try {
    const response = await getUpdates();
    
    if (!response.ok) {
      console.error('❌ Ошибка API:', response.description);
      return;
    }

    const updates = response.result;
    
    if (updates.length === 0) {
      console.log('⚠️ Обновлений не найдено.\n');
      console.log('📝 Чтобы получить ID канала:');
      console.log('1. Добавьте бота @test1marketolog_bot в ваш канал как администратора');
      console.log('2. Дайте боту права на публикацию сообщений');
      console.log('3. Напишите любое сообщение в канал');
      console.log('4. Запустите этот скрипт снова: node get-channel-id.js\n');
      return;
    }

    console.log('✅ Найдены обновления!\n');
    console.log('📋 Доступные чаты:\n');

    const chats = new Map();
    
    updates.forEach(update => {
      const message = update.message || update.channel_post;
      if (message && message.chat) {
        const chat = message.chat;
        chats.set(chat.id, {
          id: chat.id,
          title: chat.title || chat.first_name || 'Личный чат',
          type: chat.type,
          username: chat.username || 'N/A'
        });
      }
    });

    Array.from(chats.values()).forEach((chat, index) => {
      console.log(`${index + 1}. ${chat.title}`);
      console.log(`   ID: ${chat.id}`);
      console.log(`   Тип: ${chat.type}`);
      if (chat.username) {
        console.log(`   Username: @${chat.username}`);
      }
      console.log('');
    });

    console.log('\n💡 Скопируйте нужный ID и обновите в .env:');
    console.log('TELEGRAM_CHANNEL_ID=ваш_id\n');

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

main();









