#!/usr/bin/env python3
"""
Примеры использования AI Business Bot API на Python

Установка зависимостей:
pip install requests

Запустите сервер перед использованием:
npm run server
"""

import requests
import time
import sys
from datetime import datetime

# URL вашего сервера
API_URL = 'http://localhost:3000'


def check_health():
    """Проверка здоровья сервера"""
    print('\n=== HEALTH CHECK ===\n')
    
    try:
        response = requests.get(f'{API_URL}/health')
        response.raise_for_status()
        data = response.json()
        print('✅ Сервер работает:', data)
        return True
    except requests.exceptions.RequestException as e:
        print(f'❌ Сервер недоступен: {e}')
        return False


def get_bot_status():
    """Получение статуса бота"""
    print('\n=== BOT STATUS ===\n')
    
    try:
        response = requests.get(f'{API_URL}/api/bot/status')
        response.raise_for_status()
        data = response.json()
        
        print('Статус бота:', data)
        
        config = data.get('config', {})
        
        if not config.get('telegramConfigured'):
            print('⚠️ Telegram не настроен')
        if not config.get('openaiConfigured'):
            print('⚠️ OpenAI не настроен')
        if not config.get('anthropicConfigured'):
            print('⚠️ Anthropic не настроен')
        
        if all([config.get('telegramConfigured'), 
                config.get('openaiConfigured'), 
                config.get('anthropicConfigured')]):
            print('✅ Все сервисы настроены правильно')
            
    except requests.exceptions.RequestException as e:
        print(f'❌ Ошибка: {e}')


def get_content_stats():
    """Получение статистики контент-плана"""
    print('\n=== CONTENT STATS ===\n')
    
    try:
        response = requests.get(f'{API_URL}/api/content/stats')
        response.raise_for_status()
        stats = response.json()
        
        print('📊 Статистика:')
        print(f"   - В очереди: {stats.get('pending', 0)} постов")
        print(f"   - Опубликовано сегодня: {stats.get('published', 0)}")
        print(f"   - Всего опубликовано: {stats.get('totalPublished', 0)}")
        
        if stats.get('lastPublished'):
            last_pub = datetime.fromisoformat(stats['lastPublished'].replace('Z', '+00:00'))
            print(f"   - Последняя публикация: {last_pub.strftime('%Y-%m-%d %H:%M:%S')}")
        
        return stats
        
    except requests.exceptions.RequestException as e:
        print(f'❌ Ошибка: {e}')
        return None


def get_content_queue():
    """Получение очереди постов"""
    print('\n=== CONTENT QUEUE ===\n')
    
    try:
        response = requests.get(f'{API_URL}/api/content/queue')
        response.raise_for_status()
        data = response.json()
        
        total = data.get('total', 0)
        queue = data.get('queue', [])
        
        print(f'📦 Всего в очереди: {total} постов\n')
        
        if len(queue) == 0:
            print('📭 Очередь пуста')
            return queue
        
        print('Первые 10 постов:')
        for i, post in enumerate(queue, 1):
            created = datetime.fromisoformat(post['createdAt'].replace('Z', '+00:00'))
            print(f"{i}. ID: {post['id']}, "
                  f"Статей: {post['articlesCount']}, "
                  f"Создан: {created.strftime('%Y-%m-%d %H:%M:%S')}")
        
        return queue
        
    except requests.exceptions.RequestException as e:
        print(f'❌ Ошибка: {e}')
        return None


def collect_news():
    """Сбор новостей"""
    print('\n=== COLLECT NEWS ===\n')
    
    try:
        print('🔄 Запускаю сбор новостей...')
        response = requests.post(f'{API_URL}/api/content/collect')
        response.raise_for_status()
        data = response.json()
        print(f"✅ {data.get('message', '')}")
        
        # Подождём немного и проверим результат
        print('⏳ Ждём 30 секунд...')
        time.sleep(30)
        
        # Проверяем обновлённую статистику
        get_content_stats()
        
    except requests.exceptions.RequestException as e:
        print(f'❌ Ошибка: {e}')


def publish_post():
    """Публикация поста"""
    print('\n=== PUBLISH POST ===\n')
    
    try:
        # Сначала проверим, есть ли посты в очереди
        queue_response = requests.get(f'{API_URL}/api/content/queue')
        queue_response.raise_for_status()
        queue_data = queue_response.json()
        
        if queue_data.get('total', 0) == 0:
            print('📭 Очередь пуста. Сначала соберите новости.')
            return
        
        print('📤 Публикую следующий пост...')
        response = requests.post(f'{API_URL}/api/bot/publish')
        response.raise_for_status()
        data = response.json()
        print(f"✅ {data.get('message', '')}")
        
        # Подождём и проверим статистику
        print('⏳ Ждём 20 секунд...')
        time.sleep(20)
        
        get_content_stats()
        
    except requests.exceptions.RequestException as e:
        print(f'❌ Ошибка: {e}')


