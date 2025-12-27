@echo off
echo Коммичу исправления SIGTERM и файловой системы...
git add server.js
git add src/services/contentPlanner.js
git add src/services/sourceStats.js
git add FIX_SIGTERM.md
git commit -m "fix: SIGTERM handling and filesystem errors in Docker"
git push origin main
echo.
echo Готово! На сервере выполните:
echo git pull origin main
echo pm2 restart ai-bot
pause





