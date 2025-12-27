@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo.
echo ========================================
echo     FORCE PUSH PACKAGE-LOCK.JSON
echo ========================================
echo.

echo [1/4] Git status...
git status
echo.

echo [2/4] Force add package-lock.json...
git add -f package-lock.json
git add -f package.json
echo       Done!

echo [3/4] Git commit...
git commit -m "fix: force update package-lock.json with all dependencies" --allow-empty
echo       Done!

echo [4/4] Git push...
git push origin main
echo       Done!

echo.
echo ========================================
echo     FORCE PUSH COMPLETE!
echo ========================================
echo.
pause

