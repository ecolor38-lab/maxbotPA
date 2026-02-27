import axios from 'axios';

const API_URL = 'https://platform-api.max.ru';

/**
 * Resolve chat_id from chat link by listing bot's chats.
 * Shared between MaxPublisher and MetricsCollector.
 */
export async function resolveChatId(botToken, chatLink) {
  try {
    const response = await axios.get(`${API_URL}/chats`, {
      params: { count: 50 },
      headers: { Authorization: botToken },
      timeout: 15000
    });
    const chats = response.data.chats || [];
    const target = chats.find((c) => c.link === chatLink);
    if (target) {
      return { chatId: target.chat_id, title: target.title, chats };
    }
    if (chats.length === 1 && chats[0].type === 'channel') {
      return { chatId: chats[0].chat_id, title: chats[0].title, chats };
    }
    return { chatId: null, title: null, chats };
  } catch (error) {
    console.error('❌ Не удалось получить список чатов:', error.response?.data || error.message);
    return { chatId: null, title: null, chats: [] };
  }
}
