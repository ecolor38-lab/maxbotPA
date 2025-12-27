@echo off
echo ============================================================
echo ФИНАЛЬНЫЙ ДЕПЛОЙ
echo ============================================================
echo.
git add .
git commit -m "fix: ecosystem.config.cjs for ES modules + all fixes"
git push origin main
echo.
echo ============================================================
echo ГОТОВО! Теперь на сервере выполните:
echo ============================================================
echo.
echo pm2 delete all ^&^& git pull origin main ^&^& pm2 start ecosystem.config.cjs ^&^& pm2 save
echo.
pause


