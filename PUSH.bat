@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo ========================================
echo     PUSHING TO GITHUB
echo ========================================
echo.
git add .
git commit -m "fix: sync dependencies and add helper scripts"
git push origin main
echo.
echo ========================================
echo     DONE!
echo ========================================
echo.
pause