def run_bot():
    """Запуск бота (полный цикл)"""
    print('\n=== RUN BOT ===\n')
    
    try:
        print('🚀 Запускаю бота (сбор новостей + публикация)...')
        response = requests.post(f'{API_URL}/api/bot/run')
        response.raise_for_status()
        data = response.json()
        print(f"✅ {data.get('message', '')}")
        
        # Бот работает в фоне, подождём
        print('⏳ Ждём завершения (может занять 1-2 минуты)...')
        time.sleep(60)
        
        get_content_stats()
        
    except requests.exceptions.RequestException as e:
        print(f'❌ Ошибка: {e}')


def manage_scheduler():
    """Управление планировщиком"""
    print('\n=== SCHEDULER MANAGEMENT ===\n')
    
    try:
        # Проверим статус
        print('🔍 Проверяю статус планировщика...')
        response = requests.get(f'{API_URL}/api/scheduler/status')
        response.raise_for_status()
        data = response.json()
        print('Статус:', data)
        
        if not data.get('running'):
            print('\n⏰ Запускаю планировщик...')
            response = requests.post(f'{API_URL}/api/scheduler/start')
            response.raise_for_status()
            data = response.json()
            print(f"✅ {data.get('message', '')}")
            print(f"📅 Расписания: {data.get('schedules', [])}")
        else:
            print('✅ Планировщик уже запущен')
            
    except requests.exceptions.RequestException as e:
        print(f'❌ Ошибка: {e}')


def monitor_bot(interval_minutes=5):
    """Мониторинг (бесконечный цикл)"""
    print('\n=== BOT MONITORING ===\n')
    print(f'🔄 Мониторинг каждые {interval_minutes} минут\n')
    
    while True:
        try:
            stats = get_content_stats()
            
            if stats:
                # Проверки и уведомления
                if stats.get('pending', 0) == 0:
                    print('\n⚠️ ВНИМАНИЕ: Очередь пуста! Запускаю сбор новостей...\n')
                    collect_news()
                
                if stats.get('pending', 0) < 5:
                    print('\n⚠️ ПРЕДУПРЕЖДЕНИЕ: Мало постов в очереди (< 5)\n')
            
        except Exception as e:
            print(f'❌ Ошибка мониторинга: {e}')
        
        # Ждём до следующей проверки
        time.sleep(interval_minutes * 60)


def full_workflow():
    """Полный рабочий процесс"""
    print('\n╔══════════════════════════════════════╗')
    print('║   AI Business Bot - Full Workflow   ║')
    print('╚══════════════════════════════════════╝\n')
    
    # 1. Проверка здоровья
    if not check_health():
        print('\n❌ Сервер недоступен. Завершение.')
        return
    
    # 2. Проверка статуса
    get_bot_status()
    
    # 3. Текущая статистика
    stats = get_content_stats()
    
    # 4. Если очередь пуста - собираем новости
    if stats and stats.get('pending', 0) == 0:
        print('\n📭 Очередь пуста, собираю новости...')
        collect_news()
    else:
        print('\n✅ В очереди уже есть посты')
        get_content_queue()
    
    # 5. Публикуем один пост
    print('\n📤 Публикую тестовый пост...')
    publish_post()
    
    # 6. Запускаем планировщик
    print('\n⏰ Настраиваю автоматическую публикацию...')
    manage_scheduler()
    
    print('\n╔══════════════════════════════════════╗')
    print('║         Workflow Completed!         ║')
    print('╚══════════════════════════════════════╝\n')
    
    print('💡 Бот теперь работает автоматически по расписанию!')
    print(f'📊 Мониторинг доступен по адресу: {API_URL}')


def main():
    """Главная функция"""
    if len(sys.argv) < 2:
        print('\n📚 Доступные команды:\n')
        print('  python examples/api-usage.py health      - Health check')
        print('  python examples/api-usage.py status      - Статус бота')
        print('  python examples/api-usage.py stats       - Статистика')
        print('  python examples/api-usage.py queue       - Очередь постов')
        print('  python examples/api-usage.py collect     - Собрать новости')
        print('  python examples/api-usage.py publish     - Опубликовать пост')
        print('  python examples/api-usage.py run         - Запустить бота')
        print('  python examples/api-usage.py scheduler   - Управление планировщиком')
        print('  python examples/api-usage.py monitor     - Мониторинг (бесконечный)')
        print('  python examples/api-usage.py workflow    - Полный рабочий процесс')
        print('')
        print('💡 Перед использованием запустите сервер: npm run server\n')
        return
    
    command = sys.argv[1]
    
    commands = {
        'health': check_health,
        'status': get_bot_status,
        'stats': get_content_stats,
        'queue': get_content_queue,
        'collect': collect_news,
        'publish': publish_post,
        'run': run_bot,
        'scheduler': manage_scheduler,
        'monitor': lambda: monitor_bot(5),
        'workflow': full_workflow
    }
    
    if command in commands:
        commands[command]()
    else:
        print(f'\n❌ Неизвестная команда: {command}\n')
        print('Используйте: python examples/api-usage.py для списка команд\n')


if __name__ == '__main__':
    main()











