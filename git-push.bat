@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo === Git Sync ===
git pull --rebase
git add -A
git commit -m "fix: port 3000, crash protection, lazy init"
git push

echo.
echo Done!
pause
