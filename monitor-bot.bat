@echo off
REM Скрипт мониторинга бота для Windows
REM Автоматически перезапускает бота если он упал

echo Checking bot status...

REM Проверяем статус бота через PM2
pm2 show ai-bot | findstr /C:"online" >nul 2>&1

if %ERRORLEVEL% NEQ 0 (
    echo [%date% %time%] Bot is down! Restarting...
    echo [%date% %time%] Bot is down! Restarting... >> bot-restart.log
    
    pm2 restart ai-bot
    
    echo [%date% %time%] Bot restarted successfully >> bot-restart.log
    echo Bot restarted successfully!
) else (
    echo Bot is running - OK
)

REM Показать текущий статус
pm2 status


