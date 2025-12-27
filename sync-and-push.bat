@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ========================================
echo SYNCING AND PUSHING TO GITHUB
echo ========================================
echo.

echo [1/5] Removing package-lock.json...
if exist package-lock.json del /f package-lock.json
echo Done.

echo [2/5] Removing node_modules...
if exist node_modules rmdir /s /q node_modules
echo Done.

echo [3/5] Installing dependencies with updated cheerio...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: npm install failed!
    pause
    exit /b 1
)
echo Done.

echo [4/5] Git add and commit...
git add package.json package-lock.json
git commit -m "fix: sync package-lock.json with cheerio 1.0.0-rc.12 for Node 18 compatibility"
echo Done.

echo [5/5] Git push...
git push origin main
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: git push failed!
    pause
    exit /b 1
)
echo Done.

echo.
echo ========================================
echo SUCCESS! Changes pushed to GitHub.
echo Now check GitHub Actions.
echo ========================================
pause


