@echo off
git add src/services/contentPlanner.js
git add src/services/sourceStats.js
git add DOCKER_FIX.md
git commit -m "fix: Docker read-only filesystem support"
git push origin main
echo.
echo Готово! Теперь на сервере выполните:
echo git pull origin main
echo pm2 restart ai-bot
pause

