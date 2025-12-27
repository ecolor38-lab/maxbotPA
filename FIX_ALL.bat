@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo.
echo ========================================
echo     FULL FIX - STEP BY STEP
echo ========================================
echo.

echo [1/6] Deleting package-lock.json...
if exist package-lock.json del /f /q package-lock.json
echo       Done!

echo [2/6] Deleting node_modules...
if exist node_modules rmdir /s /q node_modules
echo       Done!

echo [3/6] Running npm install (wait ~30 sec)...
call npm install
echo       Done!

echo [4/6] Git add...
git add .
echo       Done!

echo [5/6] Git commit...
git commit -m "fix: downgrade cheerio to 1.0.0-rc.12 for Node 18 compatibility"
echo       Done!

echo [6/6] Git push to GitHub...
git push origin main
echo       Done!

echo.
echo ========================================
echo     ALL DONE! CHECK GITHUB ACTIONS
echo ========================================
echo.
pause

