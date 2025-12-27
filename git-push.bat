@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo === Git Push ===
git add -A
git commit -m "fix: Russian language + sources in posts"
git push

echo.
echo Done!
pause
