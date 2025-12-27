@echo off
echo Добавляю QWEN_API_KEY в .env...

if not exist .env (
    echo Создаю .env из примера...
    copy .env.example .env
) else (
    echo Файл .env уже существует
)

echo.
echo Добавьте эту строку в ваш .env файл:
echo QWEN_API_KEY=sk-a6509b0b95d1473696c7b1548deda5fe
echo.
echo Открываю .env в блокноте...
notepad .env
pause



