@echo off
echo Быстрый деплой - 100 новостей, контент-план на неделю!
git add -A
git commit -m "feat: process 100 news, weekly content plan (21 posts)"
git push origin main
echo.
echo Готово! На сервере перезапустите процесс.
pause




