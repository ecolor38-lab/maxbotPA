#!/usr/bin/env node

import axios from 'axios';
import dotenv from 'dotenv';
import fs from 'fs/promises';

dotenv.config();

const MAXBOT_API_TOKEN = process.env.MAXBOT_API_TOKEN;
const API_URL = 'https://platform-api.max.ru';

console.log('🔍 Получаю список доступных чатов для вашего бота...\n');

async function getChatIds() {
  try {
    // Пробуем получить обновления через long polling
    const response = await axios.get(
      `${API_URL}/updates`,
      {
        headers: {
          'Authorization': MAXBOT_API_TOKEN
        },
        params: {
          limit: 100
        }
      }
    );

    console.log('✅ Получены обновления от Max Bot API\n');

    const updates = response.data;
    const chatIds = new Set();

    if (updates && updates.length > 0) {
      updates.forEach(update => {
        if (update.message && update.message.chat) {
          const chat = update.message.chat;
          chatIds.add({
            id: chat.id,
            type: chat.type,
            title: chat.title || chat.first_name || 'Приватный чат',
          });
        }
      });

      if (chatIds.size > 0) {
        console.log('📋 Найденные чаты:\n');
        Array.from(chatIds).forEach((chat, index) => {
          console.log(`${index + 1}. ${chat.title}`);
          console.log(`   Chat ID: ${chat.id}`);
          console.log(`   Тип: ${chat.type}`);
          console.log('');
        });

        console.log('\n💡 Скопируйте нужный Chat ID и добавьте в .env:');
        console.log('CHAT_ID=ваш_chat_id\n');
      } else {
        console.log('⚠️ Обновлений не найдено.');
        console.log('\n📝 Чтобы получить chat_id:');
        console.log('1. Добавьте бота в канал/группу');
        console.log('2. Напишите любое сообщение в этот канал/группу');
        console.log('3. Запустите этот скрипт снова\n');
      }
    } else {
      console.log('⚠️ Обновлений не найдено.');
      console.log('\n📝 Чтобы получить chat_id:');
      console.log('1. Добавьте бота (@id380122277866_bot) в канал/группу как администратора');
      console.log('2. Напишите любое сообщение в этот канал/группу');
      console.log('3. Запустите этот скрипт снова: npm run get-chat-id\n');
    }

  } catch (error) {
    console.error('❌ Ошибка при получении обновлений:', error.message);

    if (error.response) {
      console.error('Статус:', error.response.status);
      console.error('Ответ:', error.response.data);
    }

    console.log('\n💡 Альтернативный способ:');
    console.log('1. Откройте https://dev.max.ru/');
    console.log('2. Найдите раздел с вашимботом');
    console.log('3. Посмотрите список чатов и их ID\n');
  }
}

getChatIds();
