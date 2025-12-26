#!/bin/bash

# Примеры использования AI Business Bot API через curl
# 
# Использование:
# chmod +x examples/api-usage.sh
# ./examples/api-usage.sh <команда>
#
# Перед использованием запустите сервер: npm run server

API_URL="${API_URL:-http://localhost:3000}"

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функция для красивого вывода JSON
pretty_json() {
    if command -v jq &> /dev/null; then
        echo "$1" | jq '.'
    else
        echo "$1"
    fi
}

# Health Check
health_check() {
    echo -e "\n${BLUE}=== HEALTH CHECK ===${NC}\n"
    
    response=$(curl -s "$API_URL/health")
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Сервер работает${NC}"
        pretty_json "$response"
    else
        echo -e "${RED}❌ Сервер недоступен${NC}"
        return 1
    fi
}

# Получить статус бота
bot_status() {
    echo -e "\n${BLUE}=== BOT STATUS ===${NC}\n"
    
    response=$(curl -s "$API_URL/api/bot/status")
    pretty_json "$response"
}

# Получить статистику контент-плана
content_stats() {
    echo -e "\n${BLUE}=== CONTENT STATS ===${NC}\n"
    
    response=$(curl -s "$API_URL/api/content/stats")
    pretty_json "$response"
}

# Получить очередь постов
content_queue() {
    echo -e "\n${BLUE}=== CONTENT QUEUE ===${NC}\n"
    
    response=$(curl -s "$API_URL/api/content/queue")
    pretty_json "$response"
}

# Собрать новости
collect_news() {
    echo -e "\n${BLUE}=== COLLECT NEWS ===${NC}\n"
    
    echo -e "${YELLOW}🔄 Запускаю сбор новостей...${NC}"
    response=$(curl -s -X POST "$API_URL/api/content/collect")
    pretty_json "$response"
    
    echo -e "\n${YELLOW}⏳ Ждём 30 секунд...${NC}"
    sleep 30
    
    content_stats
}

# Опубликовать пост
publish_post() {
    echo -e "\n${BLUE}=== PUBLISH POST ===${NC}\n"
    
    # Проверяем очередь
    queue_response=$(curl -s "$API_URL/api/content/queue")
    total=$(echo "$queue_response" | grep -o '"total":[0-9]*' | grep -o '[0-9]*')
    
    if [ "$total" = "0" ]; then
        echo -e "${RED}📭 Очередь пуста. Сначала соберите новости.${NC}"
        return 1
    fi
    
    echo -e "${YELLOW}📤 Публикую следующий пост...${NC}"
    response=$(curl -s -X POST "$API_URL/api/bot/publish")
    pretty_json "$response"
    
    echo -e "\n${YELLOW}⏳ Ждём 20 секунд...${NC}"
    sleep 20
    
    content_stats
}

# Запустить бота
run_bot() {
    echo -e "\n${BLUE}=== RUN BOT ===${NC}\n"
    
    echo -e "${YELLOW}🚀 Запускаю бота (сбор новостей + публикация)...${NC}"
    response=$(curl -s -X POST "$API_URL/api/bot/run")
    pretty_json "$response"
    
    echo -e "\n${YELLOW}⏳ Ждём завершения (может занять 1-2 минуты)...${NC}"
    sleep 60
    
    content_stats
}

# Управление планировщиком
manage_scheduler() {
    echo -e "\n${BLUE}=== SCHEDULER MANAGEMENT ===${NC}\n"
    
    echo -e "${YELLOW}🔍 Проверяю статус планировщика...${NC}"
    status_response=$(curl -s "$API_URL/api/scheduler/status")
    pretty_json "$status_response"
    
    is_running=$(echo "$status_response" | grep -o '"running":[a-z]*' | grep -o '[a-z]*$')
    
    if [ "$is_running" != "true" ]; then
        echo -e "\n${YELLOW}⏰ Запускаю планировщик...${NC}"
        start_response=$(curl -s -X POST "$API_URL/api/scheduler/start")
        pretty_json "$start_response"
    else
        echo -e "\n${GREEN}✅ Планировщик уже запущен${NC}"
    fi
}

# Полный рабочий процесс
full_workflow() {
    echo -e "\n${BLUE}╔══════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║   AI Business Bot - Full Workflow   ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════╝${NC}\n"
    
    # 1. Health check
    health_check
    if [ $? -ne 0 ]; then
        echo -e "\n${RED}❌ Сервер недоступен. Завершение.${NC}"
        return 1
    fi
    
    # 2. Статус бота
    bot_status
    
    # 3. Текущая статистика
    content_stats
    
    # 4. Собираем новости если нужно
    queue_response=$(curl -s "$API_URL/api/content/queue")
    total=$(echo "$queue_response" | grep -o '"total":[0-9]*' | grep -o '[0-9]*')
    
    if [ "$total" = "0" ]; then
        echo -e "\n${YELLOW}📭 Очередь пуста, собираю новости...${NC}"
        collect_news
    else
        echo -e "\n${GREEN}✅ В очереди уже есть посты${NC}"
        content_queue
    fi
    
    # 5. Публикуем пост
    echo -e "\n${YELLOW}📤 Публикую тестовый пост...${NC}"
    publish_post
    
    # 6. Запускаем планировщик
    echo -e "\n${YELLOW}⏰ Настраиваю автоматическую публикацию...${NC}"
    manage_scheduler
    
    echo -e "\n${BLUE}╔══════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║         Workflow Completed!         ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════╝${NC}\n"
    
    echo -e "${GREEN}💡 Бот теперь работает автоматически по расписанию!${NC}"
    echo -e "${GREEN}📊 Мониторинг доступен по адресу: $API_URL${NC}\n"
}

# Показать справку
show_help() {
    echo -e "\n${BLUE}📚 Доступные команды:${NC}\n"
    echo "  ./examples/api-usage.sh health      - Health check"
    echo "  ./examples/api-usage.sh status      - Статус бота"
    echo "  ./examples/api-usage.sh stats       - Статистика"
    echo "  ./examples/api-usage.sh queue       - Очередь постов"
    echo "  ./examples/api-usage.sh collect     - Собрать новости"
    echo "  ./examples/api-usage.sh publish     - Опубликовать пост"
    echo "  ./examples/api-usage.sh run         - Запустить бота"
    echo "  ./examples/api-usage.sh scheduler   - Управление планировщиком"
    echo "  ./examples/api-usage.sh workflow    - Полный рабочий процесс"
    echo ""
    echo -e "${YELLOW}💡 Перед использованием запустите сервер: npm run server${NC}\n"
    echo -e "${YELLOW}💡 Установите jq для красивого вывода JSON: apt install jq${NC}\n"
}

# Главная функция
main() {
    case "$1" in
        health)
            health_check
            ;;
        status)
            bot_status
            ;;
        stats)
            content_stats
            ;;
        queue)
            content_queue
            ;;
        collect)
            collect_news
            ;;
        publish)
            publish_post
            ;;
        run)
            run_bot
            ;;
        scheduler)
            manage_scheduler
            ;;
        workflow)
            full_workflow
            ;;
        *)
            show_help
            ;;
    esac
}

# Запуск
main "$1"







