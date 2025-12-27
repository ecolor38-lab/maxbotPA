@echo off
echo Коммичу исправление порта...
git add server.js
git add FIX_PORT.md
git commit -m "fix: handle EADDRINUSE port error"
git push origin main
echo.
echo ============================================================
echo НА СЕРВЕРЕ ВЫПОЛНИТЕ ОДНУ КОМАНДУ:
echo ============================================================
echo.
echo pm2 delete all ^&^& git pull origin main ^&^& pm2 start ecosystem.config.js ^&^& pm2 save
echo.
echo ============================================================
pause

