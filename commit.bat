@echo off
git add src/config/config.js
git add src/services/imageGenerator.js
git add ecosystem.config.js
git add test-qwen-images.js
git add start-with-scheduler.bat
git add start-without-scheduler.bat
git add COMMANDS_POWERSHELL.txt
git add START_AUTOPOST.md
git commit -m "feat: Qwen AI image generator"
git push origin main
echo.
echo Done!
pause

