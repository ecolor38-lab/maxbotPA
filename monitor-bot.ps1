# Скрипт мониторинга бота для Windows PowerShell
# Автоматически перезапускает бота если он упал

Write-Host "Checking bot status..." -ForegroundColor Cyan

# Проверяем статус бота через PM2
$status = pm2 show ai-bot 2>&1 | Out-String

if ($status -notmatch "online") {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$timestamp] Bot is down! Restarting..." -ForegroundColor Red
    
    # Записываем в лог
    Add-Content -Path "bot-restart.log" -Value "[$timestamp] Bot is down! Restarting..."
    
    # Перезапускаем бота
    pm2 restart ai-bot
    
    Add-Content -Path "bot-restart.log" -Value "[$timestamp] Bot restarted successfully"
    Write-Host "Bot restarted successfully!" -ForegroundColor Green
} else {
    Write-Host "Bot is running - OK" -ForegroundColor Green
}

# Показать текущий статус
pm2 status


