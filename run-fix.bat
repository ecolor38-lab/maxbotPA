@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Fixing deployment...
echo.

echo Step 1: Removing node_modules...
if exist node_modules rmdir /s /q node_modules
echo Done.

echo Step 2: Removing package-lock.json...
if exist package-lock.json del /f package-lock.json
echo Done.

echo Step 3: Installing dependencies (please wait)...
call npm install
echo Done.

echo Step 4: Git add...
git add package.json package-lock.json
echo Done.

echo Step 5: Git commit...
git commit -m "fix: downgrade cheerio to support Node.js 18 and sync package-lock"
echo Done.

echo Step 6: Git push...
git push origin main
echo Done.

echo.
echo ========================================
echo ALL DONE! Check GitHub Actions now.
echo ========================================
pause


