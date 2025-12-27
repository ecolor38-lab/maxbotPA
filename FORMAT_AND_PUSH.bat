@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo.
echo ========================================
echo     FORMAT CODE AND PUSH
echo ========================================
echo.

echo [1/5] Running Prettier format...
call npm run format
echo       Done!

echo [2/5] Checking format...
call npm run format:check
echo       Done!

echo [3/5] Git add...
git add -A
echo       Done!

echo [4/5] Git commit...
git commit -m "style: format code with Prettier"
echo       Done!

echo [5/5] Git push...
git push origin main
echo       Done!

echo.
echo ========================================
echo     ALL DONE!
echo ========================================
echo.
pause

