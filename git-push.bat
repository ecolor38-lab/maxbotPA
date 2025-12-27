@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo === Git Sync ===
git add -A
git commit -m "fix: critical syntax errors"
git pull --rebase origin main
git push

echo.
echo Done!
pause
