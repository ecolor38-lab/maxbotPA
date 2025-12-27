@echo off
REM Скрипт для исправления ошибки синхронизации package-lock.json

echo ========================================
echo FIXING DEPLOY ERROR
echo ========================================
echo.

echo [1/4] Removing node_modules...
if exist node_modules (
    rmdir /s /q node_modules
    echo OK - node_modules removed
) else (
    echo OK - node_modules not found
)

echo.
echo [2/4] Removing package-lock.json...
if exist package-lock.json (
    del /f package-lock.json
    echo OK - package-lock.json removed
) else (
    echo OK - package-lock.json not found
)

echo.
echo [3/4] Installing dependencies (this may take a while)...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo ERROR - npm install failed!
    echo Please check the error messages above
    pause
    exit /b 1
)
echo OK - Dependencies installed

echo.
echo [4/4] Committing and pushing changes...
git add package-lock.json
git commit -m "fix: sync package-lock.json with package.json"
git push origin main

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo WARNING - Git push failed!
    echo Please push manually: git push origin main
    pause
    exit /b 1
)

echo.
echo ========================================
echo SUCCESS! Deploy error fixed!
echo ========================================
echo.
echo Next steps:
echo 1. Go to GitHub Actions tab
echo 2. Wait for the deploy to complete
echo 3. Check that deploy succeeded
echo.
pause


