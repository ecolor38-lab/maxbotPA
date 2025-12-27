@echo off
chcp 65001 >nul
echo ========================================
echo Деплой улучшений на сервер
echo ========================================
echo.

echo [1/4] Проверка изменений...
git status

echo.
echo [2/4] Добавление файлов в git...
git add package.json
git add server.js
git add src/middleware/
git add src/utils/
git add tests/
git add .env.example
git add .eslintrc.json
git add .prettierrc.json
git add .github/

echo.
echo [3/4] Коммит изменений...
git commit -m "feat: add rate limiting, validation, logging, metrics, tests"

echo.
echo [4/4] Отправка на сервер...
git push origin main

echo.
echo ========================================
echo ✅ Готово!
echo ========================================
echo.
echo Пакеты установятся АВТОМАТИЧЕСКИ на сервере
echo при следующем деплое (через 1-2 минуты)
echo.
pause


