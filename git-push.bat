@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo === Git Push ===
git add -A
git commit -m "refactor: global code cleanup - reduce codebase by 80%%"
git push

echo.
echo Done!
del "%~f0"

