@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo.
echo ========================================
echo     PUSH CHANGES TO GITHUB
echo ========================================
echo.

git add -A
git commit -m "fix: remove useless escape characters in validation regex"
git push origin main

echo.
echo ========================================
echo     DONE!
echo ========================================
echo.
pause

